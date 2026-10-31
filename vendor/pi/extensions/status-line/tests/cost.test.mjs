import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Exercise the real footer without installing Pi or starting an agent. Only the
// terminal styling/width helpers are replaced; accounting and rendering are real.
const hooks = registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier === "@earendil-works/pi-tui") return {
			url: `data:text/javascript,${encodeURIComponent(`
				export const visibleWidth = (text) => [...text].length;
				export const truncateToWidth = (text, width) => [...text].slice(0, width).join("");
			`)}`,
			shortCircuit: true,
		};
		return nextResolve(specifier, context);
	},
});
const { default: statusLine } = await import("../extensions/status-line.ts");
hooks.deregister();

const assistant = (total) => ({
	type: "message",
	message: { role: "assistant", provider: "openai", model: "gpt-5", usage: { cost: { total } } },
});

async function setup(t, entries = [], { cwd, branch = "main", mode = "tui" } = {}) {
	const temporaryCwd = cwd ? undefined : mkdtempSync(join(tmpdir(), "pi-footer-"));
	cwd ??= temporaryCwd;
	const handlers = new Map();
	let footer;
	let branchChanged;
	let renders = 0;
	let scans = 0;
	let sessionId = "session-1";
	let leafId = "initial-leaf";
	const ctx = {
		mode,
		cwd,
		model: { provider: "openai", id: "gpt-5", contextWindow: 200_000 },
		getContextUsage: () => ({ tokens: 1000, contextWindow: 200_000, percent: 0.5 }),
		sessionManager: {
			getEntries() { scans++; return entries.slice(); },
			getSessionId: () => sessionId,
			getLeafId: () => leafId,
		},
		ui: { setFooter(factory) {
			footer = factory(
				{ requestRender() { renders++; } },
				{ fg: (_color, value) => value },
				{
					getGitBranch: () => branch,
					getExtensionStatuses: () => new Map(),
					onBranchChange(callback) { branchChanged = callback; return () => {}; },
				},
			);
		} },
	};
	statusLine({
		on(name, handler) {
			if (!handlers.has(name)) handlers.set(name, []);
			handlers.get(name).push(handler);
		},
		getThinkingLevel: () => "off",
	});
	const emit = async (name, event = {}) => {
		for (const handler of handlers.get(name) ?? []) await handler(event, ctx);
	};
	t.after(async () => {
		await emit("session_shutdown");
		if (temporaryCwd) rmSync(temporaryCwd, { recursive: true, force: true });
	});
	await emit("session_start");
	return {
		entries, emit, branchChanged: () => branchChanged(),
		append(entry) { entries.push(entry); leafId = `entry-${entries.length}`; },
		setLeaf(id) { leafId = id; },
		setSession(id) { sessionId = id; },
		invalidate: () => footer.invalidate(),
		render: () => footer.render(160)[0],
		get renders() { return renders; },
		get scans() { return scans; },
	};
}

test("OpenAI session cost updates after a completed response without a Git branch change", async (t) => {
	const h = await setup(t);
	assert.match(h.render(), /\$0\.000$/);
	const response = assistant(0.125);
	// Pi emits message_end before persisting the response. Even an intervening
	// render must not prevent the post-persistence cost from appearing.
	await h.emit("message_end", { message: response.message });
	assert.match(h.render(), /\$0\.000$/);
	h.append(response);
	await h.emit("turn_end", { message: response.message });
	assert.match(h.render(), /\$0\.125$/);
	assert.ok(h.renders > 0, "completion must request a redraw, not wait for keyboard input");
	const next = assistant(0.075);
	await h.emit("message_end", { message: next.message });
	h.append(next);
	await h.emit("turn_end", { message: next.message });
	await h.emit("agent_end");
	assert.match(h.render(), /\$0\.200$/);
});

test("the old Git branch refresh path can see the recorded cost", async (t) => {
	const h = await setup(t);
	h.render();
	h.append(assistant(0.125));
	h.branchChanged();
	assert.match(h.render(), /\$0\.125$/);
});

test("saved usage refreshes the cache even without a message lifecycle event", async (t) => {
	const h = await setup(t, [assistant(0.125)]);
	assert.match(h.render(), /\$0\.125$/);
	h.append({ type: "usage", usage: { cost: { total: 0.025 } } });
	assert.match(h.render(), /\$0\.150$/);
});

test("repeated frames reuse totals, but component invalidation clears the cache", async (t) => {
	const h = await setup(t, [assistant(0.125)]);
	for (let i = 0; i < 10; i++) assert.match(h.render(), /\$0\.125$/);
	assert.equal(h.scans, 1);
	h.invalidate();
	h.render();
	assert.equal(h.scans, 2);
});

test("totals include tool, standalone, compaction and branch-summary usage without refunds or double counting", async (t) => {
	const h = await setup(t, [assistant(0.125)]);
	h.render();
	h.append({ type: "message", message: { role: "toolResult", usage: { cost: { total: 0.025 } } } });
	h.append({ type: "usage", usage: { cost: { total: 0.05 } } });
	h.append({ type: "message", message: { role: "user" } });
	h.append({ type: "message", message: { role: "toolResult" } });
	h.append({ type: "compaction", usage: { cost: { total: 0.1 } } });
	await h.emit("session_compact");
	assert.match(h.render(), /\$0\.300$/);
	h.append({ type: "branch_summary", usage: { cost: { total: 0.2 } } });
	// Navigation can return to the last rendered leaf with new entries off-branch.
	h.setLeaf("entry-6");
	await h.emit("session_tree");
	assert.match(h.render(), /\$0\.500$/);
	await h.emit("turn_end");
	await h.emit("agent_end");
	assert.match(h.render(), /\$0\.500$/);
});

test("the cache follows session identity even when the leaf ID is unchanged", async (t) => {
	const h = await setup(t, [assistant(0.125)]);
	h.render();
	h.entries.splice(0, h.entries.length, assistant(0.25));
	h.setSession("session-2");
	assert.match(h.render(), /\$0\.250$/);
});

test("shutdown stops requesting renders from the old session", async (t) => {
	const h = await setup(t);
	await h.emit("session_shutdown");
	const before = h.renders;
	await h.emit("turn_end");
	assert.equal(h.renders, before);
});

async function waitForFooter(h, pattern) {
	const deadline = Date.now() + 5000;
	while (!pattern.test(h.render()) && Date.now() < deadline) {
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	assert.match(h.render(), pattern);
}

test("real footer displays Git counts on the left and refreshes after tools and agent runs", async (t) => {
	const cwd = mkdtempSync(join(tmpdir(), "pi-footer-git-"));
	t.after(() => rmSync(cwd, { recursive: true, force: true }));
	const git = (...args) => execFileSync("git", ["-C", cwd, ...args]);
	git("init", "-q");
	writeFileSync(join(cwd, "tracked"), "original");
	git("add", ".");
	git("-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-qm", "initial");
	const h = await setup(t, [], { cwd });
	await waitForFooter(h, /^⎇ main ✓ │/);
	writeFileSync(join(cwd, "tracked"), "changed");
	await h.emit("tool_execution_end");
	await waitForFooter(h, /^⎇ main M1 │/);
	writeFileSync(join(cwd, "new"), "untracked");
	await h.emit("agent_end");
	await waitForFooter(h, /^⎇ main M1 \?1 │/);
	git("add", "new");
	h.branchChanged();
	await waitForFooter(h, /^⎇ main M1 A1 │/);
	const detached = await setup(t, [], { cwd, branch: null });
	await waitForFooter(detached, /^⎇ detached M1 A1 │/);
});

test("failed status reads with a cached branch display unknown rather than false clean", async (t) => {
	const h = await setup(t);
	await waitForFooter(h, /git \?/);
	assert.doesNotMatch(h.render(), /✓/);
});

test("non-interactive sessions do not create a footer or poll Git", async (t) => {
	const h = await setup(t, [], { mode: "json" });
	await h.emit("tool_execution_end");
	await h.emit("agent_end");
	assert.equal(h.renders, 0);
});

for (const event of ["turn_end", "agent_end", "session_compact", "session_tree"]) {
	test(`${event} requests a redraw without a Git branch change`, async (t) => {
		const h = await setup(t);
		h.render();
		const before = h.renders;
		await h.emit(event);
		assert.ok(h.renders > before);
	});
}
