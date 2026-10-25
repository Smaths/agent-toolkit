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
        (self.root / ".skills/bin/sync.sh").write_text("test fixture\n")
        (self.root / ".skills/README.md").write_text("Toolkit\n")
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

    def run_sync(self, *options):
        return subprocess.run(
            ["bash", str(SCRIPT), *options, str(self.root)],
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
            self.assertFalse(self.installed_mod.is_symlink())
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
            self.assertFalse(self.installed_mod.is_symlink())
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
            result = self.run_sync("--with-orca")
            self.assertEqual(result.returncode, 0, result.stderr)
            for link in links:
                self.assertEqual(link.resolve(), skill)

    def test_portable_swarm_migrates_owned_vendor_links(self):
        skill = self.root / ".skills/skills/swarm"
        skill.mkdir(parents=True)
        (skill / "SKILL.md").write_text("Portable skill\n")
        old = self.root / ".skills/vendor/orca/skills/swarm"  # Removed source; links are broken.
        for agent in (".agents", ".claude", ".codex"):
            link = self.root / agent / "skills/swarm"
            link.parent.mkdir(parents=True, exist_ok=True)
            link.symlink_to(str(old) + "/")
        prompt = self.root / ".pi/agent/prompts/swarm.md"
        prompt.parent.mkdir(parents=True)
        prompt.symlink_to(old / "SKILL.md")

        preview = self.run_sync("--dry-run")
        self.assertEqual(preview.returncode, 0, preview.stderr)
        for agent in (".agents", ".claude"):
            self.assertIn(f"MIGRATE {self.root / agent / 'skills/swarm'}", preview.stdout)
        self.assertIn(f"REMOVE {prompt}", preview.stdout)
        self.assertTrue((self.root / ".agents/skills/swarm").is_symlink())

        for _ in range(2):
            result = self.run_sync()
            self.assertEqual(result.returncode, 0, result.stderr)
            for agent in (".agents", ".claude"):
                self.assertEqual((self.root / agent / "skills/swarm").resolve(), skill)
            self.assertFalse((self.root / ".codex/skills/swarm").is_symlink())
            self.assertFalse(prompt.is_symlink())

    def test_portable_swarm_conflict_preserves_old_link(self):
        skill = self.root / ".skills/skills/swarm"
        skill.mkdir(parents=True)
        (skill / "SKILL.md").write_text("Portable skill\n")
        old = self.root / ".skills/vendor/orca/skills/swarm"
        link = self.root / ".agents/skills/swarm"
        link.parent.mkdir(parents=True)
        link.symlink_to(old)
        conflict = self.root / ".claude/skills/swarm"
        conflict.parent.mkdir(parents=True)
        conflict.write_text("Keep me\n")

        result = self.run_sync()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Refusing to replace", result.stderr)
        self.assertEqual(link.readlink(), old)
        self.assertEqual(conflict.read_text(), "Keep me\n")

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

    def test_unslop_is_linked_and_standalone_copy_is_a_conflict(self):
        source = self.root / ".skills/skills/unslop"
        source.mkdir()
        (source / "SKILL.md").write_text("Repository copy\n")
        installed = self.root / ".agents/skills/unslop"
        installed.parent.mkdir(parents=True)
        installed.mkdir()
        (installed / "SKILL.md").write_text("My version\n")
        claude_unslop = self.root / ".claude/skills/unslop"
        result = self.run_sync()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Refusing to replace", result.stderr)
        self.assertEqual((installed / "SKILL.md").read_text(), "My version\n")
        self.assertFalse(claude_unslop.exists())
        self.assertFalse(self.shared.exists())
        (installed / "SKILL.md").unlink()
        installed.rmdir()
        for _ in range(2):
            result = self.run_sync()
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(installed.is_symlink())
            self.assertEqual(installed.resolve(), source)
            self.assertEqual(claude_unslop.resolve(), source)

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
                self.assertFalse((self.claude if destination == self.shared else self.shared).exists())
                self.assertFalse(self.installed_mod.exists())
                self.assertTrue(self.legacy.is_symlink())
                destination.unlink()

    def test_separate_mod_path_is_preserved(self):
        self.installed_mod.parent.mkdir(parents=True, exist_ok=True)
        self.installed_mod.mkdir()
        result = self.run_sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(self.installed_mod.is_dir())
        self.assertEqual(self.shared.resolve(), self.skill)
        self.assertEqual(self.claude.resolve(), self.skill)

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
        self.assertFalse(self.claude.exists())
        self.assertFalse(self.installed_mod.exists())

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

    def test_missing_or_empty_checkout_fails_without_writes(self):
        for missing in (".skills/README.md", ".skills/bin/sync.sh", ".skills/skills/example/SKILL.md"):
            with self.subTest(missing=missing):
                path = self.root / missing
                content = path.read_text()
                path.unlink()
                result = self.run_sync()
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(self.shared.parent.exists())
                self.assertFalse(self.claude.parent.exists())
                path.write_text(content)

    def test_preview_lists_changes_without_writing_anything(self):
        self.old_shared.parent.mkdir(parents=True)
        self.old_shared.symlink_to(self.old_skill)
        self.installed_mod.parent.mkdir(parents=True)
        self.installed_mod.symlink_to(self.mod)
        for _ in range(2):
            result = self.run_sync("--dry-run")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn(f"LINK {self.shared}", result.stdout)
            self.assertIn(f"REMOVE {self.old_shared}", result.stdout)
            self.assertIn(f"REMOVE {self.installed_mod}", result.stdout)
            self.assertTrue(self.old_shared.is_symlink())
            self.assertTrue(self.installed_mod.is_symlink())
            self.assertFalse(self.shared.exists())
            self.assertFalse(self.claude.exists())

    def test_preview_conflict_refuses_all_changes(self):
        self.shared.parent.mkdir(parents=True)
        self.shared.write_text("Keep me\n")
        result = self.run_sync("--dry-run")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Refusing to replace", result.stderr)
        self.assertIn(f"LINK {self.claude}", result.stdout)
        self.assertEqual(self.shared.read_text(), "Keep me\n")
        self.assertFalse(self.claude.parent.exists())

    def test_orca_is_opt_in_and_owned_links_are_removed_by_default(self):
        skill = self.root / ".skills/vendor/orca/skills/swarm"
        skill.mkdir(parents=True)
        (skill / "SKILL.md").write_text("Orca skill\n")
        shared = self.root / ".agents/skills/swarm"
        claude = self.root / ".claude/skills/swarm"
        result = self.run_sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(shared.exists())
        self.assertFalse(claude.exists())
        result = self.run_sync("--with-orca")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(shared.resolve(), skill)
        self.assertEqual(claude.resolve(), skill)
        result = self.run_sync("--dry-run")
        self.assertIn(f"REMOVE {shared}", result.stdout)
        self.assertIn(f"REMOVE {claude}", result.stdout)
        self.assertTrue(shared.is_symlink())
        result = self.run_sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(shared.is_symlink())
        self.assertFalse(claude.is_symlink())

    def test_symlinked_skills_root_is_refused(self):
        outside = self.root / "outside"
        outside.mkdir()
        skills = self.root / ".agents/skills"
        skills.parent.mkdir()
        skills.symlink_to(outside, target_is_directory=True)
        result = self.run_sync()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("symlinked skills root", result.stderr)
        self.assertFalse((outside / "example").exists())
        self.assertFalse(self.claude.parent.exists())

    def test_duplicate_source_names_fail_before_writes(self):
        skill = self.root / ".skills/vendor/orca/skills/example"
        skill.mkdir(parents=True)
        (skill / "SKILL.md").write_text("Orca skill\n")
        result = self.run_sync("--with-orca")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Duplicate skill name", result.stderr)
        self.assertFalse(self.shared.parent.exists())

    def test_no_checkout_fails_without_creating_destinations(self):
        empty_home = self.root / "empty"
        empty_home.mkdir()
        result = subprocess.run(
            ["bash", str(SCRIPT), str(empty_home)], capture_output=True, text=True,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Missing toolkit checkout", result.stderr)
        self.assertEqual(list(empty_home.iterdir()), [])

    def test_opt_in_requires_orca_skill(self):
        result = self.run_sync("--with-orca")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("No Orca skills", result.stderr)
        self.assertFalse(self.shared.parent.exists())

    def test_unrelated_orca_link_is_preserved(self):
        skill = self.root / ".skills/vendor/orca/skills/swarm"
        skill.mkdir(parents=True)
        (skill / "SKILL.md").write_text("Orca skill\n")
        link = self.root / ".agents/skills/swarm"
        link.parent.mkdir(parents=True)
        other = self.root / "my-swarm"
        other.mkdir()
        link.symlink_to(other)
        result = self.run_sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(link.resolve(), other)


if __name__ == "__main__":
    unittest.main()
