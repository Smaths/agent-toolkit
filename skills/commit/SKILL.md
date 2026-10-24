---
name: commit
description: Inspect changes, group by purpose, and create Conventional Commits. Use when asked to commit, stage changes, or draft commit messages.
---

# Commit

Default: stage and commit all eligible changes; don't stop at proposals or request plan approval. Honor narrower scope. Message-only: no staging or commits. Staging-only: no commits. Ask only when scope is unclear or safe separation impossible.

## Inspect and group

- Read repo instructions and commit config; inspect branch, status, staged/unstaged diffs, untracked contents, and recent subjects.
- Respect existing staged boundaries. Preserve out-of-scope work, including its index state. Exclude secrets, unintended files, and changes of uncertain scope; report exclusions.
- Group by purpose, including mixed hunks. Keep implementation, tests, and docs together; dependencies first, intermediate commits usable. Don't split coherent work for commit count.
- Briefly state chunks and messages; proceed. No eligible changes: say so.
- Message-only: default to staged changes, otherwise requested changes. Without repo access, use supplied diff or description.

## Message

`type(scope)!: subject` — scope optional; `!` only for breaking changes. Separate optional body and footers with blank lines.

- Follow repo config, then established conventions. Fallback: imperative, lowercase subject, no final period, header ≤72 characters.
- Type by intent: `feat` adds functionality, `fix` corrects bugs; otherwise use an appropriate type (`docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`). `style` means formatting only.
- Describe concrete changes. Body only for useful motivation, behavior, or tradeoffs—not a repeated subject.
- Mark breaks with `!`; explain impact and migration in a `BREAKING CHANGE:` footer when needed.
- Never invent issue references, attribution, or test results.

## Stage and commit

For each chunk:

1. Stage explicit paths or hunks. No blanket staging, stash, or discarding changes. Split via index-only operations; preserve working-tree contents and unrelated staged work.
2. Review the exact staged diff to be committed; exclude unrelated staged changes without losing their index state. Stop if safe isolation isn't possible.
3. Run required repo checks plus risk-matched verification: inspection for text-only edits, focused tests for behavior, broader checks for wider impact. Reuse results only for unchanged tested content. Report blockers; don't imply checks passed.
4. Commit with literal message text/newlines preserved. Hook failure or file edits: inspect, stage only relevant edits, repeat affected checks and diff review before retrying. Never bypass hooks without authorization.
5. Verify the resulting commit before continuing.

Verify final status. No push, amend, or history rewrite unless requested.

## Report

Message-only: return only the message. Otherwise: ordered short hashes + full subjects, checks performed/blocked, remaining changes, and any uncommitted chunks. Staging-only: summarize staged changes and checks; don't claim commits.
