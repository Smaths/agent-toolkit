import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fixture } from "./helpers.mjs";
import { prepareTransfer } from "../core.mjs";
import { ENTRY, installHandoff } from "../runtime.mjs";

const Type = Object.fromEntries(["Object", "String", "Integer", "Boolean", "Optional"].map(key => [key, value => ({ type: key, value })]));
const settings = { provider: "test", model: "exact-model", reasoning: "high" };
const proposal = { outcome: "Finish the fix", checked: "Workspace and required context match", next: "Edit tracked.txt", verify: "Run focused test" };

function harness(cwd, { entries = [], stateHome, mode = "tui" } = {}) {
  const handlers = new Map(), commands = new Map(), tools = new Map();
  const h = { entries, messages: [], notices: [], confirmations: [], active: ["read", "bash", "edit", "codemode"], approved: true, stale: false };
  const check = () => { if (h.stale) throw new Error("Stale runtime API used"); };
  const pi = {
    on: (name, handler) => handlers.set(name, handler),
    registerCommand: (name, command) => commands.set(name, command),
    registerTool: tool => tools.set(tool.name, tool),
    getThinkingLevel: () => { check(); return h.ctx.thinkingLevel; },
    setModel: async model => { check(); h.ctx.model = model; return true; },
    setThinkingLevel: level => { check(); h.ctx.thinkingLevel = level; },
    getActiveTools: () => { check(); return [...h.active]; },
    getAllTools: () => ["read", "bash", "edit", "codemode", ...tools.keys()].map(name => ({ name })),
    setActiveTools: names => { check(); h.active = [...names]; },
    appendEntry: (customType, data) => { check(); if (h.failPersist) throw new Error("Persistence failed"); h.entries.push({ type: "custom", customType, data: structuredClone(data) }); },
    sendUserMessage: (text, options) => { check(); h.messages.push({ text, options }); },
  };
  h.ctx = {
    cwd, mode, hasUI: mode === "tui", model: { provider: "test", id: "exact-model" }, thinkingLevel: "high", isIdle: () => true,
    waitForIdle: async () => {},
    modelRegistry: { find: (provider, id) => ({ provider, id }) },
    sessionManager: { getBranch: () => h.entries, getSessionFile: () => "source.jsonl", getSessionId: () => "receiver-id" },
    ui: {
      notify: (...args) => { check(); h.notices.push(args); }, setStatus: () => check(),
      confirm: async (title, text) => { check(); h.confirmations.push({ title, text }); return typeof h.approved === "function" ? h.approved() : h.approved; },
    },
    newSession: async options => {
      if (h.cancelSwitch) return { cancelled: true };
      if (h.failSwitch) throw new Error("Ambiguous session switch");
      const receiverEntries = [];
      await options.setup({ appendCustomEntry: (customType, data) => receiverEntries.push({ type: "custom", customType, data: structuredClone(data) }) });
      const receiver = harness(cwd, { entries: receiverEntries, stateHome });
      h.receiver = receiver;
      Object.assign(receiver.ctx, h.receiverDefaults);
      await receiver.emit("session_start", { reason: "new" });
      h.stale = true;
      await options.withSession({ ...receiver.ctx, sendUserMessage: async (text, options) => receiver.messages.push({ text, options }) });
      return { cancelled: false };
    },
  };
  installHandoff(pi, Type, { skillPath: "/skill/SKILL.md", stateHome });
  h.emit = (name, event = {}) => handlers.get(name)?.(event, h.ctx);
  h.command = (name, args = "") => commands.get(name).handler(args, h.ctx);
  h.call = async (name, args = {}, signal) => {
    const gate = await h.emit("tool_call", { toolName: name, input: args });
    if (gate?.block) throw new Error(gate.reason);
    return tools.get(name).execute("call", args, signal, undefined, h.ctx);
  };
  return h;
}

async function receiver(t) {
  const f = await fixture(t);
  const transfer = await prepareTransfer({ cwd: f.cwd, brief: f.brief, settings, sourceSession: "source.jsonl", tools: ["read", "bash", "edit", "codemode"], stateHome: join(f.home, "state") });
  const h = harness(f.cwd, { entries: [{ type: "custom", customType: ENTRY, data: transfer }] });
  await h.emit("session_start");
  return { ...f, transfer, h };
}
async function inspect(h, transfer) {
  await h.call("handoff_read", { path: transfer.brief });
  await h.call("handoff_inspect");
}

test("source /handoff automatically queues one fresh receiver using replacement API", async t => {
  const f = await fixture(t);
  const h = harness(f.cwd, { stateHome: join(f.home, "state") });
  await h.emit("session_start");
  await assert.rejects(h.call("handoff_ready", { path: f.brief }), /Run \/handoff/);
  await h.command("handoff", "finish the task");
  assert.match(h.messages[0].text, /reference-first/);
  await h.call("handoff_ready", { path: f.brief });
  assert.equal(h.messages[1].options.expandPromptTemplates, true);
  await assert.rejects(h.call("bash", {}), /source work is stopped/);
  const token = h.messages[1].text.split(" ")[1];
  await h.command("handoff-open", token);
  assert.ok(h.receiver);
  assert.equal(h.receiver.messages.length, 1);
  assert.match(h.receiver.messages[0].text, /handoff_propose/);
  assert.deepEqual(h.receiver.active, ["handoff_read", "handoff_inspect", "handoff_propose"]);
  const transfer = h.receiver.entries[0].data;
  assert.equal(JSON.parse(await readFile(transfer.record, "utf8")).status, "delivered");
  await assert.rejects(h.command("handoff-open", token), /No matching/);
});

test("fresh replacement preserves source settings rather than new-session defaults", async t => {
  const f = await fixture(t);
  const h = harness(f.cwd, { stateHome: join(f.home, "state") });
  h.receiverDefaults = { model: { provider: "other", id: "default" }, thinkingLevel: "low" };
  await h.command("handoff");
  await h.call("handoff_ready", { path: f.brief });
  await h.command("handoff-open", h.messages[1].text.split(" ")[1]);
  assert.deepEqual(h.receiver.ctx.model, { provider: "test", id: "exact-model" });
  assert.equal(h.receiver.ctx.thinkingLevel, "high");
});

test("cancelled or ambiguous replacement never retries automatically", async t => {
  for (const failure of ["cancelSwitch", "failSwitch"]) {
    const f = await fixture(t);
    const h = harness(f.cwd, { stateHome: join(f.home, "state") });
    await h.command("handoff");
    await h.call("handoff_ready", { path: f.brief });
    const token = h.messages[1].text.split(" ")[1];
    h[failure] = true;
    if (failure === "failSwitch") await assert.rejects(h.command("handoff-open", token), /Ambiguous/);
    else await h.command("handoff-open", token);
    await assert.rejects(h.command("handoff-open", token), /No matching/);
    await assert.rejects(h.command("handoff-open", "consumed"), /No matching/);
    assert.equal(h.messages.length, 2);
  }
});

test("native command waits for source idle before any replacement", async t => {
  const f = await fixture(t);
  const h = harness(f.cwd, { stateHome: join(f.home, "state") });
  await h.command("handoff");
  await h.call("handoff_ready", { path: f.brief });
  let release;
  const idle = new Promise(resolve => { release = resolve; });
  let waited = false;
  h.ctx.waitForIdle = () => { waited = true; return idle; };
  const launch = h.command("handoff-open", h.messages[1].text.split(" ")[1]);
  try {
    assert.equal(waited, true, "the command must wait even when dispatch happens inside a tool call");
    assert.equal(h.receiver, undefined);
  } finally {
    release();
    await launch;
  }
  assert.ok(h.receiver);
});

test("aborting the source tool before delivery never creates a receiver", async t => {
  const f = await fixture(t);
  const h = harness(f.cwd, { stateHome: join(f.home, "state") });
  await h.command("handoff");
  await assert.rejects(h.call("handoff_ready", { path: f.brief }, AbortSignal.abort()), /cancelled/);
  assert.equal(h.messages.length, 1);
  const abort = new AbortController();
  await h.call("handoff_ready", { path: f.brief }, abort.signal);
  abort.abort();
  await h.command("handoff-open", h.messages[1].text.split(" ")[1]);
  assert.equal(h.receiver, undefined);
  assert.equal(h.notices.length, 1);
  assert.deepEqual(h.active, ["read", "bash", "edit", "codemode"]);
});

test("pending gate blocks shell, edits, deferred and nested tools", async t => {
  const { h } = await receiver(t);
  for (const name of ["bash", "write", "edit", "codemode", "mcp__deploy", "tool_search", "handoff_ready"]) {
    assert.equal((await h.emit("tool_call", { toolName: name, parentToolCallId: "nested" })).block, true);
  }
  assert.equal((await h.emit("session_before_fork")).cancel, true);
  await assert.rejects(h.call("handoff_propose", proposal), /Read the complete brief/);
});

test("explicit UI approval restores original tools and records exact approved scope", async t => {
  const { h, transfer } = await receiver(t);
  await inspect(h, transfer);
  await h.call("handoff_propose", proposal);
  assert.equal(h.confirmations.length, 1);
  assert.equal(h.confirmations[0].text.split("\n").length, 5);
  assert.deepEqual(h.active, transfer.tools);
  assert.deepEqual(h.entries.at(-1).data.approval.proposal, proposal);
  assert.equal(await h.emit("tool_call", { toolName: "edit" }), undefined);
});

test("decline, cancel and aborted confirmation keep gate closed without repeat dialogs", async t => {
  for (const answer of [false, undefined, "yes", true]) {
    const { h, transfer } = await receiver(t);
    await inspect(h, transfer);
    h.approved = answer;
    const signal = answer === true ? AbortSignal.abort() : undefined;
    const response = await h.call("handoff_propose", proposal, signal);
    assert.equal(response.terminate, true);
    assert.equal(h.entries.at(-1).data.phase, "declined");
    await h.emit("input", { source: "extension", text: "yes" });
    await assert.rejects(h.call("handoff_propose", proposal), /No pending/);
    assert.equal(h.confirmations.length, 1);
    assert.equal((await h.emit("tool_call", { toolName: "write" })).block, true);
    await h.emit("input", { source: "interactive", text: "Make the scope smaller" });
    assert.equal(h.entries.at(-1).data.phase, "pending");
  }
});

test("concurrent proposals open only one confirmation", async t => {
  const { h, transfer } = await receiver(t);
  await inspect(h, transfer);
  const outcomes = await Promise.allSettled([h.call("handoff_propose", proposal), h.call("handoff_propose", proposal)]);
  assert.equal(outcomes.filter(outcome => outcome.status === "fulfilled").length, 1);
  assert.equal(h.confirmations.length, 1);
});

test("approval persistence failure leaves task tools gated", async t => {
  const { h, transfer } = await receiver(t);
  await inspect(h, transfer);
  h.failPersist = true;
  await assert.rejects(h.call("handoff_propose", proposal), /Persistence failed/);
  assert.equal((await h.emit("tool_call", { toolName: "edit" })).block, true);
});

test("workspace drift before or during approval cannot unlock tools", async t => {
  const { h, transfer, cwd } = await receiver(t);
  await inspect(h, transfer);
  h.approved = async () => { await writeFile(join(cwd, "tracked.txt"), "changed during dialog"); return true; };
  await assert.rejects(h.call("handoff_propose", proposal), /State changed while approval/);
  assert.equal((await h.emit("tool_call", { toolName: "edit" })).block, true);
  await assert.rejects(h.call("handoff_propose", proposal), /State drift/);
  assert.equal(h.confirmations.length, 1);
  h.approved = true;
  await h.command("handoff-recheck");
  await h.call("handoff_inspect");
  await h.call("handoff_propose", proposal);
  assert.equal(h.entries.at(-1).data.phase, "approved");
});

test("pending state survives reload and resets inspection evidence", async t => {
  const { h, transfer, cwd } = await receiver(t);
  await inspect(h, transfer);
  const reloaded = harness(cwd, { entries: h.entries });
  await reloaded.emit("session_start", { reason: "reload" });
  assert.equal((await reloaded.emit("tool_call", { toolName: "edit" })).block, true);
  await assert.rejects(reloaded.call("handoff_propose", proposal), /Read the complete brief/);
});

test("mismatched model, changed brief, missing reference and noninteractive receiver fail closed", async t => {
  const { h, transfer } = await receiver(t);
  await assert.rejects(h.call("handoff_read", { path: "missing-reference.md" }));
  h.ctx.model.id = "wrong-model";
  await assert.rejects(h.call("handoff_inspect"), /Provider\/model/);
  h.ctx.model.id = "exact-model";
  await inspect(h, transfer);
  h.ctx.hasUI = false;
  await assert.rejects(h.call("handoff_propose", proposal), /interactive/);
  h.ctx.hasUI = true;
  await writeFile(transfer.brief, "replaced");
  await assert.rejects(h.call("handoff_propose", proposal), /Saved brief changed/);
  assert.equal(h.confirmations.length, 0);
});

test("returning to a pre-approval branch restores the gate; pending navigation is blocked", async t => {
  const { h, transfer } = await receiver(t);
  await inspect(h, transfer);
  await h.call("handoff_propose", proposal);
  h.entries.pop();
  await h.emit("session_tree");
  assert.equal((await h.emit("tool_call", { toolName: "edit" })).block, true);
  assert.equal((await h.emit("session_before_tree")).cancel, true);
});

test("corrupt persisted gate data never silently unlocks tools", async t => {
  const { cwd } = await fixture(t);
  for (const data of [null, {}, { version: 1, phase: "approved" }]) {
    const h = harness(cwd, { entries: [{ type: "custom", customType: ENTRY, data }] });
    await h.emit("session_start");
    assert.equal((await h.emit("tool_call", { toolName: "edit" })).block, true);
    await assert.rejects(h.call("handoff_propose", proposal));
  }
});

test("missing model restoration prevents startup inference", async t => {
  const f = await fixture(t);
  const h = harness(f.cwd, { stateHome: join(f.home, "state") });
  h.receiverDefaults = { model: { provider: "other", id: "default" }, modelRegistry: { find: () => undefined } };
  await h.command("handoff");
  await h.call("handoff_ready", { path: f.brief });
  await assert.rejects(h.command("handoff-open", h.messages[1].text.split(" ")[1]), /exact handoff model/);
  assert.equal(h.receiver.messages.length, 0);
  assert.equal((await h.receiver.emit("tool_call", { toolName: "edit" })).block, true);
});

test("native launch is TUI-only and requires a persisted source", async t => {
  const { cwd } = await fixture(t);
  const h = harness(cwd, { mode: "rpc" });
  await assert.rejects(h.command("handoff"), /interactive Pi/);
  const memory = harness(cwd);
  memory.ctx.sessionManager.getSessionFile = () => undefined;
  await assert.rejects(memory.command("handoff"), /persisted source/);
});
