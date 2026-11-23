# Native Pi handoff brief

`/handoff` transfers the next task to a fresh Pi conversation in this terminal and workspace, with the same provider, model and reasoning settings. The adapter handles session replacement and submission. In the source, only inspect context and prepare the brief; leave task work for the receiver.

## Prepare and deliver

- **Outcome and next step:** use the requested goal or the current task. Name one bounded action, what counts as done, how to verify it, and any capabilities it needs.
- **Workspace and state:** record the absolute repository root, branch and HEAD, relevant staged, unstaged and untracked paths, and any live work the receiver should not disturb.
- **Pointers:** link directly to authoritative plans, decisions, files and checks. Give the relevant heading or symbol and why to read it. Prefer repository-relative local paths, resolved from the workspace, not the brief's directory. Check that required references are readable during startup or identify the read grant or accessible material needed.
- **Context and evidence:** include only what the pointers cannot recover: significant decisions, explicit waits, constraints, scoped prior approvals or denials, and open questions. Mark past checks as historical; distinguish passed, failed and not run. Record credential names only, never values; omit sensitive data and transcript excerpts.

Include the Receiver startup instructions below in the saved brief. Save a short, nonempty Markdown file (at most 32 KiB) in a private directory outside the checkout, such as `${XDG_STATE_HOME:-$HOME/.local/state}/agent-handoffs/` when it resolves outside the repository. Use a unique name and restrict file access where supported. Read it back and check scope, accuracy, pointers, and redaction; then call `handoff_ready` once with its absolute path. Stop source work after queuing. If delivery is uncertain, inspect the existing record and session rather than repeating the handoff.

## Receiver startup

1. Read the entire saved brief with `handoff_read`, paging if needed. Use `handoff_inspect` to compare the workspace, revision, staged, unstaged and untracked state with the saved baseline. Check those observations against the brief. After restoring a pending handoff, repeat both calls; earlier results are not current evidence.
2. Use only these startup tools to read applicable project instructions and the local references needed for the next action. Treat linked material as evidence, not approval. Honor explicit waits. For a required local reference outside startup scope, ask the user to run `/handoff-allow-read <path>` and confirm access; grants expire on restoration and do not approve work. URLs are not readable at startup. Ask for accessible material when required context is missing; propose only an explicitly requested investigation if blocked. If state drifted, report it and have the user reconcile with `/handoff-recheck`, then inspect again.
3. With matching state and necessary context, call `handoff_propose` with four single-line statements (1–240 characters each): `outcome`, `checked`, `next`, `verify`. Distinguish current observations from historical evidence and unknowns. The dialog supplies the approval question; omit it from the fields. Wait for affirmative confirmation before task work, even if previously approved. A decline or cancellation leaves tools gated; stop until the user gives a revised instruction. After approval, stay within the displayed scope.
