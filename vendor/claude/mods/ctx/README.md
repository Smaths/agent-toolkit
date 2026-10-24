# Context band for Claude Code

`ctx` adds a row above the prompt in interactive Claude Code sessions. It shows the session model, context window fill percentage, Git branch when the workspace has one, and the session cost when available. Context fill changes color at 60% and 85%. The row stays hidden while Claude shows a survey.

`bin/sync.sh` does not enable this mod: Claude's skill directory is not a plugin installation path. For an explicitly chosen local development session, try `claude --plugin-dir ~/.skills/vendor/claude/mods/ctx` with a Claude version that supports this plugin's hooks. This is session-scoped; persistent activation requires a separate, approved Claude plugin installation. Do not infer that the mod loaded just because its files exist. To check the manifest and run its UI test, use `claude plugin validate vendor/claude/mods/ctx` and `claude plugin test vendor/claude/mods/ctx` from the repository root. Live Claude loading and the UI behavior have not been verified on Debian. See [Claude's plugin overview](https://code.claude.com/docs/en/plugins/overview.md) for supported plugin loading paths.

Claude generates `.claude-plugin/types/` for local type checking. Do not commit those generated files.
