# Orca session transfer

## Load the installed guide

Resolve the executable once:

- Use `ORCA_CLI_COMMAND` when set.
- Otherwise use `orca-dev` when the session exposes `ORCA_DEV_REPO_ROOT`.
- Otherwise use `orca-ide` on Linux outside an Orca-managed terminal.
- Otherwise use `orca`.

Run that executable's `skills get orca-cli --json`. Do not assume an installed skill-file path exists on the execution host. If the executable cannot run or lacks `skills get`, report the error. Do not switch executables or guess commands.

Follow the version-matched guide for syntax and recovery. This skill selects an existing workspace by default, a new worktree only when requested. Do not adopt the guide's independent-new-worktree default for session replacement. Do not create coordinator tasks or use orchestration dispatch for an ownership transfer.

From the source directory, use `worktree current --json` once to resolve its enclosing root/identity. Use that worktree as the default destination. For a user-selected different checkout, verify Orca can target that exact existing workspace and use its explicit selector. If it cannot, offer a manual command rather than importing, creating or switching anything. Use explicit host selection where needed.

## Native CLI terminal path

For a new terminal in an existing checkout, prepare the command using [cli.md](cli.md). Orca only places and starts it. This is an intentional alternative to the installed guide's normal `agent launch` route when the user wants a terminal; it does not follow Orca's Chat | CLI preference or provide a managed agent-launch receipt. A requested chat, split, remote host or new worktree needs its own documented support or the user's agreement to a different destination. The [Pi adapter](../../../vendor/pi/extensions/session-handoff/README.md) remains a distinct same-terminal route.

1. Check the installed guide and help for `terminal create` and bounded `terminal read`. Use the execution host's known shell and exact native executable/settings. On Orca 1.4.254, Linux/macOS terminals use the login shell; `--shell` is a Windows selector, not a POSIX-shell override. If the shell or destination cannot be established, save the brief and report that blocker. Offer a manual command only when its shell and settings are known.
2. Choose a unique nonsecret tab title for recovery. Save the [launch record](recovery.md) with the complete quoted command, positional startup prompt, shell and worktree selector before creating anything. From the resolved root, use `terminal create --worktree current --command <quoted-command> --title <unique-title> --focus --json`. Replace `current` only for a selected different checkout. Quote the command as one argument for the invoking shell.
3. Keep the returned handle and inspect only that terminal with bounded `terminal read --screen` output. A bounded `terminal wait --for tui-idle` may help if supported, but idle is not proof of prompt processing. Apply [CLI startup observation](cli.md#launch-once); no terminal-send call or provider-specific prompt observer is required.
4. Check the returned placement and this terminal's layout if needed. A terminal in Orca's tab layout is usable from a client even when the server has no desktop. Focus is separate: `navigated: false` alone does not prove the tab is absent. If Orca returns a background-only terminal or placement is unknown, preserve the handle and report the limitation without creating another terminal or sending the prompt again.

Orca 1.4.254 help says `terminal create` may run the command but fall back to a background handle if the UI cannot adopt it. The harness may therefore receive its prompt before placement is known. This route attempts a new tab; it cannot guarantee a usable tab before startup. If the user requires that guarantee, explain the limitation and offer a manual launch instead. Do not silently substitute a background destination for a requested visible tab.

If the create reply is lost, use the saved host/workspace/title and targeted process inspection to look for the existing attempt. The guide says programs can repaint `terminals[].title`; use the custom tab title in `visualLayouts`, plus process/cwd evidence, rather than assuming a title is a stable session ID. Never repeat creation on an ambiguous reply. An unavailable prompt observer is not a failed launch.

## Managed agent launch

Keep `agent launch` for a requested Orca-managed chat or other supported placement; use `worktree create --agent` only for an approved new worktree. The user's Chat | CLI choice and the installed guide govern placement. Check per-agent forwarding under [preflight.md](preflight.md); generic flags in help or `agent-context` do not prove support for that harness. Use Orca's documented settings options, not a native argument string. If exact Pi forwarding is unavailable, consider the native CLI path for an agreed terminal, explicitly approved configured defaults, or a manual command. Never silently drop settings or change global defaults.

The initial prompt must start read-only validation and an approval proposal, not implementation. Report an instruction-only approval boundary unless the selected runtime independently enforces one. A managed launch receipt proves neither task approval nor successful validation.

Record the receiving handle, kind and prompt outcome under [recovery.md](recovery.md). Managed receipts accept `journaled` or `handed-to-terminal` as delivery. Follow the guide's operation-ID replay procedure for an ambiguous managed launch; do not apply it to native terminal creation.

## Placement and source cleanup

Default external CLI placement is a new terminal tab. For a managed launch, default to a new agent tab and focus it when supported; Orca settings decide chat versus terminal. A window, tab and split pane are different destinations.

For a requested split, check agent-launch support. `terminal split` alone does not establish fresh-agent startup or exact settings. Do not simulate that support with a nested shell command. Explain unsupported placement and obtain agreement before substituting a tab. If split placement is supported, clarify ambiguous orientation from the installed guide.

Leave the source open unless cleanup was requested. For terminal cleanup, record the source handle and inspect its topology before launch with `terminal list --include-visual-layouts` as supported by the guide. Close only that pane after confirmed receiver startup or managed prompt delivery and the final report. Unconfirmed startup, a blocked screen or unresolved placement leaves the source open. Closing the tab also requires explicit permission and proof that no other useful panes share it. Never close the receiver or a shared tab, window, workspace or worktree.

Use a documented post-turn cleanup mechanism if available. Otherwise leave the source open and report its handle. For a chat source, use only a documented source-specific close operation, not terminal commands.
