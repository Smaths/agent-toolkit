---
name: commit-conventional
description: Draft Conventional Commit messages, group changes, and stage or commit when requested. Use for commit messages, staging help, or conventional commits.
---

# Conventional commits

Follow the requested scope. A message request does not authorize staging or committing. A clear request to commit authorizes the necessary staging and commit. Ask only when scope is unclear or changes cannot be separated safely.

## Inspect and group

- Read repository instructions and commit-message configuration. Inspect status, the branch, staged and unstaged diffs, untracked filenames, and recent commit subjects.
- Base messages on actual changes. Inspect relevant untracked contents before staging. Without repository access, use the supplied diff or description.
- For message requests, use the staged diff unless the user specifies another scope. If nothing is staged, use the requested changes.
- Treat existing staged boundaries as intentional. Preserve unrelated changes, including staged changes, without including them in the commit.
- Group by purpose. Keep implementation with supporting tests and documentation. Account for unrelated hunks within a file.
- Order dependent commits first and keep intermediate commits usable. Briefly state the grouping before proceeding.
- Exclude secrets and unintended files. Include generated files or binaries only when they belong in the requested change.
- If there are no relevant changes, say so.

## Write the message

Use `type(scope)!: subject`, followed by an optional body and footers separated by blank lines.

- Use `feat` for new functionality and `fix` for bug fixes. Otherwise use an appropriate repository type, commonly `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, or `revert`.
- Choose the type by intent. Reserve `style` for formatting that does not change behavior.
- Include a scope only when useful.
- Follow repository configuration, then established conventions. Otherwise use an imperative, lowercase subject with no trailing period and a header within 72 characters.
- Describe the concrete change. Add a body only to explain motivation, behavior, or tradeoffs. Do not repeat the subject.
- Mark compatibility breaks with `!`. Add a `BREAKING CHANGE:` footer explaining impact and migration when needed.
- Never invent issue references, attribution, or test results.

## Stage and commit

1. Stage explicit paths or hunks. Do not use blanket staging, stash, or discard working-tree changes.
2. When splitting staged changes within the authorized scope, modify only the index using targeted unstaging or cached patches. Preserve working-tree contents and unrelated staged work.
3. Inspect the full staged diff before each commit. Confirm it contains exactly the intended group.
4. Verify each commit before proceeding to the next. Match checks to its risk: inspect text-only edits, run focused tests for behavior changes, and broaden checks for changes with wider effects. Honor required repository checks. Reuse passing results only when they apply to the exact changes being committed.
5. Commit using a method that preserves literal text and newlines. If a hook fails or modifies files, inspect the result. Before retrying, stage only relevant edits and repeat affected checks and staged-diff review. Do not bypass hooks without authorization.
6. Verify each resulting commit and the final repository status.

Do not push, amend, or rewrite history unless requested.

## Output

For message-only requests, return only the commit message.

After committing, report each hash and subject, checks performed or blocked, and remaining staged or unstaged changes.
