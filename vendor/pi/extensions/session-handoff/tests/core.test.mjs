import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, symlink, stat } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fixture } from "./helpers.mjs";
import { captureWorkspace, readScoped, prepareTransfer, writeRecord, updateReceiverRecord, sameState, proposalText, workspaceDiff } from "../core.mjs";


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

test("explicit local read grants allow only the canonical file or directory subtree", async t => {
  const { cwd, home, brief } = await fixture(t);
  const scope = { workspace: cwd, brief };
  const docs = join(home, "documentation with spaces");
  const file = join(docs, "README.md");
  const other = join(home, "documentation with spaces-other");
  await mkdir(docs);
  await mkdir(other);
  await writeFile(file, "allowed\nsecond line\n");
  await writeFile(join(docs, "neighbor.md"), "neighbor");
  await writeFile(join(other, "private.md"), "private");
  await assert.rejects(readScoped(scope, file), /scope/);
  const fileGrant = [{ path: file, kind: "file" }];
  assert.equal((await readScoped(scope, file, 2, 1, fileGrant)).text, "second line");
  await assert.rejects(readScoped(scope, join(docs, "neighbor.md"), 1, 160, fileGrant), /scope/);
  const directoryGrant = [{ path: docs, kind: "directory" }];
  assert.equal((await readScoped(scope, join(docs, "neighbor.md"), 1, 160, directoryGrant)).text, "neighbor");
  await assert.rejects(readScoped(scope, join(other, "private.md"), 1, 160, directoryGrant), /scope/);
  await symlink(other, join(docs, "escape"), "junction");
  await assert.rejects(readScoped(scope, join(docs, "escape", "private.md"), 1, 160, directoryGrant), /scope/);
  await assert.rejects(readScoped(scope, docs, 1, 160, directoryGrant), /regular/);
  await writeFile(join(docs, "binary"), Buffer.from([0]));
  await assert.rejects(readScoped(scope, join(docs, "binary"), 1, 160, directoryGrant), /text/);
  await writeFile(join(docs, "large"), Buffer.alloc(2 * 1024 * 1024 + 1, "x"));
  await assert.rejects(readScoped(scope, join(docs, "large"), 1, 160, directoryGrant), /limit/);
  await assert.rejects(readScoped(scope, file, 1, 201, directoryGrant), /range/);
});

test("startup reads report unsupported URLs without treating them as workspace paths", async t => {
  const { cwd, brief } = await fixture(t);
  for (const url of ["https://example.invalid/docs", "file:///external/docs"]) {
    await assert.rejects(readScoped({ workspace: cwd, brief }, url), /URLs are not supported/);
  }
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

test("receiver record updates preserve launch metadata and refuse mismatched or corrupt records", async t => {
  const { cwd, home, brief } = await fixture(t);
  const transfer = await prepareTransfer({ cwd, brief, settings: { provider: "p", model: "m", reasoning: "high" }, sourceSession: "source", tools: [], stateHome: join(home, "state") });
  const created = { status: "created", receiver: "receiver", confirmedSettings: transfer.settings };
  await writeRecord(transfer, created);
  assert.equal(await updateReceiverRecord(transfer, "receiver", () => undefined), false);
  await updateReceiverRecord({ ...transfer, phase: "approved", approval: { proposal: "not launch metadata" } }, "receiver", () => ({ status: "delivered" }));
  const updated = JSON.parse(await readFile(transfer.record, "utf8"));
  assert.deepEqual(updated.confirmedSettings, transfer.settings);
  assert.equal(updated.phase, "pending");
  assert.equal(updated.approval, undefined);
  for (const key of ["version", "id", "directory", "record", "brief", "briefHash", "workspace", "sourceSession", "receiver", "status"]) {
    await writeRecord(transfer, { ...created, [key]: "mismatched" });
    const original = await readFile(transfer.record, "utf8");
    await assert.rejects(updateReceiverRecord(transfer, "receiver", () => ({ status: "delivered" })), /record/);
    assert.equal(await readFile(transfer.record, "utf8"), original);
  }
  await writeFile(transfer.record, "not JSON");
  await assert.rejects(updateReceiverRecord(transfer, "receiver", () => ({ status: "delivered" })));
  assert.equal(await readFile(transfer.record, "utf8"), "not JSON");
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
  for (const key of Object.keys(proposal)) {
    for (const question of ["Proceed?", "proceed ?"]) {
      assert.throws(() => proposalText({ ...proposal, [key]: `${proposal[key]}. ${question}` }), /adapter.*Proceed/i);
    }
  }
});
