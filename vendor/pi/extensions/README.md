# Pi packages

The curated [status-line](status-line/README.md) and two on-demand prompt helpers live here alongside imported extensions retained for reference. Package paths are preserved from the original import, including the prompt-only packages under `extensions/`. Attribution and local changes are recorded in [SOURCES.md](../../../SOURCES.md); each imported package retains its license.

## Extensions

The [session-handoff](session-handoff/README.md) adapter opens a fresh Pi conversation in the same terminal, loads a reference-first brief, and gates task tools behind state validation and a concise approval dialog. Its offline tests do not launch agents; it is not enabled automatically.

The [status-line](status-line/README.md) package provides a custom footer. It is a local fork of Thomas van Dongen's [pi-extensions](https://github.com/Pringled/pi-extensions), pinned and attributed in [SOURCES.md](../../../SOURCES.md). Its MIT license and Pi package manifest are alongside the source.

It offers a compact context gauge, model/branch with Git file-change counts, and session cost. The local fork handles unknown usage after compaction, totals all recorded session costs (including compaction and cache warming), and keeps extension status text. It replaces Pi's built-in footer, so the default cwd/session name, cache counters, auto-compaction indicator, and virtual-model route are not shown. It never shows `CTX:`. On narrow terminals it drops the visual gauge first, preserving numeric context and other text; see the [package README](status-line/README.md#what-it-shows) for the remaining width fallbacks.

**Not enabled by this repository:** `bin/sync.sh` does not install Pi extensions, and importing source does not load it into Pi. An explicit, separate request is required to change Pi configuration. For a manual one-invocation trial, see [the package README](status-line/README.md#local-trial).

## On-demand helpers

| Package | Command | Purpose |
| --- | --- | --- |
| [pi-away](pi-away/README.md) | `/recap` | Summarize the current task, progress, and next step. |
| [pi-heads-up](pi-heads-up/README.md) | `/heads-up` | Flag one consequential concern not already disclosed, or return `NONE`. |

These local forks are **prompt templates, not executable extensions**. They have no timers, background model calls, editor patches, widgets, or tool-count gates. Invoking one submits a normal user prompt and produces a visible assistant reply in the session. Pi handles context, cancellation, and usage accounting through its normal agent path. The session's model and thinking settings still apply; these are not free requests and make no cache-reuse guarantee.

The prompts request conversation-only analysis without tools or file changes. This is an instruction, **not an enforced read-only sandbox**. A recap can only use available history; a heads-up is a model opinion, not independent verification. Neither helper automatically continues the task.

### Try a local fork

When explicitly requested, start Pi from this checkout with one package for a single invocation, without installing it into settings:

```bash
pi -e ./vendor/pi/extensions/pi-away
# Then invoke /recap when needed.
```

Or select `./vendor/pi/extensions/pi-heads-up` and invoke `/heads-up`. Pi accepts repeated `-e` options to select both helpers or add the status-line. Do not also load their old upstream extensions: an extension command such as `/recap` takes precedence over a template with the same name.

Nothing here is enabled by `bin/sync.sh`. Source edits do not authorize syncing, reloading, or launching agents. Upstream npm install commands select upstream packages, not these local forks.

### Checks

`bin/check` includes [offline helper package checks](../../../bin/test_pi_helpers.py) for prompt declarations, frontmatter, packaged files, and the absence of executable resources and dependencies in these two helpers. It does not run Pi or evaluate model responses.

Static prompt review covers short or resumed context, reported versus verified progress, already-disclosed concerns, and the no-concern `NONE` case. Live command discovery, model adherence, and usefulness remain separate opt-in checks. The design follows Pi's [prompt templates](https://github.com/earendil-works/pi/blob/v1.4.0/packages/coding-agent/docs/prompt-templates.md) and [package format](https://github.com/earendil-works/pi/blob/v1.4.0/packages/coding-agent/docs/packages.md).

## Retained source, not recommended for enablement

- [pi-next-prompt](pi-next-prompt/README.md): unsupported automatic suggestion experiment; known lifecycle, cancellation, cost, and editor-integration limitations.
- [pi-background](pi-background/README.md): command execution/logging/timeout risks.
- [pi-checkpoints](pi-checkpoints/README.md): destructive confirmed restores and persistent snapshots.
- [pi-model-pick](pi-model-pick/README.md): overlaps `/model`.
- [pi-polish](pi-polish/README.md): Pi internal UI patches and npm dependencies.

Their manifests still expose executable code when explicitly selected. Their upstream READMEs may contain install commands; retaining source is not a recommendation to run them.
