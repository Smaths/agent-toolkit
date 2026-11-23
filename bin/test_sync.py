"""Run with python3 bin/test_sync.py. All writes stay in temporary directories."""

import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).with_name("sync.sh").resolve()


class SyncTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="skills sync ")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.checkout = self.root / "workspace/agent-toolkit"
        self.skill = self.checkout / "skills/example"
        self.skill.mkdir(parents=True)
        (self.skill / "SKILL.md").write_text("Example skill\n")
        (self.checkout / "bin").mkdir()
        self.script = self.checkout / "bin/sync.sh"
        shutil.copy2(SCRIPT, self.script)
        (self.checkout / "README.md").write_text("Toolkit\n")
        # Legacy aliases let older fixtures exercise links from previous layouts.
        (self.root / ".skills").symlink_to(self.checkout, target_is_directory=True)
        (self.root / ".agent-toolkit").symlink_to(self.checkout, target_is_directory=True)
        self.shared = self.root / ".agents/skills/example"
        self.claude = self.root / ".claude/skills/example"
        self.prompt = self.root / ".pi/agent/prompts/example.md"
        self.legacy = self.root / ".codex/skills/example"
        self.old_skill = self.root / ".skills/docs-reality-sync"
        self.old_shared = self.root / ".agents/skills/docs-reality-sync"
        self.old_claude = self.root / ".claude/skills/docs-reality-sync"
        self.old_codex = self.root / ".codex/skills/docs-reality-sync"
        self.old_prompt = self.root / ".pi/agent/prompts/docs-reality-sync.md"
        self.ctx_source = self.checkout / "vendor/claude/mods/ctx"
        self.ctx = self.root / ".claude/skills/ctx"
        self.legacy.parent.mkdir(parents=True)

    def run_sync(self, *options):
        return subprocess.run(
            ["bash", str(self.script), *options, str(self.root)],
            env=dict(os.environ, HOME=str(self.root)), capture_output=True, text=True,
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
            self.assertFalse(self.prompt.is_symlink())
            self.assertFalse(self.legacy.is_symlink())
            self.assertFalse((self.shared.parent / "bin").exists())
            self.assertEqual((unrelated / "SKILL.md").read_text(), "Keep me\n")
            self.assertEqual((installed / "SKILL.md").read_text(), "Installed skill\n")

    def test_moved_checkout_repairs_broken_links_without_touching_unrelated_links(self):
        old_source = self.root / ".agent-toolkit/skills/example"
        self.shared.parent.mkdir(parents=True)
        self.shared.symlink_to(old_source)
        self.claude.parent.mkdir(parents=True)
        self.claude.symlink_to("../../.agent-toolkit/skills/example")
        unrelated = self.shared.parent / "other"
        unrelated.symlink_to(self.root / "elsewhere")
        (self.root / ".agent-toolkit").unlink()
        (self.root / ".skills").unlink()
        new_source = self.skill

        preview = self.run_sync("--dry-run")
        self.assertEqual(preview.returncode, 0, preview.stderr)
        self.assertIn(f"MIGRATE {self.shared}", preview.stdout)
        self.assertIn(f"MIGRATE {self.claude}", preview.stdout)
        self.assertEqual(self.shared.readlink(), old_source)

        result = self.run_sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.shared.readlink(), new_source)
        self.assertEqual(self.claude.readlink(), new_source)
        self.assertEqual(unrelated.readlink(), self.root / "elsewhere")

    def test_broken_old_skills_checkout_link_is_migrated(self):
        self.shared.parent.mkdir(parents=True)
        old_source = self.root / ".skills/skills/example"
        self.shared.symlink_to(old_source)
        (self.root / ".skills").unlink()
        (self.root / ".agent-toolkit").unlink()
        preview = self.run_sync("--dry-run")
        self.assertEqual(preview.returncode, 0, preview.stderr)
        self.assertIn(f"MIGRATE {self.shared}", preview.stdout)
        self.assertEqual(self.shared.readlink(), old_source)
        result = self.run_sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.shared.readlink(), self.skill)

    def test_discovery_outside_home_from_any_cwd_without_legacy_aliases(self):
        (self.root / ".skills").unlink()
        (self.root / ".agent-toolkit").unlink()
        result = subprocess.run(
            ["bash", str(self.script), "--dry-run", str(self.root)],
            cwd=self.root, env=dict(os.environ, HOME=str(self.root)), capture_output=True, text=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(f"LINK {self.shared}", result.stdout)
        self.assertFalse(self.shared.exists())
        result = self.run_sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.shared.readlink(), self.skill)
        self.assertEqual(self.claude.readlink(), self.skill)

    def test_old_layout_links_are_migrated(self):
        self.shared.parent.mkdir(parents=True)
        self.shared.symlink_to(self.root / ".skills/example")
        self.claude.parent.mkdir(parents=True)
        self.claude.symlink_to("../../.skills/example/")
        self.legacy.symlink_to("../../.skills/example/")
        self.prompt.parent.mkdir(parents=True)
        self.prompt.symlink_to("../../../.skills/example/SKILL.md")

        for _ in range(2):
            result = self.run_sync()
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(self.shared.resolve(), self.skill)
            self.assertEqual(self.claude.resolve(), self.skill)
            self.assertFalse(self.legacy.is_symlink())
            self.assertFalse(self.prompt.is_symlink())

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
                self.assertEqual((self.root / agent / "skills/swarm").resolve(), skill.resolve())
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
        separate_swarm = self.root / "my-swarm"
        separate_swarm.mkdir()
        conflict.symlink_to(separate_swarm)

        result = self.run_sync()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Refusing to replace", result.stderr)
        self.assertEqual(link.readlink(), old)
        self.assertEqual(conflict.readlink(), separate_swarm)

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
            self.assertEqual(installed.resolve(), source.resolve())
            self.assertEqual(claude_unslop.resolve(), source.resolve())

    def test_conflicting_destinations_remain_untouched(self):
        self.legacy.symlink_to(self.skill)
        self.ctx.parent.mkdir(parents=True)
        self.ctx.symlink_to(self.ctx_source)
        for destination in (self.shared, self.claude):
            with self.subTest(destination=destination):
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_text("Keep me\n")
                for options in (("--dry-run",), ()):
                    result = self.run_sync(*options)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn("Refusing to replace", result.stderr)
                    self.assertNotIn(f"REMOVE {self.ctx}", result.stdout.splitlines())
                    self.assertEqual(destination.read_text(), "Keep me\n")
                    self.assertFalse((self.claude if destination == self.shared else self.shared).exists())
                    self.assertEqual(self.ctx.readlink(), self.ctx_source)
                    self.assertTrue(self.legacy.is_symlink())
                destination.unlink()

    def test_retired_ctx_link_is_removed_without_a_manifest(self):
        (self.root / ".skills").unlink()
        (self.root / ".agent-toolkit").unlink()
        ctx = self.ctx
        ctx.parent.mkdir(parents=True)
        shared_ctx = self.shared.with_name("ctx")
        shared_ctx.parent.mkdir(parents=True)
        shared_ctx.symlink_to(self.ctx_source)
        for location in (self.checkout, Path("../../.skills"), Path("../../.agent-toolkit")):
            for layout in ("vendor/claude/mods/ctx", "claude-mods/ctx"):
                target = location / layout
                with self.subTest(target=target):
                    ctx.symlink_to(target)
                    try:
                        self.assertFalse(ctx.exists(), "Old ctx source should be gone")
                        preview = self.run_sync("--dry-run")
                        self.assertEqual(preview.returncode, 0, preview.stderr)
                        self.assertIn(f"REMOVE {ctx}", preview.stdout.splitlines())
                        self.assertEqual(ctx.readlink(), target)

                        result = self.run_sync()
                        self.assertEqual(result.returncode, 0, result.stderr)
                        self.assertCountEqual(result.stdout.splitlines(), preview.stdout.splitlines())
                        self.assertFalse(os.path.lexists(ctx))

                        repeat = self.run_sync()
                        self.assertEqual(repeat.returncode, 0, repeat.stderr)
                        self.assertNotIn(f"REMOVE {ctx}", repeat.stdout.splitlines())
                    finally:
                        if ctx.is_symlink():
                            ctx.unlink()
        self.assertEqual(shared_ctx.readlink(), self.ctx_source)

    def test_unrelated_ctx_installations_are_preserved(self):
        self.ctx.parent.mkdir(parents=True)
        other = self.root / "other"
        layout = "vendor/claude/mods/ctx"
        (other / layout).mkdir(parents=True)
        (other / "nested").mkdir()
        (self.checkout / "alias").symlink_to(other / "nested", target_is_directory=True)
        targets = {
            "symlink": other / layout,
            "broken symlink": self.ctx_source.with_name("ctx\n"),
            "symlink through another tree": self.checkout / "alias/.." / layout,
        }
        for kind in ("file", "directory", *targets):
            with self.subTest(kind=kind):
                if kind == "file":
                    expected = "Keep me\n"
                    self.ctx.write_text(expected)
                    read_installed = self.ctx.read_text
                elif kind == "directory":
                    expected = "My skill\n"
                    self.ctx.mkdir()
                    skill = self.ctx / "SKILL.md"
                    skill.write_text(expected)
                    read_installed = skill.read_text
                else:
                    expected = targets[kind]
                    self.ctx.symlink_to(expected)
                    read_installed = self.ctx.readlink
                try:
                    for options in (("--dry-run",), ()):
                        result = self.run_sync(*options)
                        self.assertEqual(result.returncode, 0, result.stderr)
                        self.assertNotIn(f"REMOVE {self.ctx}", result.stdout.splitlines())
                        self.assertEqual(read_installed(), expected)
                finally:
                    if self.ctx.is_symlink() or self.ctx.is_file():
                        self.ctx.unlink()
                    elif self.ctx.is_dir():
                        shutil.rmtree(self.ctx)

    def test_unrelated_relative_ctx_link_under_symlinked_agent_root_is_preserved(self):
        other_root = self.root / "other"
        (other_root / "claude/skills").mkdir(parents=True)
        self.ctx.parent.parent.symlink_to(other_root / "claude", target_is_directory=True)
        other_ctx = other_root / ".skills/vendor/claude/mods/ctx"
        other_ctx.mkdir(parents=True)
        target = Path("../../.skills/vendor/claude/mods/ctx")
        self.ctx.symlink_to(target)
        self.assertEqual(self.ctx.resolve(strict=True), other_ctx)
        for options in (("--dry-run",), ()):
            result = self.run_sync(*options)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertNotIn(f"REMOVE {self.ctx}", result.stdout.splitlines())
            self.assertEqual(self.ctx.readlink(), target)

    def test_broken_shared_link_is_preserved(self):
        self.shared.parent.mkdir(parents=True)
        self.shared.symlink_to("missing")
        result = self.run_sync()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.shared.readlink(), Path("missing"))
        self.assertFalse(self.claude.exists())

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
                self.assertEqual((self.root / agent / "skills/commit").resolve(), skill.resolve())

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
        for missing in ("workspace/agent-toolkit/README.md", "workspace/agent-toolkit/bin/sync.sh", "workspace/agent-toolkit/skills/example/SKILL.md"):
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
        self.ctx.parent.mkdir(parents=True)
        self.ctx.symlink_to(self.ctx_source)
        for _ in range(2):
            result = self.run_sync("--dry-run")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn(f"LINK {self.shared}", result.stdout)
            self.assertIn(f"REMOVE {self.old_shared}", result.stdout)
            self.assertIn(f"REMOVE {self.ctx}", result.stdout)
            self.assertTrue(self.old_shared.is_symlink())
            self.assertEqual(self.ctx.readlink(), self.ctx_source)
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

    def test_non_directory_agent_root_is_refused_before_cleanup(self):
        self.old_codex.symlink_to(self.old_skill)
        for name in (".agents", ".claude"):
            root = self.root / name
            for kind in ("file", "dangling symlink"):
                with self.subTest(name=name, kind=kind):
                    if kind == "file":
                        root.write_text("Keep me\n")
                    else:
                        root.symlink_to("missing")
                    try:
                        for options in (("--dry-run",), ()):
                            result = self.run_sync(*options)
                            self.assertNotEqual(result.returncode, 0)
                            self.assertIn(f"Refusing non-directory agent root: {root}", result.stderr)
                            self.assertEqual(self.old_codex.readlink(), self.old_skill)
                            self.assertFalse(self.shared.parent.exists())
                            self.assertFalse(self.claude.parent.exists())
                        if kind == "file":
                            self.assertEqual(root.read_text(), "Keep me\n")
                        else:
                            self.assertEqual(root.readlink(), Path("missing"))
                    finally:
                        root.unlink()

    def test_destination_home_does_not_need_a_checkout(self):
        empty_home = self.root / "empty"
        empty_home.mkdir()
        result = subprocess.run(
            ["bash", str(self.script), str(empty_home)],
            env=dict(os.environ, HOME=str(self.root)), capture_output=True, text=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((empty_home / ".agents/skills/example").resolve(), self.skill)
        self.assertEqual((empty_home / ".claude/skills/example").resolve(), self.skill)
        self.assertFalse(self.shared.parent.exists())
        self.assertFalse(self.claude.parent.exists())

    def test_obsolete_with_orca_is_rejected_without_writes(self):
        before = set(self.root.iterdir())
        result = self.run_sync("--with-orca")
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertIn("[--dry-run] [home]", result.stderr)
        self.assertNotIn("--with-orca", result.stderr)
        self.assertEqual(result.stdout, "")
        self.assertEqual(set(self.root.iterdir()), before)


class CheckoutSyncTests(unittest.TestCase):
    def test_real_checkout_preview_apply_and_repeat(self):
        skills = {p.parent.name: p.parent for p in SCRIPT.parent.parent.glob("skills/*/SKILL.md")}
        self.assertTrue(skills, "Test must run from a populated checkout")
        with tempfile.TemporaryDirectory(prefix="toolkit checkout sync ") as temp:
            cwd = Path(temp).resolve()
            home = cwd / "home with spaces"
            home.mkdir()

            def sync(*options):
                result = subprocess.run(
                    [str(SCRIPT), *options], cwd=cwd, env=dict(os.environ, HOME=str(home)),
                    capture_output=True, text=True, check=False,
                )
                self.assertEqual(result.returncode, 0, result.stderr)
                return set(result.stdout.splitlines())

            roots = [home / agent / "skills" for agent in (".agents", ".claude")]
            destinations = {root / name for root in roots for name in skills}
            self.assertEqual(sync("--dry-run"), {f"LINK {path}" for path in destinations})
            self.assertEqual(list(home.iterdir()), [])

            self.assertEqual(sync(), {f"LINK {path}" for path in destinations})
            self.assertEqual(sync(), {f"KEEP {path}" for path in destinations})
            self.assertEqual({p.name for p in home.iterdir()}, {".agents", ".claude"})
            for root in roots:
                self.assertFalse(root.is_symlink())
                self.assertEqual({p.name for p in root.iterdir()}, set(skills))
                for name, source in skills.items():
                    self.assertEqual((root / name).readlink(), source)
                    self.assertTrue((root / name / "SKILL.md").is_file())


if __name__ == "__main__":
    unittest.main()
