#!/usr/bin/env python3
"""Pi-style Claude Code status line. JSON on stdin; ANSI text on stdout."""
# Layout adapted from Thomas van Dongen's MIT-licensed pi-context-bar.

import argparse
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys

RESET = "\033[0m"
COLORS = {"dim": "\033[2m", "model": "\033[36m", "branch": "\033[34m",
          "success": "\033[32m", "warning": "\033[33m", "error": "\033[31m"}
ANSI = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)")


def number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    try:
        return value if math.isfinite(value) and value >= 0 else None
    except OverflowError:
        return None


def obj(value):
    return value if isinstance(value, dict) else {}


def clean(value):
    if not isinstance(value, str):
        return ""
    return "".join(c if c.isprintable() else " " for c in ANSI.sub("", value)).strip()


def fmt_tokens(value):
    value = number(value)
    if value is None:
        return "?"
    if value < 1000:
        return f"{value:g}"
    if value < 1_000_000:
        return f"{value / 1000:.1f}k"
    return f"{value / 1_000_000:.1f}M"


def columns(text):
    # Conservative, dependency-free budget for wide/combined Unicode names.
    return sum(1 if ord(c) < 127 or c in "█░│⎇…" else 2 for c in text)


def terminal_width(env):
    # stdout is a pipe, not a TTY. Claude supplies COLUMNS on every invocation.
    try:
        width = int(env.get("COLUMNS", "80"))
    except ValueError:
        width = 80
    return max(0, width - 2)  # Leave room for the host's horizontal spacing.


def git_branch(data):
    directory = obj(data.get("workspace")).get("current_dir") or data.get("cwd")
    if not isinstance(directory, str) or not directory:
        return None
    try:
        result = subprocess.run(
            ["git", "-C", directory, "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
            timeout=0.5, check=False,
        )
        if result.returncode != 0:
            return None
        return clean(result.stdout) or None
    except (OSError, ValueError, subprocess.TimeoutExpired):
        return None


def context_values(data):
    context = obj(data.get("context_window"))
    window = number(context.get("context_window_size"))
    # A null current_usage explicitly means no live reading (startup/compact).
    if "current_usage" in context and context["current_usage"] is None:
        return None, None, window
    percent = number(context.get("used_percentage"))
    tokens = number(context.get("total_input_tokens"))
    if tokens is None:
        usage = obj(context.get("current_usage"))
        inputs = [number(usage.get(k)) for k in (
            "input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens")]
        if all(n is not None for n in inputs):
            tokens = sum(inputs)
    # Unknown percentage is never replaced with 0 or a /context estimate.
    return min(100, percent) if percent is not None else None, tokens, window


def segments(data, branch, width):
    if width <= 0:
        return []
    percent, tokens, window = context_values(data)
    color = "dim" if percent is None else "error" if percent >= 80 else "warning" if percent >= 50 else "success"
    separator = ("dim", " │ ")
    cost = number(obj(data.get("cost")).get("total_cost_usd"))
    cost_parts = [] if cost is None else [separator, ("success", f"${cost:.3f}")]

    def essentials(size):
        filled = math.floor((percent or 0) / 100 * size + 0.5)
        pct = "?" if percent is None else str(math.floor(percent + 0.5))
        return [("dim", "Context: ["), (color, "█" * filled),
                ("dim", "░" * (size - filled)), ("dim", "] "),
                (None, f"{fmt_tokens(tokens)}/{fmt_tokens(window)}"),
                (color, f" ({pct}%)"), *cost_parts]

    def size_of(parts):
        return sum(columns(text) for _, text in parts)

    size = max(5, 20 - max(0, size_of(essentials(20)) - width))
    parts = essentials(size)
    model = obj(data.get("model"))
    model_part = ("model", clean(model.get("display_name")) or clean(model.get("id")) or "?")
    branch_part = ("branch", f"⎇ {clean(branch)}" if branch else "no git")
    for prefix in ([branch_part, separator, model_part, separator], [model_part, separator]):
        if size_of(prefix + parts) <= width:
            parts = prefix + parts
            break
    if size_of(parts) <= width:
        return parts
    # Last resort at widths too small for even the five-cell gauge.
    left = width - 1
    clipped = []
    for style, text in parts:
        prefix = ""
        for c in text:
            if columns(c) > left:
                break
            prefix += c
            left -= columns(c)
        clipped.append((style, prefix))
        if prefix != text:
            break
    return clipped + [("dim", "…")]


def render(data, branch, width, color=True):
    return "".join(COLORS[style] + text + RESET if color and style and text else text
                   for style, text in segments(data, branch, width))


def forward_payload(command_file, payload):
    """Optional existing telemetry hook, not another visible status line."""
    if command_file is None:
        return
    try:
        subprocess.run(["/bin/sh", str(command_file)], input=payload,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                       timeout=2, check=False)
    except (OSError, subprocess.TimeoutExpired):
        pass  # An unavailable integration must not blank the gauge.


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--forward-command", type=Path,
                        help="shell file receiving the same JSON (output discarded; 2s timeout)")
    args = parser.parse_args()
    payload = sys.stdin.buffer.read()
    try:
        data = obj(json.loads(payload))
    except (ValueError, UnicodeError):
        data = {}
    if data:
        print(render(data, git_branch(data), terminal_width(os.environ),
                     color="NO_COLOR" not in os.environ))
    forward_payload(args.forward_command, payload)


if __name__ == "__main__":
    main()
