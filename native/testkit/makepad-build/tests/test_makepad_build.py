from __future__ import annotations

import sys
import os
import hashlib
import json
import plistlib
import subprocess
import tempfile
import unittest
from unittest import mock
from pathlib import Path

TEST_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TEST_ROOT / "lib"))

from makepad_build import (  # noqa: E402
    BuildContractError,
    ValidationError,
    LeaseBusy,
    LeaseFenced,
    ManagedRoots,
    acquire_lease,
    artifact_descriptor,
    build_key,
    check_reusable_result,
    collect_volume_info,
    gc_dry_run,
    heartbeat_lease,
    ledger_path_for_key,
    managed_lease_path,
    managed_target_dir,
    new_ledger,
    publish_ledger,
    publish_build_result,
    preflight_build,
    seal_ledger,
    transition_ledger,
    validate_ledger,
    validate_managed_path,
    write_rebuildable_marker,
)


class CanonicalKeyTests(unittest.TestCase):
    def test_order_duplicates_and_repo_paths_do_not_change_key(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            roots = ManagedRoots.fixture(root / "managed")
            repo = root / "source"
            base = {
                "authority": "tessera-makepad",
                "namespace": "production",
                "source_revision": "A" * 40,
                "toolchain": "rust-1.88.0",
                "host": "darwin-arm64",
                "target": ["aarch64-apple-darwin", "aarch64-apple-darwin"],
                "profile": "release",
                "features": ["gpu", "default", "gpu"],
                "renderer": "makepad",
                "backend": "metal",
                "lockfile_sha256": "B" * 64,
                "commands": [["cargo", "build", str(repo / "native" / "Cargo.toml")]],
                "environment": [{"name": "CARGO_BUILD_JOBS", "value": "2"}],
                "manifest_path": str(repo / "native" / "Cargo.toml"),
            }
            alternate = dict(base)
            alternate["target"] = "aarch64-apple-darwin"
            alternate["features"] = ["default", "gpu"]
            alternate["environment"] = {"CARGO_BUILD_JOBS": "2"}
            first = build_key(base, repo_root=repo, roots=roots)
            second = build_key(alternate, repo_root=repo, roots=roots)
            self.assertEqual(first[0], second[0])
            self.assertEqual(first[1], second[1])
            self.assertEqual(first[2], second[2])
            self.assertEqual(first[0]["manifest_path"], "$REPO/native/Cargo.toml")

    def test_unsafe_paths_and_shell_commands_are_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            roots = ManagedRoots.fixture(Path(temporary) / "managed")
            base = {
                "authority": "tessera-makepad",
                "namespace": "production",
                "source_revision": "a" * 40,
                "toolchain": "rust-1.88.0",
                "host": "darwin-arm64",
                "target": "aarch64-apple-darwin",
                "profile": "release",
                "features": [],
                "renderer": "makepad",
                "backend": "metal",
                "lockfile_sha256": "b" * 64,
                "commands": [["cargo", "build"]],
                "environment": {"CARGO_BUILD_JOBS": "2"},
            }
            with self.assertRaises(BuildContractError):
                build_key({**base, "commands": "cargo build"}, roots=roots)
            with self.assertRaises(BuildContractError):
                build_key({**base, "target_dir": "/private/tmp/target"}, roots=roots)
            with self.assertRaises(BuildContractError):
                validate_managed_path(roots.cache_root / ".." / "outside", roots.cache_root)


class LeaseTests(unittest.TestCase):
    def test_exclusive_acquire_and_fencing(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            roots = ManagedRoots.fixture(Path(temporary) / "managed")
            key, _encoded, digest = build_key(
                {
                    "authority": "tessera-makepad",
                    "namespace": "production",
                    "source_revision": "a" * 40,
                    "toolchain": "rust-1.88.0",
                    "host": "darwin-arm64",
                    "target": "aarch64-apple-darwin",
                    "profile": "release",
                    "features": [],
                    "renderer": "makepad",
                    "backend": "metal",
                    "lockfile_sha256": "b" * 64,
                    "commands": [["cargo", "build"]],
                    "environment": {"CARGO_BUILD_JOBS": "2"},
                },
                roots=roots,
            )
            lease_path = managed_lease_path(key, digest, roots)
            first = acquire_lease(
                lease_path,
                key_sha256=digest,
                source_revision=key["source_revision"],
                writer_session="session-one",
                pid=4242,
                process_start_token="test-start-one",
                host_id="test-host",
                now=1000,
            )
            with self.assertRaises(LeaseBusy):
                acquire_lease(
                    lease_path,
                    key_sha256=digest,
                    source_revision=key["source_revision"],
                    writer_session="session-two",
                    pid=4243,
                    process_start_token="test-start-two",
                    host_id="test-host",
                    now=1001,
                    process_checker=lambda _record: True,
                )
            renewed = heartbeat_lease(
                lease_path,
                first,
                now=1005,
                verify_process=False,
            )
            self.assertGreater(renewed["expires_at"], first["expires_at"])
            wrong = dict(first)
            wrong["lease_id"] = "0" * 64
            with self.assertRaises(LeaseFenced):
                heartbeat_lease(lease_path, wrong, now=1006, verify_process=False)


class LedgerTests(unittest.TestCase):
    def test_sealed_ledger_rechecks_artifact_hash(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            roots = ManagedRoots.fixture(Path(temporary) / "managed")
            raw = {
                "authority": "tessera-makepad",
                "namespace": "production",
                "source_revision": "c" * 40,
                "toolchain": "rust-1.88.0",
                "host": "darwin-arm64",
                "target": "aarch64-apple-darwin",
                "profile": "release",
                "features": [],
                "renderer": "makepad",
                "backend": "metal",
                "lockfile_sha256": "d" * 64,
                "commands": [["cargo", "build", "--locked"]],
                "environment": {"CARGO_BUILD_JOBS": "2"},
            }
            key = build_key(raw, roots=roots)
            target = Path(roots.cache_root) / "tessera-makepad" / ("c" * 40) / "release" / key[2] / "target"
            target.mkdir(parents=True)
            binary = target / "app"
            binary.write_bytes(b"small fixture")
            artifact = artifact_descriptor(
                artifact_id="app",
                kind="binary",
                root_id="target",
                relative_path="app",
                roots=roots,
                key=key[0],
                key_sha256=key[2],
            )
            lease_path = managed_lease_path(key[0], key[2], roots)
            lease = acquire_lease(
                lease_path,
                key_sha256=key[2],
                source_revision=key[0]["source_revision"],
                writer_session="session-ledger",
                pid=4242,
                process_start_token="ledger-test-process",
                host_id="test-host",
                now=999,
            )
            ledger = new_ledger(
                key,
                source_session="session-ledger",
                roots=roots,
                now=1000,
                lease_path=lease_path,
                lease=lease,
            )
            ledger = transition_ledger(ledger, "running", now=1001, lease_path=lease_path, lease=lease)
            ledger = transition_ledger(ledger, "passed", now=1002, lease_path=lease_path, lease=lease)
            ledger["artifacts"] = [artifact]
            ledger = seal_ledger(ledger, roots=roots, now=1003, lease_path=lease_path, lease=lease)
            self.assertEqual(ledger["state"], "sealed")
            self.assertTrue(ledger["consumable"])
            path = ledger_path_for_key(key[0], key[2], roots)
            publish_ledger(
                path,
                ledger,
                roots=roots,
                require_sealed=True,
                lease_path=lease_path,
                lease=lease,
                now=1003,
            )
            self.assertEqual(validate_ledger(path, roots=roots), [])
            publish_build_result(path, roots=roots)
            result_path = path.parent / "build-result.json"
            self.assertTrue(check_reusable_result(result_path, roots=roots, requested_key=key))
            binary.write_bytes(b"tampered")
            self.assertTrue(any(item["code"] == "ARTIFACT_HASH" for item in validate_ledger(path, roots=roots)))
            self.assertFalse(check_reusable_result(result_path, roots=roots, requested_key=key))

    def test_wrong_key_hash_and_unsealed_state_are_not_consumable(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            roots = ManagedRoots.fixture(Path(temporary) / "managed")
            raw = {
                "authority": "tessera-makepad",
                "namespace": "production",
                "source_revision": "f" * 40,
                "toolchain": "rust-1.88.0",
                "host": "darwin-arm64",
                "target": "aarch64-apple-darwin",
                "profile": "release",
                "features": [],
                "renderer": "makepad",
                "backend": "metal",
                "lockfile_sha256": "0" * 64,
                "commands": [["cargo", "build"]],
                "environment": {"CARGO_BUILD_JOBS": "2"},
            }
            key = build_key(raw, roots=roots)
            lease_path = managed_lease_path(key[0], key[2], roots)
            lease = acquire_lease(
                lease_path,
                key_sha256=key[2],
                source_revision=key[0]["source_revision"],
                writer_session="session-unsealed",
                pid=4242,
                process_start_token="unsealed-test-process",
                host_id="test-host",
                now=9,
            )
            ledger = new_ledger(
                key,
                source_session="session-unsealed",
                now=10,
                lease_path=lease_path,
                lease=lease,
            )
            ledger["key_sha256"] = "1" * 64
            self.assertTrue(any(item["code"] == "LEDGER_KEY_HASH" for item in validate_ledger(ledger, roots=roots, require_sealed=False, check_hashes=False)))
            with self.assertRaises(ValidationError):
                publish_ledger(
                    ledger_path_for_key(key[0], key[2], roots),
                    ledger,
                    roots=roots,
                    lease_path=lease_path,
                    lease=lease,
                    now=10,
                )


class GCTests(unittest.TestCase):
    @staticmethod
    def make_key(authority: str, revision_byte: str, roots: ManagedRoots) -> tuple[dict[str, object], bytes, str]:
        return build_key(
            {
                "authority": authority,
                "namespace": "production",
                "source_revision": revision_byte * 40,
                "toolchain": "rust-1.88.0",
                "host": "darwin-arm64",
                "target": "aarch64-apple-darwin",
                "profile": "release",
                "features": [],
                "renderer": "makepad",
                "backend": "metal",
                "lockfile_sha256": "e" * 64,
                "commands": [["cargo", "build", "--locked"]],
                "environment": {"CARGO_BUILD_JOBS": "2"},
            },
            roots=roots,
        )

    def test_dry_run_retains_references_and_reports_only_unreferenced_candidate(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            roots = ManagedRoots.fixture(Path(temporary) / "managed")
            candidate = self.make_key("tessera-makepad", "1", roots)
            active = self.make_key("tessera-makepad", "2", roots)
            iced = self.make_key("feat-iced-history", "3", roots)
            recovery = self.make_key("recovery-archive", "4", roots)
            for key in (candidate, active, iced, recovery):
                target = Path(
                    str(
                        Path(roots.cache_root)
                        / key[0]["authority"]
                        / key[0]["source_revision"]
                        / "release"
                        / key[2]
                        / "target"
                    )
                )
                target.mkdir(parents=True)
                (target / "small.bin").write_bytes(key[0]["source_revision"].encode())
                os.utime(target, (1, 1))
                write_rebuildable_marker(key, roots=roots)
            active_result = Path(roots.result_root) / "tessera-makepad" / ("2" * 40) / "release" / active[2]
            active_result.mkdir(parents=True)
            (active_result / "build-result.json").write_text("{}", encoding="utf-8")
            report = gc_dry_run(
                roots,
                active_sessions=[{"key_sha256": active[2]}],
                doctor_ok=True,
                policy={"failed_grace_seconds": 0},
                now=2_000_000_000,
            )
            self.assertTrue(report["dry_run"])
            self.assertEqual(report["candidate_count"], 1)
            self.assertEqual(report["candidates"][0]["key_sha256"], candidate[2])
            retained = {item["key_sha256"]: item for item in report["retained"]}
            self.assertIn(active[2], retained)
            self.assertTrue(any("build-result-root" in reason for reason in retained[active[2]]["retained_reason"]))
            self.assertIn(iced[2], retained)
            self.assertTrue(any("feat-iced-root" in reason for reason in retained[iced[2]]["retained_reason"]))
            self.assertIn(recovery[2], retained)
            self.assertTrue(any("recovery-archive-protected" in reason for reason in retained[recovery[2]]["retained_reason"]))
            self.assertTrue(Path(report["candidates"][0]["path"]).exists())

    def test_candidate_requires_rebuildability_proof_and_result_only_entries_are_retained(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            roots = ManagedRoots.fixture(Path(temporary) / "managed")
            key = self.make_key("tessera-makepad", "5", roots)
            target = managed_target_dir(key[0], key[2], roots)
            target.mkdir(parents=True)
            (target / "small.bin").write_bytes(b"fixture")
            report = gc_dry_run(
                roots,
                active_sessions=[],
                doctor_ok=True,
                policy={"failed_grace_seconds": 0},
                now=2_000_000_000,
            )
            self.assertEqual(report["candidate_count"], 0)
            retained = report["retained"][0]
            self.assertIn("rebuildability-unproven", retained["retained_reason"])

            write_rebuildable_marker(key, roots=roots)
            result_dir = Path(roots.result_root) / "tessera-makepad" / ("5" * 40) / "release" / key[2]
            result_dir.mkdir(parents=True)
            (result_dir / "build-result.json").write_text("{}", encoding="utf-8")
            report = gc_dry_run(
                roots,
                active_sessions=[],
                doctor_ok=True,
                policy={"failed_grace_seconds": 0},
                now=2_000_000_000,
            )
            self.assertEqual(report["candidate_count"], 0)
            retained = {item["key_sha256"]: item for item in report["retained"]}
            self.assertIn(key[2], retained)
            self.assertIn("build-result-root", retained[key[2]]["retained_reason"])

    def test_recursive_fingerprint_changes_are_visible_to_rescan(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            roots = ManagedRoots.fixture(Path(temporary) / "managed")
            key = self.make_key("tessera-makepad", "6", roots)
            target = managed_target_dir(key[0], key[2], roots)
            target.mkdir(parents=True)
            nested = target / "nested"
            nested.mkdir()
            (nested / "small.bin").write_bytes(b"one")
            write_rebuildable_marker(key, roots=roots)
            first = gc_dry_run(
                roots,
                active_sessions=[],
                doctor_ok=True,
                policy={"failed_grace_seconds": 0},
                now=2_000_000_000,
            )
            self.assertEqual(first["candidate_count"], 1)
            before = first["candidates"][0]["fingerprint"]
            (nested / "small.bin").write_bytes(b"two")
            second = gc_dry_run(
                roots,
                active_sessions=[],
                doctor_ok=True,
                policy={"failed_grace_seconds": 0},
                now=2_000_000_000,
            )
            self.assertEqual(second["candidate_count"], 1)
            self.assertNotEqual(before, second["candidates"][0]["fingerprint"])


class PreflightTests(unittest.TestCase):
    def test_admission_requires_managed_target_and_exact_lock_hash(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            roots = ManagedRoots.fixture(root / "managed")
            lockfile = root / "Cargo.lock"
            lockfile.write_bytes(b"tiny lock fixture")
            lock_hash = hashlib.sha256(lockfile.read_bytes()).hexdigest()
            key = build_key(
                {
                    "authority": "tessera-makepad",
                    "namespace": "production",
                    "source_revision": "a" * 40,
                    "toolchain": "rust-1.88.0",
                    "host": "darwin-arm64",
                    "target": "aarch64-apple-darwin",
                    "profile": "release",
                    "features": [],
                    "renderer": "makepad",
                    "backend": "metal",
                    "lockfile_sha256": lock_hash,
                    "commands": [["cargo", "build", "--locked"]],
                    "environment": {"CARGO_BUILD_JOBS": "2"},
                },
                roots=roots,
            )
            target = Path(
                roots.cache_root
                / "tessera-makepad"
                / ("a" * 40)
                / "release"
                / key[2]
                / "target"
            )
            report = preflight_build(
                key,
                cargo_target_dir=target,
                lockfile_path=lockfile,
                estimated_peak_bytes=1,
                roots=roots,
                command=[["cargo", "build", "--locked"]],
                requested_jobs=2,
                volume={
                    "known": True,
                    "volume_id": "fixture-volume",
                    "is_ssd": True,
                    "filesystem": "apfs",
                    "total_bytes": 100 * 1024**3,
                    "available_bytes": 40 * 1024**3,
                    "free_percent": 50.0,
                },
                pressure="unknown",
            )
            self.assertTrue(report["ok"])
            rejected = preflight_build(
                key,
                cargo_target_dir="/private/tmp/unmanaged-target",
                lockfile_path=lockfile,
                estimated_peak_bytes=1,
                roots=roots,
                requested_jobs=4,
                volume={
                    "known": True,
                    "volume_id": "fixture-volume",
                    "is_ssd": True,
                    "filesystem": "apfs",
                    "total_bytes": 100 * 1024**3,
                    "available_bytes": 40 * 1024**3,
                    "free_percent": 50.0,
                },
            )
            codes = {item["code"] for item in rejected["errors"]}
            self.assertIn("TARGET_PATH", codes)
            self.assertIn("CARGO_BUILD_JOBS", codes)

    def test_volume_identity_is_fail_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            roots = ManagedRoots.fixture(root / "managed")
            lockfile = root / "Cargo.lock"
            lockfile.write_bytes(b"lock")
            key = build_key(
                {
                    "authority": "tessera-makepad",
                    "namespace": "production",
                    "source_revision": "b" * 40,
                    "toolchain": "rust-1.88.0",
                    "host": "darwin-arm64",
                    "target": "aarch64-apple-darwin",
                    "profile": "release",
                    "features": [],
                    "renderer": "makepad",
                    "backend": "metal",
                    "lockfile_sha256": hashlib.sha256(lockfile.read_bytes()).hexdigest(),
                    "commands": [["cargo", "build"]],
                    "environment": {"CARGO_BUILD_JOBS": "2"},
                },
                roots=roots,
            )
            report = preflight_build(
                key,
                cargo_target_dir=managed_target_dir(key[0], key[2], roots),
                lockfile_path=lockfile,
                estimated_peak_bytes=1,
                roots=roots,
                requested_jobs=2,
                volume={
                    "known": True,
                    "is_ssd": True,
                    "filesystem": "apfs",
                    "available_bytes": 40 * 1024**3,
                    "total_bytes": 100 * 1024**3,
                    "free_percent": 40.0,
                },
            )
            codes = {item["code"] for item in report["errors"]}
            self.assertIn("VOLUME_IDENTITY", codes)

    def test_darwin_diskutil_modern_keys_are_admitted(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            plist = plistlib.dumps(
                {
                    "VolumeUUID": "volume-uuid",
                    "DeviceIdentifier": "disk3s1s1",
                    "FilesystemType": "apfs",
                    "BusProtocol": "Apple Fabric",
                    "SolidState": True,
                }
            )
            completed = subprocess.CompletedProcess(
                ["diskutil", "info", "-plist", temporary],
                0,
                stdout=plist,
                stderr=b"",
            )
            with mock.patch("makepad_build.platform.system", return_value="Darwin"), mock.patch(
                "makepad_build.subprocess.run", return_value=completed
            ):
                info = collect_volume_info(temporary)

        self.assertTrue(info["known"])
        self.assertEqual(info["volume_id"], "volume-uuid")
        self.assertEqual(info["filesystem"], "apfs")
        self.assertEqual(info["protocol"], "Apple Fabric")
        self.assertTrue(info["is_ssd"])

    def test_darwin_diskutil_resolves_directory_to_mounted_volume(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            volume_plist = plistlib.dumps(
                {
                    "VolumeUUID": "volume-uuid",
                    "FilesystemType": "apfs",
                    "BusProtocol": "Apple Fabric",
                    "SolidState": True,
                }
            )
            failed = subprocess.CompletedProcess(
                ["diskutil", "info", "-plist", temporary],
                1,
                stdout=b"",
                stderr=b"not a volume",
            )
            mounted = subprocess.CompletedProcess(
                ["diskutil", "info", "-plist", "/"],
                0,
                stdout=volume_plist,
                stderr=b"",
            )
            filesystem = subprocess.CompletedProcess(
                ["df", "-P", temporary],
                0,
                stdout=(
                    "Filesystem 1024-blocks Used Available Capacity Mounted on\n"
                    "/dev/disk3s1s1 100 10 90 10% /\n"
                ).encode(),
                stderr=b"",
            )

            with mock.patch("makepad_build.platform.system", return_value="Darwin"), mock.patch(
                "makepad_build.subprocess.run", side_effect=[failed, filesystem, mounted]
            ) as run:
                info = collect_volume_info(temporary)

        self.assertTrue(info["known"])
        self.assertEqual(info["volume_id"], "volume-uuid")
        self.assertEqual([call.args[0][0] for call in run.call_args_list], ["diskutil", "df", "diskutil"])


class CLITests(unittest.TestCase):
    def test_cli_round_trip_uses_only_fixture_roots(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            fixture = root / "fixture"
            key_input = root / "key-input.json"
            lockfile = root / "Cargo.lock"
            lockfile.write_bytes(b"cli lock fixture")
            key_input.write_text(
                json.dumps(
                    {
                        "authority": "tessera-makepad",
                        "namespace": "production",
                        "source_revision": "1" * 40,
                        "toolchain": "rust-1.88.0",
                        "host": "darwin-arm64",
                        "target": "aarch64-apple-darwin",
                        "profile": "release",
                        "features": [],
                        "renderer": "makepad",
                        "backend": "metal",
                        "lockfile_sha256": hashlib.sha256(lockfile.read_bytes()).hexdigest(),
                        "commands": [["cargo", "build", "--locked"]],
                        "environment": {"CARGO_BUILD_JOBS": "2"},
                    }
                ),
                encoding="utf-8",
            )
            executable_root = TEST_ROOT / "bin"
            environment = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")

            def run_cli(name: str, *arguments: str) -> dict[str, object]:
                completed = subprocess.run(
                    [sys.executable, "-B", str(executable_root / name), *arguments],
                    check=False,
                    capture_output=True,
                    text=True,
                    env=environment,
                )
                if completed.returncode != 0:
                    self.fail(f"{name} failed: {completed.returncode}\n{completed.stdout}\n{completed.stderr}")
                return json.loads(completed.stdout)

            key_report = run_cli("build-key", "--input", str(key_input), "--fixture-root", str(fixture))
            key = key_report["key"]
            digest = str(key_report["key_sha256"])
            roots = ManagedRoots.fixture(fixture)
            lease_path = managed_lease_path(key, digest, roots)  # type: ignore[arg-type]
            run_cli(
                "lease",
                "acquire",
                "--fixture-root",
                str(fixture),
                "--lease-path",
                str(lease_path),
                "--key-sha256",
                digest,
                "--source-revision",
                str(key["source_revision"]),
                "--writer-session",
                "cli-session",
                "--pid",
                "4242",
                "--process-start-token",
                "cli-process",
                "--host-id",
                "cli-host",
                "--now",
                "1000",
            )
            target = managed_target_dir(key, digest, roots)  # type: ignore[arg-type]
            target.mkdir(parents=True)
            (target / "app").write_bytes(b"cli artifact")
            artifact = artifact_descriptor(
                artifact_id="app",
                kind="binary",
                root_id="target",
                relative_path="app",
                roots=roots,
                key=key,  # type: ignore[arg-type]
                key_sha256=digest,
            )
            artifacts = root / "artifacts.json"
            artifacts.write_text(json.dumps([artifact]), encoding="utf-8")
            common = (
                "--fixture-root",
                str(fixture),
                "--lease-path",
                str(lease_path),
                "--lease",
                str(lease_path),
                "--now",
                "1001",
            )
            reserve_report = run_cli(
                "build-ledger",
                "reserve",
                "--key",
                str(key_input),
                "--source-session",
                "cli-session",
                *common,
            )
            ledger_path = Path(str(reserve_report["path"]))
            run_cli(
                "build-ledger",
                "transition",
                "--ledger",
                str(ledger_path),
                "--state",
                "running",
                *common,
            )
            run_cli(
                "build-ledger",
                "transition",
                "--ledger",
                str(ledger_path),
                "--state",
                "passed",
                "--artifacts",
                str(artifacts),
                *common,
            )
            run_cli(
                "build-ledger",
                "transition",
                "--ledger",
                str(ledger_path),
                "--state",
                "sealed",
                *common,
            )
            run_cli(
                "build-ledger",
                "publish-result",
                "--ledger",
                str(ledger_path),
                "--fixture-root",
                str(fixture),
            )
            result_path = ledger_path.parent / "build-result.json"
            result_report = run_cli(
                "build-ledger",
                "validate-result",
                "--result",
                str(result_path),
                "--key",
                str(key_input),
                "--fixture-root",
                str(fixture),
            )
            self.assertTrue(result_report["ok"])
            run_cli(
                "lease",
                "release",
                "--fixture-root",
                str(fixture),
                "--lease-path",
                str(lease_path),
                "--expected",
                str(lease_path),
                "--now",
                "1005",
            )
            self.assertFalse(lease_path.exists())


if __name__ == "__main__":
    unittest.main()
