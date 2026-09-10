use crate::makepad_widgets::*;
use tessera_core::ThemeMode;

/// Shared component-frame geometry in DIP. Keep these values in Rust so every
/// Makepad prototype and its verification code use one stable contract.
pub const SURFACE_FRAME_PADDING_X: f64 = 16.0;
pub const SURFACE_FRAME_PADDING_Y: f64 = 14.0;
pub const SURFACE_FRAME_SPACING: f64 = 10.0;
pub const SURFACE_FRAME_RADIUS: f64 = 6.0;

/// Keep Label's constructor wrapping policy explicit in both theme graphs.
/// An omitted live Flow reloads its type default (non-wrapping) on reapply.
pub fn install_text_layout_defaults(vm: &mut ScriptVm) {
    let _ = script_eval!(vm, {
        use mod.prelude.widgets_internal.*
        mod.widgets.Label = mod.widgets.Label{
            flow: Flow.Right{wrap: true}
        }
    });
}

/// Shared root frame for component-owned surfaces. Component prototypes inherit
/// this geometry and palette while retaining their own Rust widget/state tree.
pub fn install_surface_frame(vm: &mut ScriptVm) {
    let _ = script_eval!(vm, {
        use mod.prelude.widgets_internal.*
        use mod.widgets.*
        mod.widgets.TesseraSurfaceFrame = mod.widgets.RoundedView{
            width: Fill
            height: Fit
            flow: Down
            spacing: #(SURFACE_FRAME_SPACING)
            padding: Inset{left: #(SURFACE_FRAME_PADDING_X), right: #(SURFACE_FRAME_PADDING_X), top: #(SURFACE_FRAME_PADDING_Y), bottom: #(SURFACE_FRAME_PADDING_Y)}
            show_bg: true
            draw_bg +: {
                color: theme.color_fg_app
                border_radius: #(SURFACE_FRAME_RADIUS)
                border_size: 1.0
                border_color: theme.color_bevel
            }
        }
    });
}

/// Reuse native shadow shaders without changing popup ownership or hit geometry.
pub fn install_overlay_defaults(vm: &mut ScriptVm) {
    use super::overlay::{OverlaySurface, visual};
    let popup = visual(OverlaySurface::Popover);
    let modal = visual(OverlaySurface::Modal);
    let drawer = visual(OverlaySurface::Drawer);
    let message = visual(OverlaySurface::Tooltip);
    let _ = script_eval!(vm, {
        use mod.prelude.widgets_internal.*
        use mod.widgets.*
        mod.widgets.TesseraPopupSurface = mod.widgets.RoundedShadowView{
            draw_bg +: {
                color: theme.color_fg_app
                border_radius: #(popup.shader_radius())
                border_size: 1.0
                border_color: theme.color_bevel
                shadow_color: theme.color_tessera_shadow
                shadow_radius: #(popup.shadow_radius)
                shadow_offset: vec2(#(popup.shadow_offset_x), #(popup.shadow_offset_y))
            }
        }
        mod.widgets.TesseraModalSurface = mod.widgets.TesseraPopupSurface{
            draw_bg +: {
                border_radius: #(modal.shader_radius())
                shadow_color: theme.color_tessera_shadow_strong
                shadow_radius: #(modal.shadow_radius)
                shadow_offset: vec2(#(modal.shadow_offset_x), #(modal.shadow_offset_y))
            }
        }
        mod.widgets.TesseraDrawerSurface = mod.widgets.TesseraPopupSurface{
            draw_bg +: {
                border_radius: #(drawer.shader_radius())
                shadow_color: theme.color_tessera_shadow_strong
                shadow_radius: #(drawer.shadow_radius)
                shadow_offset: vec2(#(drawer.shadow_offset_x), #(drawer.shadow_offset_y))
            }
        }
        mod.widgets.TesseraMessageSurface = mod.widgets.TesseraPopupSurface{
            draw_bg +: {
                border_radius: #(message.shader_radius())
                shadow_radius: #(message.shadow_radius)
                shadow_offset: vec2(#(message.shadow_offset_x), #(message.shadow_offset_y))
            }
        }
        mod.widgets.Modal = mod.widgets.Modal{
            bg_view +: {draw_bg +: {color: theme.color_tessera_modal_scrim}}
        }
    });
}

/// Keep native choice geometry and events while giving marks opaque semantic colors.
pub fn install_choice_defaults(vm: &mut ScriptVm) {
    let _ = script_eval!(vm, {
        use mod.prelude.widgets_internal.*
        mod.widgets.CheckBox = mod.widgets.CheckBox{
            draw_bg +: {
                border_size: 1.0
                border_color: theme.color_text_meta
                border_color_hover: theme.color_bevel_focus
                border_color_down: theme.color_bevel_focus
                border_color_active: theme.color_bevel_focus
                border_color_focus: theme.color_bevel_focus
                border_color_disabled: theme.color_text_disabled
                color_active: theme.color_inset
                mark_color_active: theme.color_bevel_focus
            }
        }
        mod.widgets.RadioButton = mod.widgets.RadioButton{
            draw_bg +: {
                border_size: 1.0
                border_color: theme.color_text_meta
                border_color_hover: theme.color_bevel_focus
                border_color_down: theme.color_bevel_focus
                border_color_active: theme.color_bevel_focus
                border_color_focus: theme.color_bevel_focus
                border_color_disabled: theme.color_text_disabled
                color_active: theme.color_inset
                mark_color_active: theme.color_bevel_focus
            }
        }
        mod.widgets.DropDown2 = mod.widgets.DropDown2{
            align: Align{x: 0.0, y: 0.5}
            draw_text +: {
                color: theme.color_text
                color_hover: theme.color_text
                color_focus: theme.color_text
                color_down: theme.color_text
                color_disabled: theme.color_text_disabled
            }
            draw_bg +: {
                color: theme.color_inset
                color_hover: theme.color_inset_hover
                color_focus: theme.color_inset_focus
                color_down: theme.color_inset_down
                color_disabled: theme.color_inset_disabled
                border_color: theme.color_bevel
                border_color_hover: theme.color_bevel_hover
                border_color_focus: theme.color_bevel_focus
                border_color_down: theme.color_bevel_down
                arrow_color: theme.color_text_val
                arrow_color_hover: theme.color_text
            }
            draw_popup_bg +: {
                color: theme.color_fg_app
                border_color: theme.color_bevel
            }
            draw_item +: {
                color: theme.color_fg_app
                color_hover: theme.color_inset_hover
                color_active: theme.color_selection
            }
            draw_item_text +: {
                color: theme.color_text
                color_hover: theme.color_text
                color_active: theme.color_text
            }
        }
        mod.widgets.Toggle = mod.widgets.Toggle{
            draw_bg +: {
                border_size: 1.0
                border_color: theme.color_text_meta
                border_color_hover: theme.color_bevel_focus
                border_color_down: theme.color_bevel_focus
                border_color_active: theme.color_bevel_focus
                border_color_focus: theme.color_bevel_focus
                border_color_disabled: theme.color_text_disabled
                color_active: theme.color_inset
                mark_color: theme.color_text_meta
                mark_color_hover: theme.color_text_meta
                mark_color_active: theme.color_bevel_focus
                mark_color_disabled: theme.color_text_disabled
            }
        }
    });
}

/// The two evaluated theme graphs stay rooted for the lifetime of their widgets.
/// Makepad animators retain raw apply objects from these graphs across reapply.
#[derive(Default)]
pub struct ThemeTemplates {
    light: Option<ScriptObjectRef>,
    dark: Option<ScriptObjectRef>,
}

impl ThemeTemplates {
    pub fn get_or_init(
        &mut self,
        vm: &mut ScriptVm,
        theme: ThemeMode,
        build: impl FnOnce(&mut ScriptVm) -> ScriptValue,
    ) -> ScriptObjectRef {
        let slot = match theme {
            ThemeMode::Light => &mut self.light,
            ThemeMode::Dark => &mut self.dark,
        };
        slot.get_or_insert_with(|| {
            let object = build(vm)
                .as_object()
                .expect("a trusted theme definition must produce an object");
            vm.bx.heap.new_object_ref(object)
        })
        .clone()
    }
}

/// Preserve imperative runtime fields that Makepad also declares as live defaults.
/// Text, scroll positions, animator selection and Rust-owned controllers already
/// survive ScriptReapply; these fields need explicit restoration.
pub struct ThemeRuntimeState(Vec<(WidgetRef, bool, RuntimeValue)>);

enum RuntimeValue {
    None,
    Button {
        enabled: bool,
    },
    Input {
        read_only: bool,
        numeric: bool,
        password: bool,
        multiline: bool,
    },
    DropDown(usize),
    DropDown2(usize),
}

impl RuntimeValue {
    fn capture(widget: &WidgetRef) -> Self {
        if let Some(button) = widget.borrow::<Button>() {
            Self::Button {
                enabled: button.enabled(),
            }
        } else if let Some(input) = widget.borrow::<TextInput>() {
            Self::Input {
                read_only: input.is_read_only(),
                numeric: input.is_numeric_only(),
                password: input.is_password(),
                multiline: input.is_multiline(),
            }
        } else if widget.borrow::<DropDown>().is_some() {
            Self::DropDown(widget.as_drop_down().selected_item())
        } else if widget.borrow::<DropDown2>().is_some() {
            Self::DropDown2(widget.as_drop_down2().selected_item())
        } else {
            Self::None
        }
    }

    fn restore(self, widget: &WidgetRef, cx: &mut Cx) {
        match self {
            Self::None => {}
            Self::Button { enabled } => {
                super::input::set_button_enabled(&widget.as_button(), cx, enabled);
            }
            Self::Input {
                read_only,
                numeric,
                password,
                multiline,
            } => {
                let input = widget.as_text_input();
                if input.is_read_only() != read_only {
                    input.set_is_read_only(cx, read_only);
                }
                if input.is_numeric_only() != numeric {
                    input.set_is_numeric_only(cx, numeric);
                }
                if input.is_password() != password {
                    input.set_is_password(cx, password);
                }
                if input.is_multiline() != multiline {
                    input.set_is_multiline(cx, multiline);
                }
            }
            Self::DropDown(index) => widget.as_drop_down().set_selected_item(cx, index),
            Self::DropDown2(index) => widget.as_drop_down2().set_selected_item(cx, index),
        }
    }
}

impl ThemeRuntimeState {
    pub fn capture(root: &WidgetRef) -> Self {
        let mut widgets = Vec::new();
        let mut pending = vec![root.clone()];
        while let Some(widget) = pending.pop() {
            widget.children(&mut |_, child| pending.push(child));
            let visible = widget.visible();
            let value = RuntimeValue::capture(&widget);
            widgets.push((widget, visible, value));
        }
        Self(widgets)
    }

    pub fn restore(self, cx: &mut Cx) {
        for (widget, visible, value) in self.0 {
            if widget.visible() != visible {
                widget.set_visible(cx, visible);
            }
            value.restore(&widget, cx);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn overlay_contents_inherit_the_native_shadow_shader_and_theme() {
        use crate::foundation::{
            overlay::{OverlaySurface, visual},
            theme::{rgba, tokens},
        };
        for mode in [ThemeMode::Light, ThemeMode::Dark] {
            let mut cx = Cx::new(Box::new(|_, _| {}));
            let views = cx.with_vm(|vm| {
                crate::script_mod(vm, mode);
                let native = script_eval!(vm, { mod.widgets.RoundedShadowView.draw_bg });
                let backgrounds = [
                    (script_eval!(vm, { mod.widgets.TesseraModal.modal_dialog.content.draw_bg }), OverlaySurface::Modal),
                    (script_eval!(vm, { mod.widgets.TesseraDrawer.drawer_dialog.content.draw_bg }), OverlaySurface::Drawer),
                    (script_eval!(vm, { mod.widgets.TesseraPopconfirm.popconfirm_panel.content.draw_bg }), OverlaySurface::Popover),
                    (script_eval!(vm, { mod.widgets.TesseraNotification.notification_popup.content.draw_bg }), OverlaySurface::Popover),
                    (script_eval!(vm, { mod.widgets.TesseraMessage.message_popup.content.draw_bg }), OverlaySurface::Tooltip),
                ];
                let field = |vm: &ScriptVm, value: ScriptValue, name: &str| {
                    vm.bx.heap.value(value.as_object().expect("native draw prototype"),
                        LiveId::from_str(name).into(), NoTrap)
                };
                let mut views = Vec::new();
                for (background, kind) in backgrounds {
                    let spec = visual(kind);
                    for shader in ["pixel", "vertex"] {
                        let expected = field(vm, native, shader);
                        assert_ne!(expected, ScriptValue::NIL);
                        assert_eq!(field(vm, background, shader), expected);
                    }
                    let value = script_eval!(vm, { mod.widgets.RoundedShadowView{draw_bg: #(background)} });
                    let view = View::script_from_value(vm, value);
                    views.push((view, spec));
                    let p = tokens(mode);
                    assert_eq!(field(vm, background, "shadow_color").as_color(),
                        Some(rgba(if spec.shadow_strong { p.overlay_shadow_strong } else { p.overlay_shadow })));
                    assert_eq!(field(vm, background, "color").as_color(), Some(rgba(p.surface)));
                }
                assert_eq!(script_eval!(vm, { mod.widgets.Modal.bg_view.draw_bg.color }).as_color(),
                    Some(rgba(tokens(mode).overlay_strong)));
                views
            });
            for (view, spec) in views {
                let mut radius = [f32::NAN];
                view.draw_bg
                    .get_uniform(&mut cx, id!(border_radius), &mut radius);
                assert_eq!(radius, [spec.shader_radius() as f32]);
            }
        }
    }

    #[test]
    fn dropdown_label_is_centered_in_fixed_height_controls_in_both_themes() {
        for mode in [ThemeMode::Light, ThemeMode::Dark] {
            let mut cx = Cx::new(Box::new(|_, _| {}));
            cx.with_vm(|vm| {
                crate::script_mod(vm, mode);
                let align = script_eval!(vm, { mod.widgets.DropDown2.align });
                let align = Align::script_from_value(vm, align);
                assert!((align.x - 0.0).abs() < f64::EPSILON);
                assert!((align.y - 0.5).abs() < f64::EPSILON);
            });
        }
    }

    #[test]
    fn surface_frame_keeps_native_rounded_shader_and_shared_geometry() {
        for mode in [ThemeMode::Light, ThemeMode::Dark] {
            let mut cx = Cx::new(Box::new(|_, _| {}));
            cx.with_vm(|vm| {
                crate::script_mod(vm, mode);
                let rounded_pixel = script_eval!(vm, { mod.widgets.RoundedView.draw_bg.pixel });
                assert_ne!(rounded_pixel, ScriptValue::NIL);
                for pixel in [
                    script_eval!(vm, { mod.widgets.TesseraSurfaceFrame.draw_bg.pixel }),
                    script_eval!(vm, { mod.widgets.TesseraCard.draw_bg.pixel }),
                    script_eval!(vm, { mod.widgets.TesseraInput.draw_bg.pixel }),
                    script_eval!(vm, { mod.widgets.TesseraApp.draw_bg.pixel }),
                    script_eval!(vm, { mod.widgets.TesseraConfigProvider.draw_bg.pixel }),
                    script_eval!(vm, { mod.widgets.TesseraUtil.draw_bg.pixel }),
                    script_eval!(vm, { mod.widgets.TesseraAutoComplete.draw_bg.pixel }),
                    script_eval!(vm, { mod.widgets.TesseraMentions.draw_bg.pixel }),
                    script_eval!(vm, { mod.widgets.TesseraColorPicker.draw_bg.pixel }),
                    script_eval!(vm, { mod.widgets.TesseraDatePicker.draw_bg.pixel }),
                    script_eval!(vm, { mod.widgets.TesseraTimePicker.draw_bg.pixel }),
                    script_eval!(vm, { mod.widgets.TesseraCascader.draw_bg.pixel }),
                    script_eval!(vm, { mod.widgets.TesseraTreeSelect.draw_bg.pixel }),
                    script_eval!(vm, { mod.widgets.TesseraTransfer.draw_bg.pixel }),
                    script_eval!(vm, { mod.widgets.TesseraUpload.draw_bg.pixel }),
                    script_eval!(vm, { mod.widgets.TesseraForm.draw_bg.pixel }),
                    script_eval!(vm, { mod.widgets.TesseraTable.draw_bg.pixel }),
                    script_eval!(vm, { mod.widgets.TesseraFilterPanel.draw_bg.pixel }),
                    script_eval!(vm, { mod.widgets.TesseraMiniChartCard.draw_bg.pixel }),
                    script_eval!(vm, { mod.widgets.TesseraMermaidSvgViewer.draw_bg.pixel }),
                ] {
                    assert_eq!(
                        pixel, rounded_pixel,
                        "{mode:?}: frame must paint its border and radius"
                    );
                }
                let value = script_eval!(vm, { mod.widgets.TesseraSurfaceFrame{} });
                let view = View::script_from_value(vm, value);
                assert!(matches!(view.walk.width, Size::Fill { .. }));
                assert!(matches!(view.walk.height, Size::Fit { .. }));
                assert_eq!(view.layout.flow, Flow::Down);
                assert_eq!(view.layout.spacing, SURFACE_FRAME_SPACING);
                assert_eq!(view.layout.padding.left, SURFACE_FRAME_PADDING_X);
                assert_eq!(view.layout.padding.right, SURFACE_FRAME_PADDING_X);
                assert_eq!(view.layout.padding.top, SURFACE_FRAME_PADDING_Y);
                assert_eq!(view.layout.padding.bottom, SURFACE_FRAME_PADDING_Y);
                assert!(view.show_bg);
            });
        }
    }

    #[test]
    fn shared_label_wrap_survives_repeated_theme_reapply() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let (mut ui, template) = cx.with_vm(|vm| {
            crate::makepad_widgets::script_mod(vm);
            install_text_layout_defaults(vm);
            let value = script_eval!(vm, {
                use mod.prelude.widgets.*
                use mod.widgets.*
                View{
                    status := Label{width: 210 height: 32 text: "Requested Light -> resolved Light"}
                }
            });
            let root = vm.bx.heap.new_object_ref(value.as_object().unwrap());
            (WidgetRef::script_from_value(vm, value), root)
        });
        for _ in 0..6 {
            cx.with_vm(|vm| {
                ui.script_apply(
                    vm,
                    &Apply::ScriptReapply,
                    &mut Scope::empty(),
                    template.as_object().into(),
                );
                let label = ui.child_by_path(ids!(status)).as_label();
                let value = label.borrow().unwrap().script_to_value(vm);
                let flow = vm
                    .bx
                    .heap
                    .value(value.as_object().unwrap(), id!(flow).into(), NoTrap);
                assert_eq!(Flow::script_from_value(vm, flow), Flow::right_wrap());
            });
        }
    }

    #[test]
    fn theme_reapply_preserves_selection_visibility_and_input_policy() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let (mut ui, template) = cx.with_vm(|vm| {
            crate::makepad_widgets::script_mod(vm);
            let value = script_eval!(vm, {
                use mod.prelude.widgets.*
                use mod.widgets.*
                View{
                    choice := DropDown2{labels: ["First" "Second"] selected_item: 0}
                    action := Button{text: "Action" enabled: true}
                    input := TextInput{text: "Initial" is_read_only: false}
                }
            });
            let root = vm.bx.heap.new_object_ref(value.as_object().unwrap());
            (WidgetRef::script_from_value(vm, value), root)
        });
        let choice = ui.drop_down2(&cx, ids!(choice));
        assert!(!choice.is_empty());
        choice.set_selected_item(&mut cx, 1);
        let action = ui.button(&cx, ids!(action));
        action.set_enabled(&mut cx, false);
        let input = ui.text_input(&cx, ids!(input));
        input.set_text(&mut cx, "Runtime value");
        input.set_is_read_only(&mut cx, true);
        ui.set_visible(&mut cx, false);
        let runtime = ThemeRuntimeState::capture(&ui);
        cx.with_vm(|vm| {
            ui.script_apply(
                vm,
                &Apply::ScriptReapply,
                &mut Scope::empty(),
                template.as_object().into(),
            );
        });
        assert_eq!(
            choice.selected_item(),
            0,
            "the upstream live default resets selection"
        );
        runtime.restore(&mut cx);
        assert_eq!(choice.selected_item(), 1);
        assert!(!action.borrow().unwrap().enabled());
        assert!(action.disabled(&cx));
        assert!(input.is_read_only());
        assert_eq!(input.text(), "Runtime value");
        assert!(!ui.visible());
        for enabled in [true, false, true, false] {
            super::super::input::set_button_enabled(&action, &mut cx, enabled);
            assert_eq!(action.borrow().unwrap().enabled(), enabled);
            assert_eq!(action.disabled(&cx), !enabled);
        }
    }

    #[test]
    fn both_theme_graphs_survive_gc_and_are_built_only_once() {
        let mut host = ();
        let mut std = ();
        let mut vm = ScriptVm {
            host: &mut host,
            std: &mut std,
            bx: Box::new(ScriptVmBase::new()),
        };
        let mut templates = ThemeTemplates::default();
        let mut builds = 0;
        for turn in 0..100 {
            let theme = if turn % 2 == 0 {
                ThemeMode::Light
            } else {
                ThemeMode::Dark
            };
            let graph = templates.get_or_init(&mut vm, theme, |vm| {
                builds += 1;
                let root = vm.bx.heap.new_object();
                let child = vm.bx.heap.new_object();
                vm.bx
                    .heap
                    .set_value_def(child, id!(value).into(), (turn as f64).into());
                vm.bx
                    .heap
                    .set_value_def(root, id!(apply).into(), child.into());
                root.into()
            });
            vm.gc();
            let child = vm
                .bx
                .heap
                .value(graph.as_object(), id!(apply).into(), NoTrap)
                .as_object()
                .unwrap();
            let value = vm.bx.heap.value(child, id!(value).into(), NoTrap);
            assert_eq!(value, ((turn % 2) as f64).into());
        }
        assert_eq!(builds, 2);
    }
}
