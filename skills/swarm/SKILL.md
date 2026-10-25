---
name: swarm
description: Fan out independent workers for parallel coverage, competing attempts, or reviews; inspect their evidence and return one report. Use only when the user explicitly asks to swarm, fan out, or run parallel agents. A request to plan a swarm does not authorize launching workers.
---

# Swarm

Adapted from [Poteto's swarm](https://github.com/cursor/plugins/blob/main/pstack/skills/swarm/SKILL.md). Use the host's documented worker facility; this skill supplies the workflow, not an agent launcher.

## Frame

1. State the wanted result, observable pass condition, and report or artifact. If one agent is cheaper and safer, recommend that instead. For a plan-only request, return a partition and stop before launch.
2. Choose **coverage** (independent slices), **race** (same brief, independent attempts), or **mixed**. For a race, declare `first pass`, `rank all`, or `best-of` and comparison criteria before launch. Name every required coverage slice. Use the requested worker count; otherwise start with at most three. An initial wave is not authorization for unlimited retries, commits, publishing, or deployment.
3. Make each brief self-contained: goal, slice or race arm, accessible source revision/snapshot (including relevant uncommitted changes), ownership and do-not-touch boundaries, pass condition, verification method, evidence, and stop conditions. Discover the smallest relevant project check and whether it can run in the worker environment; if unknown, make readiness the worker's first step before edits and stop/escalate on a setup blocker. An expected failing bug reproduction is not a broken harness. Require the checked revision, exact checks, results, and gaps in each result. For a fuller check-selection procedure, see [verification-readiness](../verification-readiness/SKILL.md).
4. Check independence beyond source files: shared configuration, lockfiles, generated files, services, caches, and ports may conflict. Isolate overlapping writers and race arms in separate accessible workspaces; assign shared edits to one owner or sequence them. Read-only workers can share a snapshot with distinct questions. Choose the integration owner before code-writing fan-out.

## Fan out

Confirm the host can start independent workers concurrently and retrieve their outcomes. Prefer its native subagent/coordination facility and current documentation; use configured defaults unless the user selected a model. In an Orca-managed session, load the installed `orchestration` skill and its version-matched guide for the entire supervised lifecycle. For Pi outside Orca without a subagent tool, run documented one-shot `pi --print --no-session` processes concurrently with separate private outputs; wait for every exit and inspect the results. The optional [Pi CLI path](../../vendor/pi/swarm.md) gives a shell recipe. If the host has no usable concurrent worker path, report that limitation rather than doing serial work and calling it a swarm.

Start the independent wave before waiting. Preserve the runtime's worker identity and ownership; on uncertain launch or liveness, inspect before retrying or cleaning up. Follow its documented completion and cleanup procedure. Do not expand scope or send secrets to workers. A dependency waits for an accepted, accessible result, not a completion claim.

## Aggregate and report

Wait until each expected attempt completes or its state is positively established; a timeout is not proof of exit. Inspect actual outputs, changes, and checks. For coverage, label each slice `PASS`, `ISSUES`, or `BLOCKED` with evidence; missing or inconclusive evidence is a **gap**. For a race, apply the declared selection rule only to comparable results. Review code changes, reconcile overlaps through the assigned owner, and run combined checks on the integrated revision before claiming the whole outcome.

Return one concise table with worker/slice, source revision, verdict, evidence, and issue or gap. Include the race rule if relevant, combined-check result, unresolved risks, and next owner. Separate worker claims from independently verified facts; do not paste raw transcripts. For a plan-only request, state that no workers were launched.

Review [tests/review.md](tests/review.md) when changing this skill. Its scenarios are instruction checks, not a live swarm evaluation.
