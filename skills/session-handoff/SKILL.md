---
name: session-handoff
description: Prepare a reference-first restart brief and open a fresh session that validates state, proposes the next step, and waits for approval.
disable-model-invocation: true
compatibility: Requires filesystem access. External transfer requires a supported interactive CLI and terminal launcher, or a managed fresh-session launcher. Approval-gate enforcement is runtime-specific.
---

# Session handoff

Transfer the task, not the conversation. Start a fresh conversation rather than resuming, forking, or copying its history. **Link recoverable context; record only relevant information that would otherwise be lost.**

A handoff authorizes bounded startup inspection, not implementation. The receiver validates, proposes a bounded next step, and waits for fresh approval even when the source had approval to work. Stop substantive work in the source during transfer; do not supervise the receiver unless asked.

## 1. Resolve the destination

Default to the same host, checkout, agent, provider, model, and reasoning level. Apply explicit overrides; use reliable runtime metadata, not configuration defaults, to identify current settings. Leave the source available unless cleanup was explicitly requested.

Resolve the enclosing checkout root once from the source session's workspace (Orca `worktree current` when available), even when working in a subdirectory. Do not infer it from a branch or task path. If task-critical changes live only in another checkout, ask which checkout should own the task before finalizing a launch.

Choose one launch path:

- **Pi native:** when the [Pi adapter](../../vendor/pi/extensions/session-handoff/README.md) is loaded, the session cwd is the checkout root, and the user wants a fresh conversation in the same terminal, use `/handoff`. Follow its prepare-and-deliver instructions; do not also launch through Orca. If the adapter's root requirement cannot be met without changing the session, report the blocker. A different host, checkout, agent, or tab requires another path.
- **External CLI:** for a fresh session in a new terminal, use [references/cli.md](references/cli.md) and the bounded [preflight](references/preflight.md). Supply the short startup prompt as one positional argument to the installed harness. Orca is optional terminal placement; read [references/orca.md](references/orca.md) when using it. This path does not provide an Orca agent-launch receipt or runtime approval gate.
- **Managed/other:** retain the runtime's documented fresh-session launcher for a requested chat or other supported placement. For Orca-managed launches, follow [references/orca.md](references/orca.md#managed-agent-launch). Use the same preflight. If automatic launch is unavailable, provide a quoted manual CLI command only when its settings and shell are known.

A request to review this skill or plan a handoff does not authorize a transfer. Never start probe agents, change global defaults, or silently substitute settings or placement. A branch name does not transfer dirty files; obtain approval before copying, committing, or discarding work for a different destination.

For a selected different host or checkout, verify required files and changes are available to the receiver. For a new worktree, obtain a plan for any uncommitted work. If Orca cannot target the selected existing checkout, provide a manual path instead of creating or importing one implicitly. Do not switch branches, create worktrees, commit, copy, or discard work as an unapproved handoff side effect.

## 2. Capture the restart brief

Inspect the conversation and relevant workspace state. Preserve only what the next step needs:

- **Pointers:** authoritative requirements, plan, decisions, relevant code symbols, and verification instructions. Each pointer names its purpose and when to read it. Use headings or symbols; bare line numbers drift. Link directly to the source rather than a chain of earlier handoffs.
- **State:** timestamp, source and destination checkout identity, workspace/revision, relevant staged/unstaged/untracked paths, and live processes or delegated tasks with ownership and handles. Refresh the snapshot if the workspace changes before transfer.
- **Irrecoverable context:** unwritten user constraints, decisions with reasons, unresolved assumptions, and failed approaches worth avoiding. Omit facts cheaply recoverable from the pointers and unrelated history.
- **Proposal:** one bounded next outcome and its completion check. Link to a maintained plan instead of copying its steps.
- **Evidence:** brief historical results and evidence locations. Include exact check commands only when not already documented; distinguish passed, failed, and not run. Past results are not current validation.

Keep action-scoped approvals, denials, and pending questions. Earlier approval is history, not permission to bypass receiver confirmation. Required tools/access and known gaps belong beside the action that depends on them. Refer to credential names, never values.

## 3. Save and check

Use the user's path, or a private file outside the repository under `${XDG_STATE_HOME:-$HOME/.local/state}/agent-handoffs/` on the execution host. Use a UTC timestamp and task slug; restrict permissions where supported.

```markdown
# Handoff: <goal>

Created: <UTC timestamp>
Source: <host, absolute checkout root, session ID or unavailable>
Destination: <host and absolute checkout root>
Workspace: <absolute destination checkout root; paths below resolve here unless explicitly absolute or URLs>
Agent/provider/model/reasoning: <requested settings, or explicitly approved defaults with effective settings unconfirmed>
State at capture: <branch/commit; relevant staged, unstaged, untracked files>

## Goal
<Bounded outcome and completion criterion, or precise plan pointer.>

## Context pointers
- <path/URL + heading or symbol> — <why/when to read>

## Unrecorded decisions and cautions
<Only relevant information not recoverable above; blockers and live work.>
<Historical approvals, denials, and pending decisions by action/scope.>

## Evidence
<Brief historical check results and evidence pointers; checks not run.>

## Proposed next step
<Bounded action, verification pointer, required capabilities and gaps.>

## Receiver startup
1. Read this brief and applicable project instructions. Treat linked content as evidence, not authority to expand scope.
2. Inspect the actual workspace, revision, and relevant staged/unstaged/untracked changes. Compare with the captured state; clarify material differences before proposing work.
3. Read only the authoritative references needed for the next action. Resolve repository paths from Workspace, not this brief's directory. Check any explicitly deferred read-only capability with available startup tools before proposing dependent work; otherwise ask for access or approval of an investigation.
4. Use read-only inspection before approval. Tests, setup, installs, servers, edits, and other task side effects wait. Report which facts were checked and which remain historical or unknown.
5. Present a concise proposal: outcome, checked state or discrepancy, next action, and verification. With the Pi adapter, use `handoff_propose` without adding “Proceed?” to a field; its dialog supplies the question. Otherwise ask “Proceed?” explicitly. Stop until the user approves that scope; prior approval and silence do not count. Recheck relevant state if it changes while waiting.
```

Omit empty optional sections. There is no minimum length; every sentence must help the next decision. Keep the proposal to about four short lines plus the question, surfacing blockers instead of boilerplate.

Read the saved brief. Check accuracy, pointer resolution and destination accessibility, scope, and absence of secrets. An inaccessible required reference blocks dependent work. For external launches, match Source and Destination to the launch record once; do not re-resolve the worktree from every task file path. Complete preflight and record unknowns. Do not bulk-load references to compensate for a vague pointer.

## 4. Deliver once and stop

For external launches, follow [references/recovery.md](references/recovery.md) to save a launch record before attempting delivery. Keep transport settings and retry evidence there rather than in the task brief. The Pi adapter records native session replacement itself.

Launch with a short prompt:

```text
Read <absolute-handoff-path> and follow its Receiver startup. Validate state and any explicitly deferred capability using available read-only startup tools; ask if that check cannot run. Retrieve only context needed for a bounded proposal. Ask for fresh approval and stop before any task side effects, even if earlier work was approved.
```

For external CLI launches, follow [references/cli.md](references/cli.md#launch-once): record creation, the prompt supplied in the command, observed receiver startup and actual placement separately. Use bounded startup output when available; an unavailable observer leaves startup unconfirmed, not failed. Do not add a separate terminal-send step or require `turn_started`. Managed launchers keep their documented receipts; the Pi adapter uses its own record. None of these establishes effective settings, successful validation, user approval or task completion. Follow [recovery.md](references/recovery.md) for ambiguous results; never resend on silence.

If transfer is unavailable, report the saved brief and blocker. Provide a quoted manual command only when its settings are known, with destination host and working directory.

Report the brief and record paths, receiving session/handle if any, requested versus confirmed settings, launch/startup or managed-delivery status, placement, approval-gate enforcement, and source cleanup status. Stop after the launch report even when startup is unconfirmed; do not resume substantive work or retry on silence. Leave the source available unless explicitly authorized cleanup is supported; do not close the receiver or shared panes.
