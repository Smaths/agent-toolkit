# Session handoff (Pi)

A thin native adapter for the portable [session-handoff skill](../../../../skills/session-handoff/SKILL.md). `/handoff [next goal]` prepares a reference-first brief, opens a fresh conversation **in the same terminal**, and automatically starts read-only receiver inspection. The receiver presents four short lines (outcome, checked state, next action, verification) and a **Proceed?** confirmation. Supply statements only in the proposal fields: the adapter adds the question and rejects duplicate “Proceed?” text before opening the dialog, without rewriting the scope. Task tools unlock only after an affirmative dialog response.

This is not a conversation fork or a new Orca tab. Pi retains the original session file and a parent reference, not its conversation in the receiver's context. No extra full-history summarization call is made by the extension: the source agent writes the brief using its existing context.

## Requirements and enablement

- Pi's **1.4.0** extension/session-replacement API and a persisted source session; interactive TUI mode. RPC, print/JSON, separate hosts, agent changes, and separate tabs are not supported by this adapter.
- Node.js 22.19+ for offline tests; Git on PATH; a repository with a HEAD commit and its root as the session cwd.
- A writable state directory outside the checkout and the portable skill at its relative location in this collection. Keep the checkout layout intact; this is not a standalone npm package.
- Trusted extensions and project configuration. Review this source before loading it. After an adapter update, load the updated source runtime before starting another handoff; an already-running older source can still write legacy launch records after its replacement receiver finishes.

**Not enabled by this checkout or `bin/sync.sh`.** Only after explicitly deciding to try it, start an interactive invocation from the target repository:

```bash
pi -e /absolute/path/to/agent-toolkit/vendor/pi/extensions/session-handoff
```

This is an opt-in trial command, not a verification step. Do not load it alongside Pi's example extension that also registers `/handoff`.

## Use

1. Run `/handoff` or `/handoff finish the retry fix` while idle. The source receives the portable skill path and prepares the brief. It calls `handoff_ready` to deliver it; the tool is unavailable without an explicit `/handoff` invocation.
2. The adapter saves a private immutable-by-contract copy, records workspace/settings, and queues a one-shot session replacement that explicitly waits for the source turn to become idle. It never starts a shell agent, changes global settings, closes a tab, or launches through Orca.
3. The fresh receiver reads the brief and needed local context, checks actual Git state, and uses `handoff_propose` to display its concise proposal. Approve it to continue, or decline/cancel to leave task tools locked. A plain chat “yes” cannot bypass the dialog.
4. After declining, send a revised instruction to reconsider the proposal. Extension-generated messages cannot reopen a denial. If Git state drifted, inspect the differences and use `/handoff-recheck` to acknowledge a new inspection baseline; this is **not** approval to work. The receiver must inspect and ask again.

Pi's fresh-session defaults can differ from the source. The adapter restores the exact source model and reasoning selection through session-local APIs, then verifies them before sending the receiver prompt. Missing models or clamped/unknown settings stop startup rather than falling back. Later settings drift blocks the proposal. Missing references, unavailable tools, or contradictory instructions block dependent work, not a narrowly scoped investigation the user explicitly requests. Report the gap rather than fabricating a “checked” claim; use [additional local context](#additional-local-context) for local read access.

## Approval boundary

Before approval, the receiver exposes only its dedicated startup tools:

- `handoff_read`: bounded text reads from the repository, saved brief, or explicitly granted local paths. Relative paths resolve from the recorded workspace. External files require a separate read grant; URLs are unsupported.
- `handoff_inspect`: fixed, bounded Git probes, with optional file-specific staged/unstaged diffs, without a shell, external diff, textconv, or fsmonitor hooks.
- `handoff_propose`: a human confirmation dialog, available only after the complete brief was read and current state inspected.

The `tool_call` gate also blocks undeclared/deferred tools, MCP mutations, shell execution, and tool orchestrators such as codemode. Hiding tools alone would not protect those paths. Pending gates survive reload/resume. Before proposing, **reread the complete brief with `handoff_read` and inspect again with `handoff_inspect`**; earlier transcript reads and inspection results do not satisfy the new runtime's evidence checks. Required external read grants must also be reacquired. Forking or tree navigation while pending is refused. Navigating an approved session back to a pre-approval branch restores its gate.

The adapter compares workspace, HEAD, branch, staged/unstaged diffs, and untracked content before showing the dialog and again after confirmation. Drift discards approval. Historical test results are never rerun automatically. Approval is persisted before restoring the prior task-tool set; later side effects still require their usual authorizations.

**Limits:** this is a gate on model tool calls through Pi, not an OS sandbox. Trusted extensions, hooks, user shell commands, and outside processes can still act. It does not prove the model interpreted every reference correctly, enforce the semantic scope after approval, or lock the filesystem against concurrent edits. Ignored files and nested submodule working contents are outside its fingerprint. Required context in those areas needs explicit inspection and care. Read access is not a secret scanner; the source and receiver must follow the portable skill's credential rules.

Inspection is bounded: Git probes have a five-second timeout and 4 MiB output ceiling; at most 200 untracked files, 2 MiB per file and 16 MiB total; brief copies are at most 32 KiB. Startup reads are at most 200 lines/16,000 characters per call from text files up to 2 MiB. Exceeding a limit blocks the native path rather than claiming verification. Ask for another supported path; do not delete files or silently weaken checks to fit.

### Additional local context

When a required local reference is outside the default scope, ask the user to run:

```text
/handoff-allow-read <path>
```

The command confirms the **canonical file or directory** before allowing bounded reads. A directory grant includes its descendants, but a symlink whose resolved target is outside the granted scope remains blocked. Choose the narrowest useful scope; a grant is not a credential filter or a filesystem snapshot. Regular-text-file, size, and paging limits still apply. The command resumes read-only startup after confirmation; it neither reads all descendants automatically nor unlocks ordinary tools or approves task work.

Paths come from the current environment, not a built-in home directory, package manager, or harness version. Absolute paths and paths relative to the recorded workspace are supported. The entire argument is one path, including spaces; optional double quoting uses JSON string syntax. For example, `/handoff-allow-read ../reference-docs` or `/handoff-allow-read "../reference docs"`. No shell, `~`, or environment-variable expansion occurs. The target must already exist; ask the user for its location if startup tools cannot discover it.

Grants are runtime-local: reload, resume, session switching, tree restoration, or shutdown clears them. They are not inherited from a brief, source session, saved entry, or a chat message saying “yes.” Declining/cancelling a read dialog grants nothing and leaves task approval pending; a declined *task* proposal still requires a revised user instruction before startup can continue. Session or canonical-target changes during the read dialog discard the grant.

**Permission is not capability.** Chat authorization alone cannot widen the reader. URLs (including `file:` URLs) are not supported by this command. For required web context, ask the user to supply accessible material or explicitly request a bounded documentation investigation through `handoff_propose`. Such approval restores the original tools, not a separate web-only mode; its displayed scope must limit work to investigation and require a later decision before implementation. Never treat inaccessible references as checked or use read approval to bypass task approval.

## Records and recovery

Private copies live in `${XDG_STATE_HOME:-$HOME/.local/state}/agent-handoffs/pi-*/handoff.md` (directory 0700, files 0600 where supported). The adjacent `.launch.json` records source session, requested settings, baseline fingerprint, and native launch progress: `prepared`, `attempted`, `created`, `delivered`, or `cancelled`. It contains selected metadata, not transcript content or raw diffs. Approval and its scope are recorded in the receiver's Pi session entries, separately from delivery.

The receiver owns delivery observation; the source does not infer it from the return of `sendUserMessage()`, which can wait for the run to finish or resolve after an input handler consumes the prompt.

| Record evidence | Meaning |
| --- | --- |
| `created`, `receiver`, `confirmedSettings` | A receiver exists; no startup-prompt observation is recorded yet. |
| `delivered`, `delivery.evidence: message_start` | The receiver observed the exact bootstrap user message, before model processing. This is not proof of durable transcript persistence. |
| `delivery.settledAt`, `delivery.aborted` | The original startup run reached `agent_settled`, with no automatic continuation remaining. An absent timestamp means settlement was not observed; `aborted: false` does not prove success. |
| `delivery.evidence: session_history` | On startup/reload/resume, matching bootstrap text in the active branch established submission. `delivery.observedAt` is the time of observation, not an inferred historical submission time. |
| `recovery.reason`, `recovery.observedAt`, `recovery.promptFound` | A restored receiver was inspected; records whether matching bootstrap history was available. This does not establish completion or approval. |

Recovery can repair a legacy `created` record when matching history exists, while preserving existing delivery/settlement metadata. It never infers original-run settlement from a later user turn. Missing history leaves creation ambiguous; existing live submission evidence is not downgraded when history is absent. Changed bootstrap text, missing/corrupt records, or a different receiver require inspection rather than fabricated success. Record failures are surfaced by Pi, not resolved by resending. These records remain progress metadata, not a filesystem lock or task authorization.

Submission, settlement, validation, and approval are separate. **Never invoke a second handoff on silence or an ambiguous record.** Inspect the record and Pi's session selector, and continue the identified receiver when appropriate. The internal `/handoff-open` token is one-shot, process-local, and not a recovery command. Cancellation retains the brief. A reload loses queued source tokens; it never automatically replays them. No automatic file cleanup is performed.

## Verification

Offline, without launching Pi or changing agent configuration:

```bash
node --test vendor/pi/extensions/session-handoff/tests/*.test.mjs
```

The suite uses temporary Git repositories plus a mocked Pi event/session/UI boundary. It covers dirty state and untracked-content drift, private storage, bounded reads, scope escape, lifecycle replacement, duplicate delivery prevention, read-only gating, persisted pending state, approval/denial/cancellation, forged approval text, and state changes during the dialog. Read-grant regressions use temporary paths unrelated to any installation: exact-file versus directory access, spaces and relative/absolute paths, symlink escapes and retargeting, URL rejection, cancellation, session restoration, and continued task-tool blocking. Lifecycle regressions hold receiver processing open to check prompt submission before settlement, distinguish consumed input and post-submission failure, repair historical records without replay, require fresh evidence after restoration, and reject duplicate approval questions before displaying a dialog. It does **not** exercise Pi's live UI, inference, extension loader, or actual command queue.

For a separately authorized live test in a disposable repository, follow the [handoff evaluation scenarios](../../../../skills/session-handoff/tests/receiver-scenarios.md). Verify fresh conversation/settings, one startup prompt, narrow context retrieval, a readable proposal, no task side effects before approval, decline/cancel behavior, and source recovery. Record the Pi version and host; do not infer live success from the offline doubles.

## Sources

Target and release check: the installed package and the [latest published release](https://github.com/earendil-works/pi/releases/tag/v1.4.0) were both 1.4.0 during implementation. The released docs, examples, and API/lifecycle source were consulted; this does not claim compatibility with unreleased main-branch APIs or future versions.

Session-replacement mechanics follow Mario Zechner's MIT-licensed Pi 1.4.0 [handoff example](https://github.com/earendil-works/pi/blob/v1.4.0/packages/coding-agent/examples/extensions/handoff.ts) and [extension API](https://github.com/earendil-works/pi/blob/v1.4.0/packages/coding-agent/src/core/extensions/types.ts). Delivery observation uses the released [extension lifecycle](https://github.com/earendil-works/pi/blob/v1.4.0/packages/coding-agent/docs/extensions.md#understand-the-runtime-lifecycle) and [agent-session implementation](https://github.com/earendil-works/pi/blob/v1.4.0/packages/coding-agent/src/core/agent-session.ts): user `message_start` precedes processing and persistence; `agent_settled` follows automatic continuations. This adaptation replaces transcript summarization/editor submission with a pointer-first brief and approval-gated automatic startup. Attribution and local changes are recorded in [SOURCES.md](../../../../SOURCES.md); the upstream license is retained here.
