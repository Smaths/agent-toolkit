"""Focused offline tests for the HTML report CSS embedder."""

import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "embed_css.py"
spec = importlib.util.spec_from_file_location("embed_css", SCRIPT)
embed_css = importlib.util.module_from_spec(spec)
spec.loader.exec_module(embed_css)

DRAFT = '<!doctype html><html lang="en" class="dark"><head><meta charset="utf-8"><!-- SNARFUM_STYLES --></head><body><main id="main">Safe</main></body></html>'


class EmbedTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.source = Path(self.temp.name)
        (self.source / "tokens").mkdir()
        (self.source / "styles").mkdir()
        (self.source / "tokens/tokens.css").write_text(":root { --foreground: black; }", encoding="utf-8")
        (self.source / "styles/snarfum.css").write_text("body { color: var(--foreground); }", encoding="utf-8")

    def test_embed_order_and_no_path_dependency(self):
        result = embed_css.render(DRAFT, self.source)
        self.assertLess(result.index("--foreground"), result.index("body { color"))
        self.assertEqual(result.count("<style>"), 1)
        self.assertNotIn("SNARFUM_STYLES", result)
        self.assertNotIn(str(self.source), result)

    def test_missing_dependency_and_unsafe_css_fail(self):
        (self.source / "styles/snarfum.css").unlink()
        with self.assertRaisesRegex(ValueError, "cannot read design-system CSS"):
            embed_css.render(DRAFT, self.source)
        for css in ('@import "theme.css";', 'a { background: url(https://example.test/x) }', '</style><script>bad</script>'):
            with self.subTest(css=css):
                (self.source / "styles/snarfum.css").write_text(css, encoding="utf-8")
                with self.assertRaisesRegex(ValueError, "cannot embed safely"):
                    embed_css.render(DRAFT, self.source)

    def test_marker_position_and_cardinality(self):
        for draft in (DRAFT.replace("<!-- SNARFUM_STYLES -->", ""),
                      DRAFT.replace("<!-- SNARFUM_STYLES -->", "<!-- SNARFUM_STYLES --><!-- SNARFUM_STYLES -->"),
                      DRAFT.replace("<!-- SNARFUM_STYLES -->", "").replace("<main", "<!-- SNARFUM_STYLES --><main")):
            with self.subTest(draft=draft):
                with self.assertRaisesRegex(ValueError, "exactly once inside"):
                    embed_css.render(draft, self.source)

    def test_cli_creates_temp_html_and_fails_clearly(self):
        result = subprocess.run([sys.executable, str(SCRIPT), "--design-system", str(self.source)],
                                input=DRAFT, capture_output=True, text=True, check=True)
        path = Path(result.stdout.strip())
        self.addCleanup(path.unlink)
        self.assertEqual(path.parent.resolve(), Path(tempfile.gettempdir()).resolve())
        self.assertIn("body { color: var(--foreground); }", path.read_text(encoding="utf-8"))
        fail = subprocess.run([sys.executable, str(SCRIPT)], input=DRAFT,
                              capture_output=True, text=True, env={"SNARFUM_DESIGN_SYSTEM": ""})
        self.assertNotEqual(fail.returncode, 0)
        self.assertIn("provide --design-system", fail.stderr)


if __name__ == "__main__":
    unittest.main()
