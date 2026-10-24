"""Offline decision tests. No agents, network calls, or installed-state writes."""

from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import unittest

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/check_handoff.py"
SPEC = importlib.util.spec_from_file_location("check_handoff", SCRIPT)
checker = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(checker)
FIXTURES = json.loads((ROOT / "tests/fixtures/scenarios.json").read_text())


def record(agent):
    return {
        **deepcopy(agent),
        "target": {"host": "fixture-host", "workspace": "/fixture/workspace"},
        "checks": deepcopy(FIXTURES["checks"]),
        "capabilities": [],
    }


class PreflightTests(unittest.TestCase):
    def test_all_profiles_with_supported_evidence(self):
        for agent in FIXTURES["agents"]:
            with self.subTest(agent=agent["agent"]):
                result = checker.preflight(record(agent))
                self.assertEqual(result["status"], "supported")
                self.assertTrue(result["automatic_launch_allowed"])
                self.assertTrue(result["manual_settings_known"])
                self.assertEqual(result["blockers"], [])

    def test_blocking_scenarios_for_each_agent(self):
        for agent in FIXTURES["agents"]:
            for case in FIXTURES["preflight_cases"]:
                with self.subTest(agent=agent["agent"], case=case["name"]):
                    value = record(agent)
                    value["checks"][case["check"]]["status"] = case["status"]
                    result = checker.preflight(value)
                    self.assertEqual(result["status"], case["expected"])
                    self.assertFalse(result["automatic_launch_allowed"])
                    self.assertEqual(result["manual_settings_known"], case["manual_settings_known"])

    def test_missing_required_settings(self):
        for agent in FIXTURES["agents"]:
            for field in agent["settings"]:
                for missing in (None, "", " ", [], False):
                    with self.subTest(agent=agent["agent"], field=field, missing=missing):
                        value = record(agent)
                        value["settings"][field] = missing
                        result = checker.preflight(value)
                        self.assertEqual(result["status"], "unknown")
                        self.assertFalse(result["manual_settings_known"])
                        self.assertFalse(result["automatic_launch_allowed"])

    def test_missing_checks_or_evidence_never_pass(self):
        for name in FIXTURES["checks"]:
            for replacement in (None, {}, {"status": "supported"}, {"status": "supported", "evidence": " "}):
                with self.subTest(check=name, replacement=replacement):
                    value = record(FIXTURES["agents"][0])
                    value["checks"][name] = replacement
                    result = checker.preflight(value)
                    self.assertEqual(result["status"], "unknown")
                    self.assertFalse(result["automatic_launch_allowed"])

    def test_critical_capabilities_for_each_agent(self):
        for agent in FIXTURES["agents"]:
            for status in ("supported", "unknown", "unsupported"):
                with self.subTest(agent=agent["agent"], status=status):
                    value = record(agent)
                    value["capabilities"] = [{"name": "MCP fixture read tool", "status": status, "evidence": "Fixture availability evidence"}]
                    result = checker.preflight(value)
                    self.assertEqual(result["status"], status)
                    self.assertEqual(result["automatic_launch_allowed"], status == "supported")

    def test_inventory_must_be_explicit(self):
        for inventory in (None, {}, "", [None], [{"status": "supported", "evidence": "fixture"}]):
            value = record(FIXTURES["agents"][0])
            value["capabilities"] = inventory
            self.assertFalse(checker.preflight(value)["automatic_launch_allowed"])

    def test_extra_backend_settings_and_checks_are_not_ignored(self):
        value = record(FIXTURES["agents"][1])
        value["settings"]["backend"] = None
        self.assertFalse(checker.preflight(value)["automatic_launch_allowed"])
        value["settings"]["backend"] = "fixture-backend"
        value["checks"]["backend_access"] = {"status": "unsupported", "evidence": "Fixture: no access"}
        self.assertEqual(checker.preflight(value)["status"], "unsupported")

    def test_workspace_must_be_absolute_on_the_target_platform(self):
        for workspace, allowed in (("relative/project", False), ("~/project", False), ("/srv/project", True), ("C:\\work\\project", True)):
            value = record(FIXTURES["agents"][0])
            value["target"]["workspace"] = workspace
            self.assertEqual(checker.preflight(value)["automatic_launch_allowed"], allowed)

    def test_unknown_profiles_and_target(self):
        for agent in ("other", None, []):
            value = record(FIXTURES["agents"][0])
            value["agent"] = agent
            self.assertEqual(checker.preflight(value)["status"], "unknown")
        for field in ("host", "workspace"):
            value = record(FIXTURES["agents"][0])
            del value["target"][field]
            self.assertFalse(checker.preflight(value)["automatic_launch_allowed"])


class ReceiptTests(unittest.TestCase):
    def test_sanitized_live_agent_launch_receipts(self):
        fixtures = json.loads((ROOT / "tests/fixtures/live-orca-1.4.232.json").read_text())
        for case in fixtures["cases"]:
            with self.subTest(case=case["name"]):
                result = checker.receipt(case["input"])
                self.assertEqual(result["status"], case["expected_status"])
                self.assertEqual(result["handle"], case["expected_handle"])
                self.assertFalse(result["receiver_verified"])
                self.assertFalse(result["mixed_receipt_shapes"])

    def test_direct_envelopes_do_not_bypass_delivery_checks(self):
        for case in FIXTURES["receipts"]:
            response = deepcopy(case["input"])
            wrapped = response.get("result", {}).pop("launch", None)
            if wrapped is None:
                continue
            response["result"].update(wrapped)
            with self.subTest(case=case["name"]):
                result = checker.receipt(response)
                self.assertEqual(result["status"], case["status"])
                self.assertEqual(result["recovery"], case["recovery"])

    def test_mixed_envelopes_fail_closed(self):
        for wrapped in ({}, None, deepcopy(FIXTURES["receipts"][0]["input"]["result"]["launch"])):
            response = deepcopy(FIXTURES["receipts"][0]["input"])
            direct = response["result"].pop("launch")
            response["result"].update(direct)
            response["result"]["launch"] = wrapped
            result = checker.receipt(response)
            self.assertEqual(result["status"], "unconfirmed")
            self.assertTrue(result["mixed_receipt_shapes"])

    def test_receipt_scenarios_for_each_agent(self):
        for agent in FIXTURES["agents"]:
            for case in FIXTURES["receipts"]:
                with self.subTest(agent=agent["agent"], case=case["name"]):
                    response = deepcopy(case["input"])
                    response["agent"] = agent["agent"]
                    result = checker.receipt(response)
                    for key in ("status", "recovery", "operation_id"):
                        self.assertEqual(result[key], case[key])
                    self.assertFalse(result["receiver_verified"])
                    self.assertNotIn("confirmed_settings", result)
                    self.assertNotIn("close_command", result)
                    self.assertNotIn("launch_command", result)

    def test_unknown_shapes_fail_closed(self):
        for value in (None, [], "future-format", 42):
            for response in ({"result": value}, {"result": {"launch": value}}):
                self.assertEqual(checker.receipt(response)["status"], "unconfirmed")
        for field in ("kind", "handle"):
            response = deepcopy(FIXTURES["receipts"][0]["input"])
            response["result"]["launch"]["outcome"][field] = ["wrong-type"]
            self.assertEqual(checker.receipt(response)["status"], "unconfirmed")
        response = deepcopy(FIXTURES["receipts"][0]["input"])
        response["result"]["launch"]["prompt"]["outcome"] = ["journaled"]
        self.assertEqual(checker.receipt(response)["status"], "unconfirmed")

    def test_malformed_success_flags_cannot_confirm_delivery(self):
        for key in ("ok", "success"):
            for value in (False, 0, 1, None, "false", [], {}):
                with self.subTest(key=key, value=value):
                    response = deepcopy(FIXTURES["receipts"][0]["input"])
                    response[key] = value
                    self.assertEqual(checker.receipt(response)["status"], "unconfirmed")

    def test_partial_handles_are_preserved_without_delivery_claim(self):
        value = {"result": {"agentTerminalHandle": "terminal:legacy"}}
        result = checker.receipt(value)
        self.assertEqual(result["handle"], "terminal:legacy")
        self.assertEqual(result["status"], "unconfirmed")
        self.assertIsNone(result["kind"])

    def test_unknown_prompt_outcome_is_not_delivery(self):
        for outcome in ("queued", "accepted", "future-status", "failed"):
            response = deepcopy(FIXTURES["receipts"][0]["input"])
            response["result"]["launch"]["prompt"]["outcome"] = outcome
            self.assertEqual(checker.receipt(response)["status"], "unconfirmed")

    def test_cleanup_request_does_not_authorize_actions(self):
        for case in FIXTURES["receipts"]:
            response = deepcopy(case["input"])
            expected = checker.receipt(response)
            response["cleanup"] = {
                "requested": True,
                "source_kind": "structured",
                "source_handle": "chat:source",
                "close_all": True,
            }
            self.assertEqual(checker.receipt(response), expected)

    def test_raw_output_and_requested_settings_are_not_confirmation(self):
        response = deepcopy(FIXTURES["receipts"][0]["input"])
        response["settings"] = {"model": "requested-only"}
        response["debug"] = "fixture-secret-do-not-echo"
        response["result"]["launch"]["receipt"] = {"detail": "fixture-secret-do-not-echo"}
        result = checker.receipt(response)
        self.assertNotIn("fixture-secret-do-not-echo", json.dumps(result))
        self.assertNotIn("requested-only", json.dumps(result))


class CliTests(unittest.TestCase):
    def run_checker(self, mode, content):
        return subprocess.run(
            [sys.executable, "-B", str(SCRIPT), mode, "-"],
            input=content, capture_output=True, text=True, timeout=5,
        )

    def test_success_and_blocked_exit_codes(self):
        cases = [
            ("preflight", record(FIXTURES["agents"][0]), 0),
            ("preflight", {}, 1),
            ("receipt", FIXTURES["receipts"][0]["input"], 0),
            ("receipt", {}, 1),
        ]
        for mode, value, code in cases:
            with self.subTest(mode=mode, code=code):
                result = self.run_checker(mode, json.dumps(value))
                self.assertEqual(result.returncode, code, result.stderr)
                self.assertIsInstance(json.loads(result.stdout), dict)
                self.assertEqual(result.stderr, "")

    def test_invalid_input_is_not_echoed(self):
        for content in ('{"secret":"fixture-secret",', "[]", "null", '{"result": {}, "result": {}}'):
            result = self.run_checker("receipt", content)
            self.assertEqual(result.returncode, 2)
            self.assertNotIn("fixture-secret", result.stdout + result.stderr)
            self.assertEqual(result.stderr, "")

    def test_missing_file_is_a_read_error(self):
        result = subprocess.run(
            [sys.executable, "-B", str(SCRIPT), "preflight", str(ROOT / "tests/absent.json")],
            capture_output=True, text=True, timeout=5,
        )
        self.assertEqual(result.returncode, 2)
        self.assertEqual(result.stderr, "")


if __name__ == "__main__":
    unittest.main()
