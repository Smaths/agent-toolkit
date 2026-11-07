# Handoff checks

From the repository root, run the offline suite with Python 3. It uses only the standard library:

```bash
python3 -B skills/session-handoff/tests/test_check_handoff.py
```

[fixtures/scenarios.json](fixtures/scenarios.json) contains synthetic evidence and receipt shapes based on the Orca guide. [fixtures/live-orca-1.4.232.json](fixtures/live-orca-1.4.232.json) contains sanitized replies from an authorized live test; see [live-results-2026-10-22.md](live-results-2026-10-22.md) for its results and limitations. Each agent profile is checked against the same supported, unsupported, and unknown cases. Receipt handling covers direct `agent launch` replies and wrapped worktree-create replies. Structured-chat outcomes remain synthetic-only.

The tests cover missing settings and evidence, missing source checkout, same-worktree root identity from a subdirectory, mismatched handoff and launch destinations, unapproved checkout changes, explicit approval for Pi's configured-default launch, custom backend checks, critical capabilities and receiver-gated deferred dependencies, unsupported placement, inaccessible remote files, untransferred changes, ambiguous replies, legacy handles, conflicting IDs, malformed input, and CLI exit codes. They also check that delivery does not imply receiver verification or confirmed settings, and that cleanup requests cannot cause the helper to emit launch or close commands.

The helper classifies supplied evidence. Orca agent-launch receipts are parsed; the native Pi terminal path uses the version-matched terminal-create and terminal-send receipts and is not covered by the receipt parser. These tests cannot prove that the evidence is truthful, that an agent follows the Markdown instructions, that a deferred capability is really safe to postpone, or that a native terminal reaches Pi's ready state and `turn_started`.

## Receiver behavior

Use [receiver-scenarios.md](receiver-scenarios.md) for reference-first capture, stale state, selective context retrieval, fresh approval, denial, and interruption scenarios. The [Pi adapter](../../../vendor/pi/extensions/session-handoff/README.md#verification) adds offline filesystem and mocked-runtime gate tests. These are separate from the Python receipt checks and from live model evaluation. The historical Orca results did not test the new proposal/approval flow. The [Pi 1.4.0 live smoke test](live-pi-2026-10-31.md) exercised fresh-session startup, settings preservation, denial, approval-time drift, approved execution, and interrupted-startup recovery; it also records three historical UX/bookkeeping findings, their later offline-tested fixes, and the limits of that evidence.

## Opt-in live smoke test

Run only when the user explicitly requests live testing and selects a disposable checkout. Use a disposable Orca workspace for the Orca launch path; the native Pi adapter instead runs in the same terminal as its source. Do not test in a working task's checkout or change global settings.

For Pi, Claude, and Codex, test each chat/terminal mode the host actually supports. Do not change the user's Chat UI setting to force a mode without approval. Record the host and agent versions, requested settings, actual launch kind, prompt outcome, and independently observable settings. Mark unavailable modes as skipped and unobservable settings as unknown, not passed.

Use a private handoff whose proposed next action is a harmless, explicitly scoped fixture change. Its Receiver startup must first read the document and required references, report the workspace and observable agent settings, and present a concise proposal. Decline or cancel first and verify no task command or edit occurred. In a separate approved trial, confirm the proposal and check that only the agreed fixture change occurs. Never close anything as part of this test. Confirm that the receiver is a fresh conversation, can read the file, and sees the expected checkout and task-critical tools. Receiver acknowledgment is appropriate here because the user requested a verification test; ordinary handoffs do not wait for it.

Review the recovery record and verify no second agent or prompt was created. Exercise replay only through a documented test facility or an actual ambiguous response; do not interrupt a working runtime to manufacture a failure. Test cleanup separately only with explicit permission and isolated disposable panes. Never apply terminal cleanup to a structured-chat handle.

Keep the test result as evidence tied to that host, agent, and version. It is not a permanent compatibility guarantee for another host or build.
