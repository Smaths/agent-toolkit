#!/usr/bin/env python3
"""Check supplied handoff evidence. Never launch, send input, or write files."""

import argparse
import json
from pathlib import Path, PurePosixPath, PureWindowsPath
import sys


PROFILES = {
    "pi": ("provider", "model", "reasoning"),
    "claude": ("model", "reasoning"),
    "codex": ("model", "reasoning"),
}
REQUIRED_CHECKS = (
    "settings", "launch", "prompt", "placement", "handoff_access", "workspace",
)
DELIVERED = {"journaled", "handed-to-terminal"}


def text(value):
    return isinstance(value, str) and bool(value.strip())


def obj(value):
    return value if isinstance(value, dict) else {}


def evidence_status(value):
    value = obj(value)
    status = value.get("status")
    if status in ("supported", "unsupported") and text(value.get("evidence")):
        return status
    return "unknown"


def preflight(record):
    """Classify recorded evidence, not the real host's capabilities."""
    problems = []

    def require(name, status):
        if status != "supported":
            problems.append({"check": name, "status": status})

    agent = record.get("agent")
    profile = PROFILES.get(agent) if isinstance(agent, str) else None
    require("agent_profile", "supported" if profile else "unknown")
    target = obj(record.get("target"))
    require("target.host", "supported" if text(target.get("host")) else "unknown")
    workspace = target.get("workspace")
    absolute = text(workspace) and (PurePosixPath(workspace).is_absolute() or PureWindowsPath(workspace).is_absolute())
    require("target.workspace", "supported" if absolute else "unknown")

    settings = obj(record.get("settings"))
    settings_known = profile is not None
    for field in dict.fromkeys((*(profile or ()), *settings)):
        known = text(settings.get(field))
        require("settings." + field, "supported" if known else "unknown")
        settings_known = settings_known and known

    checks = obj(record.get("checks"))
    for name in dict.fromkeys((*REQUIRED_CHECKS, *checks)):
        require(name, evidence_status(checks.get(name)))
    settings_known = settings_known and evidence_status(checks.get("settings")) == "supported"

    capabilities = record.get("capabilities")
    if not isinstance(capabilities, list):
        require("capabilities_inventory", "unknown")
    else:
        for index, capability in enumerate(capabilities):
            capability = obj(capability)
            name = capability.get("name")
            if not text(name):
                require(f"capability[{index}].name", "unknown")
            require(f"capability[{index}]", evidence_status(capability))

    states = {problem["status"] for problem in problems}
    status = "unsupported" if "unsupported" in states else "unknown" if states else "supported"
    return {
        "status": status,
        "automatic_launch_allowed": status == "supported",
        "manual_settings_known": bool(settings_known),
        "blockers": problems,
    }


def receipt(response):
    """Recognize agent-launch and worktree-create delivery envelopes."""
    result = obj(response.get("result"))
    wrapped = "launch" in result
    launch = obj(result.get("launch")) if wrapped else result
    mixed_shapes = wrapped and any(key in result for key in ("outcome", "prompt"))
    outcome = obj(launch.get("outcome"))
    prompt = obj(launch.get("prompt"))
    error = obj(response.get("error"))
    operation_ids = {
        item.get("operationId")
        for item in (response, result, launch, error, obj(error.get("details")))
        if text(item.get("operationId"))
    }
    operation_id = next(iter(operation_ids)) if len(operation_ids) == 1 else None
    kind = outcome.get("kind")
    handle = outcome.get("handle")
    prompt_outcome = prompt.get("outcome")
    known_kind = kind in ("structured", "terminal")
    known_prompt = isinstance(prompt_outcome, str) and prompt_outcome in DELIVERED
    invalid_success = any(key in response and response[key] is not True for key in ("ok", "success"))
    has_error = invalid_success or bool(response.get("error"))
    delivered = known_kind and text(handle) and known_prompt and not has_error and not mixed_shapes and len(operation_ids) <= 1
    if not text(handle):
        handle = result.get("agentTerminalHandle")
    return {
        "status": "delivered" if delivered else "unconfirmed",
        "handle": handle if text(handle) else None,
        "kind": kind if known_kind else None,
        "prompt_outcome": prompt_outcome if isinstance(prompt_outcome, str) else None,
        "operation_id": operation_id,
        "conflicting_operation_ids": len(operation_ids) > 1,
        "mixed_receipt_shapes": mixed_shapes,
        "receiver_verified": False,
        "recovery": "none" if delivered else "follow-replay-guide" if operation_id else "inspect-without-input",
    }


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON key")
        result[key] = value
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("preflight", "receipt"))
    parser.add_argument("input", help="JSON file, or - for standard input")
    args = parser.parse_args()
    try:
        content = sys.stdin.read() if args.input == "-" else Path(args.input).read_text()
        record = json.loads(content, object_pairs_hook=unique_object)
        if not isinstance(record, dict):
            raise ValueError("Expected a JSON object")
    except (OSError, UnicodeError, ValueError):
        # Do not echo input or parser excerpts: receipts may contain secret values.
        print(json.dumps({"error": "Cannot read a JSON object; no launch or delivery is established."}))
        return 2
    result = preflight(record) if args.mode == "preflight" else receipt(record)
    print(json.dumps(result, indent=2))
    passed = result.get("automatic_launch_allowed") if args.mode == "preflight" else result["status"] == "delivered"
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
