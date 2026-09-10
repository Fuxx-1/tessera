"""Exercise release isolation against real annotated Git tags."""
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location(
    "validate_release", Path(__file__).with_name("validate-release.py")
)
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)


class RustReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        (self.root / "native/crates/widget").mkdir(parents=True)
        (self.root / "native/Cargo.toml").write_text(
            '[workspace]\nmembers = ["crates/widget"]\n'
            '[workspace.package]\nversion = "1.2.3"\n'
        )
        (self.root / "native/crates/widget/Cargo.toml").write_text(
            '[package]\nname = "widget"\nversion.workspace = true\n'
        )
        self.git("init", "--quiet")
        self.git("add", ".")
        self.git("commit", "--quiet", "-m", "fixture")
        self.git("tag", "-a", "v1.2.3", "-m", "fixture")

    def git(self, *args):
        return subprocess.check_output([
            "git", "-c", "user.name=Fuxx-1", "-c", "user.email=583742849@qq.com", *args,
        ], cwd=self.root, text=True).strip()

    def test_rust_only_release_needs_no_package_json(self):
        self.assertEqual(validator.validate(self.root, "v1.2.3"), self.git("rev-parse", "HEAD"))

    def test_rejects_web_tag_and_wrong_version(self):
        for tag in ("web-v1.2.3", "v9.0.0"):
            with self.subTest(tag=tag), self.assertRaises(ValueError):
                validator.validate(self.root, tag)

    def test_rejects_mixed_tree(self):
        (self.root / "package.json").write_text("{}")
        with self.assertRaisesRegex(ValueError, "Rust-only"):
            validator.validate(self.root, "v1.2.3")

    def test_rejects_lightweight_tag(self):
        self.git("tag", "-d", "v1.2.3")
        self.git("tag", "v1.2.3")
        with self.assertRaisesRegex(ValueError, "Annotated"):
            validator.validate(self.root, "v1.2.3")

    def test_rejects_wrong_commit(self):
        self.git("commit", "--allow-empty", "--quiet", "-m", "next")
        with self.assertRaisesRegex(ValueError, "checkout mismatch"):
            validator.validate(self.root, "v1.2.3")

    def test_rejects_independent_crate_version_drift(self):
        (self.root / "native/crates/widget/Cargo.toml").write_text(
            '[package]\nname = "widget"\nversion = "0.0.1"\n'
        )
        with self.assertRaisesRegex(ValueError, "member version"):
            validator.validate(self.root, "v1.2.3")


if __name__ == "__main__":
    unittest.main()
