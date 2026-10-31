import assert from "node:assert/strict";
import { readFile, writeFile, symlink, stat } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fixture } from "./helpers.mjs";
import { captureWorkspace, readScoped, prepareTransfer, writeRecord, sameState, proposalText, workspaceDiff } from "../core.mjs";


test("snapshot detects staged, unstaged and untracked content drift", async t => {
  const { cwd, git } = await fixture(t);
  const original = await captureWorkspace(cwd);
  await writeFile(join(cwd, "tracked.txt"), "changed\n");
  const dirty = await captureWorkspace(cwd);
  assert.equal(sameState(original, dirty), false);
  git("add", ".");
  const staged = await captureWorkspace(cwd);
  assert.equal(sameState(dirty, staged), false);
  await writeFile(join(cwd, "new.txt"), "one");
  const untracked = await captureWorkspace(cwd);
  await writeFile(join(cwd, "new.txt"), "two");
  assert.equal(sameState(untracked, await captureWorkspace(cwd)), false);
  assert.equal(sameState(staged, staged), true);
});

test("snapshot refuses non-Git projects and oversized untracked input", async t => {
  const { cwd, home } = await fixture(t);
  await assert.rejects(captureWorkspace(home), /Git/);
  await writeFile(join(cwd, "large"), Buffer.alloc(2 * 1024 * 1024 + 1));
  await assert.rejects(captureWorkspace(cwd), /limit/i);
});

test("snapshot disables repository diff and fsmonitor execution", async t => {
  const { cwd, home, git } = await fixture(t);
  const hook = join(home, "probe-hook.sh");
  await writeFile(hook, '#!/bin/sh\nprintf ran > "$0.ran"\n', { mode: 0o700 });
  git("config", "core.fsmonitor", hook);
  git("config", "diff.external", hook);
  await writeFile(join(cwd, "tracked.txt"), "changed\n");
  assert.ok((await captureWorkspace(cwd)).fingerprint);
  await assert.rejects(readFile(`${hook}.ran`), { code: "ENOENT" });
});

test("reader resolves workspace paths, pages text and rejects escape/symlink/device", async t => {
  const { cwd, home, brief } = await fixture(t);
  const scope = { workspace: cwd, brief };
  assert.match((await readScoped(scope, "tracked.txt")).text, /original/);
  assert.match((await readScoped(scope, brief)).text, /Handoff/);
  await writeFile(join(cwd, "lines"), "a\nb\nc\n");
  assert.equal((await readScoped(scope, "lines", 2, 1)).text, "b");
  await assert.rejects(readScoped(scope, "../brief.md.bak"));
  await writeFile(join(home, "outside"), "private");
  await symlink(join(home, "outside"), join(cwd, "link"));
  await assert.rejects(readScoped(scope, "link"), /scope/);
  await assert.rejects(readScoped(scope, cwd), /regular/);
  await assert.rejects(readScoped(scope, "lines", 0, 1), /range/i);
});

test("transfer copies brief privately outside repository and records exact settings", async t => {
  const { cwd, home, brief } = await fixture(t);
  const settings = { provider: "test", model: "exact-model", reasoning: "high" };
  const transfer = await prepareTransfer({ cwd, brief, settings, sourceSession: "source", tools: ["read", "bash"], stateHome: join(home, "state") });
  assert.match(await readFile(transfer.brief, "utf8"), /Handoff/);
  assert.deepEqual(transfer.settings, settings);
  if (process.platform !== "win32") {
    assert.equal((await stat(transfer.brief)).mode & 0o777, 0o600);
    assert.equal((await stat(transfer.directory)).mode & 0o777, 0o700);
  }
  await writeRecord(transfer, { status: "attempted" });
  assert.equal(JSON.parse(await readFile(transfer.record, "utf8")).status, "attempted");
  await writeRecord(transfer, { status: "delivered", receiver: "new-session" });
  assert.equal(JSON.parse(await readFile(transfer.record, "utf8")).receiver, "new-session");
});

test("transfer rejects missing settings and state directory inside workspace", async t => {
  const { cwd, brief } = await fixture(t);
  await assert.rejects(prepareTransfer({ cwd, brief, settings: {}, tools: [] }), /settings/i);
  await assert.rejects(prepareTransfer({ cwd, brief, settings: { provider: "p", model: "m", reasoning: "off" }, tools: [], stateHome: join(cwd, "state") }), /outside/);
});

test("file diffs distinguish index from working tree and treat pathspecs literally", async t => {
  const { cwd, git } = await fixture(t);
  await writeFile(join(cwd, "tracked.txt"), "staged version\n");
  git("add", "tracked.txt");
  await writeFile(join(cwd, "tracked.txt"), "working version\n");
  assert.match((await workspaceDiff(cwd, "tracked.txt", true)).text, /\+staged version/);
  assert.match((await workspaceDiff(cwd, "tracked.txt")).text, /\+working version/);
  assert.equal((await workspaceDiff(cwd, ":(glob)*")).text, "");
  await assert.rejects(workspaceDiff(cwd, "../outside"), /specific path/);
  await assert.rejects(workspaceDiff(cwd, "."), /specific path/);
});

test("startup reader rejects binary content and storage symlinks into the workspace", async t => {
  const { cwd, home, brief } = await fixture(t);
  await writeFile(join(cwd, "binary"), Buffer.from([1, 0, 2]));
  await assert.rejects(readScoped({ workspace: cwd, brief }, "binary"), /text files/);
  await symlink(cwd, join(home, "state-link"));
  await assert.rejects(prepareTransfer({ cwd, brief, settings: { provider: "p", model: "m", reasoning: "high" }, tools: [], stateHome: join(home, "state-link") }), /outside/);
});

test("proposal is concise and rejects control characters, multiline or empty fields", () => {
  const proposal = { outcome: "Finish gate", checked: "Workspace matches", next: "Edit skill", verify: "Run offline checks" };
  assert.equal(proposalText(proposal).split("\n").length, 5);
  assert.match(proposalText(proposal), /Proceed\?/);
  for (const bad of ["", "a\nb", "\u001b[31mhidden", "x".repeat(241)]) {
    assert.throws(() => proposalText({ ...proposal, next: bad }));
  }
});
