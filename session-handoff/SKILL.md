---
name: session-handoff
description: Create a verified handoff document for the current agent session and start a fresh session in the same workspace. Use only when the user explicitly asks to hand off, hand over, continue in a new session, or transfer current work to another session.
disable-model-invocation: true
compatibility: Requires filesystem access. Starting the receiving session requires an agent launcher or terminal manager.
---

# Session handoff

Transfer the current task to a fresh session without making the receiver reconstruct the work. Use the same agent program, model, and reasoning level unless the user requests different settings.

A handoff transfers ownership. After the receiving session accepts the prompt, report the transfer and stop. Do not supervise or wait for the receiver unless the user asks.

## Confirm the transfer target

- Keep the current workspace and checkout unless the user requests another location or a new worktree.
- Start a fresh session. Do not clone, fork, or resume the current conversation because that carries its existing context.
- Apply any agent, model, reasoning, workspace, or destination overrides stated by the user.
- Determine the current settings from reliable runtime metadata, environment variables, status commands, or launcher output. Do not guess a missing model or reasoning level.

## Record the current state

Use the conversation and inspect the workspace before writing the document.

- State the requested outcome and completion criteria.
- Separate finished work, partial work, failed attempts, and untouched work.
- Record decisions and the reasons that constrain later work.
- Inspect version-control status and relevant diffs. Note staged, unstaged, and untracked files without changing them.
- List checks that actually ran and their exact results. Mark checks that have not run.
- Include blockers, open questions, and assumptions that the receiver must verify.
- Give exact next actions in useful order. The first action should let the receiver resume without repeating completed work.

Do not paste the full transcript, large command output, or information unrelated to the task. Never copy credentials, tokens, private keys, authentication headers, or secret environment values. Replace any needed secret reference with its variable or configuration name.

## Write the handoff document

Use a path supplied by the user. Otherwise, create a private file outside the repository under `${XDG_STATE_HOME:-$HOME/.local/state}/agent-handoffs/`. Use a UTC timestamp and short task slug in the filename. Set restrictive permissions when the available tools support them.

Use this structure and omit optional sections that have no content:

```markdown
# Session handoff: <task>

Created: <UTC timestamp>
Workspace: <absolute path>
Source session: <session ID or "unavailable">
Agent: <agent program and version when known>
Model: <provider and model>
Reasoning: <level>

## Requested outcome
<What the user wants and how to tell it is done.>

## Current state
<What works now, what is in progress, and the relevant repository state.>

## Work completed
- <Completed action with file or symbol references.>

## Decisions and constraints
- <Decision or constraint and its reason.>

## Files and commands
- `<path>`: <why it matters>
- `<command>`: <when or why to run it>

## Verification
- Passed: `<command>` with <result>
- Failed: `<command>` with <failure>
- Not run: <check and reason>

## Remaining work
1. <Next action>
2. <Following action>

## Risks and open questions
- <Risk, blocker, assumption, or question>
```

Write concrete facts and short sentences. Preserve exact paths, identifiers, commands, error text, and user constraints where they matter. Label uncertainty instead of filling gaps.

Read the saved document before transfer. Check that its state matches the workspace, its next action is clear, and it contains no secret values.

## Start the receiving session

Prefer the current runtime's supported agent launcher. Do not start a nested interactive agent in a background shell.

If the session runs under Orca, load the installed `orca-cli` skill and follow its version-matched instructions for a full handoff and agent launch. Launch the current agent type in the current worktree. Pass the current model and reasoning level explicitly when Orca supports those options. Use the handoff file's absolute path in a short initial prompt.

For another runtime, use its documented fresh-session command or API. Preserve the current working directory and pass explicit agent, model, and reasoning settings when supported. If no safe launcher is available, do not claim that the transfer occurred. Save the document and give the user the exact command to start the new session.

Use an initial prompt like this:

```text
Take ownership of the task in <absolute-handoff-path>. Read the document first, inspect the current workspace state, and continue from "Remaining work." Treat recorded command output as historical evidence and recheck it when the current result matters. Do not repeat completed work unless verification shows that it is necessary.
```

A launch counts as transferred only when the launcher reports that it created the receiving session and accepted or delivered the prompt. Record the returned session or terminal handle. Do not resend after an ambiguous response until the launcher's recovery procedure rules out a duplicate.

## Report and stop

Report:

- the handoff document path
- the receiving session or terminal handle
- the agent, model, and reasoning level used
- whether the launcher confirmed prompt delivery

If launch failed, report the exact failure and the saved document path. After a confirmed transfer, stop work in the source session.
