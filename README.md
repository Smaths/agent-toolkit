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

The portable `swarm` skill lives in `skills/` and uses the host's worker facility. Standalone Pi can use the optional [Pi CLI path](vendor/pi/swarm.md) without installing an extension; Orca uses its installed orchestration skill. Claude Code's [status-line](vendor/claude/status-line/README.md) lives in `vendor/claude/status-line/`; the legacy above-prompt `ctx` mod has been removed from this checkout. Curated Pi extensions live in [vendor/pi/extensions](vendor/pi/extensions/README.md); they are not enabled by sync. Imported tools retain their licenses. See [sources](SOURCES.md) for attribution.

See [AGENTS.md](AGENTS.md) for collection and computer enablement instructions.

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

The checks run offline after dependency setup. Sync tests use temporary homes and also run in Debian CI. They do not enable tools or evaluate model behavior. Status-line tests are included. For opt-in handoff integration checks, see [session-handoff/tests](skills/session-handoff/tests/README.md).
