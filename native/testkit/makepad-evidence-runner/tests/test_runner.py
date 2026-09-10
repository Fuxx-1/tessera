from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIB = ROOT / "lib"
sys.path.insert(0, str(LIB))

from makepad_evidence_runner import (  # noqa: E402
    RunnerError,
    capture_metadata,
    hash_artifacts,
    load_manifest,
    probe_platform_capabilities,
    reserve_run,
    seal_run,
    validate_record,
)


REVISION = "80a9f7a7bf182c8a1043497b52032d281eb35748"
BINARY_BYTES = b"untrusted test binary placeholder\n"
BINARY_SHA256 = __import__("hashlib").sha256(BINARY_BYTES).hexdigest()
BUILD_KEY_SHA256 = "1" * 64
MANIFEST = ROOT / "matrix-manifest-v1.json"


class MakepadEvidenceRunnerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.evidence_root = Path(self.temp_dir.name) / "evidence"
        self.evidence_root.mkdir()
        self.manifest = load_manifest(MANIFEST)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def reserve(self, run_id: str = "RUN-20260826T000000Z-80a9f7a7-000", ordinal: int = 0) -> Path:
        reservation = reserve_run(
            revision=REVISION,
            run_id=run_id,
            manifest_path=MANIFEST,
            evidence_root=self.evidence_root,
            cell_id="MAKEPAD-M0-SHELL-DESKTOP-LIGHT",
            binary_sha256=BINARY_SHA256,
            build_key_sha256=BUILD_KEY_SHA256,
            ordinal=ordinal,
        )
        run_root = Path(reservation["run"]["root"])
        (run_root / "artifacts" / "binary.bin").write_bytes(BINARY_BYTES)
        return run_root

    def complete_blocked_run(self, run_id: str = "RUN-20260826T000000Z-80a9f7a7-000") -> tuple[Path, dict[str, object]]:
        run_root = self.reserve(run_id)
        capture_metadata(run_root, capture_source="state_only", execution_status="BLOCKED")
        index = hash_artifacts(run_root)
        self.assertEqual(index["real_artifact_count"], 0)
        record = seal_run(run_root)
        return run_root, record

    def test_manifest_binds_fixture_bytes_and_explicit_matrix_axes(self) -> None:
        self.assertEqual(self.manifest["schema_version"], "tessera/makepad-evidence-matrix/v1")
        self.assertGreaterEqual(len(self.manifest["cells"]), 12)
        self.assertEqual({cell["theme"] for cell in self.manifest["cells"]}, {"light", "dark"})
        self.assertIn("android", {cell["platform"] for cell in self.manifest["cells"]})
        self.assertIn("ios", {cell["platform"] for cell in self.manifest["cells"]})
        self.assertEqual(
            {cell["case_id"] for cell in self.manifest["cells"]},
            {
                "SHELL",
                "BUTTON",
                "TEXTINPUT-CJK-IME",
                "CHECKBOX-SWITCH",
                "MODAL-POPOVER",
                "DATAGRID-VISIBLE",
                "LINECHART-10K",
                "MARKDOWN-REJECT",
                "MERMAID-CUBIC3",
                "ANDROID-INSTALL",
                "IOS-INSTALL",
                "AX-BRIDGE",
            },
        )
        for fixture in self.manifest["fixtures"]:
            self.assertEqual(fixture["sha256"], fixture["source_sha256"])

    def test_path_traversal_is_rejected(self) -> None:
        with self.assertRaisesRegex(RunnerError, "MANIFEST_PATH"):
            load_manifest(self._manifest_with_fixture_path("../escape.json"))

    def test_missing_artifact_seals_blocked_and_validation_rejects(self) -> None:
        run_root = self.reserve()
        capture_metadata(run_root, capture_source="state_only", execution_status="BLOCKED")
        hash_artifacts(run_root)
        record = seal_run(run_root)
        self.assertEqual(record["outcome"], "BLOCKED")
        result = validate_record(record, load_manifest(run_root / "manifest.snapshot.json"), run_root, self.evidence_root)
        codes = {entry["code"] for entry in result["errors"]}
        self.assertFalse(result["evidence_valid"])
        self.assertIn("OUTCOME_BLOCKED", codes)
        self.assertIn("SYNTHETIC_EVIDENCE", codes)
        self.assertNotIn("MATRIX_BINDING_MISMATCH", codes)

    def test_hash_mismatch_is_rejected(self) -> None:
        run_root, record = self.complete_blocked_run()
        self.assertEqual(record["outcome"], "BLOCKED")
        artifact = run_root / "artifacts" / "binary.bin"
        artifact.write_bytes(b"tampered\n")
        result = validate_record(record, load_manifest(run_root / "manifest.snapshot.json"), run_root, self.evidence_root)
        codes = {entry["code"] for entry in result["errors"]}
        self.assertIn("HASH_MISMATCH", codes)
        self.assertFalse(result["evidence_valid"])

    def test_state_only_and_synthetic_evidence_never_pass(self) -> None:
        for source in ("state_only", "synthetic"):
            with self.subTest(source=source):
                run_id = {
                    "state_only": "RUN-20260826T000010Z-80a9f7a7-000",
                    "synthetic": "RUN-20260826T000011Z-80a9f7a7-000",
                }[source]
                run_root = self.reserve(run_id)
                capture_metadata(run_root, capture_source=source, execution_status="PASS")
                hash_artifacts(run_root)
                record = seal_run(run_root)
                self.assertEqual(record["outcome"], "BLOCKED")
                result = validate_record(record, load_manifest(run_root / "manifest.snapshot.json"), run_root, self.evidence_root)
                self.assertFalse(result["evidence_valid"])
                self.assertIn("SYNTHETIC_EVIDENCE", {entry["code"] for entry in result["errors"]})

    def test_duplicate_ordinal_is_rejected(self) -> None:
        first_root, first = self.complete_blocked_run()
        self.assertEqual(first["outcome"], "BLOCKED")
        second_root = self.reserve("RUN-20260826T000001Z-80a9f7a7-001", ordinal=0)
        capture_metadata(second_root, capture_source="state_only", execution_status="BLOCKED")
        hash_artifacts(second_root)
        second = seal_run(second_root)
        result = validate_record(second, load_manifest(second_root / "manifest.snapshot.json"), second_root, self.evidence_root)
        self.assertIn("DUPLICATE_ORDINAL", {entry["code"] for entry in result["errors"]})

    def test_sealed_run_cannot_be_overwritten(self) -> None:
        run_root, _ = self.complete_blocked_run()
        with self.assertRaisesRegex(RunnerError, "RUN_ALREADY_SEALED"):
            seal_run(run_root)

    def test_platform_probe_reports_unverified_capabilities(self) -> None:
        probe = probe_platform_capabilities()
        self.assertEqual(probe["schema_version"], "tessera/makepad-capability-probe/v1")
        self.assertEqual(probe["capabilities"]["accessibility"]["status"], "blocked")
        self.assertEqual(probe["capabilities"]["ime"]["status"], "blocked")
        self.assertEqual(probe["capabilities"]["mobile_runtime"]["status"], "blocked")
        self.assertEqual(probe["platforms"]["android"]["status"], "blocked")
        self.assertEqual(probe["platforms"]["ios"]["status"], "blocked")

    def test_runtime_capture_without_trusted_attestation_stays_blocked(self) -> None:
        run_root = self.reserve()
        capture_metadata(run_root, capture_source="runtime_capture", execution_status="PASS")
        (run_root / "artifacts" / "screenshot.png").write_bytes(b"not-a-real-screenshot")
        hash_artifacts(run_root)
        record = seal_run(run_root)
        self.assertEqual(record["outcome"], "BLOCKED")
        self.assertIn("capture_attestation:missing_or_invalid", record["capture"]["metadata"]["blockers"])
        validation = validate_record(record, load_manifest(run_root / "manifest.snapshot.json"), run_root, self.evidence_root)
        self.assertIn("CAPTURE_ATTESTATION_UNVERIFIED", {entry["code"] for entry in validation["errors"]})

    def _manifest_with_fixture_path(self, relative_path: str) -> Path:
        value = json.loads(MANIFEST.read_text(encoding="utf-8"))
        value["fixtures"][0]["relative_path"] = relative_path
        path = Path(self.temp_dir.name) / "bad-manifest.json"
        path.write_text(json.dumps(value), encoding="utf-8")
        return path


if __name__ == "__main__":
    unittest.main(verbosity=2)
