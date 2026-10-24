# Sources

Imported tools are local forks. Keep upstream licenses alongside them and record substantive adaptations below. Upstream updates are optional.

The YAML registry is checked by `bin/check`. Declare every skill and Claude mod as local or imported. Import entries require an author, source URL, revision, license, and artifact paths (a list or a mapping with optional local-change notes). Record substantive adaptations. Each imported directory must retain its `LICENSE`.

```yaml
local:
  - skills/commit
  - skills/session-handoff
  - skills/sync-docs
  - skills/unslop-for-agents
  - vendor/claude/mods/ctx
imports:
  - author: Matt Pocock
    source: https://github.com/mattpocock/skills
    revision: "5beb35b" # Upstream revision dated 2026-10-19
    license: MIT
    artifacts:
      skills/grilling: Uses local tools for simple fact checks.
      skills/writing-for-agents:
      skills/diagnosing-bugs:
  - author: Poteto
    source: https://github.com/cursor/plugins/tree/main/pstack
    revision: "e73df47" # Upstream revision dated 2026-10-23
    license: MIT
    artifacts:
      skills/tdd:
      skills/unslop: Copied from the local installation and verified byte-for-byte against upstream at this revision.
      skills/benchmark-checklist: Adds macOS commands and removes playbook dependencies.
      vendor/orca/skills/swarm: Adapts the workflow to supervised Orca coordination.
```

The pstack imports other than `unslop` came through the [standalone mirror](https://github.com/backnotprop/pstack). Registry checks establish completeness, not license compliance or agreement with upstream contents.
