from __future__ import annotations

import copy
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


TESTKIT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TESTKIT / "lib"))

import policy  # noqa: E402


def load_fixture(name: str) -> dict[str, object]:
    with (TESTKIT / "fixtures" / name).open("r", encoding="utf-8") as handle:
        value = json.load(handle)
    assert isinstance(value, dict)
    return value


def codes(result: dict[str, object]) -> set[str]:
    return {entry["code"] for entry in result["errors"]}  # type: ignore[index]


class MakepadSecurityPolicyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.policy = policy.load_policy(TESTKIT / "policy-v1.json")

    def validate(self, fixture: dict[str, object]) -> dict[str, object]:
        return policy.validate_envelope(fixture, self.policy)

    def test_positive_markdown_and_mermaid_fixtures_pass(self) -> None:
        for fixture_name in ("positive-safe-markdown.json", "positive-safe-mermaid.json"):
            with self.subTest(fixture=fixture_name):
                result = self.validate(load_fixture(fixture_name))
                self.assertEqual(result["verdict"], "PASS", result["errors"])
                self.assertEqual(result["errors"], [])

    def test_negative_fixtures_block_with_expected_codes(self) -> None:
        for fixture_path in sorted((TESTKIT / "fixtures").glob("reject-*.json")):
            with self.subTest(fixture=fixture_path.name):
                fixture = load_fixture(fixture_path.name)
                result = self.validate(fixture)
                expected = fixture["expect"]  # type: ignore[index]
                self.assertEqual(result["verdict"], expected["verdict"], result["errors"])  # type: ignore[index]
                self.assertTrue(set(expected["codes"]).issubset(codes(result)))  # type: ignore[index]

    def test_entity_encoded_and_percent_obfuscated_schemes_fail_closed(self) -> None:
        base = load_fixture("positive-safe-markdown.json")
        bad_urls = [
            "java&#x73;cript:alert(1)",
            "&#x6a;avascript:alert(1)",
            "data&colon;text/html,<svg>",
            "ftp://example.test/file",
            "mailto:security@example.test",
            "//example.test/protocol-relative",
            "java%73cript:alert(1)",
            "https://user:pass@example.test/",
            "https://example.test/has space",
            "file:///private/tmp/payload",
        ]
        for index, bad_url in enumerate(bad_urls):
            with self.subTest(url=bad_url):
                fixture = copy.deepcopy(base)
                fixture["case_id"] = f"FUZZ-URL-{index}"
                fixture["input"]["text"] = f"[bad]({bad_url})"  # type: ignore[index]
                fixture["input"]["declared_byte_length"] = len(fixture["input"]["text"].encode("utf-8"))  # type: ignore[index, union-attr]
                fixture["safe_ir"]["links"] = [bad_url]  # type: ignore[index]
                fixture["broker_requests"][0]["url"] = bad_url  # type: ignore[index]
                result = self.validate(fixture)
                self.assertEqual(result["verdict"], "BLOCKED")
                self.assertTrue(codes(result) & {"URL_SCHEME", "URL_ENTITY_ENCODED_SCHEME", "URL_PROTOCOL_RELATIVE", "URL_RELATIVE", "URL_CREDENTIALS", "URL_WHITESPACE"})

    def test_executable_content_fuzz_corpus_fails_closed(self) -> None:
        base = load_fixture("positive-safe-markdown.json")
        corpus = [
            "<script>alert(1)</script>",
            "&lt;img src=x onerror=alert(1)&gt;",
            "```javascript\ndocument.querySelector('x')\n```",
            "live_design! { App = {{Root}} }",
            "script_mod! { fn main(){} }",
            "```runsplash\nreturn 1\n```",
            "<svg><foreignObject></foreignObject></svg>",
            "shader: fn pixel(self) -> vec4 { return #f00; }",
        ]
        for index, payload in enumerate(corpus):
            with self.subTest(payload=payload):
                fixture = copy.deepcopy(base)
                fixture["case_id"] = f"FUZZ-CONTENT-{index}"
                fixture["input"]["text"] = payload  # type: ignore[index]
                fixture["input"]["declared_byte_length"] = len(payload.encode("utf-8"))  # type: ignore[index]
                fixture["safe_ir"]["links"] = []  # type: ignore[index]
                fixture["broker_requests"] = []
                result = self.validate(fixture)
                self.assertEqual(result["verdict"], "BLOCKED")

    def test_resource_limits_timeout_cancel_generation_and_ui_io_reject(self) -> None:
        fixture = load_fixture("positive-safe-mermaid.json")
        fixture["safe_ir"]["node_count"] = 261  # type: ignore[index]
        fixture["safe_ir"]["max_depth"] = 65  # type: ignore[index]
        fixture["task"]["generation"] = 1  # type: ignore[index]
        fixture["task"]["active_generation"] = 2  # type: ignore[index]
        fixture["task"]["cancelled"] = True  # type: ignore[index]
        fixture["task"]["timed_out"] = True  # type: ignore[index]
        fixture["runtime_constraints"]["ui_thread_sync_io_operations"] = 1  # type: ignore[index]
        result = self.validate(fixture)
        self.assertEqual(result["verdict"], "BLOCKED")
        self.assertTrue({"SAFE_IR_NODE_LIMIT", "SAFE_IR_DEPTH_LIMIT", "GENERATION_STALE", "TASK_CANCELLED", "TASK_TIMED_OUT", "UI_THREAD_SYNC_IO"}.issubset(codes(result)))

    def test_path_traversal_and_remote_resources_reject(self) -> None:
        fixture = load_fixture("positive-safe-markdown.json")
        fixture["resources"] = [
            {"kind": "file", "path": "../escape.svg"},
            {"kind": "network", "url": "https://example.com/remote.svg"},
            {"kind": "inline_text", "path": "/absolute/path"},
        ]
        result = self.validate(fixture)
        self.assertEqual(result["verdict"], "BLOCKED")
        self.assertTrue({"RESOURCE_KIND", "PATH_TRAVERSAL", "REMOTE_RESOURCE"}.issubset(codes(result)))

    def test_fixture_reader_rejects_symlink_without_following_it(self) -> None:
        if not hasattr(os, "symlink"):
            self.skipTest("symlink unavailable")
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / "target.json"
            target.write_text(json.dumps(load_fixture("positive-safe-markdown.json")), encoding="utf-8")
            link = root / "link.json"
            os.symlink(target, link)
            result = policy.validate_fixture_path(link, self.policy)
            self.assertEqual(result["verdict"], "BLOCKED")
            self.assertIn("SYMLINK_ESCAPE", codes(result))

    def test_cli_checks_all_fixture_expectations(self) -> None:
        static_result = policy.validate_static_source(self.policy, TESTKIT.parents[2])
        self.assertEqual(static_result["verdict"], "PASS", static_result["errors"])
        self.assertIn("native/crates/tessera-gallery/src/app.rs", static_result["production_files"])

    def test_static_allowlist_cli_is_fail_closed(self) -> None:
        completed = subprocess.run(
            [
                sys.executable,
                "-B",
                str(TESTKIT / "bin" / "validate-makepad-security"),
                "--policy",
                str(TESTKIT / "policy-v1.json"),
                "--source-root",
                str(TESTKIT.parents[2]),
            ],
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=10,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertEqual(json.loads(completed.stdout)["verdict"], "PASS")
        completed = subprocess.run(
            [
                sys.executable,
                "-B",
                str(TESTKIT / "bin" / "validate-makepad-security"),
                "--policy",
                str(TESTKIT / "policy-v1.json"),
                "--fixtures-dir",
                str(TESTKIT / "fixtures"),
                "--check-expectations",
            ],
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=10,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        summary = json.loads(completed.stdout)
        self.assertEqual(summary["expectation_failures"], [])
        self.assertEqual(summary["checked"], len(list((TESTKIT / "fixtures").glob("*.json"))))


if __name__ == "__main__":
    unittest.main()
