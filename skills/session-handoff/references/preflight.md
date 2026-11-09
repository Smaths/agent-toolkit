# Bounded preflight

Read this before choosing launch settings. Inspect current session metadata, the destination's documented launcher capabilities, and only the task-critical dependencies. Resolve the installed harness executable and version; read its local help once when native flags are needed. Executable paths may be package-manager shims with startup side effects; prefer an already-known concrete executable and stop/report unexpected setup or installation activity. Give read-only probes a finite timeout. Do not scan unrelated sessions, dump configuration or environment values, inspect launcher source, or start test agents to fill gaps.

Stop after this pass. Record each check as `supported`, `unsupported`, or `unknown`, with evidence tied to the destination host, agent, and version. Generic flags, source defaults, and another agent's successful launch are not agent-specific support evidence. An unavailable capability query means `unknown`, not permission to experiment.

Record the source host and enclosing absolute worktree root in `source` (Orca `worktree current --json` from the source directory, or the checkout root outside Orca). Default `target.workspace` and `handoff_destination` to that root, even when working in a subdirectory; the handoff's Source and Destination must describe that same root. This is a single checkout-identity check, not a request for the user to supply paths. For the same worktree, one status/diff snapshot is enough for `checks.workspace`; only check individual files when there is evidence that task-critical work lives outside it. If the target host or checkout differs, require explicit user selection under `checks.checkout_change_approval` and verify the selected checkout contains the task-critical changed and untracked files. If required files live only elsewhere, ask which checkout should own the task. A shared branch name does not transfer files.

## Agent profiles

These are native CLI differences for [external CLI startup](cli.md), not a claim that Orca forwards their flags. Orca-managed agent launches use Orca's version-matched syntax; a terminal's `--command` runs the native CLI instead.

| Agent | Settings to resolve | Native fresh-session flags |
| --- | --- | --- |
| Pi | Provider, exact model ID, thinking level. Use `PI_PROVIDER`, `PI_MODEL`, and `PI_REASONING_LEVEL` only when the current session exports them reliably. | `--provider`, `--model`, `--thinking`, followed by the prompt. |
| Claude | Exact model and effort from current session metadata. Record a non-default backend if relevant. A model alias may resolve differently later. | `--model`, `--effort`, followed by the prompt. |
| Codex | Exact model and reasoning effort from current session metadata. Record a non-default provider/profile if relevant. | `--model` and `--config` overrides, followed by the prompt. Reasoning uses `model_reasoning_effort`; provider uses `model_provider`. |

Check the installed version and model's accepted values. A fuzzy catalog match is not an exact model ID; ask before correcting a user-supplied name. Do not equate reasoning levels across agents or force unsupported settings. Use `not-applicable` for reasoning only when evidence confirms that the model has no reasoning control; omit that native flag. Record and verify custom backend/profile identities without secrets.

### Pi on Orca when exact selection is unavailable

If agent-specific evidence shows Orca refuses Pi's `--model`, do not try `--effort` alone (Orca requires `--model`) or assume a generic flag works. For an agreed terminal destination, first assess the [native CLI terminal path](orca.md#native-cli-terminal-path) for exact selection with a positional startup prompt. It does not depend on Orca observing `turn_started`. An automatic Orca agent launch may instead use Pi's configured defaults **only with the user's explicit approval for this handoff**. Record `settings_selection: "agent-default"` and `checks.default_settings_approval` with the approval's scope. Keep `settings` as the known source-session settings for comparison; they are not the selected receiver settings. Check `launch` against the actual no-model/no-effort Pi launch method on the destination host. Record the intended arguments without either flag; do not edit Pi defaults or claim to know its effective provider, model, or thinking level from source metadata. Mark them unconfirmed until independently observed. If the default is unacceptable, or its capabilities cannot be checked, stop and provide a native manual launch path instead. Without approval, use `settings_selection: "exact"` (or omit it) and mark unsupported exact forwarding as a launch blocker.

For native or manual launch, follow [cli.md](cli.md#prepare-the-command) for the shell-quoted command and positional prompt. Start from the resolved destination directory. Codex `-c` means configuration; Pi and Claude `-c` means continue. Prefer long flags.

For native configuration, consult the [Codex configuration reference](https://developers.openai.com/codex/config-reference/) and [approval/security guidance](https://developers.openai.com/codex/agent-approvals-security), or [Claude Code permissions](https://code.claude.com/docs/en/permissions). Tool-level approval policies are distinct from approval of the handoff's proposed scope. The installed version and destination host remain authoritative; documentation for newer releases is not evidence of local support.

## Required checks

- `settings`: source values are known and compatible with the selected agent/model. Approved Pi defaults do not establish the receiver's effective settings.
- `launch`: this host supports a fresh launch with the recorded selection mode for that agent. For a native CLI, verify its interactive mode, destination shell/quoting and checkout before launch. Check sandbox/approval policy and record whether the receiver's startup gate is runtime-enforced, instruction-only, or unknown. Report instruction-only enforcement; if the user requires a hard gate, lack of one blocks launch. Never add bypass flags to make startup automatic.
- `prompt`: the native harness supports an initial positional prompt, or the managed launcher supports its documented initial-prompt API and receipts. This checks input support before launch, not observed receiver startup. Lack of a provider-specific prompt observer does not block the native CLI path; record startup observation separately afterward.
- `placement`: the launcher supports attempting the requested placement, or the user approved a specific alternative. Record any fallback risk. Orca native terminal creation can start before tab placement is known; a requirement for guaranteed visible placement before startup blocks that route.
- `handoff_access`: the receiver can read the document at its destination path.
- `workspace`: for the same worktree root, its identity and one read-only status/diff snapshot suffice unless work is known to live elsewhere. For a different checkout, verify the task-critical files and changes with targeted checks; for a new checkout, require an approved creation/transfer plan before startup.

List only dependencies needed for the next actions, such as a named MCP tool, Pi extension, executable, or access to a directory. Record availability evidence on the destination. An installed configuration entry alone does not prove a working tool. Do not run a mutating tool to test availability, copy credentials, install dependencies, or widen permissions without approval. If availability can only be checked inside the receiver, distinguish a **deferred dependency** from one needed to start and verify the receiver. For external launches only, defer a read-only check when the receiver's available startup tools can perform it before the proposal; the Pi native adapter gates other tools until approval. Record it under `deferred_capabilities` with `status: "unknown"`, the reason it cannot be checked yet, an explicit `startup_check`, and `on_failure: "stop-and-ask"`. Put that check in Receiver startup and the initial prompt; do not claim the capability is supported or perform dependent work before it passes. Never defer workspace access, settings, policy, launcher/input support, or capabilities required for the startup check itself. Post-launch startup observation is separate from these preflight capabilities. Keep other task-critical unknowns in `capabilities` and ask how to proceed. Do not launch a probe agent or quietly redefine the task as a capability test.

Any `unsupported` check blocks automatic launch. Otherwise, any unresolved `unknown` check outside an explicitly deferred dependency requires a question or a documented manual path. A manual command does not fix missing tools or permissions.

## Optional mechanical check

Store the evidence below in the launch record described in [recovery.md](recovery.md). For Pi, Claude, and Codex, run `python3 <skill-dir>/scripts/check_handoff.py preflight <record-path>` when Python 3 is available. Otherwise apply the checks above manually. The helper checks supplied evidence for omissions; it cannot verify the evidence's truth or discover host support.

```json
{
  "agent": "pi",
  "source": {"host": "local", "workspace": "/absolute/workspace"},
  "target": {"host": "local", "workspace": "/absolute/workspace"},
  "handoff_destination": "/absolute/workspace",
  "settings_selection": "exact",
  "settings": {"provider": "openai-codex", "model": null, "reasoning": null},
  "checks": {
    "settings": {"status": "unknown", "evidence": ""},
    "launch": {"status": "unknown", "evidence": ""},
    "prompt": {"status": "unknown", "evidence": ""},
    "placement": {"status": "unknown", "evidence": ""},
    "handoff_access": {"status": "unknown", "evidence": ""},
    "workspace": {"status": "unknown", "evidence": ""}
  },
  "capabilities": [],
  "deferred_capabilities": []
}
```

Use `null` for unknown settings, not placeholder strings. Each capability is an object with `name`, `status`, and `evidence`. An empty `capabilities` array means no additional startup-critical dependencies were identified. `deferred_capabilities` is optional; each entry must include `name`, `status: "unknown"`, `evidence`, `startup_check`, and `on_failure: "stop-and-ask"`. For Claude and Codex, omit `provider` unless it must be preserved. Additional settings and checks are also validated.

The helper exits 0 for supported preflight, 1 for blocked or unknown, and 2 for unreadable input. It requires source identity and checks `handoff_destination` against `target.workspace`; a different host or checkout needs supported `checks.checkout_change_approval`. It cannot read the handoff to verify that its Source and Destination lines are truthful, or verify that the recorded worktree identity and snapshot are truthful. With `settings_selection: "agent-default"`, it requires Pi and supported `checks.default_settings_approval`; it cannot verify the approval's truth or whether the recorded launch arguments omit model/effort. `manual_settings_known` means only that the source settings are recorded, not that a manual launch is safe. For other agents, use their documentation and the same checklist; the helper's missing profile is not evidence of runtime incompatibility.
