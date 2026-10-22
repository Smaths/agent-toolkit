# Swarm review scenarios

Use these scenarios to review changes to the instructions. They are manual acceptance cases, not automated model evaluations.

| Scenario | Required behavior |
| --- | --- |
| A one-file typo fix | Produce one bounded task. Do not manufacture a multi-agent workflow. |
| An API and client need an undecided schema | Schedule contract discovery first. Keep implementations provisional until the contract is accepted. |
| Two independent modules both need a package lockfile change | Assign the shared dependency change to one owner or serialize it. Separate worktrees alone are not sufficient. |
| Disjoint test files reset the same database | Isolate databases or serialize the tests. File separation does not establish independence. |
| The model limit is 200,000 tokens and the estimated total peak is 60,000 | Report 70% headroom and a target fit. |
| The limit is 200,000 and the estimate is 40,000 to 110,000 | Use 110,000 for approval. Split the task because 45% headroom fails the minimum. |
| The limit is 200,000 and the peak estimate is 100,000 | Allow the 50% headroom boundary only with an explained exception to the 70% target. |
| A task looks small, but setup and tests push it over budget | Count setup and verification. Do not approve based on the edit alone. |
| A requested Luna profile or its context limit is unavailable | Keep the selection or fit unverified. Propose discovery or a verified substitute without inventing an ID. |
| A one-line authorization change | Route according to security risk, not line count. Require capable review. |
| A cheap worker fails its correction or needs a design decision | Escalate or replan. Do not retry indefinitely or authorize more spending implicitly. |
| The user requests a plan, not implementation | Investigate and return prompts. Do not edit implementation or launch workers. |
| The next session has no parent transcript and no saved plan | Include enough inline state and contracts for the continuation prompt to work. |
| A worker reports success with no test evidence | Keep its task in needs-review. Do not unlock consumers based on the claim alone. |
| A resumed plan says complete, but its source revision changed | Revalidate the affected evidence and dependencies. Do not blindly rerun everything or trust stale status. |
| Workers pass local checks but combined checks fail | Keep the project incomplete and provide a bounded integration or repair task. |
| A worker times out with unknown liveness | Follow runtime recovery rules. Do not launch a duplicate editor or claim the work stopped. |
| Independent workers produce very long reports | Retain artifacts and concise summaries. Budget coordinator review and integration separately. |
| A remote worker returns a report path the coordinator cannot read | Arrange artifact transfer or return the needed evidence. Do not accept an inaccessible report. |

## Pilot, dependency, and verification cases

| Scenario | Required behavior |
| --- | --- |
| Twenty similar migrations have no comparable usage measurements | Plan one representative migration through local acceptance before releasing similar tasks. Do not add a throwaway rehearsal. |
| A pilot used more context than expected, including repair work | Record the measurement and revise remaining scopes and budgets before wider execution. Do not relax the headroom policy. |
| A pilot passed but telemetry reports only total billed tokens | Keep peak context use and fit unverified. Do not use completion as proof that wider execution fits. |
| Prior measurements cover another model or a much simpler task | Do not treat them as sufficient calibration for this task class. |
| A trivial standalone edit needs no broader execution | Keep one task. Do not add pilot ceremony. |
| A dependency says only that T1 is complete | Require the produced artifact or contract, accepted revision, acceptance evidence, and consumer access before marking the dependent task ready. |
| A previously accepted schema changes | Recheck affected consumers and their acceptance evidence. |
| An implementation requires a database fixture or permission that has not been established | Create a verification prerequisite and keep implementation unready. A proposed test command does not prove readiness. |
| A feature needs a new regression case but its test infrastructure works | Include the case with implementation. Do not require a separate setup task. |
| A verification-setup task must create a missing database fixture | Require the tools needed to create and check the fixture, not the fixture itself as an input. Avoid a self-dependency. |
| A verification run cannot distinguish success from failure | Mark it inconclusive, withhold acceptance, and schedule a bounded verification repair. Do not weaken the criterion. |

For realistic requests and a blinded comparison procedure, use [evaluation.md](evaluation.md). These cases do not launch agents or constitute a model evaluation.

## Review record

### First critical review

This was a self-review of the written instructions, not an independent agent evaluation. It identified and corrected these gaps:

- Unknown context limits could imply an unsupported fit guarantee. Calibration now has a fixed scope, an explicit unverified status, and a stopping point.
- An artifact path might exist only in a worker's workspace. The coordinator must check access and arrange transfer when needed.
- Acceptance evidence lacked a required source identity. It now refers to the tested revision or source snapshot.
- A timed-out worker might still be editing. Recovery now defers to runtime instructions and requires an ownership check before retrying.
- High-risk review needed an explicit task and budget, not just a preferred reviewer tier.

### Unslop pass

Applied the installed `unslop` skill to the draft and references. Split dense instructions, replaced compressed slash phrases with plain wording, and removed jargon where a direct instruction was clearer. Preserved context formulas, ownership rules, and acceptance requirements. Corrected a reference to a nonexistent task card to name the actual task table.

### Second critical review

Walked through the initial 19 scenarios against the revised instructions. The review found no remaining blocking instruction gaps. It also corrected the table's ambiguous phrase "upper-bound headroom" to mean headroom calculated at the upper context-use estimate.

The scenarios cover single-task plans, contract dependencies, shared files and databases, context boundaries, unavailable profiles, security risk, retries, execution authorization, fresh-session prompts, evidence checks, stale plans, integration failure, uncertain worker liveness, coordinator context, and remote artifacts.

These results establish instruction coverage only. No model was run against the scenarios and no live worker was launched. Actual context fit, model routing quality, concurrency limits, and worker reliability still need measurement on real tasks.

### Checks

- `python3 -B bin/test_sync.py` passed all 11 existing sync tests.
- Frontmatter, local Markdown links, file length, whitespace, and numerical context examples were checked with a local Python validation command.
- The repository sync script linked `swarm` into the shared agent and Claude skill directories.
- `git diff --check` reported no whitespace errors. New skill files also received a direct whitespace check because Git does not include untracked files in that command.

The structural check is not the official `skills-ref` validator, which was not installed. No live orchestration or model-quality claim follows from these checks.

### Pilot, dependency, and verification revision

Added representative pilots before wider execution, explicit input/output contracts, and verification prerequisites. Updated the worker and continuation templates to carry those requirements. Added Poteto's source material to the research reference without importing Cursor commands or elapsed-time rules.

Reviewed the 19 original scenarios and 11 added scenarios against the instructions. The review caught a possible self-dependency for verification-setup tasks. The instructions and prompt now distinguish the environment a task creates from the prerequisites it needs to create and check it.

Added five realistic requests and a fixed rubric in `evaluation.md`. These cases are prepared for a blinded comparison, not reported as completed model runs. No workers were launched.

Reran all 11 sync tests and the local structural checks. Checked the new 112,000-of-200,000-token example, which leaves 44% headroom and fails the minimum. Unrelated repository changes remain untouched.
