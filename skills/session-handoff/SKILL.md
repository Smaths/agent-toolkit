---
name: session-handoff
description: Write a checked handoff document and transfer current work to a fresh session. Keep the same workspace and agent settings unless the user requests otherwise. Invoke explicitly for session replacement, not supervised delegation.
disable-model-invocation: true
compatibility: Requires filesystem access. Automatic transfer requires a supported fresh-session launcher.
---

# Session handoff

Transfer ownership of the current task to a fresh session. Do not resume, fork, or clone the conversation. Keep the source available until prompt delivery is confirmed, then report and stop. Do not supervise the receiver unless asked.

Leave the source open unless cleanup was explicitly requested. Cleanup requires confirmed delivery and a documented source-specific operation after the final report.

## Resolve the target and launch method

Before drafting, identify the source and intended destination:

- Execution host and absolute workspace path.
- Agent program, provider, model, and reasoning level.
- Requested placement and source cleanup, if any.

Default to the same host, checkout, and settings. Apply explicit user overrides. Read current settings from reliable runtime metadata or selected non-secret configuration fields. Defaults alone do not establish the running session's settings.

Follow `references/preflight.md` for a bounded check and the Pi, Claude, or Codex profile. Resolve settings first; finish document-access checks after saving the handoff. Never start test agents, change global defaults, or silently substitute settings.

If required settings are unknown or incompatible with the requested agent, ask for the missing choices. You may save a draft marked incomplete, but do not invent an exact launch command. If settings are known but automatic launch is unsupported, prepare a manual command using the agent's documented flags.

Under Orca, read `references/orca.md` before choosing a launch method. Elsewhere, use the runtime's documented fresh-session launcher. Do not start a nested interactive agent in a background shell.

For a different host or checkout, establish how the receiver will access the document and required files before launching. A branch name does not transfer uncommitted or untracked work. Do not commit, copy, or discard work without the necessary approval.

## Capture the task

Review the conversation, version-control status, and relevant diffs. Stop substantive work during transfer. If the workspace changes, refresh the snapshot.

Record the outcome, completion criteria, completed and partial work, failed attempts, and remaining work. Include decisions and their reasons, blockers, assumptions, staged and unstaged changes, and relevant untracked files. Record any running process or delegated task the receiver must account for, including its handle and ownership.

List only capabilities needed for the next actions, such as named MCP tools, extensions, executables, or directory access. Check availability on the destination. Do not copy credentials or broaden permissions to reproduce the source environment.

List checks that actually ran, their exact results, and checks not run. Preserve approval boundaries by action and scope. A handoff does not authorize other side effects. Ask before acting on an ambiguous approval.

Keep exact paths, IDs, errors, and user constraints. Link to relevant notes and logs rather than copying the transcript or large outputs. Never copy secret values; refer to their configuration or variable names.

## Save and check the document

Use the user's path, or create a private file outside the repository under `${XDG_STATE_HOME:-$HOME/.local/state}/agent-handoffs/` on the execution host. Use a UTC timestamp and task slug. Restrict permissions where supported. Ensure the receiver can read it.

```markdown
# Session handoff: <task>

Created: <UTC timestamp>
Source: <host, workspace, branch/commit if applicable, session ID or unavailable>
Destination: <host and workspace>
Agent/provider/model/reasoning: <target settings; label unknown values>

## Outcome and current state
<Completion criteria; finished, partial, failed, and untouched work; git state.>

## Next action
1. <First action or question requiring approval.>
2. <Following action.>

## Approvals and constraints
<Action and scope: approved, denied, or pending; by whom and when if known.>
<Decisions and reasons, blockers, assumptions, and live work to account for.>

## Required capabilities
<Task-critical tools and access, availability evidence, and unresolved gaps.>

## Evidence and checks
<Relevant paths and records. Exact check commands and results; checks not run.>

## Receiver startup
1. Read this handoff and the destination's project instructions.
2. Confirm the workspace and relevant changed files. Stop if they do not match.
3. Check required capabilities and unresolved approvals before dependent actions.
4. Start the first unfinished action. Do not reconstruct the conversation or rerun every historical check.
```

Omit empty optional sections. Use only the detail needed to resume safely; there is no minimum word count. Label uncertainty and historical results.

Read the saved file. Check its accuracy, next action, accessibility, and absence of secrets. Complete preflight before launch; record unknowns rather than assuming support.

## Deliver and report

Follow `references/recovery.md` to create `<handoff-path>.launch.json` before launching. Keep selected evidence and retry details there, not just in the source conversation. Launch the selected agent at the resolved destination with a short prompt:

```text
Take ownership of the task described in <absolute-handoff-path>. Follow "Receiver startup" before "Next action." Treat recorded results as historical. Respect denied and pending approvals. Stop and ask if the workspace or required capabilities do not match. Do not repeat completed work without cause.
```

A transfer requires both a receiving handle and confirmation that the launcher accepted or delivered the prompt. Save the selected receipt fields in the launch record. Acceptance does not prove that the receiver started working or uses the requested settings; report only what was confirmed.

For an ambiguous response, follow the recovery guide. Never launch or send again merely because the receiver is silent. Write "no receiver" only when that is known.

If transfer is unavailable, report the saved document and blocker. Provide a quoted, shell-appropriate manual command only when its settings are known. Include the destination host and working directory.

Report the document and launch-record paths, receiving handle if any, requested versus confirmed settings, delivery status, placement, and source cleanup status. After confirmed transfer, stop work in the source without waiting for acknowledgment unless asked.
