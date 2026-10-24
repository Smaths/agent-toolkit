# Swarm review scenarios

These are manual instruction checks, not a model evaluation or a live Orca run. Check the corresponding part of `../SKILL.md` before accepting a change.

| Request or state | Expected behavior |
| --- | --- |
| "Plan how to parallelize this migration; do not start workers" | Return a partition and say no workers were launched. |
| "Swarm this one-line typo" | Recommend one agent instead of inventing concurrent work. |
| "Swarm review these independent modules" | Assign distinct questions, source revision, and output destinations; launch through supervised Orca. |
| Two workers edit the same lockfile | Assign one owner or serialize; worktrees alone do not solve it. |
| Two workers race to implement the same feature | Set selection rule and acceptance before launch; use isolated Orca worktrees. |
| Workers benchmark different revisions | Pin SHAs, method, sample count, and order in each brief. |
| A worker claims PASS without accessible evidence | Report a gap; do not count coverage as complete. |
| A worker's report conflicts with an observed artifact | Inspect and report the discrepancy; do not relay its claim as verification. |
| An expected worker times out or its process is unverifiable | Follow Orca recovery; no duplicate launch or premature release. |
| A worker reports a design blocker | Escalate, do not invent a contract for dependent workers. |
| All workers pass but integrated tests fail | Do not claim overall success; identify integration owner and failing check. |
| Orca orchestration is unavailable | Report blocked parallelism, not sequential work presented as a swarm. |
| User asked for a swarm, not a deployment | Launch the initial wave only; no commits, publish, deploy, or unbounded retries. |

Verify discoverability with `bin/sync.sh` and `python3 bin/test_sync.py`. After editing an installed skill, use `/reload` in Pi. A real pilot requires a separate, authorized task with independent slices and inspection of worker artifacts and Orca receipts.
