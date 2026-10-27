# Context band for Claude Code

Legacy above-prompt implementation, retained as a disabled fallback. Prefer the [custom status line](../../statusline/README.md) for the gauge below the input box. Do not enable both unless you want duplicate bars.

`ctx` adapts the local [Pi context bar](../../../pi/extensions/pi-context-bar/README.md) to Claude Code's terminal `AbovePrompt` band:

```text
⎇ main │ Opus │ Context: [█████░░░░░░░░░░░░░░░] 50.0k/200.0k (25%) │ $1.234
```

## Behavior

- Branch, model, a 20-cell context gauge, used/window tokens, and session cost to three decimals.
- Green below 50%, yellow from 50%, red from 80%. Unknown usage shows a dim empty gauge and `?`, not green 0%.
- Right-aligned within `bodyColumns`. On narrow terminals, omit branch, then model, then shorten the gauge to five cells; truncate only when that still cannot fit. Unfamiliar Unicode is budgeted conservatively at two columns per code point, so names can disappear slightly early.
- Refresh on interactive startup, completed turns, context/cost measurements, model switches, and clear/resume/fork/compaction lifecycle events. Git runs in the session cwd, not the main worktree's root. A slower old refresh cannot overwrite a newer one.
- Yield to surveys and zero-space layouts. No queries in noninteractive sessions.

### Differences from Pi

This adds an above-prompt row rather than replacing Claude's footer. It uses Claude's reported model string, without fabricated provider or thinking-level metadata. Cost comes directly from Claude's session ledger, not a reconstruction of Pi session entries; unavailable cost is omitted. Missing or failed usage reads show unknown figures until the next successful refresh.

The plain `session.usage()` API reports the live window. Its tokens and percentage are absent before the first response and after compaction. The mod deliberately does not use the `/context` breakdown estimate, whose denominator can differ. See [Claude's mod types](https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts).

Pi's extension-status row has no direct equivalent here. As before, this mod replaces other mods' content at the same band site rather than composing it.

## Loading

`bin/sync.sh` does not enable this mod. When explicitly requested, try a session-scoped load from the repository root with a Claude version supporting mods:

```bash
claude --plugin-dir "$(pwd -P)/vendor/claude/mods/ctx"
```

For explicitly requested persistent activation, the local [marketplace](../../.claude-plugin/marketplace.json) supports a user-scoped installation from the repository root:

```bash
claude plugin install ctx --marketplace "$(pwd -P)/vendor/claude" --scope user
claude plugin enable ctx@snarfum-agent-toolkit --scope user
claude plugin list
```

This local marketplace reads the plugin from this checkout; keep the checkout in place. Start a new Claude Code session, or run `/reload-plugins` in an existing one, to load it. To disable it, run `claude plugin disable ctx@snarfum-agent-toolkit --scope user`. Do not infer live loading from files alone. See [Claude's mods overview](https://code.claude.com/docs/en/plugins/mods/overview.md).

## Checks

Run manifest validation and the offline tests in a temporary copy and configuration home, without launching a session:

```bash
trial=$(mktemp -d)
cp -R vendor/claude/mods/ctx "$trial/ctx"
mkdir "$trial/home"
HOME="$trial/home" CLAUDE_CONFIG_DIR="$trial/home/.claude" claude plugin validate "$trial/ctx"
HOME="$trial/home" CLAUDE_CONFIG_DIR="$trial/home/.claude" claude plugin test "$trial/ctx"
```

Validated with Claude Code 2.1.308 on macOS; 14 tests pass. Validation reports missing author metadata and an optional marketplace icon. Tests exercise formatting, thresholds, unknown/invalid data, narrow and Unicode layouts, surveys, lifecycle refreshes, worktree cwd, read failures, and overlapping refreshes. They run without sign-in, model calls, or network. The two initial gauge/unknown-state tests failed against the previous implementation.

Live terminal painting, theme appearance, actual provider readings, and Debian runtime behavior remain unverified. No live model evaluation was run. Claude's test harness checks element trees, not how the terminal paints them; see [testing mods](https://code.claude.com/docs/en/plugins/mods/test.md).

Claude can generate `.claude-plugin/types/` for local TypeScript checking; generated files are ignored. A standalone TypeScript check is not part of these tests.

## License

The adapted Pi layout is MIT-licensed by Thomas van Dongen. See [LICENSE](LICENSE) and the [source registry](../../../../SOURCES.md).
