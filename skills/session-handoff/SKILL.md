---
name: session-handoff
description: Prepare a reference-first restart brief and open a fresh session that validates state, proposes the next step, and waits for approval.
disable-model-invocation: true
compatibility: Requires filesystem access. Automatic transfer requires a supported fresh-session launcher; enforcement of the approval gate is runtime-specific.
---

# Session handoff

Transfer the task, not the conversation. Start a fresh conversation rather than resuming, forking, or copying its history. **Link recoverable context; record only relevant information that would otherwise be lost.**

A handoff authorizes bounded startup inspection, not implementation. The receiver validates, proposes a bounded next step, and waits for fresh approval even when the source had approval to work. Stop substantive work in the source during transfer; do not supervise the receiver unless asked.

## 1. Resolve the destination

Default to the same host, checkout, agent, provider, model, and reasoning level. Apply explicit overrides; use reliable runtime metadata, not configuration defaults, to identify current settings. Leave the source available unless cleanup was explicitly requested.

Choose one launch path:

- **Pi native:** when the [Pi adapter](../../vendor/pi/extensions/session-handoff/README.md) is loaded, use `/handoff` for a fresh conversation in the same terminal. Follow its prepare-and-deliver instructions; do not also launch through Orca. A different host, checkout, agent, or tab requires another path.
- **Orca:** for a new tab or another agent, read [references/orca.md](references/orca.md) and apply the bounded [preflight](references/preflight.md).
- **Other/manual:** use the runtime's documented fresh-session launcher and the same preflight. If launch support is unknown, save the brief and report the blocker. Give a quoted manual command only when its settings are known.

A request to review this skill or plan a handoff does not authorize a transfer. Never start probe agents, change global defaults, or silently substitute settings or placement. A branch name does not transfer dirty files; obtain approval before copying, committing, or discarding work for a different destination.

## 2. Capture the restart brief

Inspect the conversation and relevant workspace state. Preserve only what the next step needs:

- **Pointers:** authoritative requirements, plan, decisions, relevant code symbols, and verification instructions. Each pointer names its purpose and when to read it. Use headings or symbols; bare line numbers drift. Link directly to the source rather than a chain of earlier handoffs.
- **State:** timestamp, workspace/revision, relevant staged/unstaged/untracked paths, and live processes or delegated tasks with ownership and handles. Refresh the snapshot if the workspace changes before transfer.
- **Irrecoverable context:** unwritten user constraints, decisions with reasons, unresolved assumptions, and failed approaches worth avoiding. Omit facts cheaply recoverable from the pointers and unrelated history.
- **Proposal:** one bounded next outcome and its completion check. Link to a maintained plan instead of copying its steps.
- **Evidence:** brief historical results and evidence locations. Include exact check commands only when not already documented; distinguish passed, failed, and not run. Past results are not current validation.

Keep action-scoped approvals, denials, and pending questions. Earlier approval is history, not permission to bypass receiver confirmation. Required tools/access and known gaps belong beside the action that depends on them. Refer to credential names, never values.

## 3. Save and check

Use the user's path, or a private file outside the repository under `${XDG_STATE_HOME:-$HOME/.local/state}/agent-handoffs/` on the execution host. Use a UTC timestamp and task slug; restrict permissions where supported.

```markdown
# Handoff: <goal>

Created: <UTC timestamp>
Workspace: <absolute destination path and host>
State at capture: <branch/commit; relevant staged, unstaged, untracked files>
Paths below resolve from Workspace unless explicitly absolute or URLs.

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
3. Read only the authoritative references needed for the next action. Resolve repository paths from Workspace, not this brief's directory. Ask about required missing references or access rather than guessing.
4. Use read-only inspection before approval. Tests, setup, installs, servers, edits, and other task side effects wait. Report which facts were checked and which remain historical or unknown.
5. Present a concise proposal: outcome, checked state or discrepancy, next action, verification, and “Proceed?” Then stop. Wait for explicit user approval of that scope; prior approval and silence do not count. Recheck relevant state if it changes while waiting.
```

Omit empty optional sections. There is no minimum length; every sentence must help the next decision. Keep the proposal to about four short lines plus the question, surfacing blockers instead of boilerplate.

Read the saved brief. Check accuracy, pointer resolution and destination accessibility, scope, and absence of secrets. An inaccessible required reference blocks dependent work. Do not bulk-load all references to compensate for a vague pointer.

## 4. Deliver once and stop

For external launches, follow [references/recovery.md](references/recovery.md) to save a launch record before attempting delivery. Keep transport settings and retry evidence there rather than in the task brief. The Pi adapter records native session replacement itself.

Launch with a short prompt:

```text
Read <absolute-handoff-path> and follow its Receiver startup. Validate state and retrieve only context needed for a bounded proposal. Ask for fresh approval and stop before any task side effects, even if earlier work was approved.
```

A launch receipt confirms delivery, not successful validation, correct settings, approval, or task completion. Never launch or send again merely because the receiver is silent. Follow recovery instructions for ambiguous results.

Report the brief path, receiving session/handle, delivery status and any unconfirmed settings or placement. Keep detailed evidence in the launch record. Then stop substantive work in the source. Leave it available unless explicitly authorized cleanup is supported; do not close the receiving session or shared panes.
