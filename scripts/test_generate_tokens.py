#!/usr/bin/env python3
"""Focused regression tests for the token schema and its generated projections."""

from __future__ import annotations

import copy
import importlib.util
import os
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
if os.environ.get("PYTHONDONTWRITEBYTECODE") != "1":
    raise RuntimeError("run token generator tests with PYTHONDONTWRITEBYTECODE=1")
sys.dont_write_bytecode = True
SPEC = importlib.util.spec_from_file_location("generate_tokens", ROOT / "scripts/generate-tokens.py")
assert SPEC and SPEC.loader
generator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(generator)


def color(value: str) -> tuple[float, float, float, float]:
    digits = value[1:]
    alpha = int(digits[6:8], 16) / 255 if len(digits) == 8 else 1.0
    return tuple(int(digits[index : index + 2], 16) / 255 for index in range(0, 6, 2)) + (alpha,)


def composite(foreground: tuple[float, float, float, float], background: tuple[float, float, float, float]) -> tuple[float, float, float, float]:
    alpha = foreground[3] + background[3] * (1.0 - foreground[3])
    return tuple(
        (foreground[index] * foreground[3] + background[index] * background[3] * (1.0 - foreground[3])) / alpha
        for index in range(3)
    ) + (alpha,)


def linear(channel: float) -> float:
    return channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4


def contrast(left: tuple[float, float, float, float], right: tuple[float, float, float, float]) -> float:
    left_luminance = sum(weight * linear(channel) for weight, channel in zip((0.2126, 0.7152, 0.0722), left[:3]))
    right_luminance = sum(weight * linear(channel) for weight, channel in zip((0.2126, 0.7152, 0.0722), right[:3]))
    return (max(left_luminance, right_luminance) + 0.05) / (min(left_luminance, right_luminance) + 0.05)


class TokenGeneratorTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.data, cls.source_hash = generator.load_tokens(ROOT / "design/tokens.toml")

    def test_schema_rejects_missing_and_unknown_fields(self) -> None:
        missing = copy.deepcopy(self.data)
        del missing["themes"]["light"]["colors"]["focus_ring"]
        with self.assertRaisesRegex(generator.SchemaError, "missing required field"):
            generator.validate_tokens(missing)

        unknown = copy.deepcopy(self.data)
        unknown["themes"]["dark"]["colors"]["future_color"] = "#000000"
        with self.assertRaisesRegex(generator.SchemaError, "unknown field"):
            generator.validate_tokens(unknown)

    def test_generation_is_deterministic_ascii_and_matches_the_checked_in_outputs(self) -> None:
        first, first_hash = generator.generate_outputs(ROOT)
        second, second_hash = generator.generate_outputs(ROOT)
        self.assertEqual(first_hash, second_hash)
        self.assertEqual(first, second)
        self.assertEqual(first_hash, self.source_hash)
        self.assertTrue(first[ROOT / generator.TS_TARGET].isascii())
        self.assertTrue(first[ROOT / generator.RUST_TARGET].isascii())
        css = first[ROOT / generator.CSS_TARGET]
        start = css.index(generator.CSS_START)
        end = css.index(generator.CSS_END) + len(generator.CSS_END)
        self.assertTrue(css[start:end].isascii())
        self.assertEqual(generator.run(ROOT, check=True), 0)

    def test_readable_text_and_disabled_tokens_meet_their_actual_surface_contracts(self) -> None:
        for theme_name in ("light", "dark"):
            colors = self.data["themes"][theme_name]["colors"]
            backgrounds = [color(colors[name]) for name in ("surface", "canvas", "surface_muted")]
            for role in ("text", "text_secondary", "text_tertiary", "text_quaternary"):
                with self.subTest(theme=theme_name, role=role):
                    self.assertGreaterEqual(min(contrast(color(colors[role]), background) for background in backgrounds), 4.5)

            # Disabled UI has its own semantic surface, not a claimed WCAG inactive exemption.
            self.assertGreaterEqual(contrast(color(colors["text_disabled"]), color(colors["surface_muted"])), 4.5)

    def test_focus_ring_contrasts_with_the_opaque_focus_gap(self) -> None:
        for theme_name in ("light", "dark"):
            colors = self.data["themes"][theme_name]["colors"]
            self.assertGreaterEqual(contrast(color(colors["focus_ring"]), color(colors["focus_gap"])), 3.0)

    def test_status_foregrounds_contrast_with_their_actual_soft_backgrounds(self) -> None:
        for theme_name in ("light", "dark"):
            theme = self.data["themes"][theme_name]
            surface = color(theme["colors"]["surface"])
            for status_name, status in theme["status"].items():
                with self.subTest(theme=theme_name, status=status_name):
                    actual_background = composite(color(status["bg"]), surface)
                    self.assertGreaterEqual(contrast(color(status["fg"]), actual_background), 4.5)

    def test_dark_danger_triplet_meets_actual_dark_surface_contracts(self) -> None:
        theme = self.data["themes"]["dark"]
        danger = theme["status"]["danger"]
        foreground = color(danger["fg"])
        surface = color(theme["colors"]["surface"])

        actual_soft_background = composite(color(danger["bg"]), surface)
        self.assertGreaterEqual(contrast(foreground, actual_soft_background), 4.5)
        for background_name in ("surface", "canvas"):
            with self.subTest(background=background_name):
                self.assertGreaterEqual(contrast(foreground, color(theme["colors"][background_name])), 4.5)

        actual_border = composite(color(danger["border"]), surface)
        self.assertGreaterEqual(contrast(actual_border, surface), 3.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
