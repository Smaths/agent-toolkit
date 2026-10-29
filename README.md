# Agent toolkit

Skills, extensions, and workflows I use for software development with agents. Portable skills work across agents; vendor-specific tools live in their own folders.

## Explore

```text
skills/                  Portable skills
vendor/<vendor>/         Vendor-specific tools and integrations
bin/                     Repository checks and optional setup
```

Each skill has its own directory with a `SKILL.md`. Browse [portable skills](skills/) or tools for [Claude](vendor/claude/), [Orca](vendor/orca/), and [Pi](vendor/pi/).

Examples include [swarm](skills/swarm/SKILL.md), the [Claude status-line](vendor/claude/status-line/README.md), and the [Pi status-line](vendor/pi/extensions/status-line/README.md). [SOURCES.md](SOURCES.md) credits imported work and records local changes.

Adding a tool to this repository does not enable it on your computer. See [AGENTS.md](AGENTS.md) for contribution instructions and [computer enablement](AGENTS.md#enable-on-this-computer).

## Checks

With Python 3, Bash, and Git available, install the check dependencies once and run the offline suite:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r bin/requirements-check.txt
source .venv/bin/activate
bin/check
```

CI also runs `bin/check`. It checks skill layout, links, attribution, and syntax, then runs offline tests. For static validation without running test suites, use `bin/check --static`.

The checks do not enable tools or evaluate model behavior. Component READMEs describe additional, opt-in checks.
