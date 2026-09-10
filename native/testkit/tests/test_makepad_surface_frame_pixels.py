"""Unit tests for diagnostic pixel assertions, not rendering evidence."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import makepad_surface_frame_pixels as frame


class FramePixelTests(unittest.TestCase):
    def fixture(self):
        return {"outside": [249, 249, 249, 255],
                "corner_left": [249, 249, 249, 255], "corner_right": [249, 249, 249, 255],
                "inset_left": [255, 255, 255, 255], "inset_right": [255, 255, 255, 255],
                "fill": [255, 255, 255, 255], "border": [236, 236, 236, 255]}

    def test_rounded_border_and_fill(self):
        self.assertTrue(all(frame.check_colors(self.fixture()).values()))

    def test_plain_solid_rectangle_fails(self):
        samples = self.fixture()
        for name in samples:
            if name != "outside":
                samples[name] = samples["fill"]
        checks = frame.check_colors(samples)
        self.assertFalse(checks["rounded_left_exposes_canvas"])
        self.assertFalse(checks["rounded_right_exposes_canvas"])
        self.assertFalse(checks["visible_border"])

    def test_blank_or_transparent_frame_fails(self):
        samples = {k: [249, 249, 249, 255] for k in self.fixture()}
        self.assertFalse(all(frame.check_colors(samples).values()))
        samples = self.fixture()
        samples["border"][3] = 0
        self.assertFalse(frame.check_colors(samples)["opaque_samples"])

    def test_invalid_or_entirely_clipped_geometry_fails(self):
        for rect in ([20, 20, float("nan"), 100], [20, 20, -2, 100],
                     [20, -50, 100, 800], [0, 20, 100, 100]):
            with self.assertRaises(ValueError):
                frame.frame_samples(rect, (840, 600))

    def test_scrolled_frame_uses_visible_bottom_edge(self):
        points = frame.frame_samples([20, -50, 100, 300], (840, 600))
        self.assertEqual(points["corner_left"], (21, 249))
        self.assertEqual(points["fill"], (32, 238))
