---
name: session-handoff
description: Create a verified handoff document for the current agent session and start a fresh session in the same workspace. Use only when the user explicitly asks to hand off, hand over, continue in a new session, or transfer current work to another session.
disable-model-invocation: true
compatibility: Requires filesystem access. Starting the receiving session requires an agent launcher or terminal manager.
---

# Session handoff

Transfer the current task to a fresh session without making the receiver reconstruct the work. Use the same agent program, model, and reasoning level unless the user requests different settings.

A handoff transfers ownership. After the launcher confirms prompt delivery, report the transfer and stop. Do not supervise or wait for the receiver unless the user asks. Keep the source session available until delivery is confirmed; do not close an Orca window or workspace as a substitute for ending a session.

## Check the launch path first

Before drafting, identify the execution host, agent, model, reasoning level, and workspace. Check whether the host supports a fresh launch with those settings and an initial prompt. Do not launch a test agent. Generic CLI flags do not prove per-agent support. If exact settings cannot be confirmed, prepare a manual launch command. Never change global defaults or silently switch models.

## Confirm the transfer target

- Keep the current workspace and checkout unless the user requests another location or a new worktree.
- Start a fresh session. Do not clone, fork, or resume the current conversation because that carries its existing context.
- Apply any agent, model, reasoning, workspace, or destination overrides stated by the user. Distinguish a new window, tab, and split pane; do not treat these as interchangeable.
- Determine the current settings from reliable runtime metadata, environment variables, status commands, or launcher output on the execution host. Do not guess a missing model or reasoning level. Check only non-secret settings when comparing defaults.

## Record the current state

Review the conversation and inspect the workspace, then stop substantive work during transfer. If a necessary correction changes the workspace, refresh the snapshot. Read only relevant diffs and selected fields from large CLI responses.

- State the requested outcome and completion criteria.
- Separate finished work, partial work, failed attempts, and untouched work.
- Record decisions and the reasons that constrain later work.
- Inspect version-control status and relevant diffs. Note staged, unstaged, and untracked files without changing them.
- List checks that actually ran and their exact results. Mark checks that have not run.
- Record pending approvals by exact action and scope. A handoff request or approval for another action is not approval for new side effects. If the answer is ambiguous, ask again before acting.
- Include blockers, open questions, and assumptions that the receiver must verify.
- Give exact next actions in useful order. The first action should let the receiver resume without repeating completed work.

Do not paste the full transcript, large command output, or information unrelated to the task. Never copy credentials, tokens, private keys, authentication headers, or secret environment values. Replace any needed secret reference with its variable or configuration name.

## Write the handoff document

Use a path supplied by the user. Otherwise, create a private file outside the repository under `${XDG_STATE_HOME:-$HOME/.local/state}/agent-handoffs/`. Use a UTC timestamp and short task slug in the filename. Set restrictive permissions when the available tools support them.

Use this structure. Omit optional sections that have no content:

```markdown
# Session handoff: <task>

Created: <UTC timestamp>
Workspace: <absolute path and branch or checkout>
Source session: <ID or "unavailable">
Agent/model/reasoning: <exact settings>

## Outcome and current state
<Completion criteria, what works now, and relevant git state.>

## Next action
1. <First action, or exact question to ask before acting.>
2. <Following action.>

## Approval and constraints
- <Action and scope>: <approved, denied, or pending; by whom and when, if known>.
- <Decisions, blockers, or assumptions that matter.>

## Evidence and checks
- `<path>`: <existing record or file to inspect>.
- Passed: `<command>` with <result>; failed or not run: <brief reason>.
```

Aim for 300–700 words in an ordinary handoff. Use more when safety or complex state requires it. Point to existing notes, diffs, and logs instead of copying them. Keep exact paths, IDs, errors, and user constraints. Label uncertainty; recorded results may be stale.

Read the saved document before transfer. Check that its state matches the workspace, its next action is clear, and it contains no secret values.

## Start the receiving session

Prefer the current runtime's supported agent launcher. Do not start a nested interactive agent in a background shell.

If the session runs under Orca, get the version-matched `orca-cli` guide from the Orca executable, **not** from an assumed skill-file path such as `~/.agents/skills/orca-cli/SKILL.md` (which may not exist on the execution host):

1. Use `ORCA_CLI_COMMAND` when set; otherwise use `orca-dev` when `ORCA_DEV_REPO_ROOT` is set, `orca-ide` on Linux outside an Orca-managed terminal, or `orca` elsewhere. Keep using that executable for subsequent commands.
2. Run its `skills get orca-cli --json` and follow the guide's full-handoff and agent-launch instructions. If the selected executable cannot run or does not support `skills get`, report the error rather than trying another executable or guessing a launch command.

Launch the current agent in the current worktree. Pass model and reasoning flags only if Orca supports them for that agent on that host. `agent launch --help` and `agent-context` list generic flags, not Pi-specific support.

For Pi, check the current model and reasoning level against non-secret settings on the execution host. Check `pi --help` for explicit CLI flags. If Orca cannot confirm an exact-model launch, save the handoff and give a fresh-shell Pi command using `--provider`, `--model`, and `--thinking`. Quote paths and prompt text for the target shell. Never retry without `--model` if that changes models, or alter global defaults to make the launch pass. Use the handoff's absolute path in a short initial prompt.

For Orca placement, default to the supported agent launch in a **new tab** and focus it when supported. Leave the source tab or pane intact during transfer so the user can recover from an incomplete launch and review the previous session. Do not create a new worktree or window just to change the layout. If the user requests a split, check the version-matched CLI: `terminal split` creates a terminal pane, not necessarily an agent-launched fresh session with reliable prompt and model delivery. Do not start a nested interactive agent via `--command` to simulate a supported launch. If the requested placement is not supported by the agent launcher, use the safe new-tab launch and explain the limitation. Orca's split directions are `horizontal` for left/right and `vertical` for top/bottom; clarify an ambiguous request for a "vertical pane" rather than guessing.

Source cleanup is opt-in, not part of the default transfer. If the user explicitly requests it, identify the original Orca terminal handle and its tab/pane topology before launch (for example, from the Orca terminal environment and `terminal list --include-visual-layouts`). After confirmed prompt delivery, close **only** that original terminal pane or, if explicitly requested and verified to contain no other useful panes, its tab. Never close a whole Orca window, workspace, worktree, or all terminals; never close the receiving handle or a shared tab with other panes. Do not close the source while its final report is still being generated: use a supported post-turn cleanup mechanism if available, otherwise leave it open and give the user the exact source handle and close action. If delivery is unconfirmed, leave the source open.

For another runtime, use its documented fresh-session command or API. Preserve the current working directory and pass explicit agent, model, and reasoning settings when supported. If no safe launcher is available, do not claim that the transfer occurred. Save the document and give the user the exact command to start the new session.

Use an initial prompt like this:

```text
Take ownership of <absolute-handoff-path>. Read it and inspect the current workspace before continuing from "Next action." Treat recorded results as historical. Do not repeat completed work without cause, or take an action marked pending approval.
```

Distinguish document prepared, launch attempted, prompt accepted or delivered, and receiver verified. A document or terminal alone is not a transfer. Report a transfer only when the launcher returns a receiving handle and confirms the prompt; keep the receipt. Do not wait for receiver verification unless the user asks.

If launch is refused, add the failure and "no receiver" to the document. Report the error and manual command. If the response is ambiguous, use the launcher's retry ID or inspect the workspace first. Never start another agent just because the first launch was silent.

## Report and stop

Report:

- the handoff document path
- the receiving session or terminal handle
- the agent, model, and reasoning level used
- whether the launcher confirmed prompt delivery
- where the receiver opened and whether the original pane/tab was left open or safely cleaned up

If launch failed, report the exact failure and the saved document path. After a confirmed transfer, stop work in the source session.
