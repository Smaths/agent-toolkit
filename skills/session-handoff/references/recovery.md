# Launch record and recovery

For external-process launches, create `<handoff-path>.launch.json` beside the handoff with the same private permissions. The [Pi native adapter](../../../vendor/pi/extensions/session-handoff/README.md#records-and-recovery) owns its different session-replacement record; do not create a second external launch or replay record for it. Do not put it in the repository by default. Use the preflight fields from [preflight.md](preflight.md) as its initial content, then add:

- `created_at`: UTC timestamp.
- `source`: host, absolute source checkout root, session ID, and handle/kind if known. Record the checkout observed for this source session, not a repository default or another checkout named in the task.
- `launch`: selected method (`agent-launch`, `worktree-create`, or `pi-native-terminal`), executable, destination host selector, invoking directory, exact non-secret arguments and initial prompt, and attempt timestamp. For native Pi, record shell, unique title, terminal-create command without the prompt, and the separately saved initial prompt; the terminal creation is not prompt delivery. The saved handoff's Source and Destination checkouts must match `source.workspace`, `handoff_destination`, and `target.workspace` respectively; a changed host or checkout needs `checks.checkout_change_approval`. For approved Pi defaults, record `settings_selection: "agent-default"`, approval evidence, and arguments without `--model` or `--effort`; keep source settings in `settings` and do not report them as confirmed receiver settings.
- `result`: operation/retry ID, receiving handle, chat/terminal kind, destination worktree ID/path, and prompt-delivery outcome. For native Pi, record the terminal-create handle and verified process/cwd/settings/policy evidence before send, then the terminal-send request ID and observed stage. Leave unknown values null; never treat terminal creation or `input_accepted` as delivery.
- `confirmed_settings`: only settings explicitly confirmed by runtime evidence, with that evidence source. Requested settings are not confirmed settings.
- `cleanup`: whether requested, source identity, and whether performed or left open.
- `startup_gate`: runtime-enforced, instruction-only, or unknown, with evidence. Delivery, receiver validation, and user approval are separate events; a receipt never establishes approval.

Record only selected fields, not raw environment, configuration, or CLI dumps. Never store authentication tokens or pairing secrets in the arguments. Record a credential/configuration reference instead. If the same authenticated execution context cannot be restored safely, stop rather than constructing a guessed retry. Keep the original prompt unchanged for replay.

Save the attempt metadata before issuing the launch. Update the record as soon as a reply arrives, using an atomic replacement where supported. A record left at "attempted" after a crash is ambiguous, not evidence that no agent started. Keep the source open whenever delivery is unconfirmed.

## Orca receipts

Use only the reply from the recorded launch attempt. A matching JSON shape does not establish its host or agent. The read-only helper can classify that reply:

```text
python3 <skill-dir>/scripts/check_handoff.py receipt <response-file-or-dash-for-stdin>
```

It recognizes `result.outcome` and `result.prompt.outcome` from `agent launch`, plus the guide's `result.launch` wrapper for worktree creation. It exits 0 only for a receiving handle with a recognized kind and delivery outcome. Mixed envelopes, unknown schemas, legacy handles without delivery evidence, contradictory errors, and missing fields return unconfirmed with exit 1. Invalid input returns exit 2. Tests include sanitized Orca 1.4.232 live replies. Delivery still does not prove successful inference, correct settings, or visible-tab placement.

Copy the selected result fields into the launch record. Preserve additional IDs from the actual reply when their location is not recognized by the helper. Do not persist unreviewed raw output merely to run the checker. It does not parse native Pi terminal-create or terminal-send replies; use the version-matched guide's `turn_started` stage for those receipts. It does not launch, retry, write records, authorize cleanup, or establish model settings.

For an ambiguous agent-launch response, follow the version-matched guide's operation-ID replay procedure using the same host, directory, launch options, and prompt. For native Pi, terminal creation has no agent-launch replay receipt: inspect the selected workspace for the unique title/handle and process before deciding whether anything started; do not create again on uncertainty. For an ambiguous terminal-send response, use only the same handle, payload and documented `--retry-request` ID. If an ID is absent, conflicting, expired, or unverifiable, inspect without sending input. Never start a fresh agent or resend on silence alone. After an Orca restart, re-resolve handles before any action.

A delivery receipt ends the normal handoff. Do not wait for a receiver acknowledgment or create coordinator tracking unless the user explicitly requested supervision.
