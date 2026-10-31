import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { formatGitStatus, parseGitStatus, readGitStatus, watchGitStatus } from "../extensions/git-status.ts";

const summary = (porcelain) => formatGitStatus(parseGitStatus(porcelain));

test("counts files across index and working tree once, with additions, removals and untracked files", () => {
	assert.equal(summary(" M a\0M  b\0MM c\0AM new\0 D gone\0?? dir/one\0?? dir/two\0"), "M3 A1 D1 ?2");
	assert.equal(summary(""), "✓");
});

test("renames and copies consume source names, and filenames never become status records", () => {
	assert.equal(summary("R  new name\0 M old name\0C  copy\0?? source\0 M line\nbreak\0?? 日本語\0"), "M1 R1 C1 ?1");
	assert.equal(summary(" T changed-type\0"), "M1");
});

test("all unmerged combinations count as conflicts, not additions or deletions", () => {
	const conflicts = ["DD", "AU", "UD", "UA", "DU", "AA", "UU"].map((xy) => `${xy} conflict-${xy}\0`).join("");
	assert.equal(summary(conflicts), "U7");
});

test("malformed or truncated output cannot report a clean tree", () => {
	for (const output of [" M unterminated", "R  destination\0", "nonsense\0"]) {
		assert.throws(() => parseGitStatus(output));
	}
});

test("real Git includes nested untracked files, staged edits, renames, and deletions from a subdirectory", async (t) => {
	const cwd = mkdtempSync(join(tmpdir(), "pi-status-"));
	t.after(() => rmSync(cwd, { recursive: true, force: true }));
	const git = (...args) => execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8" });
	git("init", "-q");
	for (const name of ["modified", "renamed", "deleted"]) writeFileSync(join(cwd, name), name);
	git("add", ".");
	git("-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-qm", "initial");
	// A repository-configured fsmonitor command must not run during polling.
	const marker = join(cwd, "fsmonitor-ran");
	git("config", "core.fsmonitor", `touch '${marker}'`);
	assert.equal(formatGitStatus(await readGitStatus(cwd)), "✓");
	assert.equal(existsSync(marker), false);
	git("config", "--unset", "core.fsmonitor");
	writeFileSync(join(cwd, "modified"), "staged edit");
	git("add", "modified");
	writeFileSync(join(cwd, "modified"), "also unstaged");
	git("mv", "renamed", "renamed now");
	rmSync(join(cwd, "deleted"));
	writeFileSync(join(cwd, "added"), "new");
	git("add", "added");
	mkdirSync(join(cwd, "nested"));
	writeFileSync(join(cwd, "nested", "one\nfile"), "untracked");
	writeFileSync(join(cwd, "nested", "two"), "untracked");
	assert.equal(formatGitStatus(await readGitStatus(join(cwd, "nested"))), "M1 A1 D1 R1 ?2");
	const linked = mkdtempSync(join(tmpdir(), "pi-status-worktree-"));
	t.after(() => rmSync(linked, { recursive: true, force: true }));
	git("worktree", "add", "--quiet", "--detach", linked, "HEAD");
	writeFileSync(join(linked, "modified"), "only this worktree");
	assert.equal(formatGitStatus(await readGitStatus(linked)), "M1");
});

test("outside a repository and cancelled reads reject instead of reporting clean", async (t) => {
	const cwd = mkdtempSync(join(tmpdir(), "pi-status-outside-"));
	t.after(() => rmSync(cwd, { recursive: true, force: true }));
	await assert.rejects(readGitStatus(cwd));
	await assert.rejects(readGitStatus(cwd, AbortSignal.abort()));
});

test("monitor polls while idle, only publishes changes, and stops on disposal", async (t) => {
	t.mock.timers.enable({ apis: ["setInterval"] });
	let output = " M file\0";
	let reads = 0;
	const changes = [];
	const monitor = watchGitStatus({
		read: async () => { reads++; return parseGitStatus(output); },
		onChange: (value) => changes.push(value),
	});
	t.after(() => monitor.dispose());
	await monitor.refresh();
	assert.deepEqual(changes, ["M1"]);
	t.mock.timers.tick(2000);
	await monitor.refresh();
	assert.deepEqual(changes, ["M1"], "unchanged polls must not redraw");
	output = "?? added\0";
	t.mock.timers.tick(2000);
	await monitor.refresh();
	assert.deepEqual(changes, ["M1", "?1"]);
	monitor.dispose();
	const before = reads;
	t.mock.timers.tick(4000);
	await monitor.refresh();
	assert.equal(reads, before);
});

test("monitor serializes reads, queues a refresh during a read, and discards late results on disposal", async () => {
	const pending = [];
	const changes = [];
	let signal;
	const monitor = watchGitStatus({
		read: (abortSignal) => { signal = abortSignal; return new Promise((resolve) => pending.push(resolve)); },
		onChange: (value) => changes.push(value),
	});
	try {
		const first = monitor.refresh();
		const second = monitor.refresh();
		assert.equal(pending.length, 1);
		pending.shift()(parseGitStatus(" M old\0"));
		await new Promise((resolve) => setImmediate(resolve));
		assert.equal(pending.length, 1, "refresh requested during a read needs a new snapshot");
		pending.shift()(parseGitStatus("?? new\0"));
		await Promise.all([first, second]);
		assert.equal(changes.at(-1), "?1");
		const late = monitor.refresh();
		monitor.dispose();
		assert.equal(signal.aborted, true);
		pending.shift()(parseGitStatus(""));
		await late;
		assert.equal(changes.at(-1), "?1");
	} finally { monitor.dispose(); }
});

test("monitor exposes failure as unknown and recovers on the next read", async () => {
	let fail = true;
	const changes = [];
	const monitor = watchGitStatus({
		read: async () => { if (fail) throw new Error("git unavailable"); return parseGitStatus(""); },
		onChange: (value) => changes.push(value),
	});
	try {
		await monitor.refresh();
		assert.deepEqual(changes, ["git ?"]);
		fail = false;
		await monitor.refresh();
		assert.deepEqual(changes, ["git ?", "✓"]);
	} finally { monitor.dispose(); }
});
