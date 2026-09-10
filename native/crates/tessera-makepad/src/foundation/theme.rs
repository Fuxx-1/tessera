use crate::makepad_widgets::*;
use tessera_core::ThemeMode;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ThemeTokens {
    pub name: &'static str,
    pub canvas: &'static str,
    pub sidebar: &'static str,
    pub surface_sunken: &'static str,
    pub surface_muted: &'static str,
    pub surface: &'static str,
    pub surface_elevated: &'static str,
    pub surface_glass: &'static str,
    pub surface_hover: &'static str,
    pub surface_active: &'static str,
    pub surface_selected: &'static str,
    pub overlay: &'static str,
    pub overlay_strong: &'static str,
    pub ink: &'static str,
    pub text: &'static str,
    pub text_secondary: &'static str,
    pub text_tertiary: &'static str,
    pub text_quaternary: &'static str,
    pub text_disabled: &'static str,
    pub text_on_accent: &'static str,
    pub border_light: &'static str,
    pub border: &'static str,
    pub border_heavy: &'static str,
    pub accent: &'static str,
    pub accent_hover: &'static str,
    pub accent_soft: &'static str,
    pub accent_text: &'static str,
    pub chart_primary: &'static str,
    pub chart_secondary: &'static str,
    pub chart_positive: &'static str,
    pub chart_negative: &'static str,
    pub chart_warning: &'static str,
    pub chart_selection: &'static str,
    pub link_text: &'static str,
    pub focus_gap: &'static str,
    pub focus_ring: &'static str,
    pub tooltip_bg: &'static str,
    pub tooltip_fg: &'static str,
    pub tooltip_border: &'static str,
    pub primary_button_bg: &'static str,
    pub primary_button_bg_hover: &'static str,
    pub primary_button_fg: &'static str,
    pub secondary_button_bg: &'static str,
    pub secondary_button_bg_hover: &'static str,
    pub secondary_button_fg: &'static str,
    pub control_active: &'static str,
    pub inverse: &'static str,
    pub on_inverse: &'static str,
    pub success: &'static str,
    pub success_border: &'static str,
    pub success_soft: &'static str,
    pub warning: &'static str,
    pub warning_border: &'static str,
    pub warning_soft: &'static str,
    pub danger: &'static str,
    pub danger_border: &'static str,
    pub danger_soft: &'static str,
    pub info: &'static str,
    pub info_border: &'static str,
    pub info_soft: &'static str,
    pub overlay_shadow: &'static str,
    pub overlay_shadow_strong: &'static str,
    pub transparent: &'static str,
    pub watermark: &'static str,
}

impl ThemeTokens {
    pub fn summary(self) -> String {
        format!(
            "{} canvas {} / surface {} / accent {} / focus {}",
            self.name, self.canvas, self.surface, self.accent, self.focus_ring
        )
    }
}

pub const LIGHT: ThemeTokens = ThemeTokens {
    name: "Light",
    canvas: "#f9f9f9",
    sidebar: "#f3f3f2",
    surface_sunken: "#f0f0ee",
    surface_muted: "#f5f5f4",
    surface: "#ffffff",
    surface_elevated: "#ffffff",
    surface_glass: "#f9f9f9f0",
    surface_hover: "#1a1c1f0a",
    surface_active: "#1a1c1f14",
    surface_selected: "#1a1c1f0d",
    overlay: "#00000047",
    overlay_strong: "#0000006b",
    ink: "#1a1c1f",
    text: "#1a1c1f",
    text_secondary: "#5d5d5d",
    text_tertiary: "#6b6d6f",
    text_quaternary: "#6e7072",
    text_disabled: "#6b6d6f",
    text_on_accent: "#ffffff",
    border_light: "#1a1c1f0d",
    border: "#1a1c1f14",
    border_heavy: "#1a1c1f24",
    accent: "#0285ff",
    accent_hover: "#339cff",
    accent_soft: "#e5f3ff",
    accent_text: "#005ea8",
    chart_primary: "#1a73e8",
    chart_secondary: "#8250df",
    chart_positive: "#078255",
    chart_negative: "#c83a3a",
    chart_warning: "#8a6724",
    chart_selection: "#1a1c1f",
    link_text: "#005ea8",
    focus_gap: "#ffffff",
    focus_ring: "#006dba",
    tooltip_bg: "#1f1f1d",
    tooltip_fg: "#ffffff",
    tooltip_border: "#1f1f1d",
    primary_button_bg: "#0d0d0d",
    primary_button_bg_hover: "#2c2c2a",
    primary_button_fg: "#ffffff",
    secondary_button_bg: "#1a1c1f0d",
    secondary_button_bg_hover: "#1a1c1f14",
    secondary_button_fg: "#1a1c1f",
    control_active: "#1a1c1f1f",
    inverse: "#0d0d0d",
    on_inverse: "#ffffff",
    success: "#2f6d4a",
    success_border: "#9fc1ac",
    success_soft: "#e9f4ec",
    warning: "#8a6724",
    warning_border: "#ddc891",
    warning_soft: "#fbf8ef",
    danger: "#9f2424",
    danger_border: "#ddc1c1",
    danger_soft: "#fbf5f5",
    info: "#4d5f77",
    info_border: "#b8cfde",
    info_soft: "#f4f7fa",
    overlay_shadow: "#00000038",
    overlay_shadow_strong: "#00000052",
    transparent: "#00000000",
    watermark: "#1a1c1f1a",
};

pub const DARK: ThemeTokens = ThemeTokens {
    name: "Dark",
    canvas: "#181818",
    sidebar: "#202020",
    surface_sunken: "#0d0d0d",
    surface_muted: "#212121",
    surface: "#303030",
    surface_elevated: "#303030",
    surface_glass: "#212121eb",
    surface_hover: "#ffffff0f",
    surface_active: "#ffffff1a",
    surface_selected: "#ffffff14",
    overlay: "#00000075",
    overlay_strong: "#00000094",
    ink: "#ededed",
    text: "#ededed",
    text_secondary: "#b6b6b6",
    text_tertiary: "#a3a3a3",
    text_quaternary: "#9f9f9f",
    text_disabled: "#999999",
    text_on_accent: "#ffffff",
    border_light: "#ffffff0f",
    border: "#ffffff1a",
    border_heavy: "#ffffff2e",
    accent: "#0a8bff",
    accent_hover: "#4aa8ff",
    accent_soft: "#0285ff38",
    accent_text: "#66b5f0",
    chart_primary: "#69a7ff",
    chart_secondary: "#b8a0ff",
    chart_positive: "#67cf9b",
    chart_negative: "#f0786f",
    chart_warning: "#e3b341",
    chart_selection: "#ededed",
    link_text: "#66b5f0",
    focus_gap: "#303030",
    focus_ring: "#66b5f0",
    tooltip_bg: "#ededed",
    tooltip_fg: "#0d0d0d",
    tooltip_border: "#ededed",
    primary_button_bg: "#ededed",
    primary_button_bg_hover: "#ffffff",
    primary_button_fg: "#0d0d0d",
    secondary_button_bg: "#ffffff14",
    secondary_button_bg_hover: "#ffffff1f",
    secondary_button_fg: "#ededed",
    control_active: "#ffffff29",
    inverse: "#ededed",
    on_inverse: "#0d0d0d",
    success: "#6cc08b",
    success_border: "#6cc08b66",
    success_soft: "#6cc08b24",
    warning: "#e3b341",
    warning_border: "#e3b34166",
    warning_soft: "#e3b34124",
    danger: "#f0786f",
    danger_border: "#f0786fb3",
    danger_soft: "#f0786f08",
    info: "#8ab3d6",
    info_border: "#8ab3d666",
    info_soft: "#8ab3d624",
    overlay_shadow: "#00000066",
    overlay_shadow_strong: "#0000008a",
    transparent: "#00000000",
    watermark: "#ededed1a",
};

pub fn tokens(mode: ThemeMode) -> &'static ThemeTokens {
    match mode {
        ThemeMode::Light => &LIGHT,
        ThemeMode::Dark => &DARK,
    }
}

// Convert only the frozen token table, never parse a user-provided theme script.
pub(crate) fn rgba(value: &'static str) -> u32 {
    crate::makepad_widgets::makepad_script::colorhex::hex_bytes_to_u32(
        value
            .strip_prefix('#')
            .expect("theme token prefix")
            .as_bytes(),
    )
    .expect("frozen theme tokens must be valid RGBA")
}

fn color(value: &'static str) -> ScriptValue {
    ScriptValue::from_color(rgba(value))
}

pub(crate) fn install(vm: &mut ScriptVm) {
    for mode in [ThemeMode::Light, ThemeMode::Dark] {
        let p = tokens(mode);
        let base = match mode {
            ThemeMode::Light => script_eval!(vm, { mod.themes.light }),
            ThemeMode::Dark => script_eval!(vm, { mod.themes.dark }),
        };
        let disabled_inset = match mode {
            ThemeMode::Light => p.surface_sunken,
            ThemeMode::Dark => p.surface_muted,
        };
        // Preserve the complete upstream theme contract; project owned semantics.
        let themed = script_eval!(vm, {
            use mod.turtle.*
            #(base){
                mspace_v_1: Inset{top: 0.0, right: 0.0, bottom: 0.0, left: 0.0}
                color_bg_app: #(color(p.canvas))
                color_fg_app: #(color(p.surface))
                color_text: #(color(p.text))
                color_text_val: #(color(p.text_secondary))
                color_text_meta: #(color(p.text_tertiary))
                color_text_placeholder: #(color(p.text_tertiary))
                color_text_placeholder_hover: #(color(p.text_tertiary))
                color_text_disabled: #(color(p.text_disabled))
                color_chart_primary: #(color(p.chart_primary))
                color_chart_secondary: #(color(p.chart_secondary))
                color_chart_positive: #(color(p.chart_positive))
                color_chart_negative: #(color(p.chart_negative))
                color_chart_warning: #(color(p.chart_warning))
                color_chart_selection: #(color(p.chart_selection))
                color_label_inner: #(color(p.text))
                color_label_inner_focus: #(color(p.text))
                color_label_inner_disabled: #(color(p.text_disabled))
                color_label_outer: #(color(p.text))
                color_label_outer_focus: #(color(p.text))
                color_label_outer_disabled: #(color(p.text_disabled))
                color_bevel: #(color(p.border))
                color_bevel_hover: #(color(p.focus_ring))
                color_bevel_focus: #(color(p.focus_ring))
                color_bevel_down: #(color(p.focus_ring))
                color_inset: #(color(p.surface))
                color_inset_hover: #(color(p.surface))
                color_inset_focus: #(color(p.surface))
                color_inset_down: #(color(p.surface_muted))
                color_inset_disabled: #(color(disabled_inset))
                color_selection: #(color(p.accent_soft))
                color_selection_hover: #(color(p.accent_soft))
                color_selection_focus: #(color(p.accent_soft))
                color_selection_down: #(color(p.accent_soft))
                color_tessera_accent: #(color(p.accent))
                color_tessera_primary: #(color(p.primary_button_bg))
                color_tessera_primary_text: #(color(p.primary_button_fg))
                color_tessera_text_on_accent: #(color(p.text_on_accent))
                color_tessera_transparent: #(color(p.transparent))
                color_tessera_watermark: #(color(p.watermark))
                color_tessera_shadow: #(color(p.overlay_shadow))
                color_tessera_shadow_strong: #(color(p.overlay_shadow_strong))
                color_tessera_modal_scrim: #(color(p.overlay_strong))
            }
        });
        match mode {
            ThemeMode::Light => {
                let _ = script_eval!(vm, { mod.themes.light = #(themed) });
            }
            ThemeMode::Dark => {
                let _ = script_eval!(vm, { mod.themes.dark = #(themed) });
            }
        }
    }
}

pub(crate) fn select(vm: &mut ScriptVm, mode: ThemeMode) {
    match mode {
        ThemeMode::Light => {
            let _ = script_eval!(vm, { mod.theme = mod.themes.light });
        }
        ThemeMode::Dark => {
            let _ = script_eval!(vm, { mod.theme = mod.themes.dark });
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{DARK, LIGHT, tokens};
    use tessera_core::ThemeMode;

    #[test]
    fn light_and_dark_tokens_keep_the_frozen_theme_values() {
        assert_eq!(LIGHT.canvas, "#f9f9f9");
        assert_eq!(LIGHT.accent, "#0285ff");
        assert_eq!(DARK.canvas, "#181818");
        assert_eq!(DARK.focus_ring, "#66b5f0");
    }

    #[test]
    fn resolving_theme_tokens_is_total_for_the_frozen_theme_modes() {
        assert_eq!(tokens(ThemeMode::Light).surface, "#ffffff");
        assert_eq!(tokens(ThemeMode::Dark).surface, "#303030");
    }

    #[test]
    fn chart_series_and_selection_have_contrast_in_each_theme() {
        let luminance = |hex| {
            let rgba = super::color(hex).as_color().unwrap();
            [24, 16, 8]
                .into_iter()
                .zip([0.2126, 0.7152, 0.0722])
                .map(|(shift, weight)| {
                    let value = ((rgba >> shift) & 255) as f64 / 255.0;
                    let linear = if value <= 0.04045 {
                        value / 12.92
                    } else {
                        ((value + 0.055) / 1.055).powf(2.4)
                    };
                    linear * weight
                })
                .sum::<f64>()
        };
        for p in [LIGHT, DARK] {
            let background = luminance(p.surface);
            let colors = [
                p.chart_primary,
                p.chart_secondary,
                p.chart_positive,
                p.chart_negative,
                p.chart_warning,
                p.chart_selection,
            ];
            assert_eq!(
                colors
                    .into_iter()
                    .collect::<std::collections::BTreeSet<_>>()
                    .len(),
                6
            );
            for color in colors {
                let foreground = luminance(color);
                let contrast =
                    (foreground.max(background) + 0.05) / (foreground.min(background) + 0.05);
                assert!(contrast >= 4.5, "{} {color}: {contrast}", p.name);
            }
        }
    }
}
