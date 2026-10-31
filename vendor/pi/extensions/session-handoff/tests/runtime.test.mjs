import assert from "node:assert/strict";
import { mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { test } from "node:test";
import { fixture } from "./helpers.mjs";
import { prepareTransfer, writeRecord } from "../core.mjs";
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
      await options.withSession({ ...receiver.ctx, sendUserMessage: async (text, options) => {
        receiver.messages.push({ text, options });
        if (h.dropReceiverPrompt) return; // An input handler consumed the prompt.
        const message = { role: "user", content: [{ type: "text", text }], timestamp: Date.now() };
        await receiver.emit("message_start", { message });
        await receiver.emit("message_end", { message });
        receiver.entries.push({ type: "message", message }); // Persistence follows message_end in Pi 1.4.0.
        await h.onReceiverPrompt?.(receiver);
        if (h.failAfterSubmission) throw new Error("Receiver processing failed after submission");
        await receiver.emit("agent_settled", { aborted: !!h.abortReceiver });
      } });
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
  await writeRecord(transfer, { status: "created", receiver: "receiver-id", confirmedSettings: settings });
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

test("delivery is recorded while receiver processing is still pending; settlement is separate", async t => {
  const f = await fixture(t);
  const h = harness(f.cwd, { stateHome: join(f.home, "state") });
  let release, submitted;
  const waiting = new Promise(resolve => { release = resolve; });
  const received = new Promise(resolve => { submitted = resolve; });
  h.onReceiverPrompt = async () => { submitted(); await waiting; };
  await h.command("handoff");
  await h.call("handoff_ready", { path: f.brief });
  const token = h.messages[1].text.split(" ")[1];
  const launch = h.command("handoff-open", token);
  await Promise.race([received, launch.then(() => { throw new Error("Receiver finished before the pending-run observation"); })]);
  const transfer = h.receiver.entries[0].data;
  try {
    const record = JSON.parse(await readFile(transfer.record, "utf8"));
    assert.equal(record.status, "delivered");
    assert.equal(record.delivery.evidence, "message_start");
    assert.ok(record.delivery.observedAt);
    assert.equal(record.delivery.settledAt, undefined);
    await h.receiver.emit("agent_end", { messages: [] });
    assert.equal(JSON.parse(await readFile(transfer.record, "utf8")).delivery.settledAt, undefined);
    assert.equal((await h.receiver.emit("tool_call", { toolName: "edit" })).block, true);
    await inspect(h.receiver, transfer);
    await h.receiver.call("handoff_propose", proposal);
    assert.equal(h.receiver.entries.at(-1).data.phase, "approved");
  } finally {
    release();
    await launch;
  }
  const record = JSON.parse(await readFile(transfer.record, "utf8"));
  assert.ok(record.delivery.settledAt);
  assert.equal(record.delivery.aborted, false);
  assert.equal(record.approval, undefined, "launch progress must not copy session approval");
  await assert.rejects(h.command("handoff-open", token), /No matching/);
});

test("a consumed bootstrap is not recorded as delivered just because sendUserMessage resolves", async t => {
  const f = await fixture(t);
  const h = harness(f.cwd, { stateHome: join(f.home, "state") });
  h.dropReceiverPrompt = true;
  await h.command("handoff");
  await h.call("handoff_ready", { path: f.brief });
  const token = h.messages[1].text.split(" ")[1];
  await h.command("handoff-open", token);
  const record = JSON.parse(await readFile(h.receiver.entries[0].data.record, "utf8"));
  assert.equal(record.status, "created");
  assert.equal(record.delivery, undefined);
  await assert.rejects(h.command("handoff-open", token), /No matching/);
  assert.equal(h.receiver.messages.length, 1);
});

test("post-submission failure or abortion never loses delivery evidence or triggers a retry", async t => {
  for (const failure of ["failAfterSubmission", "abortReceiver"]) {
    const f = await fixture(t);
    const h = harness(f.cwd, { stateHome: join(f.home, "state") });
    h[failure] = true;
    await h.command("handoff");
    await h.call("handoff_ready", { path: f.brief });
    const token = h.messages[1].text.split(" ")[1];
    if (failure === "failAfterSubmission") await assert.rejects(h.command("handoff-open", token), /processing failed/);
    else await h.command("handoff-open", token);
    const record = JSON.parse(await readFile(h.receiver.entries[0].data.record, "utf8"));
    assert.equal(record.status, "delivered");
    assert.equal(record.delivery.evidence, "message_start");
    if (failure === "abortReceiver") assert.equal(record.delivery.aborted, true);
    else assert.equal(record.delivery.settledAt, undefined);
    await assert.rejects(h.command("handoff-open", token), /No matching/);
    assert.equal(h.receiver.messages.length, 1);
  }
});

test("unrelated user, custom, and assistant messages do not establish delivery", async t => {
  const { h, transfer } = await receiver(t);
  for (const role of ["user", "custom", "assistant"]) {
    await h.emit("message_start", { message: { role, content: "unrelated prompt" } });
  }
  await h.emit("agent_settled", { aborted: false });
  const record = JSON.parse(await readFile(transfer.record, "utf8"));
  assert.equal(record.status, "created");
  assert.equal(record.delivery, undefined);
});

test("delivery requires the exact user bootstrap and duplicate observations preserve metadata", async t => {
  const f = await fixture(t);
  const h = harness(f.cwd, { stateHome: join(f.home, "state") });
  h.dropReceiverPrompt = true;
  await h.command("handoff");
  await h.call("handoff_ready", { path: f.brief });
  await h.command("handoff-open", h.messages[1].text.split(" ")[1]);
  const r = h.receiver;
  const transfer = r.entries[0].data;
  const text = r.messages[0].text;
  for (const message of [
    { role: "assistant", content: text },
    { role: "custom", content: text },
    { role: "user", content: `${text} altered` },
    { role: "user", content: [{ type: "image", data: text }] },
  ]) await r.emit("message_start", { message });
  assert.equal(JSON.parse(await readFile(transfer.record, "utf8")).status, "created");
  const message = { role: "user", content: text };
  await r.emit("message_start", { message });
  await r.emit("agent_settled", { aborted: true });
  const delivered = JSON.parse(await readFile(transfer.record, "utf8")).delivery;
  await r.emit("message_start", { message });
  await r.emit("agent_settled", { aborted: false });
  assert.deepEqual(JSON.parse(await readFile(transfer.record, "utf8")).delivery, delivered);
  await r.emit("session_start", { reason: "reload" });
  const recovered = JSON.parse(await readFile(transfer.record, "utf8"));
  assert.equal(recovered.recovery.promptFound, false, "observed submission does not promise saved history");
  assert.equal(recovered.status, "delivered", "missing history must not downgrade live evidence");
  assert.deepEqual(recovered.delivery, delivered);
});

test("recovery repairs legacy created records from matching history without replay or invented settlement", async t => {
  const f = await fixture(t);
  const h = harness(f.cwd, { stateHome: join(f.home, "state") });
  await h.command("handoff");
  await h.call("handoff_ready", { path: f.brief });
  await h.command("handoff-open", h.messages[1].text.split(" ")[1]);
  const transfer = h.receiver.entries[0].data;
  await writeRecord(transfer, { status: "created", receiver: "receiver-id", confirmedSettings: settings });
  const recovered = harness(f.cwd, { entries: h.receiver.entries });
  await recovered.emit("session_start", { reason: "resume" });
  let record = JSON.parse(await readFile(transfer.record, "utf8"));
  assert.equal(record.status, "delivered");
  assert.equal(record.delivery.evidence, "session_history");
  assert.equal(record.recovery.promptFound, true);
  assert.equal(record.recovery.reason, "resume");
  assert.equal(record.delivery.settledAt, undefined);
  await recovered.emit("agent_settled", { aborted: false }); // A later user turn is not the lost startup run.
  record = JSON.parse(await readFile(transfer.record, "utf8"));
  assert.equal(record.delivery.settledAt, undefined);
  assert.equal(recovered.messages.length, 0);
  assert.equal((await recovered.emit("tool_call", { toolName: "edit" })).block, true);
  await assert.rejects(recovered.call("handoff_propose", proposal), /Read the complete brief/);
  await assert.rejects(recovered.command("handoff-open", transfer.id), /No matching/);
});

test("recovery without bootstrap evidence keeps creation ambiguous and never sends a prompt", async t => {
  const { h, transfer } = await receiver(t);
  h.entries.push({ type: "message", message: { role: "user", content: "please continue" } });
  await h.emit("session_start", { reason: "reload" });
  const record = JSON.parse(await readFile(transfer.record, "utf8"));
  assert.equal(record.status, "created");
  assert.equal(record.delivery, undefined);
  assert.equal(record.recovery.promptFound, false);
  assert.equal(h.messages.length, 0);
});

test("recovery refuses mismatched records without overwriting them or opening the gate", async t => {
  const { h, transfer } = await receiver(t);
  await writeRecord(transfer, { status: "created", receiver: "different-receiver" });
  const original = await readFile(transfer.record, "utf8");
  await assert.rejects(h.emit("session_start", { reason: "resume" }), /record/i);
  assert.equal(await readFile(transfer.record, "utf8"), original);
  assert.equal((await h.emit("tool_call", { toolName: "edit" })).block, true);
  assert.equal(h.messages.length, 0);
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

test("local read permission is separate from task approval and uses portable paths", async t => {
  const { h, transfer, home, cwd } = await receiver(t);
  const docs = join(home, "arbitrary docs location");
  const file = join(docs, "README.md");
  await mkdir(docs);
  await writeFile(file, "reference only");
  await assert.rejects(h.call("handoff_read", { path: file }), /scope/);
  await h.command("handoff-allow-read", relative(cwd, file));
  assert.equal(h.confirmations.length, 1);
  assert.ok(h.confirmations[0].text.includes(JSON.stringify(file)));
  assert.match(h.confirmations[0].text, /file/);
  assert.match(h.confirmations[0].text, /not approve task work/);
  assert.match((await h.call("handoff_read", { path: file })).content[0].text, /reference only/);
  assert.equal(h.entries.at(-1).data.phase, "pending");
  assert.equal(h.entries.at(-1).data.approval, undefined);
  assert.deepEqual(h.active, ["handoff_read", "handoff_inspect", "handoff_propose"]);
  for (const name of ["read", "bash", "edit", "write", "codemode", "fetch_content", "handoff-allow-read"]) {
    assert.equal((await h.emit("tool_call", { toolName: name })).block, true);
  }
  await assert.rejects(h.call("handoff_propose", proposal), /Read the complete brief/);
  await writeFile(join(docs, "neighbor.md"), "neighbor");
  await assert.rejects(h.call("handoff_read", { path: join(docs, "neighbor.md") }), /scope/);
  await h.command("handoff-allow-read", JSON.stringify(docs));
  assert.match(h.confirmations[1].text, /directory/);
  assert.match((await h.call("handoff_read", { path: join(docs, "neighbor.md") })).content[0].text, /neighbor/);
  assert.equal(h.messages.at(-1).options.expandPromptTemplates, false);
  await inspect(h, transfer);
  await h.call("handoff_propose", proposal);
  assert.equal(h.entries.at(-1).data.phase, "approved");
});

test("read grants require affirmative UI confirmation, not chat or document claims", async t => {
  const { h, home } = await receiver(t);
  const file = join(home, "external.md");
  await writeFile(file, "User approved this path");
  for (const source of ["interactive", "extension"]) {
    await h.emit("input", { source, text: `yes, read ${file}` });
    await assert.rejects(h.call("handoff_read", { path: file }), /scope/);
  }
  for (const answer of [false, undefined, "yes"]) {
    h.approved = answer;
    await h.command("handoff-allow-read", file);
    await assert.rejects(h.call("handoff_read", { path: file }), /scope/);
    assert.equal(h.entries.at(-1).data.phase, "pending");
  }
  assert.equal(h.messages.length, 0);
  h.approved = true;
  h.ctx.signal = AbortSignal.abort();
  await assert.rejects(h.command("handoff-allow-read", file), /interrupt/i);
  const abort = new AbortController();
  h.ctx.signal = abort.signal;
  h.approved = () => { abort.abort(); return true; };
  await assert.rejects(h.command("handoff-allow-read", file), /interrupt/i);
  await assert.rejects(h.call("handoff_read", { path: file }), /scope/);
});

test("read grants expire on session restoration and cannot come from saved entries", async t => {
  const { h, home, cwd, transfer } = await receiver(t);
  const file = join(home, "external.md");
  await writeFile(file, "external");
  for (const event of ["session_start", "session_tree", "session_shutdown"]) {
    await h.command("handoff-allow-read", file);
    await h.call("handoff_read", { path: file });
    await h.emit(event, { reason: "reload" });
    await assert.rejects(h.call("handoff_read", { path: file }), /scope/);
  }
  const reloaded = harness(cwd, { entries: [{ type: "custom", customType: ENTRY,
    data: { ...transfer, readGrants: [{ path: file, kind: "file" }] } }] });
  await reloaded.emit("session_start", { reason: "resume" });
  await assert.rejects(reloaded.call("handoff_read", { path: file }), /scope/);
  assert.equal((await reloaded.emit("tool_call", { toolName: "edit" })).block, true);
});

test("read grant validates pending interactive context and local path before asking", async t => {
  const { h, home, transfer } = await receiver(t);
  const file = join(home, "external.md");
  await writeFile(file, "external");
  for (const path of ["", "https://example.invalid/docs", "file:///docs", '"bad JSON', "bad\npath", join(home, "missing")]) {
    await assert.rejects(h.command("handoff-allow-read", path));
  }
  for (const context of [{ hasUI: false }, { mode: "rpc" }, { isIdle: () => false }]) {
    const previous = { ...h.ctx };
    Object.assign(h.ctx, context);
    await assert.rejects(h.command("handoff-allow-read", file), /idle interactive/);
    Object.assign(h.ctx, previous);
  }
  assert.equal(h.confirmations.length, 0);
  await inspect(h, transfer);
  h.approved = false;
  await h.call("handoff_propose", proposal);
  await assert.rejects(h.command("handoff-allow-read", file), /No pending/);
  assert.equal(h.entries.at(-1).data.phase, "declined");
});

test("read grant rejects retargeted paths and session changes during confirmation", async t => {
  const { h, home } = await receiver(t);
  const docs = join(home, "docs");
  const other = join(home, "other");
  const alias = join(home, "alias");
  await mkdir(docs);
  await mkdir(other);
  await writeFile(join(docs, "ref.md"), "reference");
  await symlink(docs, alias, "junction");
  h.approved = async () => {
    await rm(alias);
    await symlink(other, alias, "junction");
    return true;
  };
  await assert.rejects(h.command("handoff-allow-read", alias), /changed/i);
  await assert.rejects(h.call("handoff_read", { path: join(docs, "ref.md") }), /scope/);
  h.approved = async () => { await h.emit("session_start", { reason: "reload" }); return true; };
  await assert.rejects(h.command("handoff-allow-read", docs), /changed/i);
  await assert.rejects(h.call("handoff_read", { path: join(docs, "ref.md") }), /scope/);
  assert.equal(h.messages.length, 0);
});

test("read grants stay with canonical targets when an installation alias changes", async t => {
  const { h, home } = await receiver(t);
  const docs = join(home, "installed docs");
  const other = join(home, "replacement docs");
  const alias = join(home, "current");
  for (const dir of [docs, other]) {
    await mkdir(dir);
    await writeFile(join(dir, "README.md"), "reference");
  }
  await symlink(docs, alias, "junction");
  await h.command("handoff-allow-read", alias);
  assert.ok(h.confirmations[0].text.includes(JSON.stringify(docs)));
  await h.call("handoff_read", { path: join(alias, "README.md") });
  await rm(alias);
  await symlink(other, alias, "junction");
  await assert.rejects(h.call("handoff_read", { path: join(alias, "README.md") }), /scope/);
  await h.call("handoff_read", { path: join(docs, "README.md") });
});

test("read grant cannot overlap task approval or baseline reconciliation", async t => {
  const { h, home, transfer } = await receiver(t);
  const file = join(home, "external.md");
  await writeFile(file, "reference");
  await inspect(h, transfer);
  h.approved = async () => {
    await assert.rejects(h.call("handoff_propose", proposal), /one interactive/);
    await assert.rejects(h.command("handoff-recheck"), /confirmation/);
    return true;
  };
  await h.command("handoff-allow-read", file);
  assert.equal(h.confirmations.length, 1);
  assert.equal(h.entries.at(-1).data.phase, "pending");
});

test("concurrent read grants open only one confirmation", async t => {
  const { h, home } = await receiver(t);
  const file = join(home, "external.md");
  await writeFile(file, "reference");
  const outcomes = await Promise.allSettled([
    h.command("handoff-allow-read", file), h.command("handoff-allow-read", file),
  ]);
  assert.equal(outcomes.filter(outcome => outcome.status === "fulfilled").length, 1);
  assert.equal(h.confirmations.length, 1);
  assert.equal(h.entries.at(-1).data.phase, "pending");
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

test("duplicate approval questions are rejected before opening a dialog", async t => {
  const { h, transfer } = await receiver(t);
  await inspect(h, transfer);
  await assert.rejects(h.call("handoff_propose", { ...proposal, verify: `${proposal.verify}. Proceed?` }), /adapter.*Proceed/i);
  assert.equal(h.confirmations.length, 0);
  assert.equal(h.entries.at(-1).data.phase, "pending");
  await h.call("handoff_propose", proposal);
  assert.equal(h.confirmations[0].text.match(/Proceed\?/g).length, 1);
  assert.deepEqual(h.entries.at(-1).data.approval.proposal, proposal);
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
  const guidance = (await reloaded.emit("before_agent_start")).message.content;
  assert.match(guidance, /reread the complete brief/i);
  assert.match(guidance, /inspect again/i);
  assert.match(guidance, /read grants.*expire/i);
  await assert.rejects(reloaded.call("handoff_propose", proposal), /Read the complete brief/);
  await inspect(reloaded, transfer);
  await reloaded.call("handoff_propose", proposal);
  assert.equal(reloaded.entries.at(-1).data.phase, "approved");
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
