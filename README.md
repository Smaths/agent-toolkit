# Agent toolkit

Skills, extensions, and workflows I use for software development with agents. Portable skills work across agents; vendor-specific tools live in their own folders.

## Explore

```text
skills/                  Portable skills
vendor/<vendor>/         Vendor-specific tools and integrations
bin/                     Repository checks and optional setup
```

Each skill has its own directory with a `SKILL.md`. Browse [portable skills](skills/) or tools for [Claude](vendor/claude/) and [Pi](vendor/pi/).

Examples include [swarm](skills/swarm/SKILL.md), [session handoff](skills/session-handoff/SKILL.md) with its [Pi adapter](vendor/pi/extensions/session-handoff/README.md), the [Claude status-line](vendor/claude/status-line/README.md), and the [Pi status-line](vendor/pi/extensions/status-line/README.md). [SOURCES.md](SOURCES.md) credits imported work and records local changes.

Adding a tool to this repository does not enable it on your computer. See [AGENTS.md](AGENTS.md) for contribution instructions and [computer enablement](AGENTS.md#enable-on-this-computer).

## Secret and privacy checks

Keep private evidence outside the checkout; see [the policy](AGENTS.md#public-checkout-privacy). The shared `bin/check-private` gate requires Git 2.41+, Python 3, and native Gitleaks Git scanning with built-in rules. [The pin file](bin/gitleaks-pin.json) is the single source for the required version and CI archive checksum. Missing/wrong scanner versions, scanner/Git errors, shallow history, and unsupported submodules/non-commit targets block the check.

- **Pre-commit:** scans staged additions with `gitleaks git --staged`, including partial staging—not unstaged or untracked content. The privacy denylist checks the complete staged tree.
- **Pre-push:** scans each outgoing commit range, including intermediate commits and merge patches. New refs or unknown remote tips conservatively scan all reachable history. Multiple refs, force pushes, and deletion-only pushes are handled.
- **CI:** scans all history reachable from the checked-out commit with the same gate; this may flag older history.

Git replacement objects and committed attributes are ignored, and Git patch color is disabled for scanning. No snapshots or report files are written. Findings show only file, line, rule, and commit; source text, secret values, author details, and raw scanner logs are withheld, with scanner redaction also enabled.

The small path denylist blocks `.local-artifacts/`, `transcripts/`, `screenshots/`, `live-sessions/`, `config-exports/`, `.env`/`.env.*`, common credential filenames, HAR captures, and key containers.

Coverage is source-file changes—not commit/tag messages, binary contents, or arbitrary private prose. Gitleaks' default path allowlist is inherited, including SVG, lockfiles, `node_modules/`, and paths matching `gitleaks.toml`. Reviewed summaries and synthetic fixtures remain necessary even when checks pass.

### Enable locally (explicit opt-in)

Install the version in [the pin file](bin/gitleaks-pin.json) from [Gitleaks releases](https://github.com/gitleaks/gitleaks/releases) on PATH, verifying the checksum for your platform. Then inspect existing hooks before opting in:

```bash
git config --show-origin --get core.hooksPath
ls "$(git rev-parse --git-path hooks)"
# Only after preserving/integrating any existing hooks:
git config --local core.hooksPath .githooks
bin/check-private staged
```

The setting can affect sibling worktrees sharing this repository's local config. Do not overwrite another hooks setup blindly. Hooks are not installed by `bin/sync.sh`, and clones must opt in separately. Offline checker tests run with `python3 bin/test_private.py`; add `--real` to also exercise the pinned Gitleaks on PATH in temporary repositories.

### Update the scanner

Update the version and Linux x64 archive SHA-256 together in `bin/gitleaks-pin.json` from the official release; local tool upgrades remain manual. With that version on PATH, run `python3 bin/test_private.py --real` and `bin/check-private history`, then review the change normally.

### GitHub enforcement

This personal repository allows direct pushes and merge commits to `main`; pull requests and CI checks, including **Secret and privacy**, are advisory rather than required. Keep signed commits, force-push protection, and branch-deletion protection enabled in the default-branch ruleset. Keep GitHub secret scanning and push protection enabled as independent server-side safeguards. Workflow files alone do not enforce branch rules; verify those settings on GitHub.

CI catches skipped/uninstalled hooks **after upload**, not before public exposure. Hooks are bypassable and no scanner guarantees that all private information is caught. If a real credential is published, revoke/rotate it first; deleting it in a later commit is insufficient.

Implementation references: [Git hook protocol](https://git-scm.com/docs/githooks), [Gitleaks usage/configuration](https://github.com/gitleaks/gitleaks#usage). No agent-harness configuration is changed.

## Checks

With Python 3, Bash, Git, and Node.js 22.19+ available, install the check dependencies once and run the offline suite:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r bin/requirements-check.txt
source .venv/bin/activate
bin/check
```

CI also runs `bin/check`. It checks skill layout, links, attribution, and syntax, then runs offline tests. For static validation without running test suites, use `bin/check --static`.

The suite includes Pi helper-package contracts, handoff tests using temporary repositories and a mocked runtime, and status-line layout, Git status, and cost/lifecycle regressions. The checks do not enable tools, launch agents, or evaluate model behavior. Component READMEs describe additional, opt-in checks.
