import assert from "node:assert/strict";
import test from "node:test";
import { layoutFooter } from "../extensions/layout.ts";

const widthOf = (text) => [...text].length;
const truncate = (text, width) => [...text].slice(0, width).join("");
const context = (size) => `${size ? `[${"█".repeat(size)}] ` : ""}50.0k/200.0k (25%)`;
const options = {
	branch: "⎇ main",
	model: "provider/model-id",
	compactModel: "model-id",
	thinking: " · high",
	cost: "$1.234",
	sep: " │ ",
	context,
	visibleWidth: widthOf,
	truncateToWidth: truncate,
};
const render = (width, overrides = {}) => layoutFooter({ ...options, ...overrides, width });

test("drops the visual gauge before any text and never reintroduces it at narrower widths", () => {
	for (const overrides of [{}, { gitStatus: "M3 A1 ?2" }]) {
		const full = render(160, overrides);
		assert.match(full, /\[█{20}\]/);
		const noGauge = full.replace(context(20), context(0));
		for (let width = widthOf(noGauge); width < widthOf(full); width++) {
			assert.equal(render(width, overrides), noGauge, `width ${width}: only the gauge should disappear`);
		}
		for (let width = 0; width < widthOf(full); width++) {
			const line = render(width, overrides);
			assert.doesNotMatch(line, /\[|\]|CTX:/, `width ${width}`);
			assert.ok(widthOf(line) <= width, `width ${width}`);
		}
		assert.equal(render(widthOf(full), overrides), full, "widening restores the full gauge");
	}
});

test("after the gauge, drops provider, thinking, branch name and Git counts in that order", () => {
	for (const gitStatus of ["", "M3 A1 ?2"]) {
		const overrides = { gitStatus };
		const git = `⎇ main${gitStatus ? ` ${gitStatus}` : ""}`;
		const fullText = `${git} │ provider/model-id · high │ ${context(0)} │ $1.234`;
		const noProvider = `${git} │ model-id · high │ ${context(0)} │ $1.234`;
		const noThinking = `${git} │ model-id │ ${context(0)} │ $1.234`;
		const noBranch = `${gitStatus ? `${gitStatus} │ ` : ""}model-id │ ${context(0)} │ $1.234`;
		assert.equal(render(widthOf(fullText), overrides), fullText);
		assert.equal(render(widthOf(fullText) - 1, overrides), noProvider);
		assert.equal(render(widthOf(noProvider) - 1, overrides), noThinking);
		assert.equal(render(widthOf(noThinking) - 1, overrides), noBranch);
		if (gitStatus) {
			const noCounts = `model-id │ ${context(0)} │ $1.234`;
			assert.equal(render(widthOf(noBranch) - 1, overrides), noCounts);
		}
		for (let width = 0; width < widthOf(noProvider); width++) {
			assert.doesNotMatch(render(width, overrides), / · high/, `width ${width}: thinking must stay hidden`);
		}
	}
});

test("retains model, numeric context and price after dropping Git and thinking", () => {
	const noThinking = `model-id │ ${context(0)} │ $1.234`;
	assert.equal(render(40), noThinking);
	assert.equal(render(39), noThinking);
});

test("shortens model only below the width required for the bar-free layout", () => {
	assert.equal(render(35), "model-id 50.0k/200.0k (25%) $1.234");
	assert.equal(render(30), "mode 50.0k/200.0k (25%) $1.234");
	for (let width = 0; width <= 120; width++) assert.ok(widthOf(render(width)) <= width, `width ${width}`);
});

test("unknown usage and non-reasoning models retain counts, percent and price without a gauge", () => {
	const unknown = render(35, { thinking: "", context: (size) => `${size ? `[${"░".repeat(size)}] ` : ""}?/200.0k (?%)` });
	assert.match(unknown, /\?\/200\.0k \(\?%\) │ \$1\.234$/);
	assert.doesNotMatch(unknown, /\[|\]/);
	assert.ok(widthOf(unknown) <= 35);
});
