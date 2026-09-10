import argparse
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import makepad_theme_smoke as smoke


class ThemeSmokeTests(unittest.TestCase):
    def test_requires_actual_nonempty_input_value_not_label_text(self):
        self.assertEqual(smoke.input_value({"val": smoke.INPUT_FIXTURE}), smoke.INPUT_FIXTURE)
        for entry in ({}, {"t": smoke.INPUT_FIXTURE}, {"val": ""}, {"val": None}):
            with self.assertRaises(RuntimeError):
                smoke.input_value(entry)

    def test_stress_run_is_bounded_and_cannot_pass_without_iterations(self):
        self.assertEqual(smoke.positive_iterations("60"), 60)
        for value in ("0", "-1", "1001"):
            with self.assertRaises(argparse.ArgumentTypeError):
                smoke.positive_iterations(value)
