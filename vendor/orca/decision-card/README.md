# Decision card experiment

A small, local experiment for presenting **three options and an explained recommendation** as an interactive HTML card. The core also works in an ordinary browser; this lives under `vendor/orca/` because its intended chat surface is Orca's native inline visuals.

**Not a skill, plugin, or installed integration.** Nothing is enabled by sync. Selecting an option prepares text to paste into chat; it never submits a message, invokes an agent, or authorizes execution.

## Try it locally

Requires Node.js 22.19+ (the repository's existing check prerequisite). No npm install, web server, CDN, or runtime dependencies.

From the repository root:

```bash
node vendor/orca/decision-card/build.mjs --check vendor/orca/decision-card/example.json

demo_dir="$(mktemp -d)"
node vendor/orca/decision-card/build.mjs \
  vendor/orca/decision-card/example.json "$demo_dir/decision-card.html"
printf 'Open this file in your browser: %s\n' "$demo_dir/decision-card.html"
```

Open the generated file in a modern browser or Orca's HTML preview. Opening `decision-card.html` in the source directory shows only the template's build notice; it is not the built example. The builder creates a private output file and refuses to overwrite existing files. Choose a new output filename for each build.

The example is synthetic. Put real decision inputs and generated HTML **outside this public checkout**. Do not check in live-session evidence or screenshots; see the [repository privacy policy](../../../README.md#secret-and-privacy-checks).

## Files and input contract

| File | Purpose |
| --- | --- |
| [decision.schema.json](decision.schema.json) | JSON Schema Draft 2020-12: field types, lengths, exactly three options, no unknown properties |
| [example.json](example.json) | Reviewed synthetic input to copy and adapt |
| [decision-card.html](decision-card.html) | Responsive, theme-aware HTML/CSS shell with three injection markers |
| [decision-card.mjs](decision-card.mjs) | Shared validation, reply formatting, and browser interaction |
| [build.mjs](build.mjs) | Validate input and embed schema, data, and runtime in one HTML file |
| [decision-card.test.mjs](decision-card.test.mjs) | Offline schema, semantic, serialization, DOM-contract, and CLI checks |
| [browser.test.mjs](browser.test.mjs) | Optional real Chromium checks, including a scripts-only sandbox |

Start from `example.json`. Keep `schemaVersion` at `1.0`; give the decision and each option stable, lowercase hyphenated IDs. Include a question, context, decision criteria, and each option's summary, benefits, trade-offs, and effort (`low`, `medium`, or `high`). `recommendation.optionId` identifies the suggestion, and `recommendation.reason` explains it.

Provide three genuinely distinct, viable alternatives, not two strawmen around a preferred answer. Tie the recommendation to the criteria; do not invent cost, effort measurements, or confidence scores. The UI cannot ensure the options are good, only that their structure is valid.

The builder and browser use the schema as the shape contract. The small dependency-free validator supports **only the keywords used in this schema**, not arbitrary JSON Schema. Unsupported keywords fail rather than being ignored. Two extra semantic checks require unique option IDs and a recommendation that references an existing option; standard JSON Schema alone does not enforce these relationships.

Input is bounded at 256 KiB; generated HTML must be under 512 KiB. All content is plain text. HTML-like strings are escaped inside embedded JSON and rendered using text nodes, never interpreted as markup. There is no custom HTML field.

## Interaction

- All choices start **unselected**, even after a browser restores form state. The recommendation is labelled and explained separately; it is not consent.
- Native radio controls support keyboard selection. Each option has expandable benefits and trade-offs. The layout stacks on narrow screens.
- **Other / modify these options** requires a description; ordinary option selections can also include conditions. Notes are limited to 2,000 characters.
- The prepared reply includes the decision ID, question, chosen option, and conditions. It explicitly requests discussion rather than granting execution permission.
- **Copy reply** uses the Clipboard API if permitted. In a sandbox or restricted browser it selects the text for manual copying. **Select reply** is always available once a reply exists.
- **Clear selection** clears notes and output. No choices are saved or sent. If browser form restoration occurs, mounting clears it again.

There is no chat callback, `postMessage` bridge, network request, analytics, or application storage. A copied reply may include sensitive context: review it before sharing. The no-execution wording is a UI contract, not an enforcement mechanism in a receiving agent.

## Show it in an Orca native chat

Enable **Settings → Chat UI → Inline visuals** and start an eligible new chat. Only proceed if that chat supplies a writable `ORCA_CHAT_SCRATCH_DIR`. Do not discover another chat's folder, manufacture the variable, or copy files into another session.

Run the builder **inside the eligible chat's execution environment**, replacing `input.json` with your private decision input:

```bash
# Stop if this variable is absent; use the standalone preview instead.
: "${ORCA_CHAT_SCRATCH_DIR:?This chat does not provide inline-visual authoring}"

node vendor/orca/decision-card/build.mjs input.json \
  "$ORCA_CHAT_SCRATCH_DIR/decision-unique-name.html"
```

Choose a fresh filename using letters, digits, dots, underscores, or hyphens, starting with a letter or digit and ending in `.html`; avoid `..`, paths, and reserved device names. Keep it at most 128 characters. After the build succeeds, the agent can include this line in its reply **outside a code fence**:

```text
::orca-visual{file="decision-unique-name.html" title="Compare three options"}
```

The builder does not emit or submit that directive automatically. Files must live directly in that chat's scratch directory; this is not an ordinary HTML code block.

### Compatibility and sources

Checked against installed Orca CLI **1.4.254** and latest released Orca **1.4.258** during development. These are release-tag checks, not a claim about future versions or unreleased `main`.

- [Official native-chat documentation](https://www.onorca.dev/docs/agents/native-chat) and [Chat settings](https://www.onorca.dev/docs/settings#chat): native inline visuals and the new-chat setting.
- [Released bundled visual instructions, v1.4.258](https://github.com/stablyai/orca/blob/v1.4.258/resources/native-chat-visuals/skills/orca-chat-visuals/SKILL.md): scratch directory, HTML limit, theme tokens, and reply directive. These instructions were identical in v1.4.254.
- [Released visual shell](https://github.com/stablyai/orca/blob/v1.4.258/src/shared/native-chat/native-chat-visual-shell.ts): restricted frame policy. This experiment needs no external assets or connection permissions.
- [Released Pi launch code](https://github.com/stablyai/orca/blob/v1.4.258/src/main/pi/rpc/launch/rpc-launch.ts): structured Pi explicitly strips the visual scratch variables. v1.4.254 has the same restriction at its former `src/main/pi/rpc-launch.ts` path. A new Pi chat or a version update between those releases is not sufficient to enable this authoring route.
- [Latest release reviewed](https://github.com/stablyai/orca/releases/tag/v1.4.258).

Use a chat that actually receives the scratch directory (the reviewed Claude and Codex launch paths supply it), or preview the generated HTML as a standalone file. There is **no Pi integration change** in this experiment. Clipboard support may differ by host; manual copy is the baseline. Theme tokens have ordinary-browser fallbacks, and the template does not override Orca's token names or size itself to the viewport height.

## Verify

From the repository root:

```bash
node --test vendor/orca/decision-card/decision-card.test.mjs
bin/check --static
```

The offline suite is also included in `bin/check`. Its minimal DOM contract is not a rendering or accessibility emulator.

For optional browser checks, use an **already installed** Playwright and Chromium. No installer runs here. If Playwright resolves normally and has its expected browser installed:

```bash
node --test vendor/orca/decision-card/browser.test.mjs
```

Otherwise set `DECISION_CARD_PLAYWRIGHT_MODULE` to the absolute path of its `index.mjs`, and optionally `DECISION_CARD_CHROMIUM` to an existing Chromium executable, for that command only. The test opens generated temporary files and a scripts-only iframe offline; it starts no web server and saves no screenshots.

Browser checks cover initial state, native radio keyboard selection, notes, clearing, literal hostile text, reply selection, theme tokens, narrow layout, no HTTP requests, and sandbox clipboard fallback. They do **not** exercise Orca's own directive parser, file RPC, theme bridge, or frame-height behavior.

Live acceptance checklist (not implied by unit or browser tests):

1. Generate a fresh visual in an authorized chat and verify the directive renders it.
2. Check light/dark Orca themes, narrow panes, and expanding details without clipped content or scroll jumps.
3. Navigate by Tab and arrow keys; verify a screen reader announces the choices, recommendation, and status.
4. Try an option, conditions, Other, clear, and clipboard refusal; confirm nothing sends or executes.

No agents are launched or reloaded, no configurations are changed, and nothing is synced by these checks.
