import type { ExtensionAPI, SessionEntry } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const BAR_WIDTH = 20;
const MIN_BAR_WIDTH = 5;

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

	pi.on("session_start", async (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		ctx.ui.setFooter((tui, theme, footerData) => {
			redraw = () => tui.requestRender();
			let cost = 0;
			let costDirty = true;
			const unsub = footerData.onBranchChange(() => { costDirty = true; tui.requestRender(); });

			return {
				dispose: unsub,
				invalidate() {},
				render(width: number): string[] {
					if (costDirty) {
						cost = 0;
						for (const e of ctx.sessionManager.getEntries()) cost += entryCost(e);
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
					const modelSeg = theme.fg("accent", `${ctx.model?.provider ?? "?"}/${ctx.model?.id ?? "none"}`) + thinking;
					const contextSeg = (barSize: number) =>
						theme.fg("muted", "CTX: [") + bar(barSize) + theme.fg("muted", "] ") +
						theme.fg("mdCode", `${used == null ? "?" : fmtTokens(used)}/${fmtTokens(contextWindow)}`) +
						theme.fg(known ? barColor : "muted", ` (${known ? pct.toFixed(0) : "?"}%)`);
					const costSeg = theme.fg("success", `$${cost.toFixed(3)}`);
					const sep = theme.fg("dim", " │ ");
					// Reserve space for context and cost first. Omit branch, then model, before hiding the gauge.
					let barSize = BAR_WIDTH;
					const essentials = (size: number) => `${contextSeg(size)}${sep}${costSeg}`;
					barSize = Math.max(MIN_BAR_WIDTH, BAR_WIDTH - Math.max(0, visibleWidth(essentials(BAR_WIDTH)) - width));
					let line = essentials(barSize);
					if (visibleWidth(`${branchSeg}${sep}${modelSeg}${sep}${line}`) <= width) line = `${branchSeg}${sep}${modelSeg}${sep}${line}`;
					else if (visibleWidth(`${modelSeg}${sep}${line}`) <= width) line = `${modelSeg}${sep}${line}`;
					const statuses = [...footerData.getExtensionStatuses().entries()].sort(([a], [b]) => a.localeCompare(b))
						.map(([, text]) => text.replace(/[\r\n\t\x00-\x1f\x7f]/g, " ").trim()).filter(Boolean);
					return [truncateToWidth(line, width), ...(statuses.length ? [truncateToWidth(statuses.join(" "), width)] : [])];
				},
			};
		});
	});
}
