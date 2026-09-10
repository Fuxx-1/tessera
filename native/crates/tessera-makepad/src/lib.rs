#![forbid(unsafe_code)]

pub use makepad_widgets;

pub mod components;
pub mod foundation;
pub mod security;

/// Register Tessera's themes, native defaults and component widgets.
/// Host pages and the Gallery-specific shell are registered afterwards.
pub fn script_mod(vm: &mut makepad_widgets::ScriptVm, theme: tessera_core::ThemeMode) {
    script_mod_with(vm, theme, |_| {});
}

/// Configure trusted host font/style overrides before widgets capture their theme.
/// The hook is compiled application code, never user-provided script or markup.
/// ThemeTemplates must keep each evaluated host graph rooted across reapply.
pub fn script_mod_with(
    vm: &mut makepad_widgets::ScriptVm,
    theme: tessera_core::ThemeMode,
    configure_theme: impl FnOnce(&mut makepad_widgets::ScriptVm),
) {
    makepad_widgets::theme_mod(vm);
    foundation::theme::install(vm);
    configure_theme(vm);
    foundation::theme::select(vm, theme);
    makepad_widgets::widgets_mod(vm);
    foundation::theme_templates::install_text_layout_defaults(vm);
    foundation::theme_templates::install_surface_frame(vm);
    foundation::theme_templates::install_overlay_defaults(vm);
    foundation::theme_templates::install_choice_defaults(vm);
    foundation::vector::script_mod(vm);
    foundation::activity::script_mod(vm);
    foundation::document_view::script_mod(vm);
    components::surfaces::script_mod(vm);
}

#[cfg(test)]
mod tests {
    use super::*;
    use makepad_widgets::*;
    use tessera_core::ThemeMode;

    #[test]
    fn standalone_setup_instantiates_every_component_without_gallery_types() {
        for mode in [ThemeMode::Light, ThemeMode::Dark] {
            let mut cx = Cx::new(Box::new(|_, _| {}));
            cx.with_vm(|vm| {
                super::script_mod(vm, mode);
                let widgets = script_eval!(vm, { mod.widgets }).as_object().unwrap();
                for definition in components::definitions() {
                    let name = components::surface(definition.id)
                        .availability()
                        .widget()
                        .unwrap();
                    let value = vm
                        .bx
                        .heap
                        .value(widgets, LiveId::from_str(name).into(), NoTrap);
                    assert!(value.as_object().is_some(), "missing {name}");
                    assert!(
                        !WidgetRef::script_from_value(vm, value).is_empty(),
                        "uninstantiable {name}"
                    );
                }
            });
        }
    }

    #[test]
    fn every_chart_captures_the_shared_palette_at_registration() {
        for mode in [ThemeMode::Light, ThemeMode::Dark] {
            let p = foundation::theme::tokens(mode);
            let mut cx = Cx::new(Box::new(|_, _| {}));
            cx.with_vm(|vm| {
                super::script_mod(vm, mode);
                let widgets = script_eval!(vm, { mod.widgets }).as_object().unwrap();
                for (name, field, expected) in [
                    ("TesseraAreaChart", "fill_color", p.chart_secondary),
                    ("TesseraBarChart", "positive", p.chart_primary),
                    ("TesseraFunnelChart", "accent", p.chart_secondary),
                    ("TesseraGaugeChart", "accent", p.chart_primary),
                    ("TesseraHeatmap", "accent", p.chart_primary),
                    ("TesseraLineChart", "accent", p.chart_primary),
                    ("TesseraMindMap", "accent", p.chart_secondary),
                    ("TesseraOrganizationChart", "accent", p.chart_primary),
                    ("TesseraPieChart", "accent", p.chart_primary),
                    ("TesseraRadarChart", "accent", p.chart_primary),
                    ("TesseraSankeyChart", "accent", p.chart_primary),
                    ("TesseraScatterChart", "point_color", p.chart_positive),
                    ("TesseraSparkline", "trend", p.chart_positive),
                    ("TesseraTreemap", "accent", p.chart_primary),
                    ("TesseraWordCloud", "accent", p.chart_primary),
                ] {
                    let prototype = vm
                        .bx
                        .heap
                        .value(widgets, LiveId::from_str(name).into(), NoTrap)
                        .as_object()
                        .unwrap();
                    for (field, hex) in [(field, expected), ("selection", p.chart_selection)] {
                        let actual = vm
                            .bx
                            .heap
                            .value(prototype, LiveId::from_str(field).into(), NoTrap)
                            .as_color();
                        let expected = makepad_script::colorhex::hex_bytes_to_u32(
                            hex.strip_prefix('#').unwrap().as_bytes(),
                        )
                        .unwrap();
                        assert_eq!(actual, Some(expected), "{mode:?} {name}.{field}");
                    }
                }
            });
        }
    }
}
