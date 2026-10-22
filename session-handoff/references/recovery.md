# Launch record and recovery

Before launching, create `<handoff-path>.launch.json` beside the handoff with the same private permissions. Do not put it in the repository by default. Use the preflight fields from `references/preflight.md` as its initial content, then add:

- `created_at`: UTC timestamp.
- `source`: host, session ID, and handle/kind if known.
- `launch`: selected executable, destination host selector, invoking directory, exact non-secret arguments and initial prompt, and attempt timestamp.
- `result`: operation/retry ID, receiving handle, chat/terminal kind, destination worktree ID/path, and prompt-delivery outcome. Leave unknown values null.
- `confirmed_settings`: only settings explicitly confirmed by runtime evidence, with that evidence source. Requested settings are not confirmed settings.
- `cleanup`: whether requested, source identity, and whether performed or left open.

Record only selected fields, not raw environment, configuration, or CLI dumps. Never store authentication tokens or pairing secrets in the arguments. Record a credential/configuration reference instead. If the same authenticated execution context cannot be restored safely, stop rather than constructing a guessed retry. Keep the original prompt unchanged for replay.

Save the attempt metadata before issuing the launch. Update the record as soon as a reply arrives, using an atomic replacement where supported. A record left at "attempted" after a crash is ambiguous, not evidence that no agent started. Keep the source open whenever delivery is unconfirmed.

## Orca receipts

Use only the reply from the recorded launch attempt. A matching JSON shape does not establish its host or agent. The read-only helper can classify that reply:

```text
python3 <skill-dir>/scripts/check_handoff.py receipt <response-file-or-dash-for-stdin>
```

It recognizes `result.outcome` and `result.prompt.outcome` from `agent launch`, plus the guide's `result.launch` wrapper for worktree creation. It exits 0 only for a receiving handle with a recognized kind and delivery outcome. Mixed envelopes, unknown schemas, legacy handles without delivery evidence, contradictory errors, and missing fields return unconfirmed with exit 1. Invalid input returns exit 2. Tests include sanitized Orca 1.4.232 live replies. Delivery still does not prove successful inference, correct settings, or visible-tab placement.

Copy the selected result fields into the launch record. Preserve additional IDs from the actual reply when their location is not recognized by the helper. Do not persist unreviewed raw output merely to run the checker. It does not launch, retry, write records, authorize cleanup, or establish model settings.

For an ambiguous response, follow the version-matched guide's operation-ID replay procedure using the same host, directory, launch options, and prompt. If the ID is absent, conflicting, expired, or unverifiable, inspect without sending input. Never start a fresh agent or resend on silence alone. After an Orca restart, re-resolve handles before any action.

A delivery receipt ends the normal handoff. Do not wait for a receiver acknowledgment or create coordinator tracking unless the user explicitly requested supervision.
