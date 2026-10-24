---
name: swarm
description: Fan out independent Orca workers for parallel coverage, competing attempts, or reviews; verify their evidence and return one report. Use when the user explicitly asks to swarm, fan out, or run parallel agents. A request to plan a swarm does not authorize launching workers.
disable-model-invocation: true
---

# Swarm

Adapted from [Poteto's swarm](https://github.com/cursor/plugins/blob/main/pstack/skills/swarm/SKILL.md) for supervised Orca workers. This skill runs work; it is not the old planning-only task splitter. Use the installed `orchestration` skill for lifecycle commands and the version-matched Orca guide it loads. Never copy Cursor `Task` arguments or guess Orca commands from this file.

## Frame

1. State the result the user wants, its observable pass condition, and the report or artifact to return. If a single agent can finish more cheaply and safely, say so instead of fabricating parallel tasks. If the request is plan-only, return a brief partition and stop before any launch.
2. Choose **coverage** (distinct slices), **race** (identical brief, independent attempts), or **mixed**. For a race, choose `first pass`, `rank all`, or `best-of` *before* launching and name the comparison criteria. For coverage, name every required slice so a missing worker is a visible gap.
3. Set the worker count from the request; otherwise start with at most three independent workers. Confirm available Orca agents/models rather than using Poteto's Cursor defaults or inventing model IDs. A request to swarm authorizes the initial wave, not unlimited retries, publishing, commits, or deployment. Ask when a cost, capability, or risky side-effect choice is genuinely unresolved.
4. Give each worker a self-contained brief: goal, exact slice or race arm, source revision or snapshot, permitted files or report destination, do-not-touch boundaries, verification method, expected evidence, and stop conditions. For a measurement, pin the method (sample count and order as relevant) and both compared revisions. Select one integration owner before any code-writing fan-out.
5. Check independence. Shared configuration, lockfiles, generated output, databases, ports, caches, and external services can conflict even when source files differ. Use separate Orca-managed worktrees for competing or overlapping code changes; assign shared edits to one owner or sequence them. Read-only reviews may use the same snapshot but need distinct questions and independent output paths. A worktree does not make incompatible interfaces safe to merge.

## Fan out

Load `orchestration` and its version-matched guide before touching the Orca lifecycle. Use supervised Tasks and Dispatches, not unsupervised terminal prompts or ad hoc Git worktrees. Read its placement reference before creating worktrees or targeting another host. Start the whole independent wave before waiting. If structured orchestration is unavailable, report that parallel execution is blocked; do not quietly run sequential agents and call it a swarm. The Orca worker preamble defines each dispatched worker's reporting and authority.

Do not expand a worker's scope or send secrets to workers. A dependency waits for an accepted, accessible result, not merely a worker's completion claim. A failed launch has its own recovery path; do not blindly relaunch.

## Aggregate

Wait through Orca's supervised loop until each expected attempt settles or the runtime positively establishes why it cannot. A timeout or missing terminal is not proof of exit. Process questions and escalations, validate Dispatch identity, inspect actual artifacts and checks, and decide retention or release for every settled worker per the runtime guide. A retry requires proof of the prior attempt's state and a fresh authorization decision; never silently create a second editor of the same work.

For each coverage slice, mark `PASS`, `ISSUES`, or `BLOCKED` with evidence. Missing, inaccessible, or inconclusive evidence is a **gap**, not a pass. For a race, apply the declared selection rule to comparable results; if no candidate passes, report that instead of choosing a winner. Do not paste raw worker transcripts. Review code changes yourself, reconcile overlaps, and run combined checks on the integrated revision before claiming the whole outcome.

## Report

Return one concise result table with worker/slice, source revision, verdict, evidence, and issue or gap. Name the race rule if relevant, combined-check result, unresolved risks, and the next owner of unfinished work. Separate what workers reported from what you verified. If the user requested only a plan, state explicitly that no workers were launched.

For changes to this skill, review [tests/review.md](tests/review.md). The checks there are written scenarios, not evidence of a live swarm run.
