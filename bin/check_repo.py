"""Offline repository checks. No installation, workflow execution, or network access."""

from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
import sys
import unicodedata
from urllib.parse import unquote, urlsplit

try:
    import yaml
    from markdown_it import MarkdownIt
except ImportError:
    raise SystemExit(
        "Missing check dependencies. In an isolated environment, install "
        "bin/requirements-check.txt; see README.md#checks."
    )

ROOT = Path(__file__).resolve().parents[1]
MARKDOWN = MarkdownIt("commonmark").enable("table")


class UniqueLoader(yaml.SafeLoader):
    """Reject duplicate explicit keys, but retain normal YAML merge behavior."""

    def construct_mapping(self, node, deep=False):
        seen = set()
        for key_node, _ in node.value:
            if key_node.tag == "tag:yaml.org,2002:merge":
                continue
            key = self.construct_object(key_node, deep=deep)
            try:
                if key in seen:
                    raise ValueError(f"duplicate YAML key: {key!r}")
                seen.add(key)
            except TypeError:
                raise ValueError("YAML mapping keys must be scalar") from None
        return super().construct_mapping(node, deep=deep)


def load_yaml(text):
    return yaml.load(text, Loader=UniqueLoader)


def frontmatter(text):
    lines = text.splitlines(keepends=True)
    if not lines or lines[0].strip() != "---":
        return None, text
    for index, line in enumerate(lines[1:], 1):
        if line.strip() == "---":
            return load_yaml("".join(lines[1:index])), "".join(lines[index + 1:])
    raise ValueError("unclosed YAML frontmatter")


def skill_location(path):
    parts = path.parts
    return (
        len(parts) == 3 and parts[0] == "skills"
        or len(parts) == 5 and parts[0] == "vendor" and parts[2] == "skills"
    )


def check_skills(root, files):
    errors, names = [], {}
    for path in files:
        if path.name != "SKILL.md":
            continue
        if not skill_location(path):
            errors.append(f"{path}: expected skills/<name>/ or vendor/<vendor>/skills/<name>/")
        try:
            data, body = frontmatter((root / path).read_text())
            if not isinstance(data, dict):
                raise ValueError("SKILL.md needs YAML mapping frontmatter")
            for field, limit in (("name", 64), ("description", 1024), ("compatibility", 500)):
                if field == "compatibility" and field not in data:
                    continue
                if not isinstance(data.get(field), str) or not data[field].strip():
                    raise ValueError(f"{field} must be a nonempty string")
                if len(data[field]) > limit:
                    raise ValueError(f"{field} must be at most {limit} characters")
            name = data["name"]
            if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name):
                raise ValueError("name must use lowercase letters, numbers, and single hyphens")
            if name != path.parent.name:
                errors.append(f"{path}: name must match directory {path.parent.name!r}")
            if name in names:
                errors.append(f"{path}: duplicate discovery name {name!r}, also in {names[name]}")
            names[name] = path
            for field in ("disable-model-invocation", "user-invocable"):
                if field in data and type(data[field]) is not bool:
                    errors.append(f"{path}: {field} must be a YAML boolean")
            if not body.strip():
                errors.append(f"{path}: skill body is empty")
        except (ValueError, yaml.YAMLError) as exc:
            errors.append(f"{path}: {exc}")
    # Use the same file inventory as other checks, so ignored directories stay out.
    directories = set()
    for path in files:
        if len(path.parts) >= 3 and path.parts[0] == "skills":
            directories.add(Path(*path.parts[:2]))
        elif len(path.parts) >= 5 and path.parts[0] == "vendor" and path.parts[2] == "skills":
            directories.add(Path(*path.parts[:4]))
    for directory in sorted(directories):
        if directory / "SKILL.md" not in files:
            errors.append(f"{directory}: missing SKILL.md")
    return errors


class HTMLTargets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.anchors = set()
        self.links = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.anchors.add(attrs["id"])
        if tag == "a" and attrs.get("name"):
            self.anchors.add(attrs["name"])
        for key in ("href", "src"):
            if attrs.get(key):
                self.links.append(attrs[key])


def inline_text(tokens):
    return "".join(
        inline_text(token.children) if token.children else token.content
        for token in tokens
        if token.type in ("text", "code_inline", "image", "softbreak")
    )


def markdown_info(text):
    """Collect real links and GitHub-style heading anchors, ignoring code examples."""
    _, body = frontmatter(text)
    tokens = MARKDOWN.parse(body)
    anchors, links = set(), []
    html = HTMLTargets()
    for index, token in enumerate(tokens):
        if token.type == "heading_open":
            title = inline_text(tokens[index + 1].children or []).lower()
            slug = "".join(
                char for char in title
                if char in "-_ " or unicodedata.category(char)[0] in "LMN"
            ).replace(" ", "-")
            anchor, suffix = slug, 0
            while anchor in anchors:
                suffix += 1
                anchor = f"{slug}-{suffix}"
            anchors.add(anchor)
        if token.type == "html_block":
            html.feed(token.content)
        for child in token.children or []:
            if child.type == "link_open":
                links.append(child.attrGet("href"))
            elif child.type == "image":
                links.append(child.attrGet("src"))
            elif child.type == "html_inline":
                html.feed(child.content)
    return anchors | html.anchors, links + html.links


def local_target(root, document, href):
    url = urlsplit(href)
    if url.scheme or url.netloc:
        return None, ""
    name = unquote(url.path)
    target = root / name.lstrip("/") if name.startswith("/") else document.parent / name
    if not name:
        target = document
    target = target.resolve()
    if not target.is_relative_to(root.resolve()):
        raise ValueError(f"local link escapes repository: {href}")
    if not target.exists():
        raise ValueError(f"missing local target: {href}")
    return target, unquote(url.fragment)


def check_links(root, files):
    errors, documents = [], {}
    for path in files:
        if path.suffix.lower() != ".md":
            continue
        try:
            documents[(root / path).resolve()] = markdown_info((root / path).read_text())
        except (ValueError, yaml.YAMLError) as exc:
            errors.append(f"{path}: {exc}")
    for document, (_, links) in documents.items():
        for href in links:
            try:
                target, fragment = local_target(root, document, href)
                if fragment and target in documents and fragment not in documents[target][0]:
                    raise ValueError(f"missing Markdown anchor: {href}")
            except ValueError as exc:
                errors.append(f"{document.relative_to(root.resolve())}: {exc}")
    return errors


def nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def check_sources(root, files):
    """Require an explicit local/import declaration for every skill and Claude mod."""
    errors = []
    source_file = root / "SOURCES.md"
    if not source_file.is_file():
        return ["SOURCES.md: missing attribution registry"]
    blocks = [
        token.content for token in MARKDOWN.parse(source_file.read_text())
        if token.type == "fence" and token.info.strip() == "yaml"
    ]
    try:
        if len(blocks) != 1:
            raise ValueError("expected one YAML attribution registry")
        data = load_yaml(blocks[0])
        if not isinstance(data, dict) or set(data) != {"local", "imports"}:
            raise ValueError("registry needs local and imports lists")
        if not isinstance(data["local"], list) or not isinstance(data["imports"], list):
            raise ValueError("local and imports must be lists")
        declared = set()

        def register(name):
            if not nonempty(name):
                raise ValueError("artifact path must be a nonempty string")
            target = (root / name).resolve()
            if not target.is_relative_to(root.resolve()) or not target.exists():
                raise ValueError(f"missing or external artifact: {name}")
            canonical = target.relative_to(root.resolve()).as_posix()
            if canonical in declared:
                raise ValueError(f"duplicate attribution: {name}")
            declared.add(canonical)
            return target

        for name in data["local"]:
            register(name)
        for entry in data["imports"]:
            if not isinstance(entry, dict):
                raise ValueError("each import must be a mapping")
            for field in ("author", "source", "revision", "license"):
                if not nonempty(entry.get(field)):
                    raise ValueError(f"each import needs a nonempty {field}")
            artifacts = entry.get("artifacts")
            if isinstance(artifacts, dict):
                names = artifacts.keys()
            elif isinstance(artifacts, list):
                names = artifacts
            else:
                raise ValueError("each import needs an artifacts list or mapping")
            if not artifacts:
                raise ValueError("each import needs at least one artifact")
            for name in names:
                directory = register(name)
                license_file = directory / "LICENSE"
                if not license_file.is_file() or not license_file.read_text().strip():
                    errors.append(f"{name}: imported artifact needs a nonempty LICENSE")
        required = {
            path.parent.as_posix() for path in files if path.name == "SKILL.md"
        } | {
            path.parent.parent.as_posix() for path in files
            if path.name == "plugin.json" and path.parent.name == ".claude-plugin"
        }
        for name in sorted(required - declared):
            errors.append(f"{name}: missing local/import declaration in SOURCES.md")
    except (ValueError, yaml.YAMLError) as exc:
        errors.append(f"SOURCES.md: {exc}")
    return errors


def reject_json_constant(value):
    raise ValueError(f"invalid JSON constant: {value}")


def check_syntax(root, files):
    errors = []
    for path in files:
        full = root / path
        try:
            if path.suffix == ".py":
                compile(full.read_bytes(), str(path), "exec")
            elif path.suffix == ".json":
                json.loads(full.read_text(), parse_constant=reject_json_constant)
            elif path.suffix in (".yaml", ".yml"):
                list(yaml.load_all(full.read_text(), Loader=UniqueLoader))
            elif path.suffix == ".sh" or path == Path("bin/check"):
                result = subprocess.run(
                    ["bash", "-n", str(full)], capture_output=True, text=True, timeout=10,
                )
                if result.returncode:
                    errors.append(f"{path}: {result.stderr.strip()}")
        except (ValueError, SyntaxError, yaml.YAMLError, subprocess.TimeoutExpired) as exc:
            errors.append(f"{path}: {exc}")
    return errors


def repository_files(root):
    result = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=root, check=True, capture_output=True, text=True,
    )
    return sorted({Path(name) for name in result.stdout.split("\0") if name and (root / name).is_file()})


def main():
    arguments = sys.argv[1:]
    if arguments not in ([], ["--static"]):
        raise SystemExit("Usage: bin/check [--static]")
    files = repository_files(ROOT)
    errors = []
    for check in (check_skills, check_links, check_sources, check_syntax):
        found = check(ROOT, files)
        print(f"{check.__name__}: {'FAIL' if found else 'PASS'}", flush=True)
        errors.extend(found)
    if errors:
        print("\n".join(dict.fromkeys(errors)), file=sys.stderr)
    if arguments == ["--static"]:
        return int(bool(errors))
    # Enumerate suites explicitly: discovering and executing arbitrary imported tests
    # would run unreviewed workflows. Each of these suites is offline and isolated.
    suites = [
        "bin/test_check.py",
        "bin/test_sync.py",
        "skills/html-report/tests/test_embed_css.py",
        "skills/session-handoff/tests/test_check_handoff.py",
        "vendor/claude/status-line/tests/test_status_line.py",
    ]
    failed = bool(errors)
    for suite in suites:
        print(f"\nRunning {suite}", flush=True)
        result = subprocess.run([sys.executable, "-B", str(ROOT / suite)], cwd=ROOT)
        failed |= result.returncode != 0
    return int(failed)


if __name__ == "__main__":
    raise SystemExit(main())
