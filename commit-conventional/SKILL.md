---
name: commit-conventional
description: Inspect repository changes, split work into coherent chunks, and create Conventional Commits by default when invoked. Also handle explicit message-only or staging requests.
---

# Conventional commits

Invoking this skill authorizes staging and committing the eligible changes in the current repository by default. Do not stop at proposed messages or ask for approval of the plan: assume the user accepts your grouping and messages, then make the commits. An explicit message-only or staging-only request overrides the commit default; a narrower-scope request still commits unless the user asks only for messages or staging. A message-only request never authorizes staging or committing. Do not commit unsafe, ambiguous, or out-of-scope changes. Ask only when scope is genuinely unclear or changes cannot be separated safely.

## Inspect and group

- Read repository instructions and commit-message configuration. Inspect status, the branch, staged and unstaged diffs, untracked filenames, and recent commit subjects.
- Base messages on actual changes. Inspect relevant untracked contents before staging. Without repository access, use the supplied diff or description.
- For message-only requests, use the staged diff unless the user specifies another scope. If nothing is staged, use the requested changes.
- With no narrower scope, consider all current staged, unstaged, and untracked changes for commits. Treat existing staged boundaries as intentional; preserve any changes outside the requested scope, including staged ones. Do not assume every untracked file is safe to add.
- Group by purpose into independently understandable commits, rather than one catch-all commit. Keep implementation with supporting tests and documentation; do not split a single coherent change just to increase the commit count. Account for unrelated hunks within a file.
- Order dependent commits first and keep intermediate commits usable. Briefly state the planned chunks and messages before executing; proceed without waiting for approval.
- Exclude secrets and unintended files. Include generated files or binaries only when they belong in the requested change. If a change is unsafe or cannot be attributed confidently, leave it untouched and explain why.
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

For a skill invocation without a narrower request, execute this workflow through all eligible chunks. Do not merely suggest commands or messages.

1. Stage explicit paths or hunks for one chunk at a time. Do not use blanket staging, stash, or discard working-tree changes.
2. When splitting staged changes within the authorized scope, modify only the index using targeted unstaging or cached patches. Preserve working-tree contents and unrelated staged work.
3. Inspect the full staged diff before each commit. Confirm it contains exactly the intended group.
4. Verify each commit before proceeding to the next. Match checks to its risk: inspect text-only edits, run focused tests for behavior changes, and broaden checks for changes with wider effects. Honor required repository checks. Reuse passing results only when they apply to the exact changes being committed.
5. Commit using a method that preserves literal text and newlines. If a hook fails or modifies files, inspect the result. Before retrying, stage only relevant edits and repeat affected checks and staged-diff review. Do not bypass hooks without authorization.
6. Verify each resulting commit and the final repository status.

Do not push, amend, or rewrite history unless requested.

## Output

For message-only requests, return only the commit message.

After committing, present a clean, ordered list of each commit's short hash and full subject (and body when it matters). Summarize checks performed or blocked and any remaining staged, unstaged, or untracked changes. If a chunk could not be committed, report it separately rather than implying success.
