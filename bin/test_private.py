#!/usr/bin/env python3
"""Isolated gate tests; optional real Gitleaks integration, no local hook installs."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

CHECK = Path(__file__).with_name("check-private").resolve()
REAL = "--real" in sys.argv
if REAL:
    sys.argv.remove("--real")
SCANNER = shutil.which("gitleaks")
VERSION = json.loads(CHECK.with_name("gitleaks-pin.json").read_text())["version"]
# Assembled synthetic, nonfunctional token: never use real credentials in tests.
SECRET = "ghp_" + "Ab3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5"
ZERO = "0" * 40


class GateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / "repo"
        self.repo.mkdir()
        self.env = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
        self.env.update(GIT_CONFIG_NOSYSTEM="1", GIT_CONFIG_GLOBAL=os.devnull)
        self.fake = self.root / "tools"
        self.fake.mkdir()
        self.env["PATH"] = str(self.fake) + os.pathsep + os.environ["PATH"]
        self.scanner('''import json, subprocess, sys
if sys.argv[1] == 'version':
    print(VERSION)
else:
    assert '--redact=100' in sys.argv
    assert '--ignore-gitleaks-allow' in sys.argv
    if '--staged' in sys.argv:
        args = ['diff', '--cached', '--no-ext-diff']
    else:
        opts = next(a.split('=', 1)[1] for a in sys.argv if a.startswith('--log-opts='))
        args = ['log', '-p', *opts.split()]
    patch = subprocess.check_output(['git', *args])
    if any(b'SYNTHETIC_LEAK' in line for line in patch.splitlines() if line.startswith(b'+')):
        print(json.dumps([{'File': 'safe.txt', 'StartLine': 1, 'RuleID': 'synthetic',
                           'Secret': 'SYNTHETIC_LEAK'}]))
        sys.exit(1)
''')
        self.git("init", "-q")
        self.git("config", "user.email", "test@example.invalid")
        self.git("config", "user.name", "Synthetic test")
        self.git("config", "core.hooksPath", str(self.root / "no-hooks"))
        self.put("safe.txt", "safe\n")
        self.base = self.commit()

    def scanner(self, code):
        file = self.fake / "gitleaks"
        file.write_text("#!" + sys.executable + "\nVERSION = " + repr(VERSION) + "\n" + code)
        file.chmod(0o755)

    def git(self, *args):
        return subprocess.check_output(["git", *args], cwd=self.repo, env=self.env, stderr=subprocess.DEVNULL).decode().strip()

    def put(self, name, text):
        path = self.repo / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
        self.git("add", "-f", "--", name)

    def commit(self):
        self.git("commit", "-qm", "synthetic change")
        return self.git("rev-parse", "HEAD")

    def check(self, mode="staged", input="", ok=True):
        result = subprocess.run([sys.executable, str(CHECK), mode], cwd=self.repo,
                                env=self.env, input=input, text=True, capture_output=True)
        self.assertEqual(result.returncode == 0, ok, result.stdout + result.stderr)
        self.assertNotIn("SYNTHETIC_LEAK", result.stdout + result.stderr)
        self.assertNotIn(SECRET, result.stdout + result.stderr)
        return result

    def push(self, tip, remote=None, ok=True):
        return self.check("pre-push", f"refs/heads/test {tip} refs/heads/test {remote or ZERO}\n", ok)

    def test_partial_staging_both_directions(self):
        self.put("safe.txt", "SYNTHETIC_LEAK")
        (self.repo / "safe.txt").write_text("safe")
        self.check(ok=False)
        self.put("safe.txt", "safe")
        (self.repo / "safe.txt").write_text("SYNTHETIC_LEAK")
        (self.repo / "untracked.txt").write_text("SYNTHETIC_LEAK")
        self.check()

    def test_deleted_secret_and_remote_exclusion(self):
        self.put("safe.txt", "SYNTHETIC_LEAK")
        bad = self.commit()
        self.put("safe.txt", "clean")
        tip = self.commit()
        self.push(tip, self.base, ok=False)
        self.push(tip, ok=False)
        self.push(tip, "f" * 40, ok=False)
        self.push(tip, bad)  # Only new clean commit; old finding is outside range.
        self.check("history", ok=False)

    def test_sensitive_paths_even_when_force_added(self):
        for path in [".local-artifacts/note.txt", "transcripts/session.txt", "dump.har", ".env.local", "key.p12"]:
            with self.subTest(path=path):
                self.put(path, "ordinary private prose")
                self.check(ok=False)
                self.git("rm", "-f", "--", path)

    def test_deleted_private_path_in_history(self):
        self.put("screenshots/evidence.txt", "private")
        self.commit()
        self.git("rm", "-f", "screenshots/evidence.txt")
        self.push(self.commit(), self.base, ok=False)

    def test_multiple_refs_and_deletion(self):
        self.push(ZERO, self.base)
        self.put("safe.txt", "SYNTHETIC_LEAK")
        tip = self.commit()
        self.check("pre-push", f"a {ZERO} b {self.base}\na {tip} b {self.base}\n", ok=False)
        self.check("pre-push", "malformed", ok=False)

    def test_force_push_and_merge_tree(self):
        self.git("checkout", "-qb", "side")
        self.put("side.txt", "side")
        old = self.commit()
        self.git("checkout", "--detach", self.base)
        self.put("safe.txt", "SYNTHETIC_LEAK")
        bad = self.commit()
        self.push(bad, old, ok=False)
        self.git("merge", "--no-commit", "--no-ff", "side")
        self.put("safe.txt", "clean")
        merged = self.commit()
        self.push(merged, self.base, ok=False)

    def test_ordinary_fixture_formats_are_allowed(self):
        for name in ["fixture.jsonl", "diagram.png", "archive.zip", "fixture.db", "certificate.pem"]:
            self.put(name, "synthetic fixture")
        self.check()

    @unittest.skipUnless(REAL, "pass --real for pinned Gitleaks integration")
    def test_symlinks_are_not_followed(self):
        self.use_real_scanner()
        (self.root / "outside").write_text("token = '" + SECRET + "'\n")
        (self.repo / "link").symlink_to(self.root / "outside")
        self.git("add", "link")
        self.check()

    def test_fail_closed(self):
        self.scanner("import sys\nprint(VERSION) if sys.argv[1] == 'version' else sys.exit(2)\n")
        self.check(ok=False)
        self.scanner("print('0.0.0')\n")
        self.check(ok=False)
        (self.fake / "gitleaks").unlink()
        self.env["PATH"] = str(self.fake)
        self.check(ok=False)

    def test_git_invokes_both_hooks(self):
        (self.repo / "bin").mkdir()
        for name in ["check-private", "gitleaks-pin.json", "gitleaks.toml"]:
            shutil.copy2(CHECK.with_name(name), self.repo / "bin" / name)
        self.git("config", "core.hooksPath", str(CHECK.parent.parent / ".githooks"))
        self.put("safe.txt", "SYNTHETIC_LEAK")
        with self.assertRaises(subprocess.CalledProcessError):
            self.commit()
        self.git("-c", "core.hooksPath=/dev/null", "commit", "-qm", "bypassed hook")
        self.put("safe.txt", "clean")
        self.commit()
        remote = self.root / "remote.git"
        self.git("init", "--bare", "-q", str(remote))
        with self.assertRaises(subprocess.CalledProcessError):
            self.git("push", str(remote), "HEAD:refs/heads/main")
        refs = subprocess.check_output(["git", "--git-dir", str(remote), "show-ref"],
                                       stderr=subprocess.DEVNULL) if (remote / "refs/heads/main").exists() else b""
        self.assertEqual(refs, b"")

    def test_replacement_refs_cannot_hide_secrets(self):
        self.put("safe.txt", "SYNTHETIC_LEAK")
        bad = self.commit()
        self.git("replace", bad, self.base)
        self.push(bad, ok=False)

    def test_old_git_is_rejected(self):
        stub = self.fake / "git"
        stub.write_text("#!" + sys.executable + "\nprint('git version 2.40.0')\n")
        stub.chmod(0o755)
        result = self.check(ok=False)
        self.assertIn("Git 2.41+ required", result.stderr)

    def test_shallow_history(self):
        (self.repo / ".git" / "shallow").write_text(self.base + "\n")
        self.check("history", ok=False)

    def assert_secret_blocked_in_all_modes(self):
        self.check()  # Clean staged content still passes with the setting enabled.
        self.put("safe.txt", "token = '" + SECRET + "'\n")
        with self.subTest(mode="staged"):
            self.check(ok=False)
        tip = self.commit()
        with self.subTest(mode="history"):
            self.check("history", ok=False)
        with self.subTest(mode="pre-push"):
            self.push(tip, self.base, ok=False)
        self.put("safe.txt", "clean")
        self.commit()

    @unittest.skipUnless(REAL, "pass --real for pinned Gitleaks integration")
    def test_real_attributes_cannot_hide_secrets(self):
        self.use_real_scanner()
        for attribute in ["-diff", "binary"]:
            with self.subTest(attribute=attribute):
                self.put(".gitattributes", "*.txt " + attribute + "\n")
                self.commit()
                self.assert_secret_blocked_in_all_modes()

    @unittest.skipUnless(REAL, "pass --real for pinned Gitleaks integration")
    def test_real_color_cannot_hide_secrets(self):
        self.use_real_scanner()
        for key in ["color.ui", "color.diff"]:
            with self.subTest(key=key):
                self.git("config", key, "always")
                self.assert_secret_blocked_in_all_modes()
                self.git("config", "--unset", key)

    def use_real_scanner(self):
        self.assertIsNotNone(SCANNER, "Gitleaks is required for --real")
        (self.fake / "gitleaks").unlink()
        (self.fake / "gitleaks").symlink_to(SCANNER)

    @unittest.skipUnless(REAL, "pass --real for pinned Gitleaks integration")
    def test_real_merge_only_secret(self):
        self.use_real_scanner()
        self.git("checkout", "-qb", "side")
        self.put("side.txt", "safe")
        self.commit()
        self.git("checkout", "--detach", self.base)
        self.put("other.txt", "safe")
        self.commit()
        self.git("merge", "--no-commit", "--no-ff", "side")
        self.put("safe.txt", "token = '" + SECRET + "'\n")
        self.push(self.commit(), self.base, ok=False)

    @unittest.skipUnless(REAL, "pass --real for pinned Gitleaks integration")
    def test_real_gitleaks(self):
        self.use_real_scanner()
        self.check()
        (self.repo / "safe.txt").write_text("token = '" + SECRET + "'\n")
        self.check()  # Unstaged secret is not part of this commit.
        self.put("safe.txt", "token = '" + SECRET + "'\n")
        (self.repo / "safe.txt").write_text("clean")
        result = self.check(ok=False)
        self.assertIn('"File": "safe.txt"', result.stderr)
        self.assertIn('"RuleID":', result.stderr)
        bad = self.commit()
        self.put("safe.txt", "clean")
        self.push(self.commit(), self.base, ok=False)
        self.git("replace", bad, self.base)
        self.push(bad, ok=False)  # Real Gitleaks must also ignore replacement refs.
        self.git("checkout", "--orphan", "new-root")
        self.put("safe.txt", "token = '" + SECRET + "'\n")
        self.check(ok=False)  # Native staged scanning also works without HEAD.


if __name__ == "__main__":
    unittest.main()
