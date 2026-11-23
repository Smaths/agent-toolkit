# Sources

Imported tools are local forks. Keep upstream licenses alongside them and record substantive adaptations below. Upstream updates are optional.

The YAML registry is checked by `bin/check`. Declare every skill as local or imported, and record imported tools. Import entries require an author, source URL, revision, license, and artifact paths (a list or a mapping with optional local-change notes). Record substantive adaptations. Each imported directory must retain its `LICENSE`.

```yaml
local:
  - skills/commit
  - skills/recap
  - skills/sync-docs
  - skills/unslop-for-agents
  - skills/verification-readiness
imports:
  - author: Matt Pocock
    source: https://github.com/mattpocock/skills
    revision: "5863806dd4e15c63174bee4e7515a4256792ecfa"
    license: MIT
    artifacts:
      skills/session-handoff: Imports skills/productivity/handoff/SKILL.md as the baseline. Retains the session-handoff name and makes suggested-skills wording portable instead of requiring a Skill tool. Adds persistent home-directory handoffs, unique filenames, working-directory and next-task context, and fresh interactive launch through an existing host with a manual command fallback. Adds a plain-text startup template shared by automatic and manual pickup. The receiver proceeds with safe read-only work while preserving constraints and authorization. Keeps the enhanced workflow in SKILL.md. Aligns Codex UI metadata and explicit invocation policy, requires receiver filesystem access before launch, and distinguishes session creation from prompt submission. Retains the historical external launch workflow, references, checker and tests as opt-in material; neither the portable skill nor the native Pi adapter loads them.
  - author: Mario Zechner
    source: https://github.com/earendil-works/pi
    revision: "v1.4.0"
    license: MIT
    artifacts:
      vendor/pi/extensions/session-handoff: Adapts the native handoff example's fresh-session lifecycle and command bridge. Replaces transcript summarization and editor submission with a native reference-first brief, private launch records, bounded Git and file inspection, a fail-closed model-tool approval gate, state-drift checks, and offline filesystem/lifecycle tests. Adds user-confirmed, runtime-local file/directory read grants without task approval or installation-specific paths. Separates observed prompt submission from run settlement, repairs delivery records from matching receiver history without replay, makes restored evidence requirements explicit, and reserves the approval question for the adapter. Bundles the native brief alongside the entry point, separate from the historical external launch workflow. Does not install or enable the adapter.
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
      vendor/pi/extensions/status-line: Renames the upstream pi-context-bar package and extension to status-line; caches total session cost across render frames, distinguishes unknown context usage, orders the footer as branch, model, context, and cost, and removes the context label entirely. On narrow terminals, drops the visual gauge first while retaining all text, then provider, thinking level, branch name, and Git counts before shortening the model ID, with offline width-boundary tests preserving numeric context and cost. Refreshes cached costs against saved session state and post-persistence lifecycle events rather than only Git branch changes; adds offline cost and lifecycle regression tests. Adds per-file Git status counts beside the branch with asynchronous bounded reads, tool-event and idle refreshes, cancellation on disposal, count-preserving width fallbacks, and offline parser, temporary-repository, polling, and footer tests.
      vendor/claude/status-line: Adapts Thomas van Dongen's MIT-licensed context layout to Claude's documented JSON-in/ANSI-out status-line API with Python and optional Git. Preserves unknown context, displays Claude's reported effort beside the model, counts cache tokens without output tokens, sizes to COLUMNS with branch/context/cost priority on narrow panes, and optionally forwards input to an existing telemetry command. Adds offline rendering, worktree, and forwarding tests; renamed from statusline/ctx.py.
      vendor/pi/extensions/pi-away: Replaces the executable idle recap extension with an on-demand /recap prompt template; removes timers, widgets, nested model calls, and runtime dependencies. Documents local loading and conversation-only limitations.
      vendor/pi/extensions/pi-heads-up: Replaces the automatic second-look extension with an on-demand /heads-up prompt template; removes tool-count gating, widgets, nested model calls, and runtime dependencies. Requires a stated basis and distinguishes possible risks from confirmed problems.
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

## Retired Pi packages

These five reference-only executable packages were removed from the checkout. Git history retains each full package, including its MIT license, at commit `062fb997a5e07f31a04cdadd5d366965566a5b67`. All five came from Thomas van Dongen (Pringled), [pi-extensions at `e5ed6372bbf82e7bcb61902b0c11a7e2514efae0`](https://github.com/Pringled/pi-extensions/tree/e5ed6372bbf82e7bcb61902b0c11a7e2514efae0). They are not loadable from the current checkout.

- [pi-next-prompt](https://github.com/Smaths/agent-toolkit/tree/062fb997a5e07f31a04cdadd5d366965566a5b67/vendor/pi/extensions/pi-next-prompt): Kept the experimental implementation unchanged, removed trial and install guidance, and documented lifecycle, cost, cancellation and editor limits.
- [pi-background](https://github.com/Smaths/agent-toolkit/tree/062fb997a5e07f31a04cdadd5d366965566a5b67/vendor/pi/extensions/pi-background): Bounded log tail reads and status output, used private unique log directories, validated timeouts, and capped wake-match memory.
- [pi-checkpoints](https://github.com/Smaths/agent-toolkit/tree/062fb997a5e07f31a04cdadd5d366965566a5b67/vendor/pi/extensions/pi-checkpoints): Rejected symlink paths, took snapshots from a single read, created private blobs, and reported partial restore errors.
- [pi-model-pick](https://github.com/Smaths/agent-toolkit/tree/062fb997a5e07f31a04cdadd5d366965566a5b67/vendor/pi/extensions/pi-model-pick): Overlapped Pi's `/model`; no substantive local implementation changes were recorded.
- [pi-polish](https://github.com/Smaths/agent-toolkit/tree/062fb997a5e07f31a04cdadd5d366965566a5b67/vendor/pi/extensions/pi-polish): Skipped expensive highlighting for large diffs and import scanning for large Python files, and fixed narrow-width rendering.

## Additional references

The local `recap` skill is original wording informed by [Claude Code's session recap](https://code.claude.com/docs/en/interactive-mode#session-recap) (bounded output), [Daniel Miessler's Fabric summarization pattern](https://github.com/danielmiessler/Fabric/blob/main/data/patterns/summarize/system.md) (scannable structure without repetition), [Annika Lewis's claude-recap](https://github.com/annikalewis/claude-recap) (thematic grouping and honest light-session reporting), and [ProstDev's recap article](https://prostdev.com/post/recap-skills-catch-up-on-any-claude-session/) (separating reporting from execution). No upstream prose or code was copied. It uses only the current conversation, optional sections, a 200-word ceiling, and evidence-gated next steps rather than history scanning, fixed item quotas, or live-state refreshes.

The pstack imports other than `unslop` came through the [standalone mirror](https://github.com/backnotprop/pstack). Registry checks establish completeness, not license compliance or agreement with upstream contents.
