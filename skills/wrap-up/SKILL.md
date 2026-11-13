---
name: wrap-up
description: Close out a task with verification, a Ship/Park/Discard recommendation, and a completion receipt.
disable-model-invocation: true
compatibility: Requires repository and filesystem inspection, Git for Git worktrees, and a shell for executable checks. Orca integration is optional and requires its version-matched CLI guide.
---

# Wrap up

Finish the task separately from removing its workspace. An unqualified wrap-up request authorizes inspection and safe local checks, not commits, publication, implementation edits, agent launches, process termination, or destructive cleanup. Carry forward explicit, applicable authorization from the user; ask only for missing authority or material ambiguity.

## 1. Establish what remains

- Read project guidance and recover the agreed scope and completion criteria from the current conversation and project references. Distinguish delivered work from proposed follow-ups; do not expand into refactoring or a repository-wide audit.
- Identify the host, checkout, branch or detached HEAD, and relevant base/upstream. Inspect staged and unstaged changes, relevant untracked files, and branch commits—not just whether the working tree is clean. Preserve unrelated work and staged boundaries. Avoid credential-bearing contents and raw private evidence.
- Establish ownership of changes and active work. If another agent or process may still be writing, treat the state as provisional; ask its owner to settle it before committing or cleanup. A completed task does not establish that every workspace process is safe to stop.
- In an Orca-managed workspace, read the [Orca closeout reference](../../vendor/orca/wrap-up/README.md) before inspecting or changing Orca state. Otherwise stay with repository tools; Orca is not a dependency of this workflow.

Done when the requested deliverables, remaining changes, branch-only work, active writers, and material unknowns are accounted for.

## 2. Verify the bounded result

- Map each completion criterion to evidence or a gap. Run project-required and risk-matched checks after inspecting their effects. Prefer safe offline checks; ask before installs, network/access changes, service interruption, or checks needing unavailable permissions. Do not launch or reload agents just to verify instructions.
- Inspect affected documentation, examples, references, attribution/licenses, and privacy implications. Report focused corrections rather than making unrequested edits. If a separate docs pass is needed, offer [sync-docs](../sync-docs/SKILL.md); it is a user-invoked workflow, not an automatic substep.
- Separate inspection, executable checks, and live/model evaluation. Reuse earlier results only for unchanged tested content. List failures, skips, blockers, and checks not run. Recheck affected evidence after any authorized edits.
- Distinguish “added to the checkout” from installed, enabled, or live-tested. A wrap-up never authorizes sync, reload, or configuration changes.

Done when every criterion has supporting evidence or an explicit gap. Failed checks remain failures, not a reason to rewrite the task's acceptance criteria.

## 3. Resolve the disposition

Honor a clear user choice within its authorized scope. Otherwise recommend one of these, explain why, and ask only the decision needed to continue; leave files and workspace intact while waiting.

- **Ship:** make the bounded result durable. When committing is authorized, follow [commit](../commit/SKILL.md) with explicit scope and exclusions. Push, PR creation, merge/integration, and history changes each require applicable authorization; “Ship” alone is not blanket permission. Report publication/integration state separately from local commits.
- **Park:** preserve actual work and provide a restart pointer. Keeping the existing checkout intact is the default; name its host, path, branch/commit, dirty files, verification gaps, and next bounded step. If removal is requested, agree on a preservation method first and verify recovery of tracked, untracked, and necessary ignored files before cleanup. A patch, branch, or handoff note alone may omit work. Temporary storage is not durable preservation. Offer [session-handoff](../session-handoff/SKILL.md) only when a fresh receiving session is wanted; parking does not invoke it or launch an agent.
- **Discard:** identify the exact changes or commits to abandon, excluded work to preserve, and consequences. Obtain explicit destructive-action authorization before acting. “Done,” “close this out,” and choosing Discard without a clear scope are insufficient authority for a reset, clean, stash, branch deletion, or worktree removal.

Keep workspace disposition separate: **retain** by default; remove/archive only when explicitly authorized and after preservation and active-work checks. Never infer branch deletion or permission to stop shared processes from permission to remove a checkout. If the cleanup operation bundles unapproved effects, stop and explain them. Revalidate state immediately before a side effect; new or ambiguous changes reopen the relevant gate.

## 4. Leave a completion receipt

Keep it short and evidence-backed:

- **Delivered:** result and authoritative paths, plus unfinished criteria or separately proposed follow-ups.
- **Verified:** checks passed/failed/skipped/blocked, evidence level, and remaining uncertainty.
- **Recorded:** commit/PR references and publication/integration state, or explicitly uncommitted/unpublished.
- **Workspace:** retained/parked/removed and branch disposition; remaining dirty or unrelated work, active resources, and restart pointer when useful.
- **Next:** only the outstanding decision or bounded follow-up, if any.

Save any required restart/cleanup receipt outside a workspace before removing it. If removal would end this session, leave the receipt and a reviewed cleanup plan for a surviving session/operator rather than deleting the session's own workspace. Claim completion only for observed outcomes; ambiguous cleanup remains unconfirmed.
