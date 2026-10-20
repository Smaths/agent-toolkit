# Portable, composable agent skills

This repository is the source of truth for skills shared across coding agents. Each skill lives once under `~/.skills`. The sync script exposes that source through the paths each agent expects.

Keeping the source outside any vendor directory has two benefits:

- A skill does not belong to the agent that happens to load it today.
- Updating one file updates every linked installation.

## Where files belong

Each skill gets its own directory at the repository root.

| Path | Purpose |
| --- | --- |
| `<skill>/SKILL.md` | The portable instructions and frontmatter that define the skill. |
| `<skill>/agents/<vendor>.yaml` | Optional vendor-specific display metadata. It must not contain the skill's core behavior. |
| `<skill>/scripts/`, `<skill>/references/`, and `<skill>/assets/` | Optional files used by that skill. Refer to them with paths relative to `SKILL.md`. |
| `bin/` | Scripts and tests that manage this repository. This is not a skill because it has no `SKILL.md`. |

Keep reusable behavior in `SKILL.md` and supporting files. Put only integration details in a vendor-named file. Do not maintain separate copies of a skill under `.claude`, `.pi`, or another agent's configuration directory.

## Filesystem example

The repository and its linked installations look like this after synchronization:

```text
~
├── .skills
│   ├── README.md
│   ├── bin
│   │   ├── sync.sh
│   │   └── test_sync.py
│   ├── commit-conventional
│   │   ├── SKILL.md
│   │   └── agents
│   │       └── openai.yaml
│   └── sync-docs
│       ├── SKILL.md
│       └── agents
│           └── openai.yaml
├── .agents
│   └── skills
│       ├── commit-conventional -> ~/.skills/commit-conventional
│       └── sync-docs -> ~/.skills/sync-docs
└── .claude
    └── skills
        ├── commit-conventional -> ~/.skills/commit-conventional
        └── sync-docs -> ~/.skills/sync-docs
```

Pi and other clients that support the Agent Skills paths load skills from `.agents/skills`. The `.claude/skills` links support Claude. Both locations link to the whole skill so relative supporting files continue to work.

## Composition

A skill should handle one task and state when an agent should use it. Agents can then combine skills without merging their instructions or installation steps. For example, a user can invoke `sync-docs` to update documentation, then use `commit-conventional` to inspect and commit that change.

`sync-docs` sets `disable-model-invocation: true`, so an agent does not select it automatically. In Pi, run it explicitly with `/skill:sync-docs`.

Skills should not depend on a particular agent's tools unless the task requires them. When a vendor-specific integration is necessary, isolate it in that vendor's metadata or explain the requirement in the skill.

## Add a skill

1. Create `~/.skills/<skill-name>/SKILL.md`.
2. Add any supporting files inside the same directory.
3. Add optional integration metadata under `agents/`.
4. Run the sync script.

```bash
~/.skills/bin/sync.sh
```

The script discovers root directories that contain `SKILL.md`. It creates missing links but refuses to replace an existing file, directory, or unrelated link. This prevents synchronization from overwriting a separate installation.

The script removes old Pi prompt-template links when they point to the same skill. It leaves separate prompt templates untouched. Pi exposes each shared skill once as `/skill:<name>` instead of also exposing a `/<name>` prompt command.

Run the sync tests with:

```bash
python3 ~/.skills/bin/test_sync.py
```
