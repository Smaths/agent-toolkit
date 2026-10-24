import assert from "node:assert/strict";
import { test } from "node:test";
import next from "./next.ts";

function harness() {
	let command;
	let settled;
	let startup;
	let branch = [];
	let sequence = 0;
	let source = "/tmp/source.jsonl";
	const sent = [];
	const notifications = [];
	const switches = [];
	const pi = {
		registerCommand(name, definition) {
			assert.equal(name, "next");
			command = definition.handler;
		},
		on(name, handler) {
			if (name === "agent_settled") settled = handler;
			if (name === "session_start") startup = handler;
		},
		sendUserMessage(text) {
			sent.push(text);
			branch = [...branch, { type: "message", id: `user-${++sequence}`, message: { role: "user", content: [{ type: "text", text }] } }];
		},
	};
	const ctx = {
		mode: "tui",
		ui: { notify(...args) { notifications.push(args); } },
		sessionManager: {
			getSessionFile() { return source; },
			getBranch() { return branch; },
		},
		isIdle() { return true; },
		hasPendingMessages() { return false; },
		async newSession(options) {
			switches.push(options);
			startup();
			await options.withSession({ sendUserMessage: async (text) => { sent.push(text); } });
			return { cancelled: false };
		},
	};
	next(pi);
	return {
			command: (args = "") => command(args, ctx),
			settle(text) {
				branch = [...branch, { type: "message", id: `assistant-${++sequence}`, message: { role: "assistant", content: [{ type: "text", text }] } }];
				settled({ aborted: false }, ctx);
			},
			settleWithoutReply(aborted = false) { settled({ aborted }, ctx); },
			appendMessage() { branch = [...branch, { type: "message", id: `user-${++sequence}`, message: { role: "user", content: [] } }]; },
			sent, notifications, switches,
	};
}

const proposal = "Next: bounded task.\n<<<NEXT_HANDOFF>>>\nImplement A; run test A.\n<<<END_NEXT_HANDOFF>>>";

test("plans in the current session and only switches after approval", async () => {
	const h = harness();
	await h.command();
	assert.match(h.sent.at(-1), /Think in THIS session/);
	assert.equal(h.switches.length, 0);
	h.settle(proposal);
	await h.command("approve");
	assert.equal(h.switches.length, 1);
	assert.equal(h.switches[0].parentSession, "/tmp/source.jsonl");
	assert.match(h.sent.at(-1), /Implement A; run test A/);
	assert.match(h.sent.at(-1), /Do not launch other agents/);
	await h.command("approve");
	assert.equal(h.switches.length, 1);
});

test("parallel only plans; revision replaces the candidate", async () => {
	const h = harness();
	await h.command("parallel");
	assert.match(h.sent.at(-1), /up to three genuinely independent tasks/);
	assert.equal(h.switches.length, 0);
	h.settle(proposal);
	await h.command("revise include a migration check");
	assert.match(h.sent.at(-1), /User's requested revision: include a migration check/);
	await h.command("approve");
	assert.equal(h.switches.length, 0);
	h.settle("No task is ready: requires a decision.");
	await h.command("approve");
	assert.equal(h.switches.length, 0);
});

test("aborted revision does not revive the previous proposal", async () => {
	const h = harness();
	await h.command();
	h.settle(proposal);
	await h.command("revise change the checks");
	h.settleWithoutReply(true);
	await h.command("approve");
	assert.equal(h.switches.length, 0);
	assert.match(h.notifications.at(-1)[0], /missing or stale/);
});

test("a completed run without a new assistant reply cannot reuse an old proposal", async () => {
	const h = harness();
	await h.command();
	h.settle(proposal);
	await h.command("revise change the checks");
	h.settleWithoutReply();
	await h.command("approve");
	assert.equal(h.switches.length, 0);
});

test("successful revision hands off only its new assignment", async () => {
	const h = harness();
	await h.command();
	h.settle(proposal);
	await h.command("revise change the checks");
	h.settle("Updated.\n<<<NEXT_HANDOFF>>>\nImplement B; run test B.\n<<<END_NEXT_HANDOFF>>>");
	await h.command("approve");
	assert.equal(h.switches.length, 1);
	assert.match(h.sent.at(-1), /Implement B; run test B/);
	assert.doesNotMatch(h.sent.at(-1), /Implement A/);
});

test("stale proposals cannot launch a session", async () => {
	const h = harness();
	await h.command();
	h.settle(proposal);
	h.appendMessage();
	await h.command("approve");
	assert.equal(h.switches.length, 0);
});
