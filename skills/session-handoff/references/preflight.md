# Bounded preflight

Read this before choosing launch settings. Inspect current session metadata, the destination's documented launcher capabilities, and only the task-critical dependencies. Read the selected agent's local help once when native flags are needed. Give read-only probes a finite timeout. Do not scan unrelated sessions, dump configuration or environment values, inspect launcher source, or start test agents to fill gaps.

Stop after this pass. Record each check as `supported`, `unsupported`, or `unknown`, with evidence tied to the destination host, agent, and version. Generic flags, source defaults, and another agent's successful launch are not agent-specific support evidence. An unavailable capability query means `unknown`, not permission to experiment.

## Agent profiles

These are native CLI differences, not a claim that Orca forwards their flags. Orca launches must use its own version-matched syntax.

| Agent | Settings to resolve | Native fresh-session flags |
| --- | --- | --- |
| Pi | Provider, exact model ID, thinking level. Use `PI_PROVIDER`, `PI_MODEL`, and `PI_REASONING_LEVEL` only when the current session exports them reliably. | `--provider`, `--model`, `--thinking`, followed by the prompt. |
| Claude | Exact model and effort from current session metadata. Record a non-default backend if relevant. A model alias may resolve differently later. | `--model`, `--effort`, followed by the prompt. |
| Codex | Exact model and reasoning effort from current session metadata. Record a non-default provider/profile if relevant. | `--model` and `--config` overrides, followed by the prompt. Reasoning uses `model_reasoning_effort`; provider uses `model_provider`. |

Check the installed version and model's accepted values. A fuzzy catalog match is not an exact model ID; ask before correcting a user-supplied name. Do not equate reasoning levels across agents or force unsupported settings. Use `not-applicable` for reasoning only when evidence confirms that the model has no reasoning control; omit that native flag. Record and verify custom backend/profile identities without secrets.

For a manual launch, change to the resolved destination directory in a fresh shell. Quote the prompt and arguments for that shell. Do not use Pi continue/resume/fork options, Claude continue/resume/fork-session options, or Codex resume/fork subcommands. Codex `-c` means configuration; Pi and Claude `-c` means continue. Prefer long flags. Do not add sandbox, approval, or trust bypasses.

Codex configuration reference: https://developers.openai.com/codex/config-reference/. The installed version and destination host remain authoritative.

## Required checks

- `settings`: values are known and compatible with the selected agent/model.
- `launch`: this host supports a fresh launch with those exact settings for that agent. Check effective sandbox/approval policy too; a read-only prompt does not enforce it.
- `prompt`: the launch carries an initial prompt and reports acceptance or delivery.
- `placement`: the requested placement is supported or the user approved a specific alternative.
- `handoff_access`: the receiver can read the document at its destination path.
- `workspace`: the intended checkout and required changes are available, or an approved creation/transfer plan supplies them before agent startup.

List only dependencies needed for the next actions, such as a named MCP tool, Pi extension, executable, or access to a directory. Record availability evidence on the destination. An installed configuration entry alone does not prove a working tool. Do not run a mutating tool to test availability, copy credentials, install dependencies, or widen permissions without approval. If availability can only be checked inside the receiver, mark it unknown and ask how to proceed. Do not launch a probe agent or quietly redefine the task as a capability test.

Any `unsupported` check blocks automatic launch. Otherwise, any `unknown` check requires a question or a documented manual path. A manual command does not fix missing tools or permissions.

## Optional mechanical check

Store the evidence below in the launch record described in `references/recovery.md`. For Pi, Claude, and Codex, run `python3 <skill-dir>/scripts/check_handoff.py preflight <record-path>` when Python 3 is available. Otherwise apply the checks above manually. The helper checks supplied evidence for omissions; it cannot verify the evidence's truth or discover host support.

```json
{
  "agent": "pi",
  "target": {"host": "local", "workspace": "/absolute/workspace"},
  "settings": {"provider": "openai-codex", "model": null, "reasoning": null},
  "checks": {
    "settings": {"status": "unknown", "evidence": ""},
    "launch": {"status": "unknown", "evidence": ""},
    "prompt": {"status": "unknown", "evidence": ""},
    "placement": {"status": "unknown", "evidence": ""},
    "handoff_access": {"status": "unknown", "evidence": ""},
    "workspace": {"status": "unknown", "evidence": ""}
  },
  "capabilities": []
}
```

Use `null` for unknown settings, not placeholder strings. Each capability is an object with `name`, `status`, and `evidence`. An empty array means no additional task-critical dependencies were identified. For Claude and Codex, omit `provider` unless it must be preserved. Additional settings and checks are also validated.

The helper exits 0 for supported preflight, 1 for blocked or unknown, and 2 for unreadable input. `manual_settings_known` means only that the settings are recorded, not that a manual launch is safe. For other agents, use their documentation and the same checklist; the helper's missing profile is not evidence of runtime incompatibility.
