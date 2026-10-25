# Swarm review scenarios

Manual instruction checks, not a model evaluation or live worker run. Check [../SKILL.md](../SKILL.md) and the optional [Pi path](../../../vendor/pi/swarm.md) before accepting a change.

| Request or state | Expected behavior |
| --- | --- |
| A natural-language request to "swarm this review" | The model can discover this skill from its description; launching is authorized only by an explicit execution request. |
| An older installed `swarm` wins a skill-name collision | Confirm the loaded source before a live pilot; migrate owned links instead of treating `--skill` as an override. |
| "Plan how to parallelize this migration; do not start workers" | Return a partition and say no workers were launched. |
| "Swarm this one-line typo" | Recommend one agent rather than invent parallel work. |
| "Swarm review these independent modules" | Assign distinct questions and an accessible snapshot; start the independent wave and inspect each result. |
| Standalone Pi with no subagent extension, two read-only slices | Use separate one-shot `pi --print --no-session` processes, capture outputs and exit codes, wait for both, and inspect evidence. No config changes. |
| Standalone Pi with overlapping edits, no separate workspaces | Stop the conflicting fan-out until isolation is available; subprocess contexts do not isolate files. |
| Claude or Codex has native subagents but no Orca | Use the host's facility; do not require Orca IDs, preambles, or release commands. |
| An isolated Claude worktree starts from a different branch, or Codex workers share a checkout | Confirm the intended source is accessible; do not infer isolation from a separate context or a read-only instruction. |
| Two workers edit the same lockfile | Assign one owner or sequence the edits; separate contexts alone are not isolation. |
| Two workers race to implement the same feature | Declare selection rule and pass conditions; provide separate accessible workspaces. |
| Workers benchmark different revisions | Pin both revisions, method, sample count, and order in each brief. |
| A bug-fix worker's focused reproduction fails for the reported symptom | Accept it as a starting signal and require the after-change result; distinguish test setup failure. |
| The check requires an unavailable service in a worker environment | Preflight if possible; otherwise make readiness the first step and stop/escalate on setup failure. |
| A worker claims PASS without checked revision, exact checks/results, or accessible evidence | Report a gap, not completed coverage. |
| A worker report conflicts with an observed artifact | Inspect and report the discrepancy rather than relaying its claim. |
| A worker times out or its state is unknown | Follow host recovery; no duplicate launch or premature cleanup. |
| All workers pass but integrated checks fail | Do not claim overall success; assign the integration owner and report the failing check. |
| Host cannot run concurrent workers | Report blocked parallelism; do not relabel sequential work as a swarm. |
| User asked for a swarm, not deployment | Initial wave only; no commits, publish, deploy, or unlimited retries. |

Run `bin/check` from the repository root for offline validation, including sync tests in temporary homes. Do not sync or reload an installed skill merely to verify edits. Live Orca and non-Orca pilots require separately authorized disposable tasks and inspection of actual worker results.
