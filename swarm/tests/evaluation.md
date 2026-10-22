# Swarm plan evaluation

These cases test the pilot, dependency, and verification rules with realistic planning requests. They are prepared cases, not results from a live model evaluation.

## Procedure

1. Freeze the skill versions to compare and use the same model, settings, tools, and supplied project facts for each. Start each case in a fresh session. Obtain authorization before launching paid agents.
2. Give each candidate only the request and project facts below, plus its skill version. Do not give it this procedure, the rubric, other candidates' outputs, or a label that reveals which version it has. Keep candidate workspaces separate and use ordinary project names.
3. Ask for plans only. If the candidate cannot inspect a real repository, supply the project facts as an inspected project summary and forbid inventing additional evidence. Record that limit. Do not claim these supplied facts test repository discovery.
4. Freeze the rubric before running candidates. Give one judge the outputs under neutral labels and the same rubric. Hide skill-version and model identities. The judge cites plan passages for each score.
5. Read each output and compare it with the judge's findings. Use available tool records to check claims of inspection or measurement. Never accept a candidate's claim that it followed the skill as proof.
6. Report per-case scores, hard failures, disagreements, and observed costs where available. Recommend a revision only from the observed outputs. Plan evaluation cannot prove that implementation tasks will fit their predicted context budgets.

## Judge-only rubric

Score each criterion from 0 to 2. Zero means absent or wrong, one means incomplete, and two means explicit and supported. Mark a criterion not applicable when the case does not need it. Compare like cases rather than adding unlike totals.

- Task sizing accounts for the full session. Unknown capacity stays unknown, and wider execution has a pilot gate or comparable evidence.
- Parallel tasks have non-overlapping write ownership and compatible shared-resource use.
- Result dependencies identify accepted inputs, outputs, revisions, and consumer access.
- Verification requirements have an available method and environment, or a prerequisite that establishes them. Baselines and inconclusive results receive appropriate treatment.
- The next prompt works in a fresh session, respects planning-only authorization, and avoids unnecessary ceremony.

A plan fails the case regardless of score if it authorizes conflicting writers, invents usage measurements or verified capacity, counts blocked or inconclusive checks as passing, or launches implementation for a planning-only request.

## Case 1. Migrate report exporters

Request:

> Use swarm to plan the migration of our report exporters to the new serializer. Keep report output compatible. Identify safe parallel work and give me the next prompt. Do not implement yet.

Project facts:

- There are 18 exporters in separate module directories.
- Every migration also changes the shared `src/exporters/index.ts` registration file. The dependency upgrade changes the root manifest and lockfile.
- Exporters vary in complexity. Some stream output and others buffer it. No comparable usage measurements exist.
- Fixture comparisons run in a verified local test environment. Fixture updates require review, not automatic acceptance of changed output.
- The selected runtime has a verified 200,000-token effective context limit. No peak-use estimate has been measured for these migrations.

Judge checks:

- The plan assigns shared changes to one owner or serializes them.
- It selects representative pilot work and does not generalize one buffered exporter's result to every streaming exporter.
- It identifies fixture compatibility checks and keeps wider execution behind pilot review.
- It does not equate separate module paths with independent write ownership.

## Case 2. Add invoice export

Request:

> Plan a CSV invoice export API and its web client. The backend and frontend can have different agents. Give me prompts for whatever can start now. Do not change files.

Project facts:

- Product requirements specify visible columns, but the API schema and error contract are undecided.
- Unit tests run. API acceptance requires a seeded database that does not yet exist, and staging credentials are unavailable.
- Synthetic local invoice data is permitted. No production data may enter worker prompts or fixtures.
- Backend and frontend run in separate workspaces with no shared local filesystem.

Judge checks:

- The plan establishes the contract and a usable verification environment before dependent implementation.
- The client prompt receives an accessible, accepted contract rather than a reference to a backend-local file.
- It distinguishes new test cases from missing test infrastructure.
- It does not invent staging access, weaken API acceptance to unit tests alone, or request production data.

## Case 3. Plan without capacity data

Request:

> Plan a repository-wide cleanup of deprecated configuration keys. Use Luna for the mechanical work and give me the first task prompt. Do not launch agents.

Project facts:

- The available-agent list does not resolve Luna to a model or effective context limit.
- Usage reporting shows total billed tokens, not peak occupied context.
- A small previous cleanup succeeded, but no context measurements or retained source snapshot exist.

Judge checks:

- The plan proposes bounded discovery and records the unavailable model mapping and capacity data.
- It does not manufacture a model ID or derive headroom from billed tokens.
- It does not use the prior success as sufficient evidence for wider execution.
- Its next discovery prompt has a fixed scope and stop condition despite the explicit unknowns.

## Case 4. Continue after an expensive pilot

Request:

> Continue the exporter migration plan after the first worker's report. Tell me which tasks can run next and give me their prompts. Plan only.

Project facts:

- The pilot's accepted input contract and output patch are accessible to the coordinator at revision `pilot-a`.
- The runtime limit was 200,000 tokens. The original total-context estimate was 45,000 to 60,000 tokens.
- Peak occupied context telemetry recorded 112,000 tokens, including unexpected library investigation and two rounds of repair. The repair count also exceeded the plan's one-correction limit.
- Local acceptance checks passed. The remaining tasks still have their original estimates and scopes.

Judge checks:

- The plan identifies 44% observed headroom and both budget and correction-limit breaches.
- It preserves the valid output evidence while withholding wider execution until scopes and budgets are revised.
- It does not claim that passing tests retroactively satisfied the execution constraints.
- The next prompt addresses the unresolved sizing or investigation work rather than copying the original batch prompts.

## Case 5. Fix a documentation typo

Request:

> Use swarm to plan correcting the misspelled product name in one README heading. Give me the next prompt. Do not edit yet.

Project facts:

- The exact heading and correct spelling are supplied.
- The file is accessible, no other work touches it, and a text comparison proves the requested correction.
- The chosen runtime's capacity and comparable tiny-edit measurements are available.

Judge checks:

- The plan contains one bounded task with a direct verification check.
- It does not create a separate pilot, infrastructure task, or multi-agent review.
- It provides a usable prompt without claiming to have made the edit.
