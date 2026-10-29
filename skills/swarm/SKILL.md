---
name: swarm
description: Fan out independent workers for parallel coverage, competing attempts, or reviews; inspect their evidence and return one report. Use only when the user explicitly asks to swarm, fan out, or run parallel agents. A request to plan a swarm does not authorize launching workers.
---

# Swarm

Adapted from [Poteto's swarm](https://github.com/cursor/plugins/blob/main/pstack/skills/swarm/SKILL.md). Coordinate a bounded batch through the host's worker facility.

## Frame

1. State the wanted result, observable pass condition, and report or artifact. If one agent is cheaper and safer, recommend that instead. For a plan-only request, return a partition, state that no workers were launched, and stop.
2. Default to **coverage**. Name every required slice and give each worker a distinct question or task. Use the requested worker count; otherwise start with at most three. For competing attempts or mixed batches, apply [the race rules](#when-workers-compete) before launch.
3. Give each worker a self-contained brief with its goal, assigned work, accessible source snapshot, scope boundaries, pass condition, verification method, expected evidence, and stop conditions. Include relevant uncommitted changes in a code snapshot. Read-only workers may share a snapshot. Before delegating edits, apply [the editing rules](#when-workers-edit-code).

Check independence, including shared services, caches, ports, and outputs. When workers verify or measure code, name the revisions and exact checks or measurement method in their briefs and require them in the results. For measurements, include sample count and order where relevant.

Keep workers within the authorized scope and keep secrets out of their briefs. An initial wave does not authorize unlimited retries, commits, publishing, or deployment.

## Run

Before launch, follow the [worker runtime reference](references/workers.md) to choose a concurrent worker path and its lifecycle procedure. Start the independent wave before waiting. Preserve each worker's identity and ownership. Inspect uncertain launches or liveness before retrying or cleaning up. Start dependent work only after accepting an accessible result.

## Verify and report

Account for every worker until it completes or its state is positively established. A timeout is not proof of exit. Inspect outputs and evidence. For coverage, label each slice `PASS`, `ISSUES`, or `BLOCKED`. Missing, inaccessible, or inconclusive evidence is a gap, not a pass.

Return one concise report with coverage verdicts, supporting evidence, gaps, unresolved risks, and the next owner of unfinished work. Separate worker claims from facts you verified. Summarize findings instead of pasting transcripts. Use a table when it helps comparison.

## When workers edit code

Use [verification-readiness](../verification-readiness/SKILL.md) before dispatch to select a relevant check, establish readiness in the worker's environment, and define the required evidence. Include each worker's checked revision, exact checks, results, and gaps in the report.

Choose an integration owner before launch. Check for conflicts in files, lockfiles, configuration, and generated output. Isolate overlapping writers and competing implementations in separate accessible workspaces. Assign shared edits to one owner or sequence them.

Review changes and reconcile overlaps through the integration owner. Run combined checks on the integrated revision before claiming success, and report that revision and result.

## When workers compete

Give competing workers the same task, comparable starting snapshots, and the same pass condition. Mixed batches may combine coverage slices with competing attempts. Before launch, declare the comparison criteria and a selection rule:

- `first pass` selects the first candidate you verify meets the pass condition.
- `rank all` ranks all comparable candidates using the declared criteria.
- `best-of` combines useful parts of comparable results and verifies the combined result.

Report the selection rule and outcome. If no candidate or combined result passes, report that. Selecting a winner leaves you responsible for the other workers. Follow the host's completion or cancellation procedure for every outstanding worker before the final report.

Review [tests/review.md](tests/review.md) when changing this skill. Its scenarios are instruction checks, not a live swarm evaluation.
