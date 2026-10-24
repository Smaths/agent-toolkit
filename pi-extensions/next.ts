import type { ExtensionAPI, SessionEntry } from "@earendil-works/pi-coding-agent";

/** Manual, review-first handoff. No context watcher or automatic worker launch. */
const START = "<<<NEXT_HANDOFF>>>";
const END = "<<<END_NEXT_HANDOFF>>>";

type Request = { sessionFile: string; startTipId: string | undefined };
type Proposal = { sessionFile: string; tipId: string; prompt: string };

function lastAssistantTextAfter(branch: SessionEntry[], startTipId: string | undefined): string {
	const start = startTipId === undefined ? -1 : branch.findIndex((entry) => entry.id === startTipId);
	if (startTipId !== undefined && start < 0) return "";
	for (let i = branch.length - 1; i > start; i--) {
		const entry = branch[i];
		if (entry.type !== "message" || entry.message.role !== "assistant") continue;
		return entry.message.content
			.filter((part): part is { type: "text"; text: string } => part.type === "text")
			.map((part) => part.text)
			.join("\n");
	}
	return "";
}

function extractHandoff(text: string): string | undefined {
	const start = text.indexOf(START);
	const end = text.indexOf(END);
	if (start < 0 || end < start || text.indexOf(START, start + START.length) >= 0 || text.indexOf(END, end + END.length) >= 0) {
		return undefined;
	}
	const prompt = text.slice(start + START.length, end).trim();
	return prompt || undefined;
}

function planningPrompt(parallel: boolean, revision?: string): string {
	return [
		"Plan the next session handoff; do not implement, edit files, launch agents, or switch sessions yet.",
		"Think in THIS session: review our goal and decisions, repository instructions, current workspace changes, and relevant code/tests or plan. Preserve existing work.",
		"Propose the next bounded task that a fresh session can implement and verify. Explain why it is next, its dependencies, acceptance checks, and any blockers. Ask for a decision instead if no task is ready.",
		parallel
			? "Also consider up to three genuinely independent tasks. Explain dependencies, non-overlapping write ownership, verification, and risk-appropriate agent tiers only when known. Do not launch workers; select just ONE next task for the handoff."
			: "Prefer one task; don't manufacture parallel work or require a full swarm plan.",
		revision ? `User's requested revision: ${revision}` : "",
		"Show your proposal for the user to review. If a task is ready, finish with exactly one self-contained assignment between these marker lines:",
		START,
		"[The approved-on-review assignment for the fresh session: objective, decisions, constraints, relevant paths, current changes to preserve, first steps, checks, stopping conditions, and any approvals still required. Include the workspace location. The receiver cannot see this conversation. Do not include secrets or claim tests were run if they weren't.]",
		END,
		"Do not put those markers anywhere else in your reply. If blocked on a user decision, omit both markers and explain the question instead.",
		"Tell the user to run /next approve to hand off, or /next revise <feedback> to reconsider. Nothing is transferred until approval.",
	].filter(Boolean).join("\n\n");
}

export default function (pi: ExtensionAPI) {
	let awaiting: Request | undefined;
	let pending: Proposal | undefined;

	pi.on("session_start", () => {
		awaiting = undefined;
		pending = undefined;
	});

	pi.on("agent_settled", (event, ctx) => {
		const sessionFile = ctx.sessionManager.getSessionFile();
		const branch = ctx.sessionManager.getBranch();
		const tipId = branch.at(-1)?.id;
		if (sessionFile && awaiting?.sessionFile === sessionFile) {
			const request = awaiting;
			awaiting = undefined;
			const prompt = event.aborted ? undefined : extractHandoff(lastAssistantTextAfter(branch, request.startTipId));
			if (prompt && tipId) {
				pending = { sessionFile, tipId, prompt };
				ctx.ui.notify("Proposal ready: review it, then /next approve or /next revise <feedback>.", "info");
			} else {
				pending = undefined;
				ctx.ui.notify("No ready handoff found. Resolve the blocker or run /next again.", "warning");
			}
		} else if (pending && (pending.sessionFile !== sessionFile || pending.tipId !== tipId)) {
			pending = undefined;
		}
	});

	pi.registerCommand("next", {
		description: "Plan the next chunk here; on approval, start it in a fresh session",
		handler: async (args, ctx) => {
			if (ctx.mode !== "tui") {
				ctx.ui.notify("/next requires an interactive Pi session", "error");
				return;
			}
			const source = ctx.sessionManager.getSessionFile();
			if (!source) {
				ctx.ui.notify("/next needs a saved session (not --no-session)", "error");
				return;
			}
			if (!ctx.isIdle() || ctx.hasPendingMessages() || awaiting) {
				ctx.ui.notify("Wait for the current agent turn to finish before using /next", "warning");
				return;
			}

			const input = args.trim();
			if (input === "approve") {
				if (!pending || pending.sessionFile !== source || pending.tipId !== ctx.sessionManager.getBranch().at(-1)?.id) {
					ctx.ui.notify("Proposal is missing or stale; run /next to plan again", "warning");
					return;
				}
				const assignment = pending.prompt;
				// Do not carry source-session objects across replacement. The callback receives
				// a fresh session-bound context, including sendUserMessage().
				const result = await ctx.newSession({
					parentSession: source,
					withSession: async (replacement) => {
						await replacement.sendUserMessage(
							"This is the approved task from the previous session. Read project instructions and verify the workspace/current changes first. " +
								"Execute only the bounded task below, run its checks, and report results. Stop and ask if the workspace, inputs, or required approvals do not match. " +
								"Do not launch other agents unless explicitly authorized.\n\n" + assignment,
						);
					},
				});
				if (!result.cancelled) pending = undefined;
				return;
			}
			if (input !== "" && input !== "parallel" && !input.startsWith("revise ")) {
				ctx.ui.notify("Usage: /next [parallel | revise <feedback> | approve]", "warning");
				return;
			}
			if (input.startsWith("revise ") && !pending) {
				ctx.ui.notify("No proposal to revise; use /next first", "warning");
				return;
			}
			const revision = input.startsWith("revise ") ? input.slice("revise ".length).trim() : undefined;
			if (input.startsWith("revise ") && !revision) {
				ctx.ui.notify("Provide feedback after /next revise", "warning");
				return;
			}
			pending = undefined;
			awaiting = { sessionFile: source, startTipId: ctx.sessionManager.getBranch().at(-1)?.id };
			try {
				pi.sendUserMessage(planningPrompt(input === "parallel", revision));
			} catch (error) {
				awaiting = undefined;
				throw error;
			}
		},
	});
}
