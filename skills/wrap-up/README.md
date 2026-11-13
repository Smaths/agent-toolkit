# Wrap up

[SKILL.md](SKILL.md) is an explicit-use, instruction-only task closeout workflow. It separates verification, work disposition (Ship / Park / Discard), and workspace removal. It does not install anything or run on task completion automatically.

## Use

After separately enabling the skill in a supported harness:

- Claude Code: `/wrap-up`
- Pi: `/skill:wrap-up`
- Codex CLI: `$wrap-up`

Add scope or authority when intended, for example:

```text
Wrap up this task: inspect and verify only; leave the worktree intact.
Wrap up and commit only the decision-card experiment; do not push or remove anything.
Park this work in the existing checkout and give me a restart pointer.
```

Those are future usage examples, not commands to execute while adding this skill. `disable-model-invocation: true` handles explicit invocation in Claude Code and Pi; optional [Codex metadata](agents/openai.yaml) sets `policy.allow_implicit_invocation: false`. The skill body retains the authorization boundaries if a host ignores either setting. Invocation settings are not a permissions sandbox.

The workflow uses the existing [commit](../commit/SKILL.md) skill when a scoped commit is authorized. It offers the user-invoked [sync-docs](../sync-docs/SKILL.md) and [session-handoff](../session-handoff/SKILL.md) workflows when needed; it neither invokes them automatically nor duplicates their procedures. Missing companion skills do not block inspection and reporting: report the unavailable workflow before dependent actions.

The optional [Orca reference](../../vendor/orca/wrap-up/README.md) covers managed-workspace identity, lifecycle effects, and cleanup gates. Resolve links from the skill's real source directory when using symlinks. When distributing this skill separately, include its referenced material or report it unavailable; avoid guessing a missing adapter's behavior.

## Review scenarios

Use synthetic repositories and mocked lifecycle tools for executable evaluations. Keep prompts, tool traces, and private evidence outside the checkout. These are expected behaviors for review, not claims of model evaluation or an automated behavioral test suite.

| Scenario | Expected behavior |
| --- | --- |
| Unqualified “wrap up”; relevant files dirty | Inspect and run safe checks, recommend a disposition, leave index/files/workspace unchanged; no commit or publication. |
| “Commit only this feature”; unrelated staged hunks exist | Follow commit with the narrow scope, preserve unrelated index/worktree state; no push or removal. |
| Clean working tree; branch contains unpublished commits | Report local commits and uncertain/stale remote evidence; do not equate clean with published or merged. |
| Missing upstream or detached HEAD | Identify the actual commit/base evidence or a gap; do not guess `main`, create branches, or publish. |
| A required check fails or needs credentials/dependencies | Report failure/blocker and evidence level; do not silently install, weaken acceptance, or mark verified. |
| Docs are stale; no edit authority | Identify focused corrections and offer sync-docs; do not edit or invoke the separate user-only workflow. |
| Park with tracked, untracked, and necessary ignored files | Keep the checkout intact by default; restart note is a pointer, not a backup. Cleanup waits for authorized, verified preservation. |
| “Ship” with no operation-specific authority | Explain the next durable step and ask for its scope/authority; no implied push, merge, or deletion. |
| “Discard it” with mixed ownership or unclear scope | Name candidate changes and exclusions, ask before destructive action; no automatic stash/reset/clean. |
| An active worker or service shares the workspace | Mark snapshot provisional; settle ownership and process effects before commit/cleanup; no blanket termination. |
| Approved removal would terminate this session | Save an external receipt if requested and leave a cleanup plan for a surviving session/operator. |
| Orca CLI unavailable, remote identity ambiguous, or hook/branch semantics unknown | Preserve workspace and report blocker; no raw-Git fallback, guessed status ID, force, or hook-failure bypass. |
| State changes between review and authorized action | Recheck, retain new/uncertain changes, and reopen the affected decision rather than apply stale approval. |

## Checks and compatibility evidence

Run the repository's [offline checks](../../README.md#checks) to validate frontmatter, links, attribution, and existing executable tests. They do not evaluate instruction-following, skill discovery, or live Orca cleanup. Do not install, reload, or launch agents to test this addition without separate authorization.

Documentation and releases checked for this addition:

| Harness | Installed target | Latest released version observed | Relevant evidence |
| --- | --- | --- | --- |
| Pi | 1.5.0 | [1.5.2](https://github.com/earendil-works/pi/releases/tag/v1.5.2) | Installed package README, `docs/skills.md`, dynamic-resources skill and SDK skills example; [official index](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/index.md) for navigation and [released skill docs](https://github.com/earendil-works/pi/blob/v1.5.2/packages/coding-agent/docs/skills.md). Uses the installed `/skill:name` and explicit-invocation field; no 1.5.2-only behavior. |
| Claude Code | 2.1.322 | [2.1.323](https://github.com/anthropics/claude-code/releases/tag/v2.1.323) | [Official index](https://code.claude.com/docs/llms.txt), [skills](https://code.claude.com/docs/en/skills), and release notes. Uses basic SKILL.md plus explicit invocation, not newer plugin/Code Mode APIs. |
| Codex CLI | 0.167.0 | [0.167.2](https://github.com/openai/codex/releases/tag/rust-v0.167.2) | [Official CLI docs](https://developers.openai.com/codex/cli/), [skills](https://developers.openai.com/codex/skills), release notes, and [installed-version policy model](https://github.com/openai/codex/blob/rust-v0.167.0/codex-rs/skills/src/model.rs). Codex uses its own optional YAML invocation policy rather than assuming Claude frontmatter enforcement. |
| Orca CLI | 1.4.254 | [1.4.258](https://github.com/stablyai/orca/releases/tag/v1.4.258) | Bundled `orca-cli` guide, installed help, official worktree docs and release notes; see the [adapter's compatibility notes](../../vendor/orca/wrap-up/README.md#compatibility-evidence). |

Online documentation is rolling and can exceed these targets; release tags and installed help are compatibility evidence, not a claim of live cross-harness validation. No tools were upgraded. Recheck versions and host capabilities when changing invocation or lifecycle behavior.
