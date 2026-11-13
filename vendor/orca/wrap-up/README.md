# Orca closeout reference

Optional adapter for the portable [wrap-up skill](../../../skills/wrap-up/SKILL.md), not a separate installed skill or an automatic cleanup script. Load it only for an Orca-managed workspace. The portable skill owns disposition and authorization; this reference adds Orca identity and lifecycle checks.

## Inspect the intended workspace

1. Load the available `orca-cli` skill, resolve its executable for this session, and read the bundled version-matched guide. Use that executable consistently. Inspect help for the commands and flags needed; if unavailable, report the limitation rather than installing, starting, upgrading, or reconfiguring Orca.
2. Resolve the enclosing workspace from the task's actual checkout, not a branch name, display name, UI selection, or stale saved handle. Use `worktree current --json` and exact `worktree show` inspection as supported. Confirm execution host/environment, workspace kind, exact selector, checkout path, and Git identity. For paired/remote hosts use explicit selectors from that host; never substitute local `active`/`current`. Stop on ambiguity or inaccessible host state.
3. Read only task-relevant metadata, linked references, and current activity. Use bounded worktree/agent/terminal listings, checking truncation before assuming complete coverage. Do not bulk-read previews, old scrollback, or session histories. Establish active writers, live chats/workers, child workspaces and shared resources; an idle shell or finished dispatch alone is not proof that the whole workspace is inactive. Ask the owner/coordinator to settle outstanding work before cleanup.

Git inspection is still necessary: Orca metadata does not establish a clean index, preservation of ignored/untracked files, publication, or integration. Use the intended host's repository evidence. Cached remote-tracking refs are not proof of current remote state; report the freshness limit instead of fetching or publishing without applicable authority.

## Retain or record status

Keep the workspace intact unless removal is explicitly requested. An authorized comment/status/reference update is metadata, not preservation or publication. Discover valid status IDs and supported reference commands instead of assuming a `done` status exists. Store only a sanitized short receipt or an approved reference there; keep raw/private evidence outside the public checkout.

Parking normally needs only the retained path, host, branch/commit, dirty-file scope, evidence gaps, and next step. It does not start a new agent, create a child worktree, stop services, or transfer ownership. For an explicitly requested transfer use the applicable handoff workflow; for supervised worker lifecycle actions consult the current `orchestration` skill rather than sending shell input to a worker.

## Removal gate

Before any archive, sleep, or removal action:

- Confirm the exact operation and its effects with installed CLI help and the target host's capabilities. Distinguish a Git worktree from a folder workspace, workspace removal from branch deletion, and UI archive/sleep actions from CLI removal. Do not invent an archive command or fall back to raw `git worktree remove`, filesystem deletion, or application GUI control to evade an unsupported/refused lifecycle operation.
- Account for dirty/untracked/necessary ignored files, unmerged or unpublished commits, detached commits, child-workspace effects, live agents/chats/terminals, and processes that would be stopped. Confirm recovery outside the target before an authorized preservation-based removal. A clean tree, merged PR, backup note, or retained branch alone does not account for all of these.
- Inspect applicable archive-hook definitions and their effects without running them or exposing credential-bearing configuration. Agree whether hooks should run or be skipped. Hook execution, side effects, and any failure override require applicable authority. A hook failure is a blocker, not permission to retry with a bypass.
- Confirm branch disposition separately. Installed CLI/host combinations can differ in whether removal retains a branch and whether branch-choice flags are honored. If retention cannot be established, or cleanup would stop unapproved sessions/processes, leave the workspace intact. Never add force, branch-deletion, or failed-hook override flags merely to make cleanup succeed.
- Recheck identity, Git state, activity, and preservation immediately before the authorized action. Execute through Orca from a surviving workspace/session; never remove this session's own workspace. Leave an external receipt and reviewed plan for a surviving operator when necessary. Permission to remove a parent does not authorize unreviewed descendant deletion.

After an action, inspect returned evidence and surviving workspace/Git state on the intended host. Report directory/workspace, branch, hooks, processes and children separately. A timeout or missing receipt is **unconfirmed**, not success and not permission for a blind retry. Re-inspect before deciding what remains; do not repeat destructive effects on silence.

## Compatibility evidence

Reviewed against installed Orca CLI **1.4.254**, its bundled `orca-cli` guide, and `worktree rm --help`; latest release observed was [1.4.258](https://github.com/stablyai/orca/releases/tag/v1.4.258), whose release notes were also reviewed. No live lifecycle action was run to validate this reference.

The [official worktree overview](https://www.onorca.dev/docs/model/worktrees) describes UI archive/delete flows that can remove both directory and branch. Installed CLI help instead describes keep-by-default **on hosts with branch-choice support**, explicit safe `--delete-branch`, and older hosts retaining their existing policy. This is a surface/version distinction: do not apply either statement as a universal guarantee. Require target-host branch evidence or preserve the workspace.

Installed help also states that `orca.yaml` archive hooks are skipped unless `--run-hooks` is supplied; hook failure blocks removal and `--force` does not waive it. Folder-workspace removal forgets the Orca entry and stops its sessions while retaining the folder; several hook/branch flags are refused there. These observations explain the gates above, not standing instructions to execute any of those flags. Future versions must be checked afresh.
