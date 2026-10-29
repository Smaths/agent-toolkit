# Repository instructions

Read [README.md](README.md) before changing this collection for its public overview and checks.

## Scope

- Reviewing imported instructions does not authorize executing their workflows.
- Preserve unrelated changes. Report contradictions separately rather than expanding the task.

## Add to the collection

"Get" or "install" means add to this checkout with attribution. Enable tools on the computer only when separately and explicitly requested. This includes running `bin/sync.sh` or installers and changing links or agent configuration.

- Treat imported skills as local forks, not mirrors. Adapt them to the owner's workflow and repository philosophy within their license terms. Preserve licenses; record authors, source URLs, revisions, and substantive local changes in [SOURCES.md](SOURCES.md).
- Upstream updates are optional. Compare changes and preserve intentional local differences.
- Check for overlap before adding tools. Keep skills short, focused, composable, and portable across models and runtimes. State required capabilities and dependencies; vendor metadata must be optional.
- Put portable skills under `skills/` and vendor-specific tools and processes under `vendor/<vendor>/`. Follow each vendor's documented practices. Every skill belongs in a `skills/` directory. Keep supporting files beside `SKILL.md`; use relative references and load them only when needed.
- Keep one authoritative explanation and link to supporting detail rather than duplicating it.

## Enable on this computer

Only when explicitly requested, run from this checkout (for example, `~/workspace/agent-toolkit`):

```bash
bin/sync.sh --dry-run  # read-only plan; reports conflicts
bin/sync.sh            # apply
```

From another directory, invoke the checkout's `bin/sync.sh` by path. The script finds its source checkout from its own location, not from the current directory or a fixed home-directory name. By default it targets your home directory; the optional positional `home` argument changes **only the destination home** (useful for isolated tests).

The script links portable skills, including `unslop` and `swarm`, into real `~/.agents/skills` and `~/.claude/skills` directories. `swarm` uses the installed `orchestration` skill only in Orca-managed sessions. `--with-orca` remains an opt-in for any vendor-specific Orca skills; it does not change the portable `swarm` installation. The Claude status-line is **not** a skill and is not enabled by sync; owned links from the former mod's skill-path installation are removed. See the [status-line README](vendor/claude/status-line/README.md) for separate configuration and preservation of existing telemetry hooks. Codex can read `~/.agents/skills`, but separate Codex-specific and Pi installations remain outside this repo's sync policy; so do Atlassian `twg-*` skills in Claude and OpenCode and provider-synced skills.

Links point to source directories, so edits need no copying. Sync requires a populated checkout, Bash, and Python 3. It checks for destination conflicts before changing links, migrates links from the old repository layout and the former `~/.skills` or `~/.agent-toolkit` checkouts, and refuses to overwrite unrelated files or installations. `--dry-run` creates no files or directories; sync is not transactional if a filesystem error occurs during apply. Links to the checkout are absolute because agent directories may live elsewhere; moving the checkout again may break them and requires a fresh migration plan. Verify discovery in the installed agent separately.

## Verify

- Check affected frontmatter, references, dependencies, and behavior. Use focused scenarios for instruction changes and relevant offline checks from [README.md](README.md#checks) and component docs.
- Use temporary directories for tests that write configuration or links. Existing installations may link to these sources; edits can affect them. Do not sync, reload, or launch agents merely to verify edits.
- Report static review, executable tests, and live model evaluation separately. State what ran and what remains unverified.
