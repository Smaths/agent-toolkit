---
name: sync-docs
description: Audit affected documentation against project changes and verified behavior; report mismatches or make requested corrections.
disable-model-invocation: true
---

# Sync docs

Audit the requested area. A review is read-only; a request to sync or update authorizes focused documentation edits. Preserve unrelated work. Do not stage, commit, or publish unless requested.

## Bound the audit

- Read repository instructions and Git status. Identify the requested change or area from the conversation; inspect relevant staged and unstaged diffs, requested commits, or branch comparison. A clean working tree does not rule out drift.
- Find affected documentation and references: behavior, interfaces, setup, commands, defaults, workflows, examples, links, and user-facing help. Audit the affected area, not the whole repository, unless requested.

## Check claims against evidence

- Compare material claims with relevant implementation, configuration, tests, and examples. Run focused, non-destructive checks if inspection cannot establish the behavior. Tests are evidence, not necessarily the intended contract.
- If implementation conflicts with a public contract, policy, compatibility promise, or design decision, report the conflict rather than documenting the regression as intended behavior.
- Check version-specific claims against actual dependency versions; consult primary sources when external documentation is needed. Do not invent guarantees, defaults, limits, or deprecations. Ask a targeted question when uncertainty blocks a correction; continue independent work.
- Check for missing steps or constraints, stale names and paths, incorrect claims, and contradictions. Resolve each material claim checked as verified accurate, a mismatch to correct or report, or an unresolved conflict or evidence gap.

## Review or correct

- For a review, report actionable mismatches with file references, evidence, and proposed corrections. Make no edits.
- For an update, correct the smallest complete set of documentation. Keep its format and audience, and preserve accurate content. Use actual project names and direct prose. Accurate docs need no change.
- Change generated documentation through its canonical source and established generation process. Report required code, schema, or configuration changes separately unless authorized.
- Keep one canonical explanation where ownership is established. Fix affected references; report broader consolidation opportunities instead of reorganizing the project.

## Verify and report

- Review the diff for scope and accuracy. Check affected links, paths, and examples; verify counts, directory trees, and sample output against their source. Include an existing regeneration command when useful.
- Run relevant documentation checks proportionate to the change. Report the audited area, findings or changed paths, evidence and checks actually used, and unresolved gaps. Distinguish inspection from executable checks; do not claim a check ran when it did not.
