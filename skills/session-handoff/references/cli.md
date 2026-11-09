# External CLI startup

Use this for a fresh interactive session in a new terminal. The harness receives its initial prompt as a positional argument. A terminal launcher, including Orca, only places and starts that command. For Orca placement, also read [orca.md](orca.md#native-cli-terminal-path).

## Prepare the command

1. Apply [preflight.md](preflight.md) on the execution host. Resolve the installed executable, version, positional-prompt support, exact settings, destination shell and checkout. Use the documented interactive invocation, not one-shot modes such as `--print` or `codex exec`, or JSON/RPC interfaces. Keep stdin and stdout attached to a terminal; redirecting either can select one-shot mode. If required settings or shell behavior are unknown, save the brief and report the blocker instead of guessing a command.
2. Use the short [startup prompt](../SKILL.md#4-deliver-once-and-stop), with the brief's absolute path. Keep private task context in the brief outside the checkout. Arguments can appear in process listings, shell history and launcher logs, so the path and prompt must contain no secrets. Start the prompt with an instruction such as `Read`, not an option, slash command or file-attachment shorthand.
3. Build an argument list containing the resolved executable, supported settings and one unchanged prompt argument. Use the [agent profiles](preflight.md#agent-profiles) for native differences. Omit all continue, resume, fork and existing-session selectors. Keep the normal trust and permission policy; do not add credentials or bypass flags.
4. Quote each argument for the destination shell. For a known POSIX shell, use `shlex.join(argv)` when Python is available, or single-quote each argument and encode an embedded apostrophe as `'"'"'`. Prefix the quoted command with `exec` to replace the shell. If passing the command as another CLI's `--command` argument, quote that entire string again for the invoking shell. Do not interpolate user-provided shell fragments. Other shells need their own documented quoting. If it cannot be established, save the brief and ask for a supported shell; do not invent a manual command.

For example, this is the command text for a POSIX destination shell, not the outer terminal-launch command. Replace every placeholder with verified, nonsecret values:

```sh
exec '/absolute/path/to/pi' --provider 'provider-id' --model 'exact-model-id' --thinking 'high' 'Read /private/state/handoff.md and follow Receiver startup. Inspect read-only, propose the next step, ask for fresh approval, then stop before tests or edits.'
```

Native flags establish requested settings. Pi can fuzzy-match a model and clamp its thinking level; Claude aliases can change. Preserve exact IDs and compatible values, and report effective settings as unconfirmed unless independently observed.

## Launch once

Save the [launch record](recovery.md) before invoking the terminal launcher from the selected checkout. For a manual command, name the execution host and directory and leave the attempt unconfirmed until the user runs it. Do not also send the prompt through a terminal-input API.

After an automatic launch, inspect only the returned terminal with bounded, task-scoped output when available. Record these facts separately:

- Whether terminal/process creation was confirmed, failed or remains unknown, with its handle if available.
- Whether the startup command included the prompt. This is not an acknowledgment from the harness.
- Whether receiver startup was observed, blocked by a trust/login/error screen, or remains unconfirmed. A receiver proposal is evidence of startup, not user approval.
- Whether the terminal has the requested tab or pane. Focus is separate from placement.

Check observable process/cwd/settings against the saved command and checkout without printing secrets. Report a mismatch or blocked screen; let the user resolve trust or login prompts. An unavailable prompt observer does not establish failure, and a terminal handle alone does not establish receiver startup. Record unknowns and stop; do not wait for task completion or require a new acknowledgment protocol. Follow [recovery.md](recovery.md) on an ambiguous result, without relaunching or resending on silence.

## Approval limit

External startup has an instruction-only task-approval boundary unless the selected runtime independently enforces one. The receiver must inspect read-only, propose and wait for fresh approval. Normal startup can still execute configured hooks/extensions and write session records before the model follows that instruction. A fresh conversation does not disable project instructions, configuration or memory. If a hard gate is required, use a verified gated route such as the distinct same-terminal [Pi adapter](../../../vendor/pi/extensions/session-handoff/README.md), or stop and ask.

## Documentation checked

This workflow was checked against installed Pi 1.5.0, Claude Code 2.1.319 and Codex 0.165.0 help. At review, latest stable releases were [Pi 1.5.0](https://github.com/earendil-works/pi/releases/tag/v1.5.0), [Claude Code 2.1.319](https://github.com/anthropics/claude-code/releases/tag/v2.1.319) and [Codex 0.167.0](https://github.com/openai/codex/releases/tag/rust-v0.167.0). This is documentation evidence, not a live launch result or a promise for other versions.

- [Pi 1.5.0 CLI](https://github.com/earendil-works/pi/blob/v1.5.0/packages/coding-agent/docs/cli.md) and [integration modes](https://github.com/earendil-works/pi/blob/v1.5.0/packages/coding-agent/docs/cli-integration.md) document initial messages, terminal mode and selection flags. [Security](https://github.com/earendil-works/pi/blob/v1.5.0/packages/coding-agent/docs/security.md) describes trust and process permissions.
- [Claude CLI](https://code.claude.com/docs/en/cli-reference) documents `claude "query"`; [SessionStart hooks](https://code.claude.com/docs/en/hooks#sessionstart) run before the first response. Current docs are not version-pinned; use installed help for accepted values.
- [Codex CLI overview](https://developers.openai.com/codex/cli/), [configuration reference](https://developers.openai.com/codex/config-reference/) and the [0.165.0 CLI definition](https://github.com/openai/codex/blob/rust-v0.165.0/codex-rs/tui/src/cli.rs) support the native prompt/settings path. The detailed web CLI reference could not be retrieved during review; installed help and tagged source supplied the positional-prompt evidence.
