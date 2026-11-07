# Orca session transfer

## Load the installed guide

Resolve the executable once:

- Use `ORCA_CLI_COMMAND` when set.
- Otherwise use `orca-dev` when the session exposes `ORCA_DEV_REPO_ROOT`.
- Otherwise use `orca-ide` on Linux outside an Orca-managed terminal.
- Otherwise use `orca`.

Run that executable's `skills get orca-cli --json`. Do not assume an installed skill-file path exists on the execution host. If the executable cannot run or lacks `skills get`, report the error. Do not switch executables or guess commands.

Follow the version-matched guide for command syntax, receipts, and recovery. This skill determines the transfer target: an existing workspace by default, a new worktree only when requested. Do not adopt the guide's independent-new-worktree default for session replacement.

## Launch with the requested settings

From the source directory, use `worktree current --json` once to get its enclosing root/identity; work in that root for preflight and launch. In the same checkout, use that worktree as the implicit destination—no user-supplied path or separate file-by-file path checks. Use `agent launch` for that existing workspace, or `worktree create --agent` only for a requested new worktree. For a selected checkout other than the source, confirm Orca can target that exact existing workspace and pass its explicit `--worktree` selector; if it cannot, offer a native launch from that checkout rather than implicitly importing, creating, or switching anything. Use explicit host selection where needed. Do not create coordinator tasks or use orchestration dispatch for an ownership transfer.

The initial prompt must start validation and an approval proposal, not task execution. Unless the selected runtime provides a verified tool gate, this is an instruction-only approval boundary; report that limitation. The [Pi adapter](../../../vendor/pi/extensions/session-handoff/README.md) is a separate, same-terminal, runtime-gated path—not an Orca launch fallback. This page's native Pi terminal path opens a **new tab** and has only instruction-level task approval unless the launched runtime independently provides a verified gate.

Apply [preflight.md](preflight.md) to the selected agent and execution host. `agent launch --help` and `agent-context` expose generic flags, not proof of per-agent forwarding. Express exact settings through Orca's documented options; do not forward native argument strings to it. If exact Pi forwarding is unavailable or unverified for a requested new tab, use the native Pi terminal path below only if its checks pass. Otherwise an explicitly approved configured-default Pi launch can use `agent launch` without model/effort flags; it does not preserve or verify source settings. Never silently drop requested settings or change defaults to bypass a refusal.

### Native Pi terminal path (exact settings, existing checkout)

Use this only when the requested destination is a terminal in an existing workspace on the same execution host. Orca's `terminal create --command` opens a shell terminal, **not** an Orca agent launch: do not claim Orca's chat placement, agent-launch receipt, or policy applies to it. Require an explicit terminal placement or the skill's default tab placement; ask before replacing a requested chat, split, remote host, or new worktree. Check the installed Orca guide and help for `terminal create`, `terminal read`, `terminal wait`, and `terminal send --wait-submit --retry-request`, and check Pi's native flags on that host. Verify the terminal's actual working directory and effective trust/tool policy can be checked without widening permissions. Require a visible tab; Orca can fall back to a background handle, which must not receive the prompt. If any of these are unknown, use the manual path. Shell quoting must match the destination's known shell; support only a known POSIX shell, with no user-provided shell fragments.

1. From the resolved worktree root, record the exact absolute Pi executable, provider, model ID, thinking level, and Orca worktree identity. Use `--worktree current` from that root for the default same-worktree transfer; use an explicit selector only for a user-selected different checkout. Use a unique non-secret tab title to aid recovery. Prepare one shell-quoted `exec <pi-executable> --provider <provider> --model <model> --thinking <level>` command (omit `--thinking` only when reasoning is genuinely not applicable). `exec` replaces the interactive shell with a fresh Pi process. Never use continue, resume, fork, `--print`, backgrounding, policy-bypass flags, or an initial prompt in the shell command.
2. Save the launch record **before** `terminal create --worktree current --command <command> --title <unique-title> --focus --json` (replace `current` with the verified selector only for a selected different checkout). Keep the original prompt in the record, but do not send it yet. A create reply may give a terminal handle without proving Pi started. If the reply is lost, inspect that host/workspace for the unique title and process; never create another terminal on a timeout or ambiguous reply.
3. Inspect only this terminal (bounded `terminal wait --for tui-idle` and `terminal read --screen`). Verify a visible tab with a fresh Pi process at its ready input—not a trust, permission, login, or error screen. Confirm its process/cwd and trust/tool policy once before prompt delivery, against the saved worktree root and native command; this is not a second search through task file paths. Check process arguments without printing secrets or the handoff prompt. An unknown or mismatched state blocks sending; keep the terminal and source open and report the handle. Do not answer a trust prompt on behalf of the user.
4. Once ready, use `terminal send --terminal <handle> --text <unchanged-prompt> --enter --wait-submit <bounded-seconds> --json`. Record its request ID and stages. Only `turn_started` establishes delivery for this path; `input_accepted` alone is unconfirmed. If transport fails, use the guide's `--retry-request` with the **same** payload and handle, or inspect without input when no valid ID exists. Never resend on silence. Record terminal handle, kind `terminal`, and prompt outcome separately from Orca agent-launch receipts. Turn start does not prove task completion or model inference; native flags establish requested selection, not independently observed effective settings.

Use only an actual Pi agent session in a visible Orca terminal; this is not permission to start a nested agent in a background shell or use `terminal split --command` as a substitute for a requested split. When this path is unsupported, offer the native manual command instead of inventing a delivery receipt.

Record the exact receiving handle, kind, and prompt outcome as described in [recovery.md](recovery.md). Agent-launch receipts accept `journaled` or `handed-to-terminal` as delivery; the native Pi path instead requires the terminal-send `turn_started` stage.

## Placement and source cleanup

Default to a new agent tab and focus it when supported. Orca settings decide whether that tab contains a chat or terminal. A window, tab, and split pane are different destinations.

For a requested split, check agent-launch support. `terminal split` alone does not establish fresh-agent launch or model and prompt delivery. Do not simulate that support by starting a nested agent through `--command`. Explain unsupported placement and obtain agreement before substituting a tab. If split placement is supported, clarify ambiguous orientation and read its meaning from the installed guide rather than caching it here.

Leave the source open unless the user requested cleanup. For terminal cleanup, record the source handle and inspect its topology before launch with `terminal list --include-visual-layouts` as supported by the guide.

Close only the identified source pane after confirmed delivery and the final report. Closing its tab also requires explicit permission and verification that no other useful panes share it. Never close the receiver, a shared tab, all terminals, or a whole window, workspace, or worktree.

Use a documented post-turn cleanup mechanism if available. Otherwise leave the source open and report its handle. Give a documented manual close action if one exists; otherwise explain the limitation. For a chat source, use only a documented source-specific close operation. Do not treat its handle as a terminal handle.
