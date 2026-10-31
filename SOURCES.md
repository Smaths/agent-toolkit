# Sources

Imported tools are local forks. Keep upstream licenses alongside them and record substantive adaptations below. Upstream updates are optional.

The YAML registry is checked by `bin/check`. Declare every skill as local or imported, and record imported tools. Import entries require an author, source URL, revision, license, and artifact paths (a list or a mapping with optional local-change notes). Record substantive adaptations. Each imported directory must retain its `LICENSE`.

```yaml
local:
  - skills/commit
  - skills/session-handoff
  - skills/sync-docs
  - skills/unslop-for-agents
  - skills/verification-readiness
imports:
  - author: Matt Pocock
    source: https://github.com/mattpocock/skills
    revision: "5beb35b" # Upstream revision dated 2026-10-19
    license: MIT
    artifacts:
      skills/html-report: Adapts evidence-backed visual reporting and option comparison into a general skill; replaces the CDN scaffold and architecture-specific format with the Snarfum design-system dependency and offline CSS embedding. No upstream prose copied.
      skills/grilling: Uses local tools for simple fact checks.
      skills/writing-for-agents:
      skills/diagnosing-bugs:
  - author: Thomas van Dongen (Pringled)
    source: https://github.com/Pringled/pi-extensions
    revision: "e5ed6372bbf82e7bcb61902b0c11a7e2514efae0"
    license: MIT
    artifacts:
      vendor/pi/extensions/status-line: Renames the upstream pi-context-bar package and extension to status-line; caches total session cost across render frames, distinguishes unknown context usage, orders the footer as branch, model, context, and cost, and now prioritizes model, context gauge, used/maximum tokens, percentage, and cost on narrow terminals by removing the context label entirely and dropping provider before branch, then thinking and eventually the gauge before shortening the model ID, with offline width tests. Refreshes cached costs against saved session state and post-persistence lifecycle events rather than only Git branch changes; adds offline cost and lifecycle regression tests.
      vendor/claude/status-line: Adapts Thomas van Dongen's MIT-licensed context layout to Claude's documented JSON-in/ANSI-out status-line API with Python and optional Git. Preserves unknown context, displays Claude's reported effort beside the model, counts cache tokens without output tokens, sizes to COLUMNS with branch/context/cost priority on narrow panes, and optionally forwards input to an existing telemetry command. Adds offline rendering, worktree, and forwarding tests; renamed from statusline/ctx.py.
  - author: Poteto
    source: https://github.com/cursor/plugins/tree/main/pstack
    revision: "e73df47" # Upstream revision dated 2026-10-23
    license: MIT
    artifacts:
      skills/tdd:
      skills/unslop: Copied from the local installation and verified byte-for-byte against upstream at this revision.
      skills/benchmark-checklist: Adds macOS commands and removes playbook dependencies.
      skills/swarm: Makes the workflow portable and defaults to coverage. Separates code editing and race rules from the common workflow, moves runtime guidance to a reference while preserving Orca supervision and the Pi path, scales evidence to the task, makes report tables optional, and requires completion or cancellation of outstanding race workers after selecting a winner.
```

The `html-report` inspiration at Matt Pocock revision `5beb35b040e3de97e54fa9e386d7e42d15c295c2`: [architecture skill](https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/improve-codebase-architecture/SKILL.md), [HTML report guidance](https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/improve-codebase-architecture/HTML-REPORT.md), and [design it twice](https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/codebase-design/DESIGN-IT-TWICE.md). The local skill generalizes their content principles; the original MIT license is retained.

The pstack imports other than `unslop` came through the [standalone mirror](https://github.com/backnotprop/pstack). Registry checks establish completeness, not license compliance or agreement with upstream contents.
