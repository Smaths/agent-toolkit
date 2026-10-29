#!/usr/bin/env python3
"""Offline status-line tests; subprocesses and repositories stay in temp dirs."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "status-line.py"
spec = importlib.util.spec_from_file_location("claude_status_line", SCRIPT)
ctx = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ctx)

SAMPLE = {
    "model": {"display_name": "Opus"},
    "context_window": {
        "context_window_size": 200_000, "used_percentage": 25,
        "total_input_tokens": 50_000, "total_output_tokens": 12_000,
        "current_usage": {"input_tokens": 10_000, "cache_creation_input_tokens": 20_000,
                          "cache_read_input_tokens": 20_000, "output_tokens": 12_000},
    },
    "cost": {"total_cost_usd": 1.234},
}


class StatusLineTests(unittest.TestCase):
    def test_wide_layout(self):
        self.assertEqual(ctx.render(SAMPLE, "main", 120, color=False),
                         "⎇ main │ Opus │ CTX: [█████░░░░░░░░░░░░░░░] 50.0k/200.0k (25%) │ $1.234")

    def test_effort_beside_model_and_unknown_omitted(self):
        for level in ["low", "high", "max"]:
            data = {**SAMPLE, "effort": {"level": level}}
            self.assertIn(f"Opus · {level} │ CTX:", ctx.render(data, "main", 120, False))
            self.assertIn(ctx.COLORS["dim"] + f" · {level}" + ctx.RESET,
                          ctx.render(data, "main", 120))
        for effort in [None, {}, {"level": None}, {"level": 123}]:
            data = {**SAMPLE, "effort": effort}
            self.assertIn("Opus │ CTX:", ctx.render(data, "main", 120, False))
        width = ctx.columns("Opus │ CTX: [█████░░░░░░░░░░░░░░░] 50.0k/200.0k (25%) │ $1.234")
        self.assertNotIn("Opus · high", ctx.render({**SAMPLE, "effort": {"level": "high"}},
                                                       "main", width, False))

    def test_thresholds_and_rounding(self):
        for percent, color, filled in [(0, "success", 0), (49, "success", 10),
                                       (50, "warning", 10), (79, "warning", 16),
                                       (80, "error", 16), (150, "error", 20)]:
            data = copy.deepcopy(SAMPLE)
            data["context_window"]["used_percentage"] = percent
            result = ctx.render(data, "main", 120)
            self.assertIn(ctx.COLORS[color] + f" ({min(percent, 100)}%)", result)
            if filled:
                self.assertIn(ctx.COLORS[color] + "█" * filled + ctx.RESET, result)
        data["context_window"]["used_percentage"] = 12.5
        self.assertIn("(13%)", ctx.render(data, None, 120, color=False))

    def test_null_usage_overrides_zeroed_or_stale_totals(self):
        for percent in [None, 0, 25]:
            data = copy.deepcopy(SAMPLE)
            data["context_window"].update(current_usage=None, used_percentage=percent)
            result = ctx.render(data, None, 120, color=False)
            self.assertIn("[" + "░" * 20 + "] ?/200.0k (?%)", result)
            self.assertNotIn("█", result)
            self.assertIn("$1.234", result)

    def test_missing_and_invalid_percent_stays_unknown(self):
        for percent in [None, "25", True, float("nan"), float("inf"), -1]:
            data = copy.deepcopy(SAMPLE)
            data["context_window"]["used_percentage"] = percent
            self.assertIn("(?%)", ctx.render(data, None, 120, color=False))

    def test_tokens_include_caches_not_output(self):
        data = copy.deepcopy(SAMPLE)
        del data["context_window"]["total_input_tokens"]
        self.assertEqual(ctx.context_values(data), (25, 50_000, 200_000))
        del data["context_window"]["current_usage"]["cache_read_input_tokens"]
        self.assertEqual(ctx.context_values(data), (25, None, 200_000))

    def test_token_units(self):
        self.assertEqual([ctx.fmt_tokens(n) for n in [None, 0, 999, 1000, 200_000, 1_000_000]],
                         ["?", "0", "999", "1.0k", "200.0k", "1.0M"])

    def test_missing_cost_not_zero_cost(self):
        for cost in [None, {}, {"total_cost_usd": -1}, {"total_cost_usd": True}]:
            data = {**SAMPLE, "cost": cost}
            self.assertNotIn("$", ctx.render(data, None, 120, color=False))
        data["cost"] = {"total_cost_usd": 0}
        self.assertIn("$0.000", ctx.render(data, None, 120, color=False))

    def test_narrow_layout_keeps_branch_context_figures_and_cost(self):
        # The unlabeled narrow gauge starts at half the wide gauge's 20 cells.
        essential = "[███░░░░░░░] 50.0k/200.0k (25%) │ $1.234"
        with_model = "⎇ main │ Opus │ " + essential
        without_model = "⎇ main │ " + essential
        self.assertEqual(ctx.render(SAMPLE, "main", ctx.columns(with_model), False), with_model)
        self.assertEqual(ctx.render(SAMPLE, "main", ctx.columns(without_model), False), without_model)
        with_effort = {**SAMPLE, "effort": {"level": "high"}}
        with_effort_layout = "⎇ main │ Opus · high │ " + essential
        self.assertEqual(ctx.render(with_effort, "main", ctx.columns(with_effort_layout), False),
                         with_effort_layout)
        self.assertEqual(ctx.render(with_effort, "main", ctx.columns(without_model), False), without_model)
        narrower = ctx.render(SAMPLE, "main", ctx.columns(without_model) - 3, False)
        self.assertIn("⎇ main │ [██░░░░░]", narrower)
        self.assertIn("50.0k/200.0k (25%) │ $1.234", narrower)
        self.assertNotIn("CTX:", narrower)

    def test_long_branch_is_shortened_before_context_or_cost_is_lost(self):
        min_context = "[█░░░░] 50.0k/200.0k (25%) │ $1.234"
        width = ctx.columns("⎇ … │ " + min_context)
        result = ctx.render(SAMPLE, "feature/long-worktree-name", width, False)
        self.assertEqual(result, "⎇ … │ " + min_context)
        self.assertLessEqual(ctx.columns(result), width)

    def test_all_widths_and_unicode(self):
        data = {**SAMPLE, "model": {"display_name": "模型👩‍💻"}}
        for width in range(181):
            result = ctx.render(data, "分支/é🚀" * 10, width, False)
            self.assertLessEqual(ctx.columns(result), width)
        self.assertEqual(ctx.render(data, None, 1, False), "…")
        self.assertEqual(ctx.render(data, None, 0, False), "")

    def test_columns_env_not_tty_detection(self):
        for env, width in [({}, 78), ({"COLUMNS": "120"}, 118), ({"COLUMNS": "bad"}, 78),
                           ({"COLUMNS": "1"}, 0), ({"COLUMNS": "-1"}, 0)]:
            self.assertEqual(ctx.terminal_width(env), width)

    def test_untrusted_names_cannot_inject_ansi_or_newlines(self):
        data = {**SAMPLE, "model": {"display_name": "Opus\x1b[31m\n\x1b]0;evil\x07"}}
        result = ctx.render(data, "main\n\x1b[2J", 120, False)
        self.assertNotIn("\x1b", result)
        self.assertNotIn("\n", result)
        self.assertNotIn("evil", result)
        self.assertIn("Opus", result)
        data["effort"] = {"level": "high\x1b[2J\n"}
        result = ctx.render(data, None, 120, False)
        self.assertNotIn("\x1b", result)
        self.assertNotIn("\n", result)

    def test_malformed_shapes(self):
        self.assertIn("?/?", ctx.render({"context_window": []}, None, 120, False))
        self.assertIn("no git │ ?", ctx.render({}, None, 120, False))

    def test_git_errors_are_optional(self):
        for error in [FileNotFoundError(), subprocess.TimeoutExpired("git", 0.5)]:
            with patch.object(ctx.subprocess, "run", side_effect=error):
                self.assertIsNone(ctx.git_branch({"cwd": "/work"}))

    def test_git_uses_current_worktree_not_project_dir(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            repo, worktree = root / "main", root / "linked"
            def git(*args):
                return subprocess.run(["git", *map(str, args)], check=True, capture_output=True,
                                      env={**os.environ, "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": os.devnull})
            git("init", "-b", "main", repo)
            git("-C", repo, "-c", "user.name=Test", "-c", "user.email=test@example.invalid",
                "-c", "commit.gpgsign=false", "commit", "--allow-empty", "-m", "test")
            git("-C", repo, "worktree", "add", "-b", "feature", worktree)
            self.assertEqual(ctx.git_branch({"cwd": str(repo), "workspace": {
                "current_dir": str(worktree), "project_dir": str(repo)}}), "feature")
            git("-C", worktree, "checkout", "--detach")
            self.assertEqual(ctx.git_branch({"cwd": str(worktree)}), "HEAD")
            self.assertIsNone(ctx.git_branch({"cwd": str(root)}))

    def test_cli_and_forwarding_use_same_input(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            hook = root / "hook with spaces.sh"
            received = root / "input.json"
            hook.write_text('cat > "$CAPTURE"\nprintf "must not appear"\n')
            payload = json.dumps({**SAMPLE, "workspace": {"current_dir": tmp}})
            result = subprocess.run([sys.executable, str(SCRIPT), "--forward-command", str(hook)],
                                    input=payload, text=True, capture_output=True, check=True,
                                    env={**os.environ, "NO_COLOR": "1", "COLUMNS": "120", "CAPTURE": str(received)})
            self.assertEqual(received.read_text(), payload)
            self.assertIn("no git │ Opus │ CTX:", result.stdout)
            self.assertNotIn("must not appear", result.stdout)
            self.assertNotIn("\x1b", result.stdout)
            self.assertEqual(result.stderr, "")

    def test_forward_failure_and_timeout_are_nonfatal(self):
        for error in [FileNotFoundError(), subprocess.TimeoutExpired("sh", 2)]:
            with patch.object(ctx.subprocess, "run", side_effect=error) as run:
                ctx.forward_payload(Path("fake.sh"), b"{}")
                self.assertEqual(run.call_args.kwargs["timeout"], 2)

    def test_cli_malformed_input_is_quiet(self):
        for payload in ["", "not json", "null", "[]", "{}"]:
            result = subprocess.run([sys.executable, str(SCRIPT)], input=payload, text=True,
                                    capture_output=True, check=True)
            self.assertEqual((result.stdout, result.stderr), ("", ""))


if __name__ == "__main__":
    unittest.main()
