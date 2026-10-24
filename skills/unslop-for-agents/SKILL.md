---
name: unslop-for-agents
description: Edit agent instructions for reliable behavior and plain language.
disable-model-invocation: true
---

# Unslop for agents

Edit skills, `AGENTS.md`, and other agent-facing instructions. Preserve behavior unless the user requests a change.

## Process

1. Read [writing-for-agents](../writing-for-agents/SKILL.md) and [unslop](../unslop/SKILL.md) as required references. When editing a skill, also read [skill mechanics](../writing-for-agents/SKILL-MECHANICS.md). Apply runtime-specific invocation advice only where supported by the target runtime.
2. Apply `writing-for-agents` to structure. Make triggers, required actions, references, and completion criteria explicit. Keep shared rules in one authoritative place.
3. Apply `unslop` to wording, using the conflict rules below.
4. Compare the revision with the original. Account for every requirement, trigger, exception, permission boundary, and completion criterion. Restore unintended changes and verify that references still reach the intended material. Report unresolved contradictions rather than inventing policy.

## Conflict rules

- Operational meaning takes priority over style. Preserve commands, identifiers, paths, and required syntax when editing surrounding prose.
- Keep defined terms when they name useful distinctions. Prefer explicit instructions when a compact term requires guessing.
- Keep portable rules when they affect behavior. Applicability to other projects is not grounds for deletion.
