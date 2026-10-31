# Session handoff (Pi)

A thin native adapter for the portable [session-handoff skill](../../../../skills/session-handoff/SKILL.md). `/handoff [next goal]` prepares a reference-first brief, opens a fresh conversation **in the same terminal**, and automatically starts read-only receiver inspection. The receiver presents four short lines (outcome, checked state, next action, verification) and a **Proceed?** confirmation. Task tools unlock only after an affirmative dialog response.

This is not a conversation fork or a new Orca tab. Pi retains the original session file and a parent reference, not its conversation in the receiver's context. No extra full-history summarization call is made by the extension: the source agent writes the brief using its existing context.

## Requirements and enablement

- Pi's **1.4.0** extension/session-replacement API and a persisted source session; interactive TUI mode. RPC, print/JSON, separate hosts, agent changes, and separate tabs are not supported by this adapter.
- Node.js 22.19+ for offline tests; Git on PATH; a repository with a HEAD commit and its root as the session cwd.
- A writable state directory outside the checkout and the portable skill at its relative location in this collection. Keep the checkout layout intact; this is not a standalone npm package.
- Trusted extensions and project configuration. Review this source before loading it.

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

Pi's fresh-session defaults can differ from the source. The adapter restores the exact source model and reasoning selection through session-local APIs, then verifies them before sending the receiver prompt. Missing models or clamped/unknown settings stop startup rather than falling back. Later settings drift blocks the proposal. Missing references, unavailable tools, or contradictory instructions require a question rather than a fabricated “checked” claim.

## Approval boundary

Before approval, the receiver exposes only its dedicated startup tools:

- `handoff_read`: bounded text reads from the repository or the saved brief. Repository-relative paths resolve from the recorded workspace. Required external URLs or paths are not silently fetched; ask the user to supply accessible context or use a different workflow.
- `handoff_inspect`: fixed, bounded Git probes, with optional file-specific staged/unstaged diffs, without a shell, external diff, textconv, or fsmonitor hooks.
- `handoff_propose`: a human confirmation dialog, available only after the complete brief was read and current state inspected.

The `tool_call` gate also blocks undeclared/deferred tools, MCP mutations, shell execution, and tool orchestrators such as codemode. Hiding tools alone would not protect those paths. Pending gates survive reload/resume; inspection evidence must be gathered again. Forking or tree navigation while pending is refused. Navigating an approved session back to a pre-approval branch restores its gate.

The adapter compares workspace, HEAD, branch, staged/unstaged diffs, and untracked content before showing the dialog and again after confirmation. Drift discards approval. Historical test results are never rerun automatically. Approval is persisted before restoring the prior task-tool set; later side effects still require their usual authorizations.

**Limits:** this is a gate on model tool calls through Pi, not an OS sandbox. Trusted extensions, hooks, user shell commands, and outside processes can still act. It does not prove the model interpreted every reference correctly, enforce the semantic scope after approval, or lock the filesystem against concurrent edits. Ignored files and nested submodule working contents are outside its fingerprint. Required context in those areas needs explicit inspection and care. Read access is not a secret scanner; the source and receiver must follow the portable skill's credential rules.

Inspection is bounded: Git probes have a five-second timeout and 4 MiB output ceiling; at most 200 untracked files, 2 MiB per file and 16 MiB total; brief copies are at most 32 KiB. Startup reads are at most 200 lines/16,000 characters per call from text files up to 2 MiB. Exceeding a limit blocks the native path rather than claiming verification. Ask for another supported path; do not delete files or silently weaken checks to fit.

## Records and recovery

Private copies live in `${XDG_STATE_HOME:-$HOME/.local/state}/agent-handoffs/pi-*/handoff.md` (directory 0700, files 0600 where supported). The adjacent `.launch.json` records source session, requested settings, baseline fingerprint, and native launch progress: `prepared`, `attempted`, `created`, `delivered`, or `cancelled`. It contains selected metadata, not transcript content or raw diffs. Approval and its scope are recorded in the receiver's Pi session entries, separately from delivery.

`created` records a receiver ID; `delivered` means its startup prompt was submitted successfully, not proof of validation or approval. A failed call can leave `attempted` or `created`; do not invoke a second handoff on silence. Inspect the record and Pi's session selector, and continue the identified receiver when appropriate. The internal `/handoff-open` token is one-shot, process-local, and not a recovery command. Cancellation retains the brief. A reload loses queued source tokens; it never automatically replays them. No automatic file cleanup is performed.

## Verification

Offline, without launching Pi or changing agent configuration:

```bash
node --test vendor/pi/extensions/session-handoff/tests/*.test.mjs
```

The suite uses temporary Git repositories plus a mocked Pi event/session/UI boundary. It covers dirty state and untracked-content drift, private storage, bounded reads, scope escape, lifecycle replacement, duplicate delivery prevention, read-only gating, persisted pending state, approval/denial/cancellation, forged approval text, and state changes during the dialog. It does **not** exercise Pi's live UI, inference, extension loader, or actual command queue.

For a separately authorized live test in a disposable repository, follow the [handoff evaluation scenarios](../../../../skills/session-handoff/tests/receiver-scenarios.md). Verify fresh conversation/settings, one startup prompt, narrow context retrieval, a readable proposal, no task side effects before approval, decline/cancel behavior, and source recovery. Record the Pi version and host; do not infer live success from the offline doubles.

## Sources

Target and release check: the installed package and the [latest published release](https://github.com/earendil-works/pi/releases/tag/v1.4.0) were both 1.4.0 during implementation. The released docs, examples, and API/lifecycle source were consulted; this does not claim compatibility with unreleased main-branch APIs or future versions.

Session-replacement mechanics follow Mario Zechner's MIT-licensed Pi 1.4.0 [handoff example](https://github.com/earendil-works/pi/blob/v1.4.0/packages/coding-agent/examples/extensions/handoff.ts) and [extension API](https://github.com/earendil-works/pi/blob/v1.4.0/packages/coding-agent/src/core/extensions/types.ts). This adaptation replaces transcript summarization/editor submission with a pointer-first brief and approval-gated automatic startup. Attribution and local changes are recorded in [SOURCES.md](../../../../SOURCES.md); the upstream license is retained here.
