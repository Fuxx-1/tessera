#!/usr/bin/env python3
"""Generate Tessera's CSS, TypeScript, and Iced token projections from TOML."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import tomllib
from collections.abc import Mapping
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
CSS_TARGET = Path("src/styles.css")
TS_TARGET = Path("src/theme/tokens.ts")
RUST_TARGET = Path("native/crates/tessera-iced/src/tokens.rs")
CSS_START = "/* @generated begin: tessera design tokens"
CSS_END = "/* @generated end: tessera design tokens */"
HEX_COLOR = re.compile(r"^#[0-9a-f]{6}(?:[0-9a-f]{2})?$")


def exact(*keys: str) -> dict[str, Any]:
    return {key: str for key in keys}


STATUS_SCHEMA = {
    "success": exact("fg", "border", "bg"),
    "warning": exact("fg", "border", "bg"),
    "danger": exact("fg", "border", "bg"),
    "info": exact("fg", "border", "bg"),
}

COLOR_KEYS = (
    "canvas",
    "sidebar",
    "surface_sunken",
    "surface_muted",
    "surface",
    "surface_elevated",
    "surface_glass",
    "surface_hover",
    "surface_active",
    "surface_selected",
    "overlay",
    "overlay_strong",
    "ink",
    "text",
    "text_secondary",
    "text_tertiary",
    "text_quaternary",
    "text_disabled",
    "text_on_accent",
    "border_light",
    "border",
    "border_heavy",
    "accent",
    "accent_hover",
    "accent_soft",
    "accent_text",
    "link_text",
    "focus_gap",
    "focus_ring",
    "tooltip_bg",
    "tooltip_fg",
    "tooltip_border",
    "button_primary_bg",
    "button_primary_bg_hover",
    "button_primary_fg",
    "button_secondary_bg",
    "button_secondary_bg_hover",
    "button_secondary_fg",
    "control_active",
)

PALETTE_KEYS = (
    "gray_0",
    "gray_50",
    "gray_100",
    "gray_200",
    "gray_300",
    "gray_500",
    "gray_600",
    "gray_700",
    "gray_800",
    "gray_900",
    "gray_1000",
)

TYPOGRAPHY_STRING_KEYS = (
    "font_sans",
    "font_mono",
    "text_xs",
    "text_sm",
    "text_base",
    "text_lg",
    "text_heading_sm",
    "text_heading_md",
    "text_heading_lg",
    "text_xl",
    "text_2xl",
)
TYPOGRAPHY_NUMBER_KEYS = (
    "weight_normal",
    "weight_medium",
    "weight_semibold",
    "weight_bold",
    "leading_tight",
    "leading_snug",
    "leading_normal",
    "leading_relaxed",
    "tracking_tight",
    "tracking_heading",
)
GEOMETRY_STRING_KEYS = (
    "radius_2xs",
    "radius_xs",
    "radius_sm",
    "radius_md",
    "radius_lg",
    "radius_xl",
    "radius_2xl",
    "radius_3xl",
    "radius_4xl",
    "radius_full",
    "space_1",
    "space_2",
    "space_3",
    "space_4",
    "space_5",
    "space_6",
    "space_8",
    "control_height_sm",
    "control_height",
    "control_height_lg",
    "topbar_height",
    "panel_toolbar_height",
    "shell_sidebar_width",
    "navigation_rail_width",
    "content_max_width",
    "hit_target_min",
    "hit_target_coarse",
    "focus_gap_width",
    "focus_ring_width",
    "focus_ring_offset",
)
MOTION_KEYS = (
    "fast",
    "base",
    "panel",
    "easing_standard",
    "easing_enter",
    "easing_exit",
)
SHADOW_KEYS = ("hairline", "sm", "md", "lg", "xl", "2xl", "floating", "modal")

SCHEMA: dict[str, Any] = {
    "schema_version": int,
    "metadata": exact("name", "owner", "authority"),
    "shared": {
        "palette": exact(*PALETTE_KEYS),
        "typography": {**exact(*TYPOGRAPHY_STRING_KEYS), **{key: (int, float) for key in TYPOGRAPHY_NUMBER_KEYS}},
        "geometry": {"corner_radius_scale": (int, float), **exact(*GEOMETRY_STRING_KEYS)},
        "motion": exact(*MOTION_KEYS),
    },
    "themes": {
        "light": {"colors": exact(*COLOR_KEYS), "status": STATUS_SCHEMA, "shadow": exact(*SHADOW_KEYS)},
        "dark": {"colors": exact(*COLOR_KEYS), "status": STATUS_SCHEMA, "shadow": exact(*SHADOW_KEYS)},
    },
}


class SchemaError(ValueError):
    """Raised when the source TOML does not match the frozen token schema."""


def is_expected_type(value: Any, expected: Any) -> bool:
    if isinstance(expected, tuple):
        return type(value) in expected
    return type(value) is expected


def validate_tree(value: Any, schema: Any, path: str = "") -> None:
    if isinstance(schema, Mapping):
        if not isinstance(value, Mapping):
            raise SchemaError(f"{path or '<root>'} must be a table")
        actual = set(value)
        expected = set(schema)
        unknown = sorted(actual - expected)
        missing = sorted(expected - actual)
        if unknown:
            raise SchemaError(f"{path or '<root>'} has unknown field(s): {', '.join(unknown)}")
        if missing:
            raise SchemaError(f"{path or '<root>'} is missing required field(s): {', '.join(missing)}")
        for key, child_schema in schema.items():
            child_path = f"{path}.{key}" if path else key
            validate_tree(value[key], child_schema, child_path)
        return
    if not is_expected_type(value, schema):
        name = schema.__name__ if isinstance(schema, type) else " or ".join(item.__name__ for item in schema)
        raise SchemaError(f"{path} must be {name}")


def validate_tokens(data: dict[str, Any]) -> None:
    validate_tree(data, SCHEMA)
    if data["schema_version"] != 1:
        raise SchemaError("schema_version must be 1")

    for name in PALETTE_KEYS:
        assert_color(data["shared"]["palette"][name], f"shared.palette.{name}")
    for theme_name in ("light", "dark"):
        theme = data["themes"][theme_name]
        for name in COLOR_KEYS:
            assert_color(theme["colors"][name], f"themes.{theme_name}.colors.{name}")
        for status_name in STATUS_SCHEMA:
            for role in ("fg", "border", "bg"):
                assert_color(theme["status"][status_name][role], f"themes.{theme_name}.status.{status_name}.{role}")


def assert_color(value: str, path: str) -> None:
    if not HEX_COLOR.fullmatch(value):
        raise SchemaError(f"{path} must be a lowercase #rrggbb or #rrggbbaa color")


def load_tokens(path: Path) -> tuple[dict[str, Any], str]:
    source = path.read_bytes()
    if any(byte > 0x7F for byte in source):
        raise SchemaError(f"{path} must remain ASCII so generated artifacts are byte-stable")
    try:
        data = tomllib.loads(source.decode("ascii"))
    except tomllib.TOMLDecodeError as error:
        raise SchemaError(f"invalid TOML: {error}") from error
    validate_tokens(data)
    return data, hashlib.sha256(source).hexdigest()


def generated_header(comment_prefix: str, source_hash: str) -> str:
    return (
        f"{comment_prefix} @generated by scripts/generate-tokens.py; DO NOT EDIT.\n"
        f"{comment_prefix} source: design/tokens.toml\n"
        f"{comment_prefix} source-sha256: {source_hash}\n"
    )


def css_declaration(name: str, value: str | int | float) -> str:
    return f"  --ct-{name}: {value};"


def css_color_declarations(theme: Mapping[str, Any], include_palette: Mapping[str, str] | None = None) -> list[str]:
    colors = theme["colors"]
    lines: list[str] = []
    if include_palette is not None:
        for key, value in include_palette.items():
            lines.append(css_declaration(key.replace("_", "-"), value))
    mapping = (
        ("ink", "ink"),
        ("text", "text"),
        ("text-secondary", "text_secondary"),
        ("text-tertiary", "text_tertiary"),
        ("text-quaternary", "text_quaternary"),
        ("text-disabled", "text_disabled"),
        ("text-on-accent", "text_on_accent"),
        ("bg", "canvas"),
        ("surface", "surface"),
        ("surface-elevated", "surface_elevated"),
        ("surface-muted", "surface_muted"),
        ("surface-sunken", "surface_sunken"),
        ("surface-glass", "surface_glass"),
        ("surface-hover", "surface_hover"),
        ("surface-active", "surface_active"),
        ("surface-selected", "surface_selected"),
        ("overlay", "overlay"),
        ("overlay-strong", "overlay_strong"),
        ("border-light", "border_light"),
        ("border", "border"),
        ("border-heavy", "border_heavy"),
        ("accent", "accent"),
        ("accent-hover", "accent_hover"),
        ("accent-soft", "accent_soft"),
        ("accent-text", "accent_text"),
        ("link-text", "link_text"),
        ("focus-gap", "focus_gap"),
        ("focus-ring", "focus_ring"),
        ("focus", "focus_ring"),
        ("tooltip-bg", "tooltip_bg"),
        ("tooltip-fg", "tooltip_fg"),
        ("tooltip-border", "tooltip_border"),
        ("btn-primary-bg", "button_primary_bg"),
        ("btn-primary-bg-hover", "button_primary_bg_hover"),
        ("btn-primary-fg", "button_primary_fg"),
        ("btn-secondary-bg", "button_secondary_bg"),
        ("btn-secondary-bg-hover", "button_secondary_bg_hover"),
        ("btn-secondary-fg", "button_secondary_fg"),
    )
    for css_name, key in mapping:
        lines.append(css_declaration(css_name, colors[key]))
    for status_name in STATUS_SCHEMA:
        status = theme["status"][status_name]
        lines.extend(
            (
                css_declaration(status_name, status["fg"]),
                css_declaration(f"{status_name}-border", status["border"]),
                css_declaration(f"{status_name}-bg", status["bg"]),
            )
        )
    return lines


def css_shared_declarations(shared: Mapping[str, Any], theme: Mapping[str, Any]) -> list[str]:
    geometry = shared["geometry"]
    typography = shared["typography"]
    motion = shared["motion"]
    lines = [css_declaration("corner-radius-scale", geometry["corner_radius_scale"])]
    for key in ("2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "full"):
        lines.append(css_declaration(f"radius-{key}", geometry[f"radius_{key}"]))
    for key in ("1", "2", "3", "4", "5", "6", "8"):
        lines.append(css_declaration(f"space-{key}", geometry[f"space_{key}"]))
    for css_name, key in (
        ("control-height-sm", "control_height_sm"),
        ("control-height", "control_height"),
        ("control-height-lg", "control_height_lg"),
        ("topbar-height", "topbar_height"),
        ("panel-toolbar-height", "panel_toolbar_height"),
        ("shell-sidebar-width", "shell_sidebar_width"),
        ("navigation-rail-width", "navigation_rail_width"),
        ("content-max-width", "content_max_width"),
        ("hit-target-min", "hit_target_min"),
        ("hit-target-coarse", "hit_target_coarse"),
        ("focus-gap-width", "focus_gap_width"),
        ("focus-ring-width", "focus_ring_width"),
        ("focus-ring-offset", "focus_ring_offset"),
    ):
        lines.append(css_declaration(css_name, geometry[key]))
    for key in SHADOW_KEYS:
        lines.append(css_declaration(f"shadow-{key}", theme["shadow"][key]))
    lines.append("  --ct-shadow-ring: inset 0 0 0 1px var(--ct-border-heavy);")
    for css_name, key in (("font-sans", "font_sans"), ("font-mono", "font_mono")):
        lines.append(css_declaration(css_name, typography[key]))
    for css_name, key in (
        ("text-xs", "text_xs"),
        ("text-sm", "text_sm"),
        ("text-base", "text_base"),
        ("text-lg", "text_lg"),
        ("text-heading-sm", "text_heading_sm"),
        ("text-heading-md", "text_heading_md"),
        ("text-heading-lg", "text_heading_lg"),
        ("text-xl", "text_xl"),
        ("text-2xl", "text_2xl"),
        ("weight-normal", "weight_normal"),
        ("weight-medium", "weight_medium"),
        ("weight-semibold", "weight_semibold"),
        ("weight-bold", "weight_bold"),
        ("leading-tight", "leading_tight"),
        ("leading-snug", "leading_snug"),
        ("leading-normal", "leading_normal"),
        ("leading-relaxed", "leading_relaxed"),
        ("tracking-tight", "tracking_tight"),
        ("tracking-heading", "tracking_heading"),
        ("motion-fast", "fast"),
        ("motion-base", "base"),
        ("motion-panel", "panel"),
        ("easing-standard", "easing_standard"),
        ("easing-enter", "easing_enter"),
        ("easing-exit", "easing_exit"),
    ):
        source = motion if key.startswith("easing_") or key in {"fast", "base", "panel"} else typography
        lines.append(css_declaration(css_name, source[key]))
    return lines


def generate_css(data: Mapping[str, Any], source_hash: str) -> str:
    shared = data["shared"]
    light = data["themes"]["light"]
    dark = data["themes"]["dark"]
    root = css_color_declarations(light, shared["palette"]) + css_shared_declarations(shared, light)
    dark_lines = css_color_declarations(dark)
    dark_lines.extend(css_declaration(f"shadow-{key}", dark["shadow"][key]) for key in SHADOW_KEYS)
    root.extend(
        (
            "  font-family: var(--ct-font-sans);",
            "  color: var(--ct-text);",
            "  background: var(--ct-bg);",
            "  font-synthesis: none;",
            "  text-rendering: optimizeLegibility;",
            "  -webkit-font-smoothing: antialiased;",
            "  -moz-osx-font-smoothing: grayscale;",
        )
    )
    return "\n".join(
        (
            CSS_START,
            generated_header(" *", source_hash).rstrip(),
            " */",
            ":root {",
            *root,
            "}",
            "",
            ':root[data-theme="dark"],',
            '.c-config-provider[data-theme="dark"] {',
            "  color-scheme: dark;",
            *dark_lines,
            "}",
            CSS_END,
            "",
        )
    )


def ts_key(name: str) -> str:
    parts = name.split("_")
    value = parts[0] + "".join(part[:1].upper() + part[1:] for part in parts[1:])
    return value if re.fullmatch(r"[A-Za-z_$][A-Za-z0-9_$]*", value) else json.dumps(value)


def ts_object(mapping: Mapping[str, Any], indent: int = 0) -> list[str]:
    lines = ["{"]
    for key, value in mapping.items():
        prefix = " " * (indent + 2) + ts_key(key) + ": "
        if isinstance(value, Mapping):
            nested = ts_object(value, indent + 2)
            lines.append(prefix + nested[0])
            lines.extend(" " * (indent + 2) + line for line in nested[1:-1])
            lines.append(" " * (indent + 2) + nested[-1] + ",")
        else:
            lines.append(prefix + json.dumps(value, ensure_ascii=True) + ",")
    lines.append(" " * indent + "}")
    return lines


def ts_export(name: str, mapping: Mapping[str, Any], source_hash: str | None = None) -> str:
    lines = [f"export const {name} = " + ts_object(mapping)[0]]
    lines.extend(ts_object(mapping)[1:-1])
    lines.append(ts_object(mapping)[-1] + " as const;")
    return "\n".join(lines)


def type_script_theme(data: Mapping[str, Any], theme_name: str) -> dict[str, Any]:
    shared = data["shared"]
    theme = data["themes"][theme_name]
    colors = theme["colors"]
    color: dict[str, Any] = {
        **{key.replace("gray_", "gray"): value for key, value in shared["palette"].items()},
        "canvas": colors["canvas"],
        "sidebar": colors["sidebar"],
        "surface": colors["surface"],
        "surfaceElevated": colors["surface_elevated"],
        "surfaceSubtle": colors["surface_muted"],
        "surfaceSunken": colors["surface_sunken"],
        "surfaceGlass": colors["surface_glass"],
        "surfaceHover": colors["surface_hover"],
        "surfaceActive": colors["surface_active"],
        "surfaceSelected": colors["surface_selected"],
        "overlay": colors["overlay"],
        "overlayStrong": colors["overlay_strong"],
        "ink": colors["ink"],
        "border": colors["border"],
        "borderLight": colors["border_light"],
        "borderStrong": colors["border_heavy"],
        "text": colors["text"],
        "textMuted": colors["text_secondary"],
        "textSubtle": colors["text_tertiary"],
        "textQuaternary": colors["text_quaternary"],
        "textDisabled": colors["text_disabled"],
        "textOnAccent": colors["text_on_accent"],
        "control": colors["button_secondary_bg"],
        "controlHover": colors["button_secondary_bg_hover"],
        "controlActive": colors["control_active"],
        "inverse": colors["button_primary_bg"],
        "inverseText": colors["button_primary_fg"],
        "focus": colors["focus_ring"],
        "focusGap": colors["focus_gap"],
        "focusRing": colors["focus_ring"],
        "accent": colors["accent"],
        "accentHover": colors["accent_hover"],
        "accentSoft": colors["accent_soft"],
        "accentText": colors["accent_text"],
        "linkText": colors["link_text"],
        "tooltipBg": colors["tooltip_bg"],
        "tooltipFg": colors["tooltip_fg"],
        "tooltipBorder": colors["tooltip_border"],
        "buttonPrimaryBg": colors["button_primary_bg"],
        "buttonPrimaryBgHover": colors["button_primary_bg_hover"],
        "buttonPrimaryFg": colors["button_primary_fg"],
        "buttonSecondaryBg": colors["button_secondary_bg"],
        "buttonSecondaryBgHover": colors["button_secondary_bg_hover"],
        "buttonSecondaryFg": colors["button_secondary_fg"],
    }
    for name in STATUS_SCHEMA:
        color[name] = theme["status"][name]["fg"]
        color[f"{name}Border"] = theme["status"][name]["border"]
        color[f"{name}Bg"] = theme["status"][name]["bg"]
    geometry = shared["geometry"]
    typography = shared["typography"]
    return {
        "color": color,
        "radius": {
            "2xs": geometry["radius_2xs"],
            "xs": geometry["radius_xs"],
            "sm": geometry["radius_sm"],
            "md": geometry["radius_md"],
            "lg": geometry["radius_lg"],
            "xl": geometry["radius_xl"],
            "2xl": geometry["radius_2xl"],
            "3xl": geometry["radius_3xl"],
            "4xl": geometry["radius_4xl"],
            "full": geometry["radius_full"],
        },
        "shadow": dict(theme["shadow"]),
        "font": {"sans": typography["font_sans"], "mono": typography["font_mono"]},
        "size": {
            "controlHeight": geometry["control_height"],
            "controlHeightSm": geometry["control_height_sm"],
            "controlHeightLg": geometry["control_height_lg"],
            "topbarHeight": geometry["topbar_height"],
            "panelToolbarHeight": geometry["panel_toolbar_height"],
            "navigationRailWidth": geometry["navigation_rail_width"],
            "pageMaxWidth": geometry["content_max_width"],
            "gap": geometry["space_4"],
            "hitTargetMin": geometry["hit_target_min"],
            "hitTargetCoarse": geometry["hit_target_coarse"],
            "focusGapWidth": geometry["focus_gap_width"],
            "focusRingWidth": geometry["focus_ring_width"],
            "focusRingOffset": geometry["focus_ring_offset"],
        },
        "motion": dict(shared["motion"]),
        "spacing": {key.replace("space_", "space"): geometry[key] for key in ("space_1", "space_2", "space_3", "space_4", "space_5", "space_6", "space_8")},
        "typography": dict(typography),
    }


def generate_typescript(data: Mapping[str, Any], source_hash: str) -> str:
    light = type_script_theme(data, "light")
    dark = type_script_theme(data, "dark")
    aliases = {
        "color": {
            "canvas": "--ct-bg",
            "surface": "--ct-surface",
            "surfaceElevated": "--ct-surface-elevated",
            "surfaceSubtle": "--ct-surface-muted",
            "surfaceSunken": "--ct-surface-sunken",
            "border": "--ct-border",
            "borderLight": "--ct-border-light",
            "borderStrong": "--ct-border-heavy",
            "text": "--ct-text",
            "textMuted": "--ct-text-secondary",
            "textSubtle": "--ct-text-tertiary",
            "textQuaternary": "--ct-text-quaternary",
            "textDisabled": "--ct-text-disabled",
            "inverse": "--ct-btn-primary-bg",
            "inverseText": "--ct-btn-primary-fg",
            "focus": "--ct-focus-ring",
            "focusGap": "--ct-focus-gap",
            "focusRing": "--ct-focus-ring",
            "accent": "--ct-accent",
            "accentHover": "--ct-accent-hover",
            "accentSoft": "--ct-accent-soft",
            "accentText": "--ct-accent-text",
            "linkText": "--ct-link-text",
            "tooltipBg": "--ct-tooltip-bg",
            "tooltipFg": "--ct-tooltip-fg",
            "tooltipBorder": "--ct-tooltip-border",
        },
        "radius": {
            "2xs": "--ct-radius-2xs",
            "xs": "--ct-radius-xs",
            "sm": "--ct-radius-sm",
            "md": "--ct-radius-md",
            "lg": "--ct-radius-lg",
            "xl": "--ct-radius-xl",
            "2xl": "--ct-radius-2xl",
            "3xl": "--ct-radius-3xl",
            "4xl": "--ct-radius-4xl",
            "full": "--ct-radius-full",
        },
        "shadow": {key: f"--ct-shadow-{key}" for key in SHADOW_KEYS},
        "font": {"sans": "--ct-font-sans", "mono": "--ct-font-mono"},
        "size": {
            "controlHeight": "--ct-control-height",
            "controlHeightSm": "--ct-control-height-sm",
            "controlHeightLg": "--ct-control-height-lg",
            "pageMaxWidth": "--ct-content-max-width",
        },
        "motion": {"fast": "--ct-motion-fast", "base": "--ct-motion-base", "panel": "--ct-motion-panel"},
    }
    header = generated_header("//", source_hash).rstrip()
    return "\n\n".join(
        (
            header,
            ts_export("tokens", light),
            ts_export("darkTokens", dark),
            "export const themeTokens = {\n  light: tokens,\n  dark: darkTokens,\n} as const;",
            ts_export("cssTokenAliases", aliases),
            "type WidenTokenLeaves<T> = {\n"
            "  readonly [Key in keyof T]: T[Key] extends string ? string : T[Key] extends number ? number : WidenTokenLeaves<T[Key]>;\n"
            "};\n\n"
            "export type ThemeTokens = WidenTokenLeaves<typeof tokens>;\n"
            "export type ThemeName = keyof typeof themeTokens;\n",
        )
    )


RUST_FIELDS = (
    ("canvas", "colors.canvas"),
    ("sidebar", "colors.sidebar"),
    ("surface_sunken", "colors.surface_sunken"),
    ("surface_muted", "colors.surface_muted"),
    ("surface", "colors.surface"),
    ("surface_elevated", "colors.surface_elevated"),
    ("surface_glass", "colors.surface_glass"),
    ("surface_hover", "colors.surface_hover"),
    ("surface_active", "colors.surface_active"),
    ("surface_selected", "colors.surface_selected"),
    ("overlay", "colors.overlay"),
    ("overlay_strong", "colors.overlay_strong"),
    ("ink", "colors.ink"),
    ("text", "colors.text"),
    ("text_secondary", "colors.text_secondary"),
    ("text_tertiary", "colors.text_tertiary"),
    ("text_quaternary", "colors.text_quaternary"),
    ("text_disabled", "colors.text_disabled"),
    ("text_on_accent", "colors.text_on_accent"),
    ("border_light", "colors.border_light"),
    ("border", "colors.border"),
    ("border_heavy", "colors.border_heavy"),
    ("accent", "colors.accent"),
    ("accent_hover", "colors.accent_hover"),
    ("accent_soft", "colors.accent_soft"),
    ("accent_text", "colors.accent_text"),
    ("link_text", "colors.link_text"),
    ("focus_gap", "colors.focus_gap"),
    ("focus_ring", "colors.focus_ring"),
    ("tooltip_bg", "colors.tooltip_bg"),
    ("tooltip_fg", "colors.tooltip_fg"),
    ("tooltip_border", "colors.tooltip_border"),
    ("primary_button_bg", "colors.button_primary_bg"),
    ("primary_button_bg_hover", "colors.button_primary_bg_hover"),
    ("primary_button_fg", "colors.button_primary_fg"),
    ("secondary_button_bg", "colors.button_secondary_bg"),
    ("secondary_button_bg_hover", "colors.button_secondary_bg_hover"),
    ("secondary_button_fg", "colors.button_secondary_fg"),
    ("control_active", "colors.control_active"),
    ("inverse", "colors.button_primary_bg"),
    ("on_inverse", "colors.button_primary_fg"),
    ("success", "status.success.fg"),
    ("success_border", "status.success.border"),
    ("success_soft", "status.success.bg"),
    ("warning", "status.warning.fg"),
    ("warning_border", "status.warning.border"),
    ("warning_soft", "status.warning.bg"),
    ("danger", "status.danger.fg"),
    ("danger_border", "status.danger.border"),
    ("danger_soft", "status.danger.bg"),
    ("info", "status.info.fg"),
    ("info_border", "status.info.border"),
    ("info_soft", "status.info.bg"),
)


def nested(mapping: Mapping[str, Any], path: str) -> str:
    value: Any = mapping
    for key in path.split("."):
        value = value[key]
    assert isinstance(value, str)
    return value


def rust_color(value: str) -> str:
    digits = value[1:]
    if len(digits) == 6:
        return f"rgb(0x{digits})"
    return f"rgba(0x{digits})"


def generate_rust(data: Mapping[str, Any], source_hash: str) -> str:
    fields = "\n".join(f"    pub {name}: Color," for name, _ in RUST_FIELDS)
    variants: list[str] = []
    for mode in ("Light", "Dark"):
        theme = data["themes"][mode.lower()]
        assignments = "\n".join(
            f"            {name}: {rust_color(nested(theme, path))}," for name, path in RUST_FIELDS
        )
        variants.append(f"        ThemeMode::{mode} => Tokens {{\n{assignments}\n        }},")
    header = generated_header("//", source_hash).rstrip()
    return f"""{header}

use iced::{{Color, Theme, theme::Palette}};
use tessera_core::ThemeMode;

#[derive(Debug, Clone, Copy)]
pub struct Tokens {{
{fields}
}}

#[must_use]
pub fn tokens(mode: ThemeMode) -> Tokens {{
    match mode {{
{chr(10).join(variants)}
    }}
}}

#[must_use]
pub fn theme(mode: ThemeMode) -> Theme {{
    let t = tokens(mode);
    Theme::custom(
        match mode {{
            ThemeMode::Light => "Tessera Light",
            ThemeMode::Dark => "Tessera Dark",
        }},
        Palette {{
            background: t.canvas,
            text: t.text,
            primary: t.accent,
            success: t.success,
            warning: t.warning,
            danger: t.danger,
        }},
    )
}}

fn rgb(value: u32) -> Color {{
    Color::from_rgb8(
        ((value >> 16) & 0xff) as u8,
        ((value >> 8) & 0xff) as u8,
        (value & 0xff) as u8,
    )
}}

fn rgba(value: u32) -> Color {{
    Color::from_rgba8(
        ((value >> 24) & 0xff) as u8,
        ((value >> 16) & 0xff) as u8,
        ((value >> 8) & 0xff) as u8,
        (value & 0xff) as f32 / 255.0,
    )
}}
"""


def replace_css_block(path: Path, generated: str) -> str:
    if not generated.isascii():
        raise SchemaError("generated CSS token block is not ASCII")
    current = path.read_text(encoding="utf-8")
    start = current.find(CSS_START)
    end = current.find(CSS_END)
    if start < 0 or end < 0 or end < start:
        raise SchemaError(f"{path} must contain the generated token markers")
    end += len(CSS_END)
    return current[:start] + generated.rstrip() + current[end:]


def generate_outputs(root: Path) -> tuple[dict[Path, str], str]:
    data, source_hash = load_tokens(root / "design/tokens.toml")
    css = generate_css(data, source_hash)
    outputs = {
        root / CSS_TARGET: replace_css_block(root / CSS_TARGET, css),
        root / TS_TARGET: generate_typescript(data, source_hash),
        root / RUST_TARGET: generate_rust(data, source_hash),
    }
    return outputs, source_hash


def run(root: Path, check: bool) -> int:
    try:
        outputs, source_hash = generate_outputs(root)
    except (OSError, SchemaError) as error:
        print(f"token generation failed: {error}", file=sys.stderr)
        return 2

    drift = [path for path, expected in outputs.items() if not path.exists() or path.read_text(encoding="utf-8") != expected]
    if check:
        if drift:
            for path in drift:
                print(f"token output drift: {path.relative_to(root)}", file=sys.stderr)
            return 1
        print(f"token outputs match source-sha256 {source_hash}")
        return 0

    for path in drift:
        if path != root / CSS_TARGET and not outputs[path].isascii():
            raise SchemaError(f"generated output for {path.relative_to(root)} is not ASCII")
        path.write_text(outputs[path], encoding="utf-8", newline="\n")
        print(f"generated {path.relative_to(root)}")
    print(f"token source-sha256 {source_hash}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail when a generated target differs from TOML")
    parser.add_argument("--root", type=Path, default=ROOT, help="project root; used by the generator test")
    args = parser.parse_args()
    return run(args.root.resolve(), args.check)


if __name__ == "__main__":
    raise SystemExit(main())
