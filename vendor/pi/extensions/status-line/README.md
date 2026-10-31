# status-line (Pi)

A custom footer for [Pi](https://pi.dev) showing the Git branch and file-change counts, model information, context usage, and session cost. Based on Thomas van Dongen's MIT-licensed pi-context-bar, styled after [ccstatusline](https://github.com/sirmalloc/ccstatusline).

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Pringled/pi-extensions/main/assets/images/pi-context-bar-dark.gif">
  <img src="https://raw.githubusercontent.com/Pringled/pi-extensions/main/assets/images/pi-context-bar-light.gif" alt="pi-context-bar">
</picture>

The upstream command below installs the original `pi-context-bar`, not this local `status-line` fork:

```bash
pi install npm:pi-context-bar
```

## Local trial

From the agent-toolkit checkout, start an **interactive** one-off session without changing Pi settings:

```bash
pi -e ./vendor/pi/extensions/status-line
```

Do not use `bin/sync.sh` to enable Pi packages; it manages other agent resources only.

## What it shows

- The Git branch and [file-change counts](#git-status), or `no git` outside a repository.
- The current model, as `provider/model`, and its thinking level.
- A context bar with used and total tokens. It turns yellow at 50% and red at 80%.
- The recorded total cost of the session so far, including prior branches and compaction.

This fork shows `?` rather than a false 0% when context usage is unknown after compaction and preserves extension status text. It uses Pi's `setFooter` API; the new package path does not update existing Pi settings automatically. The `CTX:` label is never shown. As the terminal narrows, it removes the visual gauge first while preserving used/maximum tokens, percentage, and all other text. It then drops the provider, thinking level, branch name, and Git counts, in that order. At narrower widths it reduces separator padding and then shortens the model ID; when the figures cannot fit, it shows the model ID alone. For example, at 40 columns: `model-id │ 50.0k/200.0k (25%) │ $1.234`. It replaces Pi's default footer: cwd/session name, cache counters, auto-compaction indicator and virtual-model route are not displayed.

## Git status

The left side shows a compact summary, for example `⎇ main M3 A1 D1 ?2`:

| Label | Files |
|---|---|
| `M` | Modified (including type changes) |
| `A` | Added to the index |
| `D` | Deleted |
| `R` / `C` | Renamed / copied, when detected by Git |
| `U` | Unmerged conflicts |
| `?` | Untracked, counted individually inside directories |
| `✓` | Clean working tree and index |

Zero counts are omitted. Counts combine staged and unstaged changes, not lines changed. Each file is counted once: conflicts take priority, then deletions, additions, renames/copies, and modifications. A staged addition with further edits remains `A`, for example. Ignored files are excluded. Detached HEAD shows `⎇ detached` once status is available.

With Git on `PATH`, status refreshes asynchronously at startup, after tool completion, agent runs, and branch changes, and every two seconds for edits made outside Pi. Polls are serialized and do not run inside rendering; unchanged summaries do not request redraws. Each read has a 1.5-second timeout and a 4 MiB output limit, with optional Git index writes and repository-configured fsmonitor commands disabled. The footer shows `…` while loading and `git ?` for failed reads when a branch is known, rather than claiming a clean tree. Disposal and session shutdown stop polling and cancel outstanding reads.

This implementation targets Pi 1.4.0, checked against its [released extension lifecycle guidance](https://github.com/earendil-works/pi/blob/v1.4.0/packages/coding-agent/docs/extensions.md), [TUI guidance](https://github.com/earendil-works/pi/blob/v1.4.0/packages/coding-agent/docs/tui.md), and [custom-footer example](https://github.com/earendil-works/pi/blob/v1.4.0/packages/coding-agent/examples/extensions/custom-footer.ts).

## Cost updates

The footer refreshes recorded costs after completed turns, agent runs, compaction, and session-tree navigation; it does not show a live per-token charge while a response streams. The cache also checks the session and leaf IDs so newly saved usage (including cache warming) is picked up on the next render without rescanning unchanged history on every frame.

The amount is Pi's recorded usage cost, not an OpenAI account balance or invoice. Zero-priced models can still report `$0.000`, and the display rounds to three decimal places. The former cache refreshed only on Git branch changes, leaving the amount frozen during normal conversations regardless of provider.

## Offline checks

With Node.js 22.19 or newer, run the layout, Git status, and cost/lifecycle regression tests without installing Pi, launching an agent, or making model requests:

```bash
node --test vendor/pi/extensions/status-line/tests/*.test.mjs
```

## License

MIT
