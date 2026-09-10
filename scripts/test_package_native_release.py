"""Exercise the actual ZIP writer with dependency-style file timestamps."""
import hashlib
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import time
import unittest
import zipfile


spec = importlib.util.spec_from_file_location(
    "package_native_release", Path(__file__).with_name("package-native-release.py")
)
package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)


class WindowsArchiveTests(unittest.TestCase):
    def test_lockfile_digest_uses_committed_blob_not_worktree_line_endings(self):
        with tempfile.TemporaryDirectory() as temporary:
            repository = Path(temporary)
            lockfile = repository / "native" / "Cargo.lock"
            lockfile.parent.mkdir()
            lockfile.write_bytes(b"version = 4\n")
            subprocess.run(["git", "init", "--quiet", repository], check=True)
            subprocess.run(["git", "-C", repository, "add", "native/Cargo.lock"], check=True)
            subprocess.run([
                "git", "-C", repository, "-c", "user.name=Test", "-c",
                "user.email=test@example.invalid", "commit", "--quiet", "-m", "fixture",
            ], check=True)
            lockfile.write_bytes(b"version = 4\r\n")

            self.assertEqual(
                package.git_blob_sha("native/Cargo.lock", cwd=repository),
                hashlib.sha256(b"version = 4\n").hexdigest(),
            )
            self.assertNotEqual(
                package.git_blob_sha("native/Cargo.lock", cwd=repository),
                hashlib.sha256(lockfile.read_bytes()).hexdigest(),
            )

    def check_timestamp(self, timestamp, expected):
        with tempfile.TemporaryDirectory() as temporary:
            stage = Path(temporary)
            bundle = stage / "tessera-makepad-windows-x64"
            notices = bundle / "Notices"
            notices.mkdir(parents=True)
            license_file = notices / "LICENSE-dependency"
            license_file.write_bytes(b"Dependency license\n")
            os.utime(license_file, (timestamp, timestamp))
            original_mtime = license_file.stat().st_mtime_ns
            executable = bundle / "tessera-gallery.exe"
            executable.write_bytes(b"MZ-test-fixture")
            output = stage / "application.zip"

            package.write_windows_archive(bundle, output)

            with zipfile.ZipFile(output) as archive:
                self.assertIsNone(archive.testzip())
                self.assertEqual(archive.namelist(), [
                    "tessera-makepad-windows-x64/Notices/LICENSE-dependency",
                    "tessera-makepad-windows-x64/tessera-gallery.exe",
                ])
                info = archive.getinfo("tessera-makepad-windows-x64/Notices/LICENSE-dependency")
                self.assertEqual(info.date_time, expected)
                self.assertEqual(archive.read(info), license_file.read_bytes())
                self.assertEqual(info.compress_type, zipfile.ZIP_DEFLATED)
                self.assertEqual(archive.read("tessera-makepad-windows-x64/tessera-gallery.exe"), executable.read_bytes())
            self.assertEqual(license_file.stat().st_mtime_ns, original_mtime)

    def test_epoch_timestamp_is_clamped_without_modifying_source(self):
        self.check_timestamp(0, (1980, 1, 1, 0, 0, 0))

    def test_representable_timestamp_is_preserved(self):
        stamp = (2000, 6, 15, 12, 34, 56)
        self.check_timestamp(time.mktime((*stamp, 0, 0, -1)), stamp)

    def test_future_timestamp_is_clamped(self):
        timestamp = time.mktime((2108, 6, 15, 12, 34, 56, 0, 0, -1))
        self.check_timestamp(timestamp, (2107, 12, 31, 23, 59, 58))


if __name__ == "__main__":
    unittest.main()
