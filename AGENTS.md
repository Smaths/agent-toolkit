# Repository instructions

Read [README.md](README.md) before changing this collection. It defines the philosophy, layout, and enablement policy.

## Scope

- "Get" or "install" means add here with attribution. Enabling tools on the computer requires a separate, explicit request.
- Reviewing imported instructions does not authorize executing their workflows.
- Preserve unrelated changes. Report contradictions separately rather than expanding the task.

## Curate

- Treat imported skills as local forks, not mirrors. Adapt them to the owner's workflow and repository philosophy within their license terms. Preserve licenses; record authors, source URLs, revisions, and substantive local changes in [SOURCES.md](SOURCES.md).
- Upstream updates are optional. Compare changes and preserve intentional local differences.
- Check for overlap before adding tools. Keep skills focused, composable, and vendor-agnostic; optional vendor metadata must remain optional.
- Put vendor-specific skills and processes under `vendor/<vendor>/` and follow that vendor's documented practices. Every skill belongs in a `skills/` directory.
- Keep one authoritative explanation and link to supporting detail rather than duplicating it.

## Verify

- Check affected frontmatter, references, dependencies, and behavior. Use focused scenarios for instruction changes and relevant offline checks from [README.md](README.md#checks) and component docs.
- Use temporary directories for tests that write configuration or links. Existing installations may link to these sources; edits can affect them. Do not sync, reload, or launch agents merely to verify edits.
- Report static review, executable tests, and live model evaluation separately. State what ran and what remains unverified.
