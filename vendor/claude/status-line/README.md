# status-line (Claude Code)

A context gauge **below the input box**, using Claude Code's documented [custom status-line API](https://code.claude.com/docs/en/statusline.md). No plugin or marketplace is required.

```text
⎇ main │ Opus · high │ CTX: [█████░░░░░░░░░░░░░░░] 50.0k/200.0k (25%) │ $1.234
```

## Behavior

[status-line.py](status-line.py) reads JSON on stdin and prints one ANSI-colored line. Requires Python 3; Git is optional. No packages, model calls, or network are needed for the gauge.

- Branch, model with known reasoning effort, a 20-cell gauge, input/window tokens, and session cost to three decimals. Reads `effort.level` from Claude's status-line JSON, including changes made with `/effort`; omits it when unavailable.
- Green below 50%, yellow from 50%, red from 80%. Unknown usage is a dim gauge with `?`, not green 0%.
- Reads `context_window.used_percentage` and `total_input_tokens`; if the latter is absent, sums input + cache-write + cache-read tokens from `current_usage`, never output tokens. Explicitly null `current_usage` means unknown, including after compaction.
- Uses `cost.total_cost_usd` from Claude's ledger; absent cost is omitted, a real zero is shown.
- Git runs in `workspace.current_dir`, falling back to `cwd`, with a 0.5-second timeout. Detached HEAD displays `HEAD`; unavailable Git displays `no git`.
- Uses Claude's `COLUMNS` environment variable, leaving two columns for host spacing (80-column fallback). On narrow panes it keeps the branch, token counts, percentage, and cost: removes `CTX:` and halves the gauge from 20 to 10 cells, then drops model/effort and shortens the gauge as far as five cells. Long branch names are truncated before sacrificing context or cost; at widths too small for all essentials, it may omit the branch or truncate the line. Unfamiliar Unicode is budgeted conservatively. Claude's notifications can still reduce the space available.
- Left-aligned in Claude's status-line row. Set `NO_COLOR` for plain text. Invalid or empty JSON produces no output.

Claude controls refreshes, cancellation, and temporary hiding during dialogs. There is no mod state, lifecycle hook, or background watcher. A custom status line hides most built-in keyboard hints but does not replace footer badges.

## Enable only when requested

Set the `statusLine` field in `~/.claude/settings.json` (or the chosen Claude configuration directory), preserving other settings:

```json
{
  "statusLine": {
    "type": "command",
    "command": "python3 /absolute/path/to/agent-toolkit/vendor/claude/status-line/status-line.py"
  }
}
```

Use an absolute interpreter path if Python is not on Claude's PATH, and shell-quote paths containing spaces. No executable bit is needed when invoking the interpreter. Keep this checkout in place. Claude reloads settings automatically; if an old mod remains visible, start a new session or reload plugins yourself.

`bin/sync.sh` does not configure the status line. If an earlier checkout's `ctx` mod is still enabled, disable it separately to avoid duplicate bars; removing its source here does not uninstall an existing plugin. When moving from the old `vendor/claude/statusline/ctx.py` path, update your `statusLine.command` setting yourself after reviewing any existing command.

### Preserve an existing telemetry hook

Do not overwrite an existing status-line command without reviewing it. On this computer, Orca already uses that command to receive usage telemetry. Its original command is saved outside the repository at `~/.claude/statusline-before-ctx.sh`, and the configured command adds:

```text
--forward-command /absolute/path/to/.claude/statusline-before-ctx.sh
```

This optional POSIX-shell file receives the **same raw stdin**. Its stdout/stderr are discarded so only the gauge is displayed; failure or a two-second timeout does not suppress the gauge. The forwarded command runs with your permissions and may make network requests; only use a reviewed command. The renderer itself has no Orca dependency. Tests use a fake hook, never Orca's live endpoint.

Orca may manage this setting again in future. If the gauge disappears after an Orca update, inspect the setting rather than assuming the script failed. To undo the conversion, restore the backed-up `statusLine` value; preserve any unrelated settings added since.

## Checks

From the repository root:

```bash
python3 -B vendor/claude/status-line/tests/test_status_line.py
```

These tests also run through `bin/check`. They cover formatting, effort display, thresholds, null/invalid input, cache accounting, narrow and Unicode layouts, ANSI sanitization, real temporary Git worktrees, subprocess failures, and forwarding through a fake hook.

Static review and offline tests do not establish live terminal appearance or Orca telemetry delivery. No agent session or live model is launched for verification.

## Attribution

Based on Thomas van Dongen's MIT-licensed context layout. See [LICENSE](LICENSE) and [SOURCES.md](../../../SOURCES.md).
