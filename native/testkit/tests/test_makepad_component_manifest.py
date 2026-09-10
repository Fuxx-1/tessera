from __future__ import annotations

import json
import os
import subprocess
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path


TESTKIT = Path(__file__).resolve().parents[1]
REPO_ROOT = TESTKIT.parent.parent
VALIDATOR = TESTKIT / "bin" / "validate-makepad-component-manifest"
MANIFEST = TESTKIT / "makepad-component-manifest-v1.json"
FIXTURES = TESTKIT / "fixtures" / "makepad-component-manifest-negative-fixtures.json"


def run_validator(manifest_path: Path) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    return subprocess.run(
        [os.environ.get("PYTHON", "python3"), "-B", str(VALIDATOR), str(manifest_path), "--repo-root", str(REPO_ROOT)],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        env=env,
        check=False,
    )


def load_manifest() -> dict[str, object]:
    return json.loads(MANIFEST.read_text(encoding="utf-8"))


def write_manifest_temp(payload: dict[str, object]) -> Path:
    temp_dir = Path(tempfile.mkdtemp(prefix="makepad-manifest-test-"))
    manifest_path = temp_dir / "manifest.json"
    manifest_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return manifest_path


class MakepadComponentManifestTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.base_manifest = load_manifest()
        cls.fixtures = json.loads(FIXTURES.read_text(encoding="utf-8"))["cases"]

    def test_manifest_passes_validator(self) -> None:
        result = run_validator(MANIFEST)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("manifest_valid=true", result.stdout)
        self.assertEqual(result.stderr.strip(), "")

    def test_manifest_has_exact_inventory_and_fail_closed_defaults(self) -> None:
        components = self.base_manifest["components"]
        self.assertEqual(self.base_manifest["component_count"], 101)
        self.assertEqual(self.base_manifest["category_counts"], {"Base": 75, "Business": 11, "Charts": 15})
        self.assertEqual(len(components), 101)
        self.assertEqual({component["status"] for component in components}, {"blocked"})
        self.assertEqual({component["strategy"] for component in components}, {"deferred"})
        self.assertTrue(all(not component["evidence_refs"] for component in components))
        required = {
            "id", "category", "kind", "strategy", "status", "source_ref",
            "owner", "implementation", "case_ids", "evidence_refs", "constraints",
        }
        self.assertTrue(all(required <= set(component) for component in components))

    def test_validator_rejects_negative_fixtures(self) -> None:
        for case in self.fixtures:
            with self.subTest(case=case["id"]):
                payload = deepcopy(self.base_manifest)
                components = payload["components"]
                assert isinstance(components, list)
                if case["id"] == "missing-component":
                    components.pop()
                elif case["id"] == "duplicate-component":
                    components.append(deepcopy(components[0]))
                elif case["id"] == "extra-component":
                    extra = deepcopy(components[0])
                    extra["id"] = "generic-fallback"
                    extra["source_ref"] = "design/02-base/01-general.md#Button"
                    components.append(extra)
                elif case["id"] == "unsealed-verified":
                    components[0]["status"] = "verified"
                    components[0]["strategy"] = "native-direct"
                    components[0]["case_ids"] = ["case-button"]
                    components[0]["evidence_refs"] = [
                        {
                            "revision": "a" * 40,
                            "binary_sha256": "b" * 64,
                            "ledger_sha256": "c" * 64,
                            "sealed": False,
                        }
                    ]
                elif case["id"] == "old-iced-path":
                    components[0]["implementation"]["rust"] = "native/crates/tessera-iced/src/button.rs"
                elif case["id"] == "bad-hash":
                    components[0]["status"] = "verified"
                    components[0]["strategy"] = "native-direct"
                    components[0]["case_ids"] = ["case-button"]
                    components[0]["evidence_refs"] = [
                        {
                            "revision": "a" * 40,
                            "binary_sha256": "not-a-hash",
                            "ledger_sha256": "c" * 64,
                            "sealed": True,
                        }
                    ]
                elif case["id"] == "component-preview-path":
                    components[0]["implementation"]["rust"] = "planned:native/crates/tessera-makepad/src/components/component_preview.rs"
                elif case["id"] == "invalid-state-transition":
                    components[0]["status"] = "planned"
                    components[0]["strategy"] = "deferred"
                else:
                    self.fail(f"unknown fixture case {case['id']}")

                manifest_path = write_manifest_temp(payload)
                result = run_validator(manifest_path)
                self.assertNotEqual(result.returncode, 0)
                for expected in case["expected_codes"]:
                    self.assertIn(expected, result.stderr)


if __name__ == "__main__":
    unittest.main()
