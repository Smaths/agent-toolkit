import { realpath } from "node:fs/promises";
import { captureWorkspace, prepareTransfer, proposalText, readScoped, sameState, verifyBrief, workspaceDiff, writeRecord } from "./core.mjs";

export const ENTRY = "session-handoff-v1";
const STARTUP_TOOLS = ["handoff_read", "handoff_inspect", "handoff_propose"];
const result = (value, terminate = false) => ({ content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value) }], details: undefined, ...(terminate ? { terminate: true } : {}) });
const settingsOf = (ctx, pi) => ({ provider: ctx.model?.provider, model: ctx.model?.id, reasoning: ctx.thinkingLevel ?? pi.getThinkingLevel() });
const equalSettings = (a, b) => ["provider", "model", "reasoning"].every(key => a[key] === b[key]);

export function installHandoff(pi, Type, { skillPath, stateHome } = {}) {
  let state;
  let preparing = false;
  let queued;
  let deliverySignal;
  let observed;
  let briefRead = false;
  let readLines = new Set();
  let proposalInFlight = false;

  function persist(next) {
    // Persist before widening tool access; a persistence failure leaves the gate closed.
    pi.appendEntry(ENTRY, next);
    state = next;
  }
  function restrict() {
    if (state && state.phase !== "approved") pi.setActiveTools(STARTUP_TOOLS);
  }
  function pending() {
    if (!state || state.phase !== "pending") throw new Error("No pending handoff. After declining, give a revised instruction first.");
  }
  async function validate(ctx) {
    pending();
    if (await realpath(ctx.cwd) !== state.workspace) throw new Error("Workspace differs from the handoff destination.");
    if (!equalSettings(settingsOf(ctx, pi), state.settings)) throw new Error("Provider/model/reasoning differs from the source; restore the requested settings before proceeding.");
    await verifyBrief(state);
    return captureWorkspace(ctx.cwd);
  }

  async function cancelDelivery(transfer, ctx) {
    queued = undefined;
    preparing = false;
    pi.setActiveTools(transfer.tools);
    await writeRecord(transfer, { status: "cancelled" });
    ctx.ui.notify(`Session replacement cancelled; brief saved at ${transfer.brief}`, "info");
  }

  function restore(ctx) {
    observed = undefined;
    briefRead = false;
    readLines = new Set();
    const entry = [...ctx.sessionManager.getBranch()].reverse().find(item => item.type === "custom" && item.customType === ENTRY);
    state = entry?.data;
    if (entry && (!state || state.version !== 1 || !["pending", "declined", "approved"].includes(state.phase) || !Array.isArray(state.tools) || !state.snapshot?.fingerprint || !state.settings?.model)) state = { phase: "invalid" };
    restrict();
    ctx.ui.setStatus("handoff", state && state.phase !== "approved" ? "Handoff: awaiting approval" : undefined);
  }

  pi.on("session_tree", (_event, ctx) => restore(ctx));
  pi.on("session_before_tree", () => state && state.phase !== "approved" ? { cancel: true } : undefined);
  pi.on("session_start", async (event, ctx) => {
    preparing = false;
    queued = undefined;
    deliverySignal = undefined;
    restore(ctx);
    if (event.reason === "new" && state?.phase === "pending") {
      // /new reloads configured defaults. Restore only this new receiver's exact
      // selection through session-local APIs, never global settings or aliases.
      if (ctx.model?.provider !== state.settings.provider || ctx.model?.id !== state.settings.model) {
        const model = ctx.modelRegistry.find(state.settings.provider, state.settings.model);
        if (!model || model.provider !== state.settings.provider || model.id !== state.settings.model || !await pi.setModel(model)) {
          throw new Error("Cannot restore the exact handoff model; receiver remains gated.");
        }
      }
      pi.setThinkingLevel(state.settings.reasoning);
    }
  });

  // Tool annotations and active-tool visibility are not security decisions. Block every
  // other call, including deferred tools and nested codemode/MCP calls, at execution.
  pi.on("tool_call", event => {
    if (queued) return { block: true, reason: "Transfer queued; source work is stopped." };
    if (state && state.phase !== "approved" && !STARTUP_TOOLS.includes(event.toolName)) {
      return { block: true, reason: "Handoff startup is read-only until explicit proposal approval." };
    }
  });
  pi.on("before_agent_start", () => {
    restrict();
    if (state && state.phase !== "approved") return { message: {
      customType: "handoff-gate", display: false,
      content: "Handoff approval is pending. Use handoff_read and handoff_inspect for bounded startup; follow the brief's Receiver startup. Use handoff_propose only after reading required context and reconciling discrepancies. Missing references/capabilities require a question, not a guess. Task work waits for the confirmation dialog. A declined proposal means stop until the user revises it.",
    } };
  });
  pi.on("input", event => {
    // Extension-generated text (including forged 'yes') cannot grant approval or reopen a denial.
    if (state?.phase === "declined" && event.source === "interactive") persist({ ...state, phase: "pending" });
  });
  pi.on("session_before_fork", () => state && state.phase !== "approved" ? { cancel: true } : undefined);

  pi.registerCommand("handoff", {
    description: "Prepare a reference-first brief and open a fresh, approval-gated session in this terminal",
    handler: async (goal, ctx) => {
      if (ctx.mode !== "tui" || !ctx.hasUI) throw new Error("Native handoff requires an interactive Pi terminal.");
      if ((state && state.phase !== "approved") || queued) throw new Error("A handoff is already pending.");
      if (!ctx.isIdle()) throw new Error("Wait for the current turn to finish before handing off.");
      if (!ctx.sessionManager.getSessionFile()) throw new Error("Native handoff requires a persisted source session for recovery.");
      await captureWorkspace(ctx.cwd);
      preparing = true;
      pi.setActiveTools([...new Set([...pi.getActiveTools(), "handoff_ready"])]);
      pi.sendUserMessage(`Read the session-handoff skill at ${JSON.stringify(skillPath)}. Prepare and check its reference-first brief for ${goal?.trim() || "the current task"}. This /handoff invocation authorizes only a native same-terminal, same-workspace, same-settings transfer. Save the brief, then call handoff_ready with its absolute path. Do not launch through Orca, perform substantive task work, or change settings. The adapter will record and open the fresh receiver, which must validate and ask for approval.`, { expandPromptTemplates: false });
    },
  });

  pi.registerTool({
    name: "handoff_ready", label: "Open fresh handoff session", exposure: "model-only", defaultActive: false,
    description: "Finish an explicitly requested /handoff: snapshot a checked brief and queue fresh-session replacement. Do not use for ordinary task work.",
    parameters: Type.Object({ path: Type.String() }), executionMode: "sequential",
    async execute(_id, { path }, signal, _update, ctx) {
      if (!preparing || queued || !ctx.hasUI || ctx.mode !== "tui") throw new Error("Run /handoff interactively first; no transfer is authorized.");
      if (signal?.aborted) throw new Error("Handoff cancelled before delivery.");
      const transfer = await prepareTransfer({ cwd: ctx.cwd, brief: path, settings: settingsOf(ctx, pi), sourceSession: ctx.sessionManager.getSessionFile(), tools: pi.getActiveTools().filter(name => name !== "handoff_ready"), stateHome });
      if (signal?.aborted) {
        await cancelDelivery(transfer, ctx);
        return result("Handoff cancelled; no receiver launched.", true);
      }
      deliverySignal = signal;
      queued = transfer;
      preparing = false;
      pi.sendUserMessage(`/handoff-open ${transfer.id}`, { deliverAs: "followUp", expandPromptTemplates: true });
      return result(`Brief: ${transfer.brief}\nLaunch record: ${transfer.record}\nFresh-session replacement queued. Stop source work.`, true);
    },
  });

  pi.registerCommand("handoff-open", {
    description: "Internal one-shot native handoff delivery (requires a queued transfer token)",
    handler: async (token, ctx) => {
      const transfer = queued;
      const signal = deliverySignal;
      if (!transfer || token.trim() !== transfer.id) throw new Error("No matching queued transfer; do not replay an ambiguous launch.");
      // Pi dispatches expanded commands immediately, even with deliverAs=followUp.
      // Consume before the first await, then let the initiating tool/turn finish.
      queued = { ...transfer, id: null };
      await ctx.waitForIdle();
      await verifyBrief(transfer);
      if (!sameState(transfer.snapshot, await captureWorkspace(ctx.cwd))) throw new Error("Workspace changed before delivery; prepare a new brief.");
      await writeRecord(transfer, { status: "attempted" });
      if (signal?.aborted) {
        await cancelDelivery(transfer, ctx);
        return;
      }
      const outcome = await ctx.newSession({
        parentSession: transfer.sourceSession,
        setup: async manager => { manager.appendCustomEntry(ENTRY, transfer); },
        withSession: async fresh => {
          const receiver = fresh.sessionManager.getSessionId();
          const confirmedSettings = { provider: fresh.model?.provider, model: fresh.model?.id, reasoning: fresh.thinkingLevel };
          await writeRecord(transfer, { status: "created", receiver, confirmedSettings });
          if (!equalSettings(confirmedSettings, transfer.settings)) throw new Error("Receiver settings were not preserved; no startup prompt sent.");
          // This is the replacement runtime's API, not the now-stale pi/ctx closure.
          await fresh.sendUserMessage(`Read the handoff at ${JSON.stringify(transfer.brief)} with handoff_read. Follow Receiver startup, inspect current state with handoff_inspect, and retrieve only context needed for the proposed action. Use handoff_propose to show a concise approval dialog, then wait for the user's choice. Prior approvals do not count. Source session is retained; launch record: ${transfer.record}.`, { expandPromptTemplates: false });
          await writeRecord(transfer, { status: "delivered", receiver, confirmedSettings });
        },
      });
      if (outcome.cancelled) await cancelDelivery(transfer, ctx);
    },
  });

  pi.registerTool({
    name: "handoff_read", label: "Read startup context", defaultActive: false,
    description: "Read bounded text from this repository or the saved handoff. Relative paths resolve from the workspace. External paths/URLs need user clarification. Page through required files; do not bulk-read links.",
    parameters: Type.Object({ path: Type.String(), offset: Type.Optional(Type.Integer({ minimum: 1 })), limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200 })) }),
    async execute(_id, { path, offset = 1, limit = 160 }) {
      pending();
      const read = await readScoped(state, path, offset, limit);
      if (read.path === state.brief) {
        if (read.text.length < 16000) for (let line = offset; line <= Math.min(read.totalLines, offset + limit - 1); line++) readLines.add(line);
        briefRead = readLines.size >= read.totalLines;
      }
      return result(read);
    },
  });

  pi.registerTool({
    name: "handoff_inspect", label: "Validate handoff state", defaultActive: false,
    description: "Run fixed read-only Git probes; compare branch, revision, staged/unstaged diffs and untracked content with the saved snapshot. Optionally inspect a specific file diff (staged=true for the index); no shell or task commands.",
    parameters: Type.Object({ path: Type.Optional(Type.String()), staged: Type.Optional(Type.Boolean()) }), executionMode: "sequential",
    async execute(_id, { path, staged = false }, _signal, _update, ctx) {
      observed = await validate(ctx);
      const diff = path === undefined ? undefined : await workspaceDiff(state.workspace, path, staged);
      const available = new Set(pi.getAllTools().map(tool => tool.name));
      const tools = state.tools.map(name => ({ name, registered: available.has(name) }));
      return result({ ...observed, diff, tools, matches: sameState(state.snapshot, observed), note: "Tool registration is not proof of working access. Historical test results have not been rerun. If state differs, ask the user to reconcile via /handoff-recheck before proposing work." });
    },
  });

  pi.registerCommand("handoff-recheck", {
    description: "Acknowledge workspace drift for a new read-only inspection; does not approve task work",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI || ctx.mode !== "tui" || !ctx.isIdle()) throw new Error("Recheck requires an idle interactive session.");
      if (state?.phase === "declined") persist({ ...state, phase: "pending" });
      const current = await validate(ctx);
      if (!await ctx.ui.confirm("Reconcile handoff state?", `Use current ${current.branch} at ${current.head.slice(0, 12)} (${current.status.length} status records) as the new inspection baseline? This does not approve work.`)) return;
      if (!sameState(current, await captureWorkspace(ctx.cwd))) throw new Error("State changed during reconciliation; inspect again.");
      persist({ ...state, snapshot: current });
      observed = undefined;
      pi.sendUserMessage("The user acknowledged the current workspace as the inspection baseline, not approval to work. Inspect it, read relevant context, then propose the next bounded action for fresh approval.");
    },
  });

  pi.registerTool({
    name: "handoff_propose", label: "Approve next step", exposure: "model-only", defaultActive: false,
    description: "After reading the brief, project instructions and needed references, and inspecting matching state, show four concise lines and ask Proceed? Only a human confirmation unlocks task tools. Missing context or blockers require a question instead.",
    parameters: Type.Object(Object.fromEntries(["outcome", "checked", "next", "verify"].map(key => [key, Type.String({ minLength: 1, maxLength: 240 })]))), executionMode: "sequential",
    async execute(_id, proposal, signal, _update, ctx) {
      pending();
      if (proposalInFlight || !ctx.hasUI || ctx.mode !== "tui") throw new Error("Approval requires one interactive confirmation.");
      if (!briefRead || !observed) throw new Error("Read the complete brief and inspect current state before proposing.");
      proposalInFlight = true;
      try {
        const current = await validate(ctx);
        if (!sameState(state.snapshot, current) || !sameState(observed, current)) throw new Error("State drift requires inspection/reconciliation before approval.");
        const message = proposalText(proposal);
        const approved = await ctx.ui.confirm("Continue this task?", message);
        if (approved !== true || signal?.aborted) {
          persist({ ...state, phase: "declined" });
          return result("Not approved. Stop and wait for a revised user instruction; do not ask again automatically.", true);
        }
        const after = await validate(ctx);
        if (signal?.aborted) throw new Error("Approval interrupted; no task tools unlocked.");
        if (!sameState(current, after)) throw new Error("State changed while approval was open. Approval discarded; inspect and ask again.");
        persist({ ...state, phase: "approved", approval: { at: new Date().toISOString(), proposal, fingerprint: after.fingerprint } });
        pi.setActiveTools(state.tools);
        ctx.ui.setStatus("handoff", undefined);
        return result("User approved only the displayed scope. Proceed with that action and verification; other side effects still need their own authorization.");
      } finally {
        proposalInFlight = false;
      }
    },
  });
}
