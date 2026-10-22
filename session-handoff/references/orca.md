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

Use `agent launch` for the resolved existing workspace, or `worktree create --agent` for a requested new worktree. Use explicit host and workspace selection where needed. Do not create coordinator tasks or use orchestration dispatch for an ownership transfer.

Apply `references/preflight.md` to the selected agent and execution host. `agent launch --help` and `agent-context` expose generic flags, not proof of per-agent forwarding. Express requested settings through Orca's documented options; do not forward native argument strings to it. Never drop requested settings to bypass a refusal.

Record the exact receiving handle, kind, and prompt outcome as described in `references/recovery.md`. The current guide accepts `journaled` or `handed-to-terminal` as delivery, not proof that a turn started or that settings match.

## Placement and source cleanup

Default to a new agent tab and focus it when supported. Orca settings decide whether that tab contains a chat or terminal. A window, tab, and split pane are different destinations.

For a requested split, check agent-launch support. `terminal split` alone does not establish fresh-agent launch or model and prompt delivery. Do not simulate that support by starting a nested agent through `--command`. Explain unsupported placement and obtain agreement before substituting a tab. If split placement is supported, clarify ambiguous orientation; Orca uses `horizontal` for left/right and `vertical` for top/bottom.

Leave the source open unless the user requested cleanup. For terminal cleanup, record the source handle and inspect its topology before launch with `terminal list --include-visual-layouts` as supported by the guide.

Close only the identified source pane after confirmed delivery and the final report. Closing its tab also requires explicit permission and verification that no other useful panes share it. Never close the receiver, a shared tab, all terminals, or a whole window, workspace, or worktree.

Use a documented post-turn cleanup mechanism if available. Otherwise leave the source open and report its handle. Give a documented manual close action if one exists; otherwise explain the limitation. For a chat source, use only a documented source-specific close operation. Do not treat its handle as a terminal handle.
