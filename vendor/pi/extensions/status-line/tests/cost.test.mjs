import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

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

async function setup(entries = []) {
	const handlers = new Map();
	let footer;
	let branchChanged;
	let renders = 0;
	let scans = 0;
	let sessionId = "session-1";
	let leafId = "initial-leaf";
	const ctx = {
		mode: "tui",
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
					getGitBranch: () => "main",
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

test("OpenAI session cost updates after a completed response without a Git branch change", async () => {
	const h = await setup();
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

test("the old Git branch refresh path can see the recorded cost", async () => {
	const h = await setup();
	h.render();
	h.append(assistant(0.125));
	h.branchChanged();
	assert.match(h.render(), /\$0\.125$/);
});

test("saved usage refreshes the cache even without a message lifecycle event", async () => {
	const h = await setup([assistant(0.125)]);
	assert.match(h.render(), /\$0\.125$/);
	h.append({ type: "usage", usage: { cost: { total: 0.025 } } });
	assert.match(h.render(), /\$0\.150$/);
});

test("repeated frames reuse totals, but component invalidation clears the cache", async () => {
	const h = await setup([assistant(0.125)]);
	for (let i = 0; i < 10; i++) assert.match(h.render(), /\$0\.125$/);
	assert.equal(h.scans, 1);
	h.invalidate();
	h.render();
	assert.equal(h.scans, 2);
});

test("totals include tool, standalone, compaction and branch-summary usage without refunds or double counting", async () => {
	const h = await setup([assistant(0.125)]);
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

test("the cache follows session identity even when the leaf ID is unchanged", async () => {
	const h = await setup([assistant(0.125)]);
	h.render();
	h.entries.splice(0, h.entries.length, assistant(0.25));
	h.setSession("session-2");
	assert.match(h.render(), /\$0\.250$/);
});

test("shutdown stops requesting renders from the old session", async () => {
	const h = await setup();
	await h.emit("session_shutdown");
	const before = h.renders;
	await h.emit("turn_end");
	assert.equal(h.renders, before);
});

for (const event of ["turn_end", "agent_end", "session_compact", "session_tree"]) {
	test(`${event} requests a redraw without a Git branch change`, async () => {
		const h = await setup();
		h.render();
		const before = h.renders;
		await h.emit(event);
		assert.ok(h.renders > before);
	});
}
