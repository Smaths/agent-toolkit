# status-line (Pi)

A custom footer for [Pi](https://pi.dev) showing the Git branch, model information, context usage, and session cost. Based on Thomas van Dongen's MIT-licensed pi-context-bar, styled after [ccstatusline](https://github.com/sirmalloc/ccstatusline).

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

- The Git branch, or `no git` outside a repository.
- The current model, as `provider/model`, and its thinking level.
- A context bar with used and total tokens. It turns yellow at 50% and red at 80%.
- The recorded total cost of the session so far, including prior branches and compaction.

This fork shows `?` rather than a false 0% when context usage is unknown after compaction and preserves extension status text. It uses Pi's `setFooter` API; the new package path does not update existing Pi settings automatically. The `CTX:` label is never shown. As the terminal narrows, it drops the provider first, then the branch, shortens the gauge, and drops thinking. At the narrowest widths it removes the gauge before shortening the model ID, keeping used/maximum tokens, percentage, and cost (for example, at 40 columns: `model-id │ 50.0k/200.0k (25%) │ $1.234`). Below that, it reduces separator padding and then shortens the model ID; when the figures cannot fit, it shows the model ID alone. It replaces Pi's default footer: cwd/session name, cache counters, auto-compaction indicator and virtual-model route are not displayed.

## Cost updates

The footer refreshes recorded costs after completed turns, agent runs, compaction, and session-tree navigation; it does not show a live per-token charge while a response streams. The cache also checks the session and leaf IDs so newly saved usage (including cache warming) is picked up on the next render without rescanning unchanged history on every frame.

The amount is Pi's recorded usage cost, not an OpenAI account balance or invoice. Zero-priced models can still report `$0.000`, and the display rounds to three decimal places. The former cache refreshed only on Git branch changes, leaving the amount frozen during normal conversations regardless of provider.

## Offline checks

With Node.js 22.19 or newer, run the layout and cost/lifecycle regression tests without installing Pi, launching an agent, or making model requests:

```bash
node --test vendor/pi/extensions/status-line/tests/*.test.mjs
```

## License

MIT
