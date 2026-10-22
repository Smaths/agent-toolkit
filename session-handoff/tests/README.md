# Handoff checks

Run the offline suite with Python 3. It uses only the standard library:

```bash
python3 -B ~/.skills/session-handoff/tests/test_check_handoff.py
```

`fixtures/scenarios.json` contains synthetic evidence and receipt shapes based on the Orca guide. `fixtures/live-orca-1.4.232.json` contains sanitized replies from an authorized live test; see `tests/live-results-2026-10-22.md` for its results and limitations. Each agent profile is checked against the same supported, unsupported, and unknown cases. Receipt handling covers direct `agent launch` replies and wrapped worktree-create replies. Structured-chat outcomes remain synthetic-only.

The tests cover missing settings and evidence, custom backend checks, critical capabilities, unsupported placement, inaccessible remote files, untransferred changes, ambiguous replies, legacy handles, conflicting IDs, malformed input, and CLI exit codes. They also check that delivery does not imply receiver verification or confirmed settings, and that cleanup requests cannot cause the helper to emit launch or close commands.

The helper classifies supplied evidence. These tests cannot prove that the evidence is truthful, that an agent follows the Markdown instructions, or that Orca forwards native settings correctly.

## Opt-in live smoke test

Run only when the user explicitly requests live testing and selects a disposable Orca workspace. Do not test in a working task's checkout or change global settings.

For Pi, Claude, and Codex, test each chat/terminal mode the host actually supports. Do not change the user's Chat UI setting to force a mode without approval. Record the host and agent versions, requested settings, actual launch kind, prompt outcome, and independently observable settings. Mark unavailable modes as skipped and unobservable settings as unknown, not passed.

Use a private handoff whose only next action is to read the document, report the workspace and observable agent settings, then stop without editing files, running task commands, or closing anything. Confirm that the receiver is a fresh conversation, can read the file, and sees the expected checkout and task-critical tools. Receiver acknowledgment is appropriate here because the user requested a verification test; ordinary handoffs do not wait for it.

Review the recovery record and verify no second agent or prompt was created. Exercise replay only through a documented test facility or an actual ambiguous response; do not interrupt a working runtime to manufacture a failure. Test cleanup separately only with explicit permission and isolated disposable panes. Never apply terminal cleanup to a structured-chat handle.

Keep the test result as evidence tied to that host, agent, and version. It is not a permanent compatibility guarantee for another host or build.
