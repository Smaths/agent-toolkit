import type { ExtensionAPI, SessionEntry } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { layoutFooter } from "./layout.ts";

// Match Pi's session totals: branch changes and compaction do not refund prior requests.
function entryCost(entry: SessionEntry): number {
	if (entry.type === "usage" || entry.type === "compaction" || entry.type === "branch_summary") return entry.usage?.cost.total ?? 0;
	if (entry.type === "message" && (entry.message.role === "assistant" || entry.message.role === "toolResult"))
		return entry.message.usage?.cost.total ?? 0;
	return 0;
}

function fmtTokens(n: number): string {
	if (n < 1000) return `${n}`;
	if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
	return `${(n / 1_000_000).toFixed(1)}M`;
}

export default function (pi: ExtensionAPI) {
	let redraw = () => {};
	pi.on("thinking_level_select", async () => redraw());
	pi.on("model_select", async () => redraw());
	// message_end runs before persistence. Refresh at post-persistence boundaries.
	pi.on("turn_end", async () => redraw());
	pi.on("agent_end", async () => redraw());
	pi.on("session_compact", async () => redraw());
	pi.on("session_tree", async () => redraw());
	pi.on("session_shutdown", async () => { redraw = () => {}; });

	pi.on("session_start", async (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		ctx.ui.setFooter((tui, theme, footerData) => {
			let cost = 0;
			let costDirty = true;
			let costSessionId: string | undefined;
			let costLeafId: string | null | undefined;
			redraw = () => { costDirty = true; tui.requestRender(); };
			const unsub = footerData.onBranchChange(redraw);

			return {
				dispose: unsub,
				invalidate() { costDirty = true; },
				render(width: number): string[] {
					// Appends move the leaf, including usage saved outside normal turns.
					// Checking IDs avoids copying/scanning all entries on every render frame.
					const sessionId = ctx.sessionManager.getSessionId();
					const leafId = ctx.sessionManager.getLeafId();
					if (costDirty || sessionId !== costSessionId || leafId !== costLeafId) {
						cost = 0;
						for (const e of ctx.sessionManager.getEntries()) cost += entryCost(e);
						costSessionId = sessionId;
						costLeafId = leafId;
						costDirty = false;
					}

					const contextUsage = ctx.getContextUsage();
					const used = contextUsage?.tokens;
					const contextWindow = contextUsage?.contextWindow ?? ctx.model?.contextWindow ?? 0;
					// Pi reports null after compaction; don't turn "unknown" into a reassuring green 0%.
					const pctUsed = contextUsage?.percent;
					const known = pctUsed != null && Number.isFinite(pctUsed);
					const pct = known ? Math.min(100, Math.max(0, pctUsed)) : 0;
					const barColor = pct >= 80 ? "error" : pct >= 50 ? "warning" : "success";
					const bar = (size: number) => {
						const filled = Math.round((pct / 100) * size);
						return (known ? theme.fg(barColor, "█".repeat(filled)) : "") + theme.fg("dim", "░".repeat(size - filled));
					};

					const branch = footerData.getGitBranch();
					const branchSeg = theme.fg("mdLink", branch ? `⎇ ${branch}` : "no git");
					// The thinking level only means something for models that can think
					const thinking = ctx.model?.reasoning ? theme.fg("muted", ` · ${pi.getThinkingLevel()}`) : "";
					const modelSeg = theme.fg("accent", `${ctx.model?.provider ?? "?"}/${ctx.model?.id ?? "none"}`);
					const contextSeg = (barSize: number) =>
						(barSize ? theme.fg("muted", "[") + bar(barSize) + theme.fg("muted", "] ") : "") +
						theme.fg("mdCode", `${used == null ? "?" : fmtTokens(used)}/${fmtTokens(contextWindow)}`) + " " +
						theme.fg(known ? barColor : "muted", `(${known ? pct.toFixed(0) : "?"}%)`);
					const costSeg = theme.fg("success", `$${cost.toFixed(3)}`);
					const sep = theme.fg("dim", " │ ");
					const line = layoutFooter({ width, branch: branchSeg, model: modelSeg,
						compactModel: theme.fg("accent", ctx.model?.id ?? "none"), thinking, context: contextSeg,
						cost: costSeg, sep, visibleWidth, truncateToWidth });
					const statuses = [...footerData.getExtensionStatuses().entries()].sort(([a], [b]) => a.localeCompare(b))
						.map(([, text]) => text.replace(/[\r\n\t\x00-\x1f\x7f]/g, " ").trim()).filter(Boolean);
					return [truncateToWidth(line, width), ...(statuses.length ? [truncateToWidth(statuses.join(" "), width)] : [])];
				},
			};
		});
	});
}
