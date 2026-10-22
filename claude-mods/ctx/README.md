# Context band for Claude Code

`ctx` adds a row above the prompt in interactive Claude Code sessions. It shows the session model, context window fill percentage, Git branch when the workspace has one, and the session cost when available. Context fill changes color at 60% and 85%. The row stays hidden while Claude shows a survey.

From this repository, run `bin/sync.sh` to link the mod to `~/.claude/skills/ctx`, then restart Claude. It has no external dependencies. To check the manifest and run its UI test, use `claude plugin validate claude-mods/ctx` and `claude plugin test claude-mods/ctx`.

Claude generates `.claude-plugin/types/` for local type checking. Do not commit those generated files.
