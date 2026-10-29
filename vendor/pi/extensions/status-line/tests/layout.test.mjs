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

test("omits CTX at every width and removes provider before branch", () => {
	const full = render(120);
	assert.match(full, /^⎇ main │ provider\/model-id · high │ \[/);
	const noProvider = render(widthOf(full) - 1);
	assert.match(noProvider, /^⎇ main │ model-id · high │ \[/);
	const noBranch = render(75);
	assert.match(noBranch, /^model-id · high │ \[/);
	for (let width = 0; width <= 120; width++) assert.doesNotMatch(render(width), /CTX:/);
});

test("drops thinking and then the bar, keeping model, token counts, percentage and price", () => {
	assert.match(render(65), /^model-id · high │ \[█+\] 50\.0k\/200\.0k \(25%\) │ \$1\.234$/);
	assert.equal(render(50), "model-id │ [█████████] 50.0k/200.0k (25%) │ $1.234");
	assert.equal(render(42), "model-id [█████] 50.0k/200.0k (25%) $1.234");
	assert.equal(render(40), "model-id │ 50.0k/200.0k (25%) │ $1.234");
	assert.equal(render(39), "model-id │ 50.0k/200.0k (25%) │ $1.234");
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
