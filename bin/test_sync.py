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
        self.skill = self.root / ".skills/skills/example"
        self.skill.mkdir(parents=True)
        (self.skill / "SKILL.md").write_text("Example skill\n")
        (self.root / ".skills/bin").mkdir()
        self.shared = self.root / ".agents/skills/example"
        self.claude = self.root / ".claude/skills/example"
        self.prompt = self.root / ".pi/agent/prompts/example.md"
        self.legacy = self.root / ".codex/skills/example"
        self.old_skill = self.root / ".skills/docs-reality-sync"
        self.old_shared = self.root / ".agents/skills/docs-reality-sync"
        self.old_claude = self.root / ".claude/skills/docs-reality-sync"
        self.old_codex = self.root / ".codex/skills/docs-reality-sync"
        self.old_prompt = self.root / ".pi/agent/prompts/docs-reality-sync.md"
        self.mod = self.root / ".skills/vendor/claude/mods/ctx"
        (self.mod / ".claude-plugin").mkdir(parents=True)
        (self.mod / ".claude-plugin/plugin.json").write_text('{"name":"ctx"}\n')
        self.installed_mod = self.root / ".claude/skills/ctx"
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
            self.assertEqual(self.installed_mod.resolve(), self.mod)
            self.assertFalse((self.root / ".agents/skills/claude-mods").exists())
            self.assertFalse(self.prompt.is_symlink())
            self.assertFalse(self.legacy.is_symlink())
            self.assertFalse((self.shared.parent / "bin").exists())
            self.assertEqual((unrelated / "SKILL.md").read_text(), "Keep me\n")
            self.assertEqual((installed / "SKILL.md").read_text(), "Installed skill\n")

    def test_old_layout_links_are_migrated(self):
        self.shared.parent.mkdir(parents=True)
        self.shared.symlink_to(self.root / ".skills/example")
        self.claude.parent.mkdir(parents=True)
        self.claude.symlink_to("../../.skills/example/")
        self.legacy.symlink_to("../../.skills/example/")
        self.prompt.parent.mkdir(parents=True)
        self.prompt.symlink_to("../../../.skills/example/SKILL.md")
        self.installed_mod.symlink_to("../../.skills/claude-mods/ctx/")

        for _ in range(2):
            result = self.run_sync()
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(self.shared.resolve(), self.skill)
            self.assertEqual(self.claude.resolve(), self.skill)
            self.assertEqual(self.installed_mod.resolve(), self.mod)
            self.assertFalse(self.legacy.is_symlink())
            self.assertFalse(self.prompt.is_symlink())

    def test_orca_skill_is_migrated_and_linked(self):
        skill = self.root / ".skills/vendor/orca/skills/swarm"
        skill.mkdir(parents=True)
        (skill / "SKILL.md").write_text("Orca skill\n")
        links = []
        for agent in (".agents", ".claude"):
            link = self.root / agent / "skills/swarm"
            link.parent.mkdir(parents=True, exist_ok=True)
            link.symlink_to(self.root / ".skills/swarm")
            links.append(link)
        for _ in range(2):
            result = self.run_sync()
            self.assertEqual(result.returncode, 0, result.stderr)
            for link in links:
                self.assertEqual(link.resolve(), skill)

    def test_unconfigured_vendor_and_root_skills_are_skipped(self):
        for path in (".skills/root-skill", ".skills/vendor/other/skills/other"):
            skill = self.root / path
            skill.mkdir(parents=True)
            (skill / "SKILL.md").write_text("Not installed\n")
        result = self.run_sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        for agent in (".agents", ".claude"):
            for name in ("root-skill", "other", "vendor"):
                self.assertFalse((self.root / agent / "skills" / name).exists())

    def test_conflicting_destinations_remain_untouched(self):
        self.legacy.symlink_to(self.skill)
        for destination in (self.shared, self.claude):
            with self.subTest(destination=destination):
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_text("Keep me\n")
                result = self.run_sync()
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("Refusing to replace", result.stderr)
                self.assertEqual(destination.read_text(), "Keep me\n")
                self.assertTrue(self.legacy.is_symlink())
                destination.unlink()

    def test_conflicting_mod_is_preserved(self):
        self.installed_mod.parent.mkdir(parents=True, exist_ok=True)
        self.installed_mod.mkdir()
        result = self.run_sync()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Refusing to replace", result.stderr)
        self.assertTrue(self.installed_mod.is_dir())

    def test_directory_without_plugin_manifest_is_skipped(self):
        other = self.root / ".skills/vendor/claude/mods/notes"
        other.mkdir()
        result = self.run_sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse((self.root / ".claude/skills/notes").exists())

    def test_broken_shared_link_is_preserved(self):
        self.shared.parent.mkdir(parents=True)
        self.shared.symlink_to("missing")
        result = self.run_sync()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.shared.readlink(), Path("missing"))

    def test_renamed_skill_links_are_removed(self):
        links = (
            (self.old_shared, str(self.old_skill)),
            (self.old_claude, str(self.old_skill) + "/"),
            (self.old_codex, str(self.old_skill)),
            (self.old_prompt, str(self.old_skill / "SKILL.md")),
        )
        for destination, target in links:
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.symlink_to(target)

        result = self.run_sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        for destination, _ in links:
            self.assertFalse(destination.is_symlink())

    def test_unrelated_renamed_skill_link_is_preserved(self):
        other = self.root / "other-old-skill"
        other.mkdir()
        self.old_shared.parent.mkdir(parents=True)
        self.old_shared.symlink_to(other)
        result = self.run_sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.old_shared.resolve(), other)

    def test_commit_rename_and_repeat_run(self):
        skill = self.root / ".skills/skills/commit"
        skill.mkdir()
        (skill / "SKILL.md").write_text("Commit skill\n")
        old = self.root / ".skills/commit-conventional"
        links = []
        for agent in (".agents", ".claude", ".codex"):
            link = self.root / agent / "skills/commit-conventional"
            link.parent.mkdir(parents=True, exist_ok=True)
            link.symlink_to(str(old) + "/")
            links.append(link)
        prompt = self.root / ".pi/agent/prompts/commit-conventional.md"
        prompt.parent.mkdir(parents=True)
        prompt.symlink_to(old / "SKILL.md")
        links.append(prompt)

        for _ in range(2):
            result = self.run_sync()
            self.assertEqual(result.returncode, 0, result.stderr)
            for link in links:
                self.assertFalse(link.is_symlink())
            for agent in (".agents", ".claude"):
                self.assertEqual((self.root / agent / "skills/commit").resolve(), skill)

    def test_separate_commit_conventional_installations_are_preserved(self):
        other = self.root / "other-commit"
        other.mkdir()
        link = self.root / ".agents/skills/commit-conventional"
        link.parent.mkdir(parents=True)
        link.symlink_to(other)
        directory = self.root / ".claude/skills/commit-conventional"
        directory.mkdir(parents=True)
        result = self.run_sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(link.resolve(), other)
        self.assertTrue(directory.is_dir())

    def test_pi_prompt_directory_is_not_created(self):
        result = self.run_sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(self.prompt.parent.exists())

    def test_separate_pi_prompt_is_preserved(self):
        self.prompt.parent.mkdir(parents=True)
        self.prompt.write_text("Separate prompt\n")
        result = self.run_sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.prompt.read_text(), "Separate prompt\n")

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
