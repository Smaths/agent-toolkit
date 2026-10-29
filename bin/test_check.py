"""Validator regressions. Every fixture and write stays in a temporary directory."""

from contextlib import redirect_stderr, redirect_stdout
from io import StringIO
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import check_repo as checks


class CheckTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="repo checks ")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()

    def write(self, path, content):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content)
        return Path(path)

    def files(self):
        return [path.relative_to(self.root) for path in self.root.rglob("*") if path.is_file()]

    def skill(self, path="skills/example/SKILL.md", name="example", extra=""):
        return self.write(path, f"---\nname: {name}\ndescription: A useful skill\n{extra}---\nDo the task.\n")

    def registry(self, body):
        self.write("SOURCES.md", f"# Sources\n\n```yaml\n{body}\n```\n")

    def test_portable_and_vendor_skills_allow_extra_metadata(self):
        self.skill(extra="disable-model-invocation: true\ncustom-field: optional\n")
        self.skill("vendor/example/skills/other/SKILL.md", "other")
        self.assertEqual(checks.check_skills(self.root, self.files()), [])

    def test_bad_frontmatter_and_body(self):
        for content in (
            "No frontmatter",
            "---\nname: example\n",
            "---\n- example\n---\nBody",
            "---\nname: example\n---\nBody",
            "---\nname: example\ndescription: 42\n---\nBody",
            "---\nname: example\ndescription: [broken\n---\nBody",
            "---\nname: example\nname: other\ndescription: test\n---\nBody",
            "---\nname: example\ndescription: test\n---\n",
        ):
            with self.subTest(content=content):
                self.write("skills/example/SKILL.md", content)
                self.assertTrue(checks.check_skills(self.root, self.files()))

    def test_name_location_and_boolean_validation(self):
        for name in ("Wrong", "wrong_name", "double--hyphen", "other", "''"):
            with self.subTest(name=name):
                self.skill(name=name)
                self.assertTrue(checks.check_skills(self.root, self.files()))
        for flag in ("disable-model-invocation", "user-invocable"):
            self.skill(extra=f'{flag}: "false"\n')
            self.assertTrue(checks.check_skills(self.root, self.files()))
        self.skill()
        self.skill("example/SKILL.md")
        errors = checks.check_skills(self.root, self.files())
        self.assertTrue(any("expected skills/" in error for error in errors))
        self.assertTrue(any("duplicate discovery name" in error for error in errors))

    def test_missing_skill_entry_point(self):
        self.write("skills/incomplete/references/note.md", "# Note")
        self.assertTrue(checks.check_skills(self.root, self.files()))

    def test_real_links_anchors_and_examples(self):
        self.write("docs/a file.md", "# Hello, **world**!\n\n# Hello, world!\n\nTitle\n=====\n\n<a id='custom'></a>\n")
        self.write("image.png", "fixture")
        self.write("README.md", """# Start
[inline](docs/a%20file.md#hello-world)
[duplicate](docs/a%20file.md#hello-world-1)
[setext](docs/a%20file.md#title)
[custom](docs/a%20file.md#custom)
[root](/docs/a%20file.md)
[self](#start)
[reference][doc]
![image](image.png)
<a href="docs/a%20file.md#title">HTML link</a>
[external](https://example.invalid/missing)
[mail](mailto:test@example.invalid)
`[example](missing.md)`
```markdown
[example](also-missing.md)
# Fake heading
```
[doc]: docs/a%20file.md "A title"
""")
        self.assertEqual(checks.check_links(self.root, self.files()), [])

    def test_missing_links_images_and_anchors(self):
        for content in (
            "[missing](missing.md)",
            "![image](missing.png)",
            "[missing][target]\n\n[target]: missing.md",
            '<a href="missing.md">missing</a>',
            "# Title\n\n[missing](#absent)",
            "[outside](../outside.md)",
            "```md\n# Fake\n```\n[missing](#fake)",
        ):
            with self.subTest(content=content):
                self.write("README.md", content)
                self.assertTrue(checks.check_links(self.root, self.files()))

    def test_markdown_frontmatter_checked_by_links(self):
        path = self.write("README.md", "---\nbroken: [\n---\nText")
        self.assertEqual(len(checks.check_links(self.root, [path])), 1)
        self.assertEqual(checks.check_syntax(self.root, [path]), [])

    def test_duplicate_headings_with_numbered_titles(self):
        anchors, _ = checks.markdown_info("# A\n# A\n# A-1\n# A\n")
        self.assertEqual(anchors, {"a", "a-1", "a-1-1", "a-2"})

    def test_local_and_imported_attribution(self):
        self.skill()
        self.skill("vendor/example/skills/imported/SKILL.md", "imported")
        self.write("vendor/example/skills/imported/LICENSE", "License text")
        self.registry("""local: [skills/example]
imports:
  - author: Original author
    source: https://example.org/repo
    revision: abc1234
    license: MIT
    artifacts:
      vendor/example/skills/imported: Adapted the workflow.
""")
        self.assertEqual(checks.check_sources(self.root, self.files()), [])

    def test_list_artifacts_need_a_license(self):
        self.skill()
        self.write("skills/example/LICENSE", "License text")
        self.registry("""local: []
imports:
  - author: Author
    source: upstream-repo
    revision: abc1234
    license: MIT
    artifacts: [skills/example]
""")
        self.assertEqual(checks.check_sources(self.root, self.files()), [])
        (self.root / "skills/example/LICENSE").unlink()
        self.assertTrue(checks.check_sources(self.root, self.files()))

    def test_unregistered_skill_or_plugin(self):
        self.skill()
        self.write("vendor/example/mods/demo/.claude-plugin/plugin.json", "{}")
        self.registry("local: []\nimports: []")
        errors = checks.check_sources(self.root, self.files())
        self.assertEqual(len(errors), 2)
        self.assertTrue(all("missing local/import declaration" in error for error in errors))

    def test_bad_import_records(self):
        self.skill()
        template = """local: []
imports:
  - author: Author
    source: https://example.org/repo
    revision: abc1234
    license: MIT
    artifacts:
      skills/example: None.
"""
        self.write("skills/example/LICENSE", "License text")
        for original, replacement in (
            ("author: Author", "author: ''"),
            ("revision: abc1234", "revision: null"),
            ("license: MIT", "license: ''"),
            ("skills/example: None.", "skills/missing: None."),
            ("local: []", "local: [skills/example]"),
            ("skills/example: None.", "../example: None."),
        ):
            with self.subTest(original=original):
                self.registry(template.replace(original, replacement))
                self.assertTrue(checks.check_sources(self.root, self.files()))
        self.registry(template.replace("skills/example: None.", "skills/example: ''"))
        self.assertEqual(checks.check_sources(self.root, self.files()), [])
        self.registry(template.replace("skills/example: None.", "skills/../skills/example: ''")
                      .replace("local: []", "local: [skills/example]"))
        self.assertTrue(checks.check_sources(self.root, self.files()))
        self.registry(template)
        (self.root / "skills/example/LICENSE").unlink()
        self.assertTrue(checks.check_sources(self.root, self.files()))
        self.write("skills/example/LICENSE", "  \n")
        self.assertTrue(checks.check_sources(self.root, self.files()))

    def test_missing_or_malformed_registry(self):
        self.assertTrue(checks.check_sources(self.root, []))
        for body in ("", "local: [broken", "local: []", "local: {}\nimports: []"):
            self.registry(body)
            self.assertTrue(checks.check_sources(self.root, self.files()))

    def test_syntax_checks_do_not_execute_code(self):
        self.write("sample.py", "raise RuntimeError('must not run')\n")
        self.write("sample.sh", "#!/bin/bash\nexit 99\n")
        self.write("sample.json", '{"valid": true}')
        self.write("sample.yml", "valid: true\n")
        self.assertEqual(checks.check_syntax(self.root, self.files()), [])
        for path, content in (
            ("bad.py", "def broken(:"),
            ("bad.sh", "if true; then\n"),
            ("bad.json", '{"broken": }'),
            ("bad.json", '{"broken": NaN}'),
            ("bad.yaml", "broken: ["),
            ("bad.yaml", "duplicate: 1\nduplicate: 2"),
        ):
            with self.subTest(path=path, content=content):
                self.write(path, content)
                self.assertTrue(checks.check_syntax(self.root, [Path(path)]))

    def test_main_runs_suites_after_static_failure_without_repeated_errors(self):
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        self.write("README.md", "[broken](missing.md)\n")
        self.write("skills/example/SKILL.md", "---\nname: [\n---\nBody\n")
        self.registry("local: [skills/example]\nimports: []")
        marker = self.root / "suites-ran.txt"
        suites = (
            "bin/test_check.py",
            "bin/test_sync.py",
            "skills/html-report/tests/test_embed_css.py",
            "skills/session-handoff/tests/test_check_handoff.py",
            "vendor/claude/status-line/tests/test_status_line.py",
        )
        for suite in suites:
            self.write(suite, f"from pathlib import Path\n"
                              f"Path({str(marker)!r}).open('a').write({suite!r} + '\\n')\n")
        stdout, stderr = StringIO(), StringIO()
        with patch.object(checks, "ROOT", self.root), \
             patch.object(checks.sys, "argv", ["bin/check"]), \
             redirect_stdout(stdout), redirect_stderr(stderr):
            self.assertEqual(checks.main(), 1)
        self.assertEqual(marker.read_text().splitlines(), list(suites))
        self.assertIn("README.md: missing local target: missing.md", stderr.getvalue())
        self.assertEqual(stderr.getvalue().count("skills/example/SKILL.md:"), 1)
        self.assertIn("check_skills: FAIL", stdout.getvalue())
        self.assertIn("check_links: FAIL", stdout.getvalue())
        for suite in suites:
            self.assertIn(f"Running {suite}", stdout.getvalue())

    def test_yaml_merges_remain_supported(self):
        self.write("merge.yaml", "base: &base\n  a: 1\ncopy:\n  <<: *base\n  a: 2\n")
        self.assertEqual(checks.check_syntax(self.root, self.files()), [])

    def test_file_discovery_includes_untracked_but_not_ignored_files(self):
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        self.write(".gitignore", ".venv/\nskills/ignored/\n")
        self.write("untracked.md", "# Check me")
        self.write(".venv/broken.py", "invalid syntax (")
        self.write("skills/ignored/broken.py", "invalid syntax (")
        files = checks.repository_files(self.root)
        self.assertEqual(files, [Path(".gitignore"), Path("untracked.md")])
        self.assertEqual(checks.check_skills(self.root, files), [])


if __name__ == "__main__":
    unittest.main()
