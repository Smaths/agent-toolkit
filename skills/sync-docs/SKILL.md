---
name: sync-docs
description: Review or update documentation against project changes and verified behavior.
disable-model-invocation: true
---

# Sync docs

Reviews are read-only. Sync or update requests authorize focused documentation edits. Preserve unrelated work. Stage, commit, or publish only when explicitly requested.

## 1. Bound the audit

- Read repository instructions and Git status. Identify the requested change or area and target revision or release; inspect relevant staged and unstaged diffs, requested commits, or branch comparison. A clean working tree does not rule out drift.
- Find affected documentation and references: behavior, interfaces, setup, commands, defaults, workflows, examples, links, and user-facing help. Audit the affected area, not the whole repository, unless requested.

## 2. Check claims against evidence

- Compare material claims with relevant implementation, configuration, tests, and examples. Check for missing steps or constraints, stale names and paths, incorrect claims, and contradictions. Run focused, non-destructive checks when inspection is insufficient.
- Tests are evidence, not necessarily the intended contract. If implementation conflicts with a public contract, policy, compatibility promise, or design decision, report the conflict rather than documenting the regression as intended behavior.
- Check version-specific claims against actual dependency versions; consult primary sources when external documentation is needed. Support guarantees, defaults, limits, and deprecations with evidence.
- Model-quality and benchmark claims require evaluation results tied to the relevant version and configuration. Otherwise, report them as unverified.
- When uncertainty blocks a correction, ask a targeted question and continue independent work.

Account for every material change or requested audit topic with evidence-backed corrections, a reason no update is needed, or an explicit coverage gap, conflict, or missing evidence.

## 3. Correct docs when requested

- Correct the smallest complete set of documentation. Keep its format and audience. Leave accurate content unchanged.
- Preserve historical records and version-specific guidance; use explicit corrections or supersession according to project conventions.
- When editing agent instructions, preserve permissions, triggers, requirements, and exceptions unless a behavior change is requested. Report conflicts rather than inventing policy.
- Change generated documentation through its canonical source and established generation process. Report required code, schema, or configuration changes separately unless authorized.
- Keep one canonical explanation where ownership is established. Fix affected references; report broader consolidation opportunities instead of reorganizing the project.

## 4. Verify and report

- Review any edits for scope and accuracy. Check affected links and paths; verify examples and derived facts against their source. Run relevant documentation checks proportionate to the audit or change.
- Report the audited area, findings or changed paths, supporting evidence, and unresolved gaps. For reviews, include file references and proposed corrections. Include an existing regeneration command when useful.
- State which checks ran and their results, distinguishing inspection, executable checks, and live model evaluation. Identify required checks that remain unperformed.
