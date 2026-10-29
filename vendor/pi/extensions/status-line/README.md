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

This fork shows `?` rather than a false 0% when context usage is unknown after compaction and preserves extension status text. It uses Pi's `setFooter` API; the new package path does not update existing Pi settings automatically. On narrow terminals it hides the branch, then model, before shortening the context gauge. It replaces Pi's default footer: cwd/session name, cache counters, auto-compaction indicator and virtual-model route are not displayed.

## License

MIT
