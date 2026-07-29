---
name: docs-reality-sync
description: >
  Review the changes in the current conversation and the actual project state,
  verify documentation against implementation, update docs so they reflect
  reality, and concisely identify opportunities to consolidate duplicated or
  splintered information. Use after code, config, workflow, API, CLI, or
  behavior changes, or whenever the user asks whether docs are still accurate.
---

# Docs Reality Sync

Bring documentation back in line with the real state of the project.

## Defaults

- Trust the repository and runnable artifacts over conversation summaries.
- Prefer inspecting actual diffs, files, tests, configs, commands, and generated output when available.
- Update the smallest correct set of docs needed to reflect reality.
- Make only the documentation updates needed for accuracy; report broader consolidation work unless the user asks for it.
- Be concise when reporting gaps, risks, and consolidation opportunities.
- If the implementation is ambiguous, say so and ask one short question instead of guessing.

## Workflow

1. **Find the real change surface.**
   - Start with `git status --short` so staged, unstaged, and untracked files are visible.
   - Inspect staged changes (`git diff --staged`) and unstaged changes (`git diff`), then read relevant untracked files.
   - Also use the current conversation, touched files, tests, configs, scripts, and entrypoints as clues.
   - Identify what actually changed: behavior, API, CLI, config, setup, file layout, limits, defaults, naming, or workflows.

2. **Verify reality in the project.**
   - Read the relevant source files, tests, configs, package metadata, scripts, and examples.
   - Prefer evidence over assumptions. If docs claim something, confirm it in code or other authoritative project artifacts.
   - If needed, run safe read-only commands to confirm behavior or discover related docs.

3. **Find impacted documentation.**
   - Search for README files, docs directories, help text, examples, comments intended as user guidance, changelogs, and onboarding/setup instructions.
   - Include adjacent docs that may now be incomplete, contradictory, or stale.
   - Limit direct documentation edits to Markdown and plain-text files. Treat other files as evidence unless the user explicitly asks to change them.

4. **Compare docs against reality.**
   For each relevant doc, check whether it:
   - matches current behavior and naming
   - reflects current setup, commands, paths, and defaults
   - omits important new constraints or capabilities
   - contradicts code, tests, examples, or other docs
   - duplicates guidance better owned by another canonical document

5. **Update docs.**
   - Edit Markdown and plain-text documentation so it reflects the current project truth.
   - Identify generated documentation and its canonical source. Do not edit generated output; update its Markdown or plain-text source when one exists. If the source is another file type, report it and ask before changing it.
   - Keep wording direct and specific.
   - Prefer one canonical explanation plus links/references over repeated prose.
   - Preserve existing style and structure unless a small restructure clearly improves accuracy or discoverability.

6. **Call out consolidation opportunities.**
   After making the necessary updates, concisely note any:
   - duplicated explanations across multiple files
   - splintered information that should live in one canonical place
   - stale examples, commands, or references
   - missing cross-links that would reduce future drift

7. **Report succinctly.**
   Summarize:
   - what reality was verified
   - which docs were updated
   - any unresolved ambiguity
   - any consolidation recommendations

## Heuristics

- For current implemented behavior, treat executable code, configuration, and passing tests as primary evidence. For public contracts, policy, compatibility, or roadmap statements, verify the intended authority before changing documentation.
- If multiple docs say the same thing, keep the clearest canonical source and shorten the rest when it is within scope; otherwise report the consolidation opportunity.
- If a change affects users, setup, commands, or interfaces, docs likely need updates even if no `.md` files were touched.
- If tests encode behavior, treat them as strong evidence of intended reality.
- Do not claim something is supported, required, or deprecated unless the project evidence supports it.

## Output shape

When asked to review rather than directly edit, use this structure:

- **Reality checked:** <what you verified>
- **Docs updated / needed:** <files changed or that should change>
- **Mismatches found:** <concise bullets>
- **Consolidation opportunities:** <concise bullets>
- **Open question:** <only if required>
