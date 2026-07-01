---
name: commit-conventional
description: >
  Write Conventional Commits-style commit messages from staged or unstaged git changes.
  Use this whenever the user asks to write a commit message, commit their changes, asks
  "what should I commit this as", or mentions git commit, staging, conventional commits,
  semantic commits, or commit conventions. Also use when reviewing a diff and the user
  wants help summarizing it as a commit message.
---

# Commit Conventional

Writes commit messages that follow the Conventional Commits 1.0.0 spec
(https://www.conventionalcommits.org/en/v1.0.0/), based on the actual code
changes rather than what the user says the change is about.

## Workflow

1. **Inspect the changes.** Prefer `git diff --staged`. If nothing is staged,
   fall back to `git diff` and tell the user you're describing unstaged
   changes. If git inspection is unavailable or the repo cannot be read, ask
   the user for a pasted diff or a brief summary of the changes instead of
   guessing from conversation context alone.

2. **Check for scope creep.** If the diff spans clearly unrelated concerns
   (e.g. a bug fix plus an unrelated dependency bump plus a docs edit), say so
   and propose splitting into separate commits rather than writing one message
   that tries to cover everything. Don't silently smoosh unrelated changes
   into a single type/subject.

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
   `git commit -F -`). Only run `git commit` yourself if the user explicitly
   asks you to, and never run `git add -A` / `git add .` to paper over the
   "check for scope creep" step above; stage the specific files or hunks that
   belong to the commit being described.

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
