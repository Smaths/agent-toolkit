"""Run with python3 bin/test_sync.py. All writes stay in temporary directories."""

from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).with_name("sync.sh").resolve()


class SyncTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="skills sync ")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.skill = self.root / ".skills/example"
        self.skill.mkdir(parents=True)
        (self.skill / "SKILL.md").write_text("Example skill\n")
        (self.root / ".skills/bin").mkdir()
        self.shared = self.root / ".agents/skills/example"
        self.claude = self.root / ".claude/skills/example"
        self.prompt = self.root / ".pi/agent/prompts/example.md"
        self.legacy = self.root / ".codex/skills/example"
        self.legacy.parent.mkdir(parents=True)

    def run_sync(self):
        return subprocess.run(
            ["bash", str(SCRIPT), str(self.root)],
            capture_output=True, text=True,
        )

    def test_migration_and_repeat_run(self):
        self.legacy.symlink_to(str(self.skill) + "/")
        self.claude.parent.mkdir(parents=True)
        self.claude.symlink_to("../../.skills/example/")
        self.prompt.parent.mkdir(parents=True)
        self.prompt.symlink_to(str(self.skill) + "//SKILL.md")
        unrelated = self.legacy.parent / "unrelated"
        unrelated.mkdir()
        (unrelated / "SKILL.md").write_text("Keep me\n")
        self.shared.parent.mkdir(parents=True)
        installed = self.shared.parent / "installed"
        installed.mkdir()
        (installed / "SKILL.md").write_text("Installed skill\n")

        for _ in range(2):
            result = self.run_sync()
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(self.shared.resolve(), self.skill)
            self.assertEqual(self.claude.resolve(), self.skill)
            self.assertEqual(self.prompt.resolve(), self.skill / "SKILL.md")
            self.assertFalse(self.legacy.is_symlink())
            self.assertFalse((self.shared.parent / "bin").exists())
            self.assertEqual((unrelated / "SKILL.md").read_text(), "Keep me\n")
            self.assertEqual((installed / "SKILL.md").read_text(), "Installed skill\n")

    def test_conflicting_destinations_remain_untouched(self):
        self.legacy.symlink_to(self.skill)
        for destination in (self.shared, self.claude, self.prompt):
            with self.subTest(destination=destination):
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_text("Keep me\n")
                result = self.run_sync()
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("Refusing to replace", result.stderr)
                self.assertEqual(destination.read_text(), "Keep me\n")
                self.assertTrue(self.legacy.is_symlink())
                destination.unlink()

    def test_broken_shared_link_is_preserved(self):
        self.shared.parent.mkdir(parents=True)
        self.shared.symlink_to("missing")
        result = self.run_sync()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.shared.readlink(), Path("missing"))

    def test_separate_codex_installation_is_preserved(self):
        self.legacy.mkdir()
        (self.legacy / "SKILL.md").write_text("Separate skill\n")
        result = self.run_sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.legacy / "SKILL.md").read_text(), "Separate skill\n")

    def test_unrelated_codex_link_is_preserved(self):
        other = self.root / "other"
        other.mkdir()
        self.legacy.symlink_to(other)
        result = self.run_sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.legacy.resolve(), other)


if __name__ == "__main__":
    unittest.main()
