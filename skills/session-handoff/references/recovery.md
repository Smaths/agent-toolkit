# Launch record and recovery

For external-process launches, create `<handoff-path>.launch.json` beside the private handoff with the same restricted permissions. The [Pi native adapter](../../../vendor/pi/extensions/session-handoff/README.md#records-and-recovery) owns its different session-replacement record; do not create a second external launch or replay record for it. Keep records outside the checkout. Start with the fields from [preflight.md](preflight.md), then add:

- `created_at`: UTC timestamp.
- `source`: host, absolute source checkout root, session ID and handle/kind if known. Use the observed source checkout, not a repository default or another checkout mentioned in the task.
- `launch`: method such as `native-cli`, `agent-launch` or `worktree-create`, execution host, executable, invoking directory, exact nonsecret arguments, initial prompt and attempt timestamp. For a native CLI, include the shell, terminal launcher/selector, unique tab title if supported and the quoted command containing the positional prompt. For a manual command not yet run, leave the attempt timestamp null. Match the brief's Source and Destination to `source.workspace`, `handoff_destination` and `target.workspace`; a changed host or checkout needs `checks.checkout_change_approval`.
- `result`: receiving handle/kind and destination identity if known. For a native CLI, separately record creation status, whether the command supplied the prompt, observed startup status/evidence and actual placement. For a managed launch, record the operation/retry ID and documented prompt-delivery outcome. Leave unknown values null. A terminal handle or supplied prompt does not prove harness startup, validation or approval.
- `confirmed_settings`: only settings independently observed from the runtime, with the evidence source. Requested flags are not confirmed effective settings. For approved Pi defaults, preserve `settings_selection: "agent-default"` and approval evidence, and record arguments without model/effort overrides; the source settings remain comparison data.
- `startup_gate`: runtime-enforced, instruction-only or unknown, with evidence.
- `cleanup`: whether requested, source identity and whether performed or left open.

Record selected facts, not raw environment, configuration, command output or transcripts. Never store credentials in arguments. Reference credential/configuration names instead. If the execution context cannot be restored safely, stop rather than guessing a retry.

Save attempt metadata before issuing the launch, then update it as soon as a reply arrives, atomically where supported. A record left at "attempted" after a crash is ambiguous, not proof that nothing started. Keep the source open whenever receiver startup, managed delivery or placement is unresolved.

## Native CLI recovery

The startup prompt is part of the saved command. There is no separate send request to retry and no required `turn_started` receipt. Use [cli.md](cli.md#launch-once) to distinguish command input from observed receiver behavior.

If creation times out or its reply is lost, inspect only the recorded host/workspace for that attempt's handle, custom tab title and process/cwd evidence. On Orca, a running program can repaint the terminal title; check the custom tab title in the layout rather than treating `terminals[].title` as a stable identifier. Do not create another terminal while the first attempt is uncertain. After an Orca restart, re-resolve handles before any action.

An unsupported observer or empty screen leaves startup unconfirmed. A trust/login/error screen is a blocker, not permission to answer it or launch a replacement. Preserve the handle and source and report the next user action. Background-only or unknown placement likewise needs an honest report, not a duplicate launch. Do not resend the prompt or add a receiver acknowledgment protocol to resolve silence.

A legacy `pi-native-terminal` record describes the former start-empty/terminal-send route. Inspect its existing handle and recorded send request without input; do not migrate it by running the new command. If recovering its send, use only the installed guide's documented replay with the original payload, same handle and valid request ID. Missing or unverifiable IDs require inspection, not a fresh send.

## Orca managed receipts

Use only the reply from the recorded managed-launch attempt. A matching JSON shape does not establish its host or agent. The read-only helper can classify that reply:

```text
python3 <skill-dir>/scripts/check_handoff.py receipt <response-file-or-dash-for-stdin>
```

It recognizes `result.outcome` and `result.prompt.outcome` from `agent launch`, plus the guide's `result.launch` wrapper for worktree creation. It exits 0 only for a receiving handle with a recognized kind and delivery outcome. Mixed envelopes, unknown schemas, legacy handles without delivery evidence, contradictory errors and missing fields return unconfirmed with exit 1. Invalid input returns exit 2. Tests include sanitized Orca 1.4.232 live replies. Delivery does not prove successful inference, correct settings or visible-tab placement.

Copy selected fields into the launch record. Preserve additional IDs from the actual reply when the helper does not recognize their location. Do not persist unreviewed raw output just to run the checker. The helper does not parse native terminal startup, launch, retry, write records, authorize cleanup or establish effective settings.

For an ambiguous managed response, follow the installed guide's operation-ID replay procedure using the same host, directory, options and prompt. If an ID is absent, conflicting, expired or unverifiable, inspect without input. Do not apply managed-launch replay to native terminal creation. Never start another agent or resend on silence alone.

## Stop after reporting

Report the recorded facts and unknowns, then stop. Native CLI handoffs do not require a delivery receipt or wait for a receiver acknowledgment. Managed handoffs retain their documented delivery criterion; neither route waits for task completion or creates coordinator tracking unless the user asked for supervision. Unresolved startup or placement leaves the source available and prevents cleanup.
