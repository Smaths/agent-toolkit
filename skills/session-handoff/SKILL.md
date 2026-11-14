---
name: session-handoff
description: Save a persistent handoff and start a fresh session to continue the work, or provide a launch command.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work. If the user passed arguments, treat them as the next session's focus.

Save it in `~/handoffs/`, resolving `~` to the user's home directory. Create the directory if needed. Use a filename such as `YYYY-MM-DD_HHMMSS_project_topic.md`; add a suffix on collision and create without overwriting. Retain existing handoffs. Return the absolute path.

Record the absolute working directory, the objective, relevant progress and constraints, and the next task with a concrete completion criterion. Prefer a useful outcome such as identifying a bug's cause over a token action such as checking Git status. Preserve explicit waits and unresolved decisions.

Include a "suggested skills" section in the document, naming which skills would help the next agent continue the work.

Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

## Continue in a fresh session

Use the user's selected agent, otherwise the current agent. When an existing supported terminal or session host can open a user-accessible interactive session, launch it in the recorded working directory with the startup prompt below. Use a fresh session, without resuming or forking the old conversation. A request to save only skips launching.

Include these continuation instructions in the handoff: complete the next task without asking for confirmation if it is safely read-only. Assess the actual operations, including scripts, rather than trusting a read-only label. Preserve recorded constraints, explicit waits, and runtime permission requirements. If a required decision or permission is missing, explain what is needed. Otherwise continue within the user's existing authorization. Report the result against the task's completion criterion.

Use this startup prompt, replacing every placeholder from the saved handoff. Keep the summary fields to one short sentence each and paths complete. Use plain text with real line breaks and blank lines, readable without Markdown rendering. Send the text inside the fence as one prompt; the fence is only for this template.

```text
Session handoff: <short task title>

Goal: <desired outcome>
Progress: <relevant completed work or current finding>
Next: <next useful task>
Done when: <observable completion criterion>

Workspace: <absolute working-directory path>
Handoff: <absolute handoff-document path>

Read the handoff and follow its continuation instructions in the recorded
workspace. Begin with a brief statement of what you will do, then proceed
with safe read-only work without asking for confirmation. Honor explicit
waits and required permissions; report any blocker instead of guessing.
```

Use this same prompt for automatic launch and manual pickup. Keep shell quoting, command syntax, and transport escaping outside the displayed prompt. Avoid tables, HTML, ANSI styling, and vendor-specific file mentions. The receiving agent should give its brief opening statement after reading the handoff, without repeating the full document or treating the statement as an approval gate. The host controls how submitted prompts are displayed; do not claim identical rendering across vendors.

If no supported launcher is available, return a ready-to-run command for the installed agent that sets the working directory and passes this prompt. Check its CLI help for syntax and quote paths and prompt for the user's shell. For Codex and Claude, an initial prompt is a positional argument to `codex` or `claude`; use interactive mode. If the CLI is unavailable, provide the startup prompt for manual use.

Verify launch from the host's returned session identifier or status. If delivery is uncertain, inspect that session before retrying to avoid duplicates. Report whether the session started or a manual command is needed, then stop working on the transferred task. Keep launch support in the existing environment; do not install hooks, change configuration, or bypass permission checks.
