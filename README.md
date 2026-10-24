# Agent toolkit

My collection of skills, extensions, mods, and workflows for software development with agents, shaped around how I work.

## Philosophy

- Keep skills short and clear. Every instruction and supporting file must earn its place.
- Write for any model, vendor, agent runtime, or IDE. State required capabilities rather than assuming proprietary tools.
- Keep each skill focused on one task, usable on its own, and composable with others. Make dependencies explicit.
- Keep vendor support optional. Files such as `agents/openai.yaml` may improve integration, but the skill must work without them.
- Put vendor-specific skills and processes in `vendor/<vendor>/`. Follow that vendor's documented formats and best practices.

## Layout

```text
skills/<name>/SKILL.md                 # Portable skills
vendor/<vendor>/skills/<name>/SKILL.md # Vendor-specific skills
vendor/<vendor>/                      # Vendor-specific plugins and processes
bin/                                  # Repository tooling
```

Every skill belongs in a `skills/` directory. Keep its scripts, references, assets, tests, and optional metadata alongside `SKILL.md`. Use relative paths for supporting files and load them only when needed.

The Orca-dependent `swarm` skill lives in `vendor/orca/skills/`. The Claude Code `ctx` mod lives in `vendor/claude/mods/`. Imported skills retain their licenses. See [sources](SOURCES.md) for attribution.

## Add to the collection

When I ask an agent to "get" or "install" skills or other tools, add them to this repository. Do not install them into my computer's agent configurations.

- Put portable skills in `skills/` and vendor-specific tools in `vendor/<vendor>/`.
- Preserve upstream licenses. Record the author, source URL, revision, and local changes in [SOURCES.md](SOURCES.md).
- Review additions against the philosophy above.

Creating links, changing agent configuration, running installers, or enabling tools requires a separate, explicit request. Adding something here does not authorize running `bin/sync.sh`.

## Enable on this computer

Only when explicitly requested, run this from a checkout at `~/.skills`:

```bash
~/.skills/bin/sync.sh
```

The script links portable skills and the Orca `swarm` skill into `~/.agents/skills` and `~/.claude/skills`. `swarm` requires Orca and the installed `orchestration` skill. The `ctx` mod links only into `~/.claude/skills`.

Links point to source directories, so edits need no copying. Sync migrates links from the old repository layout and refuses to overwrite unrelated files or installations. It requires Bash and Python 3. See the [ctx README](vendor/claude/mods/ctx/README.md) for loading and testing the mod.

## Checks

Checks are tested with Python 3.13 and also need Bash and Git. Set up an isolated environment once:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r bin/requirements-check.txt
```

Then run the same entry point locally and in CI:

```bash
source .venv/bin/activate
bin/check
```

It checks skill layout and frontmatter, local Markdown links and anchors, [attribution](SOURCES.md), Python/Bash/JSON/YAML syntax, and the offline test suites. Git-tracked and untracked files are checked; ignored environments and generated files are excluded. Use Markdown links for supporting files. Code examples and external URLs are not link-checked.

The checks run offline after dependency setup. Sync tests use temporary homes. They do not enable tools or evaluate model behavior. Claude runtime tests remain separate; see the [ctx README](vendor/claude/mods/ctx/README.md). For opt-in handoff integration checks, see [session-handoff/tests](skills/session-handoff/tests/README.md).
