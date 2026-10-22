# Swarm output templates

Replace every placeholder before returning a runnable prompt. Do not fabricate paths, commands, model IDs, estimates, or completed checks. If required information is missing, give a discovery prompt instead. Use the shortest format that preserves the assignment.

## Plan header

```text
Goal and observable completion:
Scope exclusions:
Workspace or source snapshot:
Evidence inspected:
Assumptions and unresolved decisions:
Plan location and revision, or inline state:
Coordinator and integration owner:
Available agent profiles and verified model IDs:
Context policy: 70% headroom target, 50% minimum.
Pilot task and release gate, or comparable prior measurements:
Verification readiness and baseline evidence:
Concurrency cap and resource constraints:
Retry limit and escalation owner:
Execution authorization and cost constraints:
```

## Task table

| ID / status | Result | Prerequisites | Required inputs / produced outputs | Write ownership / shared resources | Role, profile/model, reason | Context limit, estimated peak, headroom, confidence | Acceptance and verification readiness |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T1 / proposed | One bounded result | Task IDs, verification setup, pilot review, or none | Accepted input artifacts and revisions, access paths; named output artifacts or contracts | Exact paths or deliverables; resource reservations | A verified option or an explicit unresolved choice | C; W range; headroom at the upper W estimate; estimate basis | Checks, expected evidence, available environment, and baseline if needed |

For each result dependency, identify its producer and acceptance evidence. A task ID or a worker-local path is not enough. Inline a small contract when no shared artifact exists. For a resource dependency, record the reservation or release evidence instead of inventing an artifact.

Record each wave's task IDs, why they can run together, and what the integrator must accept before dependent tasks become ready. A ready task need not wait for an unrelated task in an earlier wave if the runtime can schedule it safely within the cap.

## Pilot report

Add these fields to the normal worker report for a pilot task:

```text
Task, model, runtime, and source revision:
Original context estimate and effective limit:
Observed peak occupied context, measurement source, and measurement gaps:
Unexpected investigation and retained source material:
Repairs and verification effort:
Acceptance results:
Suggested changes to remaining task scopes or estimates:
```

The coordinator records which task class this evidence covers, revised budgets, and whether wider execution is ready. If usage measurements are missing, record context fit as unverified. Do not infer peak context use from total billed tokens or successful completion.

## Worker prompt

```text
Complete task <ID> only.

Goal: <one observable result>.
Role and selected agent: <role, configured profile, verified model ID>.
Workspace and baseline: <location and accepted source revision or snapshot>.
Read first: <repository instructions and the minimum source packet>.
Prerequisites: <accepted task IDs, verification setup, pilot review, or none>.
Required inputs: <producer, artifact or contract, accepted revision, access path,
inline content if needed, and acceptance evidence for each input>.
Produced outputs: <named artifacts or contracts, destinations, and intended consumers>.

You may write: <specific files, directories, or deliverables>.
Do not write: <shared and neighboring files outside this task>.
Shared resources: <isolated resources, reservations, or none>.
Preserve: <behavior, compatibility, security, and existing user changes>.
Tools and permissions: <required access and explicit restrictions>.

Context limit: <verified C>.
Estimated total peak: <W range including setup, tools, tests, repairs, and report>.
Required headroom: <70%, or explained exception of at least 50%>.
If the work no longer fits, preserve progress and report the remaining scope.
Do not depend on compaction or spawn further workers.

Acceptance: <specific tests or evidence and expected results>.
Verification readiness: <tools, fixtures, permissions, environment, and preflight evidence>.
Baseline: <source revision, method, and result, or why comparison is not needed>.
Confirm required inputs and verification prerequisites are available before editing.
For a verification-setup task, this excludes the environment you are assigned to
create. Build that environment and run its specified acceptance check.
If any other prerequisite is missing, report blocked rather than guessing or
weakening the checks.
Correction limit: <bounded attempts within this session>.
Stop and report to <coordinator> for an unresolved design choice, unavailable
capability, shared-write conflict, context overrun, or failed correction.
Do not expand scope, commit, publish, or deploy unless separately authorized.

Return:
- Result and each acceptance check's pass, fail, blocked, or inconclusive outcome.
- Accessible artifact paths and source or revision identifiers.
- Files changed, or an explicit statement that no files changed.
- Exact checks run, outcomes, and checks not run.
- Blockers, remaining risks, and any proposed follow-up.
- For a pilot, the calibration fields listed in this assignment.
Keep long logs in artifacts. Do not mark the shared plan accepted yourself.
```

For a pilot, include the pilot report fields in the prompt itself so the worker does not need this template file. Remove the pilot instruction for other tasks.

For a read-only task, allow writes only to its report artifact, or no writes if it returns the report in its response. Do not label an unknown context limit verified. Instead, write a calibration prompt with a fixed inspection scope, explicit unknowns, and a stop condition.

## Continuation prompt

```text
Use swarm to continue this plan: <actual plan path and revision, or inline plan>.
Goal and completion checks: <enough detail to recover the user's request>.
Workspace and baseline: <location and current accepted source identifier>.
Current task states: <IDs, statuses, dependencies, input/output contracts, ownership,
model/budget choices, verification prerequisites, and pilot gates>.
Pilot evidence: <accessible measurements, scope revisions, or explicit unknowns>.
Results to verify: <task IDs and accessible artifact paths or inline evidence>.
Open decisions and constraints: <blockers, context policy, cost and concurrency caps>.
Authorization for this turn: <plan only, or the expressly authorized execution scope>.

Read repository instructions and inspect current state. Check the claimed results
before accepting them. Preserve accepted work and unrelated edits. Re-evaluate
input acceptance and access, verification readiness, pilot findings, dependencies,
ownership conflicts, model availability, and context fit.
Identify the next ready tasks and return their complete prompts. Do not launch
workers unless this turn's authorization permits it. If blocked, return the
specific decision or discovery prompt needed. If all work is accepted, run or
verify combined acceptance checks and report completion or the remaining gap.
```

If several prompts run in parallel, label which agent receives each and where its result goes. Include the minimum accepted contract in each prompt. Never rely on "same context as above" when the user will paste it into a fresh session.
