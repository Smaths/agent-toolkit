---
name: docs-reality-sync
description: Review or update documentation against project changes and verified behavior. Use for documentation drift, accuracy checks, or syncing docs after implementation changes.
---

# Sync documentation with reality

Follow the requested scope. Review requests are read-only. Requests to sync or update docs authorize focused documentation edits. Preserve unrelated work.

## Establish the scope

- Read repository instructions and check Git status before editing.
- Inspect relevant staged and unstaged diffs. For committed work, inspect the requested commits or branch comparison. A clean working tree does not rule out documentation drift.
- Use the conversation to identify intent, then verify claims against project artifacts.
- Focus on affected behavior, interfaces, setup, commands, defaults, and workflows. Avoid a repository-wide audit unless requested.

## Verify the claims

- Read the relevant implementation, configuration, tests, and examples. Run focused, non-destructive checks when static evidence is insufficient.
- Distinguish observed behavior from intended contracts. Tests provide evidence but may encode a bug.
- If implementation conflicts with a public contract, policy, compatibility promise, or design decision, report the conflict. Do not rewrite documentation to conceal a regression.
- Check version-specific claims against the project's actual dependency versions. Use primary sources when external documentation is needed.
- Do not invent support guarantees, defaults, limits, or deprecations. If uncertainty blocks a correction, ask a targeted question and continue independent work.

## Review or update

- Find affected documentation and references, including setup guides, command examples, links, and user-facing help.
- Check for incorrect claims, missing steps or constraints, stale names and paths, and contradictions.
- For reviews, report actionable mismatches with file references, supporting evidence, and proposed corrections. Do not edit.
- For updates, change the smallest complete set of documentation. Preserve its format, structure, and unaffected content.
- Use actual project names for commands, flags, symbols, and components. Write direct prose without filler.
- Preserve the document's purpose and audience. Add what readers need to complete the task or understand the change.
- Update generated documentation through its canonical source and established generation process. Report required code, schema, or configuration changes separately unless authorized.
- Keep one canonical explanation where ownership is established. Fix nearby references as needed, but report broader consolidation opportunities without reorganizing the project.
- Do not add documentation solely to produce a change. Accurate docs need no edits.

## Verify and report

- Review the final diff for accuracy, scope, and unintended changes.
- Check affected links, paths, and examples. Verify counts, directory trees, and sample output against their source. Include an existing regeneration command when useful.
- Run relevant documentation checks when available, with verification proportional to the change.
- Distinguish checks actually run from conclusions based on inspection. State any verification limits.
- Report findings or changed paths, supporting checks, and unresolved issues. Mention consolidation only when it would prevent concrete duplication or drift.
- Do not stage, commit, or publish unless requested.
