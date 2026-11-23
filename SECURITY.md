# Secret and privacy checks

Follow the [public-checkout privacy policy](AGENTS.md#public-checkout-privacy) before publishing. Keep private evidence outside the checkout even when the checks pass.

## What the checks cover

`bin/check-private` requires Git 2.41 or later, Python 3, and the [pinned Gitleaks version](bin/gitleaks-pin.json). It uses Gitleaks' Git scanner with its built-in rules. The check stops if Gitleaks is missing or the wrong version, Git or Gitleaks fails, or it encounters a submodule or a target that does not resolve to a commit. Pre-push and CI require a full Git history.

- The pre-commit hook scans staged additions, including partial staging. It ignores unstaged and untracked content. It checks every path in the staged tree.
- The pre-push hook scans the outgoing history for each ref, including intermediate commits and merge patches. For new refs and unknown remote tips, it scans all reachable history. It handles force pushes and skips deleted refs.
- CI scans all history reachable from the checked-out commit, so it can flag older changes.

The scanner ignores Git replacement objects and committed attributes and runs without Git patch color. It writes no snapshots or report files. Gitleaks redacts its scan results, and the check prints only the file, line, rule, and commit for each finding. It does not print source text, secret values, author details, or raw scanner logs.

The path denylist blocks `.local-artifacts/`, `transcripts/`, `screenshots/`, `live-sessions/`, `config-exports/`, `.env` and `.env.*`, common credential filenames, HAR captures, and key containers.

The scanner covers source-file changes. It does not check commit or tag messages, binary contents, or arbitrary private prose. Gitleaks' default path allowlist still applies, including SVG, lockfiles, `node_modules/`, and paths matching `gitleaks.toml`.

## Enable local hooks

Install the [pinned version](bin/gitleaks-pin.json) from [Gitleaks releases](https://github.com/gitleaks/gitleaks/releases) on PATH. Verify the archive checksum for your platform. Check for existing hooks before opting in:

```bash
git config --show-origin --get core.hooksPath
ls "$(git rev-parse --git-path hooks)"
```

Preserve or integrate any existing hooks before changing the hook path. The setting can affect worktrees that share this repository's local Git configuration. Run the following to opt in and check the staged changes:

```bash
git config --local core.hooksPath .githooks
bin/check-private staged
```

`bin/sync.sh` does not install hooks. Opt in separately in each clone.

## Update Gitleaks

Update the version and Linux x64 archive SHA-256 together in [`bin/gitleaks-pin.json`](bin/gitleaks-pin.json). Use the checksum from the official release. With the new version on PATH, run `python3 bin/test_private.py --real` and `bin/check-private history`. Local upgrades are manual.

Run `python3 bin/test_private.py` for the offline checker tests. The `--real` option also tests the pinned scanner in temporary repositories.

## GitHub settings

This repository allows direct pushes and merge commits to `main`. Pull requests and CI checks, including the Secret and privacy job, are advisory. In the default-branch ruleset, require signed commits and keep force-push and branch-deletion protection on. Keep GitHub secret scanning and push protection enabled. Verify these settings in GitHub, since workflow files do not enforce branch rules.

If you skip the local hooks, CI only scans after upload. Neither check guarantees that a change is safe to publish. If you publish a real credential, revoke or rotate it first. Deleting it in a later commit is not enough.

See the [Git hook protocol](https://git-scm.com/docs/githooks) and [Gitleaks usage and configuration](https://github.com/gitleaks/gitleaks#usage) for implementation details.
