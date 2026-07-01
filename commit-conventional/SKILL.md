---
name: commit-conventional
description: >
  Draft Conventional Commits-style messages from staged or unstaged git changes.
  Use this whenever the user asks to write a commit message, commit their changes, asks
  "what should I commit this as", or mentions git commit, staging, conventional commits,
  semantic commits, or commit conventions. Also use when reviewing a diff and the user
  wants help summarizing it as a commit message.
---

# Commit Conventional

Writes commit messages that follow the Conventional Commits 1.0.0 spec
(https://www.conventionalcommits.org/en/v1.0.0/), based on the actual code
changes rather than what the user says the change is about.

## Defaults

- Prefer one best draft, not a list of alternatives.
- Prefer staged changes when they exist; use unstaged changes only when no staged changes are present.
- If git context is missing, ask for a pasted diff or a brief summary.
- If the change set is too mixed to describe honestly, say it should be split.

## Workflow

1. **Inspect the changes.** Prefer `git diff --staged`. If staged changes
   exist, describe those changes only. If nothing is staged, fall back to
   `git diff` and tell the user you're describing unstaged changes. If git
   inspection is unavailable or the repo cannot be read, ask the user for a
   pasted diff or a brief summary of the changes instead of guessing from
   conversation context alone.

2. **Check for scope creep.** If the diff spans clearly unrelated concerns
   (e.g. a bug fix plus an unrelated dependency bump plus a docs edit), say so
   and recommend splitting it into separate commits instead of forcing one
   subject to cover everything.

3. **Pick the type.** See the type table below. Pick the type that reflects
   the primary *intent* of the change, not just the file extension touched
   (e.g. a `.md` fix inside a `feat` PR is still part of `feat` if it's
   incidental to the feature).

4. **Pick a scope (optional).** Use a short noun for the affected area:
   module, package, component, or directory name. Skip it if the change is
   repo-wide or a scope would be noise (e.g. `chore: bump lockfile`).

5. **Write the subject line.**
   - Format: `type(scope)!: subject` (`!` only if this is a breaking change).
   - Imperative, present tense: "add", not "added" or "adds".
   - Lowercase after the colon, no trailing period.
   - Describe *what changed*, not *why* (why goes in the body).
   - Target ~50 characters, hard cap at 72.

6. **Write the body (optional but preferred for anything non-trivial).**
   - Blank line after the subject.
   - Wrap at ~72 characters.
   - Explain what changed and why, not a line-by-line narration of the diff.
   - Use multiple paragraphs if there are distinct reasons or side effects.

7. **Write footers (as needed).**
   - Breaking change: `BREAKING CHANGE: <description of the break and migration path>`.
   - Issue references: `Closes #123`, `Refs #456`, `Fixes #789`.
   - Co-authors, if asked: `Co-authored-by: Name <email>`.

8. **Present the message, don't commit it.** Output the drafted message
   (ideally in a fenced code block so it's easy to copy or pipe to
   `git commit -F -`). If you need clarification, ask one short question and
   stop. Do not commit yet.

9. **Offer the handoff.** Ask whether the user wants you to create the commit
   now. Only run `git commit` after explicit confirmation. Never run
   `git add -A` / `git add .` to paper over the "check for scope creep" step
   above; stage the specific files or hunks that belong to the commit being
   described.

## Examples

- `feat(parser): add diff-aware commit draft`
- `fix(cli): handle empty staged changes`
- `docs: clarify commit handoff flow`

## Types

| Type       | Use for |
|------------|---------|
| `feat`     | A new feature, user-facing or API-facing |
| `fix`      | A bug fix |
| `docs`     | Documentation only |
| `style`    | Formatting, whitespace, missing semicolons; no logic change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement |
| `test`     | Adding or correcting tests |
| `build`    | Build system or external dependencies (npm, gradle, docker, etc.) |
| `ci`       | CI configuration and scripts (GitHub Actions, CircleCI, etc.) |
| `chore`    | Everything else that doesn't modify src or test files |
| `revert`   | Reverts a previous commit |

## Breaking changes

Mark with `!` right before the colon, and/or a `BREAKING CHANGE:` footer.
A footer is required if the break needs explanation; the `!` alone is fine
for trivial, self-explanatory breaks.
