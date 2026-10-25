#!/usr/bin/env python3
"""Embed the current Snarfum CSS in a draft HTML report; print a new temp path."""

import argparse
import os
from pathlib import Path
import re
import sys
import tempfile

MARKER = "<!-- SNARFUM_STYLES -->"
CSS_FILES = ("tokens/tokens.css", "styles/snarfum.css")


def render(draft: str, design_system: Path) -> str:
    if draft.count(MARKER) != 1 or not re.search(r"<head\b[^>]*>[\s\S]*?" + re.escape(MARKER) + r"[\s\S]*?</head\s*>", draft, re.I):
        raise ValueError(f"place {MARKER} exactly once inside <head>")
    parts = []
    for relative in CSS_FILES:
        path = design_system / relative
        try:
            css = path.read_text(encoding="utf-8")
        except OSError as exc:
            raise ValueError(f"cannot read design-system CSS at {path}: {exc}") from exc
        # A self-contained <style> must not depend on relative files or close early.
        if re.search(r"</style\s*|@import\b|url\s*\(", css, re.I):
            raise ValueError(f"{path} contains an external asset/import or HTML style end tag; cannot embed safely")
        parts.append(f"/* {relative} */\n{css}")
    return draft.replace(MARKER, "<style>\n" + "\n".join(parts) + "\n</style>")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--design-system", default=os.environ.get("SNARFUM_DESIGN_SYSTEM"),
                        help="path to the Snarfum design-system source (or set SNARFUM_DESIGN_SYSTEM)")
    args = parser.parse_args()
    if not args.design_system:
        parser.error("provide --design-system or SNARFUM_DESIGN_SYSTEM")
    try:
        draft = sys.stdin.read()
        output = render(draft, Path(args.design_system).expanduser())
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", prefix="html-report-",
                                         suffix=".html", delete=False) as file:
            file.write(output)
            path = file.name
    except (ValueError, OSError, UnicodeError) as exc:
        parser.exit(1, f"html-report: {exc}\n")
    print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
