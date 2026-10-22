# Agent skills and Claude mods

This repository stores shared agent skills and Claude mods under `~/.skills`. Run `bin/sync.sh` to link them into the agent directories. Edits to a linked source take effect without copying it again.

## Where files belong

Each shared skill gets its own directory at the repository root. Claude mods live under `claude-mods/` because they are plugins, not skills.

| Path | Purpose |
| --- | --- |
| `<skill>/SKILL.md` | The portable instructions and frontmatter that define the skill. |
| `<skill>/agents/<vendor>.yaml` | Optional vendor-specific display metadata. It must not contain the skill's core behavior. |
| `<skill>/scripts/`, `<skill>/references/`, and `<skill>/assets/` | Optional files used by that skill. Refer to them with paths relative to `SKILL.md`. |
| `claude-mods/<mod>/.claude-plugin/plugin.json` | Claude mod manifest. Keep its hooks, tests, and type declarations in the same mod directory. |
| `bin/` | Sync script and tests. This is not a skill because it has no `SKILL.md`. |

Keep reusable behavior in `SKILL.md` and supporting files. Put only integration details in a vendor-named file. Do not maintain separate copies of a skill under `.claude`, `.pi`, or another agent's configuration directory. Claude mods do not need `SKILL.md` and do not load from `.agents/skills`.

## Filesystem example

The repository and its linked installations look like this after synchronization:

```text
~
├── .skills
│   ├── README.md
│   ├── bin
│   │   ├── sync.sh
│   │   └── test_sync.py
│   ├── claude-mods
│   │   └── ctx
│   │       ├── .claude-plugin/plugin.json
│   │       ├── hooks/
│   │       ├── tests/
│   │       └── types/
│   ├── commit-conventional/
│   ├── session-handoff/
│   └── sync-docs/
├── .agents
│   └── skills
│       ├── commit-conventional -> ~/.skills/commit-conventional
│       ├── session-handoff -> ~/.skills/session-handoff
│       └── sync-docs -> ~/.skills/sync-docs
└── .claude
    └── skills
        ├── commit-conventional -> ~/.skills/commit-conventional
        ├── ctx -> ~/.skills/claude-mods/ctx
        ├── session-handoff -> ~/.skills/session-handoff
        └── sync-docs -> ~/.skills/sync-docs
```

Pi and other clients that support Agent Skills paths load shared skills from `.agents/skills`. Claude loads skills and the `ctx` mod from `.claude/skills`. The links point to whole directories so relative file paths work.

## Composition

A skill should handle one task and state when an agent should use it. Agents can then combine skills without merging their instructions or installation steps. For example, a user can invoke `sync-docs` to update documentation, then use `commit-conventional` to inspect and commit that change.

Use `swarm` to investigate a prompt or plan, split it into single-session tasks, identify safe parallel work, and produce the next worker and continuation prompts. It targets 70% unused context with a 50% minimum, routes work by complexity and risk, and plans without launching workers unless authorized. Its sources, templates, and review scenarios live under `swarm/`.

`sync-docs` and `session-handoff` set `disable-model-invocation: true`, so an agent does not select them automatically. In Pi, invoke them with `/skill:sync-docs` or `/skill:session-handoff`.

Use `/skill:session-handoff` to replace the current session while keeping its workspace and agent settings unless you specify overrides. A plain "handoff" request may select `orca-cli` instead, whose default can create an independent worktree. The session-handoff skill uses agent-specific preflight checks, records task-critical capabilities, and keeps a private launch-recovery record beside the handoff. Its optional Python checker is read-only; it never launches agents or closes terminals. Orca instructions load only when needed. The skill does not manage supervised workers. After editing a skill in an active Pi session, use `/reload`.

Skills should not depend on a particular agent's tools unless the task requires them. When a vendor-specific integration is necessary, isolate it in that vendor's metadata or explain the requirement in the skill.

## Add and install

1. Create `~/.skills/<skill-name>/SKILL.md`.
2. Add any supporting files inside the same directory.
3. Add optional integration metadata under `agents/`.
4. Run the sync script. For a Claude mod instead, create `claude-mods/<name>/.claude-plugin/plugin.json` and put its hooks and tests alongside it. The script links it to `~/.claude/skills/<name>` only.

```bash
~/.skills/bin/sync.sh
```

The script finds root directories with `SKILL.md` and mod directories with `.claude-plugin/plugin.json`. It creates missing links but refuses to replace an existing file, directory, or unrelated link. Restart Claude to load a newly linked mod.

The script removes old Pi prompt-template links when they point to the same skill. It leaves separate prompt templates untouched. Pi exposes each shared skill once as `/skill:<name>` instead of also exposing a `/<name>` prompt command.

Check the sync script, handoff decision logic, and the `ctx` mod with:

```bash
python3 ~/.skills/bin/test_sync.py
python3 -B ~/.skills/session-handoff/tests/test_check_handoff.py
claude plugin validate ~/.skills/claude-mods/ctx
claude plugin test ~/.skills/claude-mods/ctx
```

Handoff fixtures do not establish live Orca compatibility. See `session-handoff/tests/README.md` for the separately authorized live smoke-test procedure.
