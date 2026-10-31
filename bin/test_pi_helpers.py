"""Offline contracts for the two on-demand Pi helper packages; no Pi process or model calls."""

import json
from pathlib import Path
import unittest

from check_repo import frontmatter


ROOT = Path(__file__).resolve().parents[1] / "vendor/pi/extensions"
HELPERS = {"pi-away": "recap", "pi-heads-up": "heads-up"}


class PiHelperTests(unittest.TestCase):
    def test_packages_expose_only_the_expected_prompt(self):
        for package, command in HELPERS.items():
            with self.subTest(package=package):
                root = ROOT / package
                manifest = json.loads((root / "package.json").read_text())
                self.assertEqual(manifest["pi"], {
                    "extensions": [],
                    "prompts": [f"./prompts/{command}.md"],
                })
                self.assertEqual(
                    sorted(path.name for path in (root / "prompts").glob("*.md")),
                    [f"{command}.md"],
                )
                self.assertIn("prompts", manifest["files"])
                for filename in ("README.md", "LICENSE"):
                    self.assertIn(filename, manifest["files"])
                    self.assertTrue((root / filename).read_text().strip())

    def test_helpers_have_no_executable_resources_or_dependencies(self):
        for package in HELPERS:
            with self.subTest(package=package):
                root = ROOT / package
                manifest = json.loads((root / "package.json").read_text())
                for field in ("dependencies", "peerDependencies", "scripts"):
                    self.assertFalse(manifest.get(field))
                self.assertFalse((root / "extensions").exists())
                self.assertFalse(list(root.rglob("*.ts")))
                self.assertFalse(list(root.rglob("*.js")))

    def test_prompt_frontmatter_and_body(self):
        for package, command in HELPERS.items():
            with self.subTest(package=package):
                path = ROOT / package / "prompts" / f"{command}.md"
                metadata, body = frontmatter(path.read_text())
                self.assertIsInstance(metadata, dict)
                self.assertIsInstance(metadata.get("description"), str)
                self.assertTrue(metadata["description"].strip())
                self.assertTrue(body.strip())


if __name__ == "__main__":
    unittest.main()
