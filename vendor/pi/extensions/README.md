# Experimental Pi extensions

This Orca worktree/branch is based on the curated [context bar](pi-context-bar/README.md) on `main`. It adds three **experimental helpers**, each independently selectable for a one-invocation trial, plus four previously imported packages retained as reviewed source. Attribution and local differences are recorded in [SOURCES.md](../../../SOURCES.md); each package retains its license.

| Trial candidate | What it does | Important limitation |
| --- | --- | --- |
| [pi-away](pi-away/README.md) | Idle recap and `/recap` | Sends session context to the current model; a three-minute timer is not an actual return detector, and recaps do not survive closing Pi. |
| [pi-next-prompt](pi-next-prompt/README.md) | Grey next-prompt suggestion | Extra full-context request after each completed reply, up to 2,000 output tokens; intercepts Tab/right-arrow in an empty editor. |
| [pi-heads-up](pi-heads-up/README.md) | One potential omission after tool-rich work | Extra full-context model request; a model opinion is not independent verification. |

These implementations use `agent_end`, which is not Pi 1.4's final settlement boundary. Next-prompt and heads-up await a provider call in the event handler, which may delay the idle/settled state and Orca status. Responses are not persisted as auditable verification. Test one helper at a time, measure cost and usefulness, and confirm session switches/cancellation before considering permanent enablement.

To trial a **local fork** without installing it into Pi settings, start an interactive session from this worktree and select one package:

```bash
pi -e ./vendor/pi/extensions/pi-away
pi -e ./vendor/pi/extensions/pi-next-prompt
pi -e ./vendor/pi/extensions/pi-heads-up
```

Each command is an alternative single invocation, not a setup script to run all three. To compare alongside the context bar, select both local packages in the same invocation (Pi accepts repeated `-e`). The default `main` checkout contains only the context bar. Nothing here is enabled by `bin/sync.sh`; source review does not authorize running extension workflows.

Also retained from the original import, **not recommended for this helper trial**: [pi-background](pi-background/README.md) (command execution/logging/timeout risks), [pi-checkpoints](pi-checkpoints/README.md) (destructive confirmed restores and persistent snapshots), [pi-model-pick](pi-model-pick/README.md) (overlaps `/model`), and [pi-polish](pi-polish/README.md) (Pi internal UI patches and npm dependencies). Their upstream READMEs contain npm install commands for **upstream**, not these local forks.
