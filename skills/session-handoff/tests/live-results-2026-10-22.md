# Live Orca forwarding test: 2026-10-22

Local macOS host, Orca 1.4.232. Initially one explicitly approved diagnostic attempt per agent in a disposable `pi-extensions` worktree. After the user corrected the model name, one additional Codex session tested `gpt-6-luna`; this was a new authorized attempt, not a replay. Setup hooks were skipped. The existing Chat UI preference selected terminals; it was not changed. No silent model fallback, prompt resend, forced failure, or cleanup was attempted.

## Results

| Agent | Requested settings | Forwarding evidence | Diagnostic outcome |
| --- | --- | --- | --- |
| Pi 1.3.0 | `gpt-6-lun`, high | Orca returned `invalid_argument`: "Agent pi does not support launch-time model selection. Omit --model to run the model from its own config." | Blocked. No accepted test launch or delivered test prompt. Did not omit the model flag or change Pi defaults. |
| Codex 0.163.0 | `gpt-6-lun`, high | Native process arguments included `-m gpt-6-lun -c model_reasoning_effort=high`; rendered UI showed the same settings and the initial prompt. | Forwarding passed. Inference failed with HTTP 400: "The 'gpt-6-lun' model is not supported when using Codex with a ChatGPT account." The handoff file was not read. |
| Codex 0.163.0, corrected name | `gpt-6-luna`, high | Native arguments included `-m gpt-6-luna -c model_reasoning_effort=high`; rendered UI showed GPT-6-Luna high. | Passed inference, a new file challenge, AGENTS.md read/constraint quote, actual cwd, HEAD, and clean git status. Read-only tools worked; the receiver stopped. Orca reported a connected, non-orphaned terminal with tab/pane IDs. |
| Claude Code 2.1.308 | Configured `opus` alias, high | Native process arguments included `--model opus --effort high`. UI showed high effort. Assistant-response metadata identified `claude-opus-5-5`. | File challenge, actual cwd, checkout, and Read/Bash availability passed. The scoped session log contained one initial test prompt and the expected challenge response. |

The current Pi catalog listed `gpt-6-luna`, not the original `gpt-6-lun`. The user explicitly confirmed the correction before the successful Codex follow-up. Pi was not retried: its failure was Orca's agent-level rejection of launch-time model selection, not the model spelling.

## Limits and safety observations

- The test worktree and source checkout were clean after the test.
- Claude made one Read call for the handoff and one Bash call for pwd/status/HEAD. An explicit AGENTS.md read was not observed; project-instruction injection was not independently verified.
- A later topology query reported Claude's PTY as connected but orphaned, with no visible tab in the returned layout. Visible-tab placement is therefore unverified despite successful inference. The test did not manipulate the UI to fix it.
- The worktree's original shell later contained a Pi session on its configured default model. Its provenance was not established, and it was not returned by the rejected Pi launch. No test prompt was sent to it; it was not counted as a successful Pi test or disturbed.
- Native processes showed `--dangerously-bypass-approvals-and-sandbox` for Codex and `--dangerously-skip-permissions` for Claude. The test did not supply those flags or change model/permission defaults. They came from the existing Orca launch behavior. Read-only scope was an instruction, not a sandbox guarantee.
- Structured chat, model fallback, replay under transport failure, cleanup, and remote hosts were not tested. Successful GPT inference was verified only for the corrected Codex settings. All existing sessions and the disposable worktree were left in place.

## Parser regression found and fixed

The installed guide describes launch fields under `result.launch`. Actual `agent launch` replies placed `outcome`, `prompt`, `receipt`, and `operationId` directly under `result`. The original checker conservatively reported these successful deliveries as unconfirmed.

The checker now accepts either documented worktree-create wrappers or observed direct agent-launch envelopes, and rejects mixed envelopes. Sanitized selected replies are in `tests/fixtures/live-orca-1.4.232.json`. IDs and paths were replaced; no credentials or transcript content were included.

These observations apply only to this host, account configuration, and build. They are not a universal compatibility table. Delivery success remains separate from inference success, model availability, and visible UI placement.
