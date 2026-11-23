# Agent toolkit

My collection of skills, extensions, and workflows for building software with agents.

## Quickstart

Use Git to clone the repository. Sync needs Bash and Python 3. See [Sync on Debian](#sync-on-debian) for package names. Clone into a directory you plan to keep, since the installed skills link back to the checkout.

```bash
git clone https://github.com/Smaths/agent-toolkit.git
cd agent-toolkit
bin/sync.sh --dry-run
```

The preview does not change any files. Review the proposed changes before running `bin/sync.sh` as your regular user to apply them. See [what sync changes](AGENTS.md#enable-on-this-computer) for details. Vendor tools have their own setup instructions.

## Portable skills

### Writing and documentation

- [html-report](skills/html-report/SKILL.md). Create a standalone HTML investigation or decision report using the Snarfum design system.
- [sync-docs](skills/sync-docs/SKILL.md). Review or update documentation against what the project does.
- [unslop](skills/unslop/SKILL.md). Cut filler and stock AI phrasing while keeping the meaning and tone.
- [unslop-for-agents](skills/unslop-for-agents/SKILL.md). Rewrite agent instructions in plain language without changing their behavior.
- [writing-for-agents](skills/writing-for-agents/SKILL.md). Write clear instructions that tell an agent when to act and how to tell it's done.

### Code and tests

- [benchmark-checklist](skills/benchmark-checklist/SKILL.md). Check that a benchmark measures the right work and gives repeatable results.
- [commit](skills/commit/SKILL.md). Group related changes and write Conventional Commits.
- [diagnosing-bugs](skills/diagnosing-bugs/SKILL.md). Reproduce a bug and test likely causes before choosing a fix.
- [tdd](skills/tdd/SKILL.md). Write a failing test before fixing a bug when a focused test is practical.

### Planning and delegation

- [grilling](skills/grilling/SKILL.md). Stress-test a plan or decision with pointed questions.
- [swarm](skills/swarm/SKILL.md). Run independent workers on request and combine their findings.
- [verification-readiness](skills/verification-readiness/SKILL.md). Prepare a coding brief with a runnable check and the evidence the worker should return.

### Session notes and handoffs

- [recap](skills/recap/SKILL.md). Summarize the current conversation.
- [session-handoff](skills/session-handoff/SKILL.md). Save a handoff so a fresh agent session can continue the work.

## Vendor tools

- [Claude Code tools](vendor/claude/), including the [status line](vendor/claude/status-line/README.md)
- [Pi tools](vendor/pi/extensions/), including the [status line](vendor/pi/extensions/status-line/README.md) and [same-terminal handoff adapter](vendor/pi/extensions/session-handoff/README.md)

See [SOURCES.md](SOURCES.md) for credits and local changes, and [AGENTS.md](AGENTS.md) for contribution instructions.

## Sync on Debian

Sync needs a populated checkout, Bash, coreutils, and Python 3. If packages are missing, run `apt-get install bash coreutils python3` as root. Run sync itself as your regular user. It does not need Node.js, a Python virtual environment, or an agent CLI.

Run `python3 bin/test_sync.py -v` to test sync in a temporary home. The [Debian sync workflow](.github/workflows/debian-sync.yml) runs the suite on Debian 12 and 13 for changes to sync, its tests, the workflow, or portable `SKILL.md` files. It can also run on demand.

## Checks

The offline suite requires Python 3, Bash, Git, and Node.js 22.19 or later. Set up the Python environment and run the same command CI uses:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r bin/requirements-check.txt
source .venv/bin/activate
bin/check
```

Use `bin/check --static` to validate skill layout, local link targets (not heading anchors), attribution, and syntax without running the test suites. The offline suite includes sync and the native Pi handoff adapter. The [legacy external handoff checks](skills/session-handoff/tests/README.md) are opt-in. The tests do not enable tools, launch agents, or evaluate model behavior.

See [SECURITY.md](SECURITY.md) for secret and privacy checks before publishing.
