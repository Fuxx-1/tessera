use crate::foundation::focus::FocusFrame;
use crate::foundation::input::button_keyboard_activation;
use crate::makepad_widgets::*;

pub fn register_resources(vm: &mut ScriptVm) {
    crate::foundation::resources::register_embedded_resource(
        &vm.host.cx_mut().script_data.resources,
        concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/resources/icons/tessera-mark.svg"
        ),
        "tessera_makepad/resources/icons/tessera-mark.svg",
        || include_bytes!("../../resources/icons/tessera-mark.svg").to_vec(),
    );
}

script_mod! {
    use mod.prelude.widgets.*
    use mod.widgets.*

    mod.widgets.TesseraShellBase = #(TesseraShell::register_widget(vm))
    mod.widgets.TesseraShell = set_type_default() do mod.widgets.TesseraShellBase{
        width: Fill
        height: Fill
        flow: Right
        focus_frame: #(FocusFrame::script_component(vm)){
            gap: theme.color_inset_focus
            ring: theme.color_bevel_focus
        }

        sidebar := SolidView{
            width: 252
            height: Fill
            flow: Down
            spacing: 3
            padding: Inset{left: 18, right: 18, top: 16, bottom: 14}
            show_bg: true
            draw_bg.color: theme.color_fg_app

            View{
                width: Fill
                height: 38
                align: Align{x: 0.5, y: 0.5}

                logo_mark := View{
                    width: 38
                    height: 38
                    align: Align{x: 0.5, y: 0.5}
                    logo_icon := Svg{
                        width: 32
                        height: 32
                        animating: false
                        draw_svg +: {
                            svg: crate_resource("self://resources/icons/tessera-mark.svg")
                        }
                    }
                }
            }

            View{width: Fill height: 14}
            Label{
                width: Fill
                height: Fit
                text: "LIBRARY"
                draw_text +: {
                    color: theme.color_text_meta
                    text_style +: {font_size: 10.0}
                }
            }
            catalog_button := Button{
                width: Fill
                height: 32
                text: "All components"
                draw_bg +: {
                    color: theme.color_bg_app
                    border_radius: 3.0
                    color_2: vec4(-1.0)
                    border_size: 1.0
                    border_color: theme.color_bevel
                }
                draw_text +: {
                    color: theme.color_text
                    text_style +: {font_size: 12.0}
                }
            }
            sidebar_content := View{
                width: Fill
                height: Fill
                flow: Down
            }

            View{
                width: Fill
                height: 1
                show_bg: true
                draw_bg.color: theme.color_bevel
            }
            Label{
                width: Fill
                height: Fit
                text: "APPEARANCE"
                draw_text +: {
                    color: theme.color_text_meta
                    text_style +: {font_size: 10.0}
                }
            }
            toggle_theme := Button{
                width: Fill
                height: 32
                text: "Cycle theme"
                draw_bg +: {
                    color: theme.color_bg_app
                    border_radius: 3.0
                    color_2: vec4(-1.0)
                    border_size: 1.0
                    border_color: theme.color_bevel
                }
                draw_text +: {
                    color: theme.color_text
                    text_style +: {font_size: 13.0}
                }
            }
            theme_status := Label{
                width: Fill
                height: 32
                text: "Theme status"
                draw_text +: {
                    color: theme.color_text_meta
                    text_style +: {font_size: 10.0}
                    flow: Flow.Right{wrap: true}
                }
            }
        }

        main_column := View{
            width: Fill
            height: Fill
            flow: Down
            show_bg: true
            draw_bg.color: theme.color_bg_app

            topbar := SolidView{
                width: Fill
                height: 48
                flow: Right
                spacing: 8
                padding: Inset{left: 28, right: 28, top: 10, bottom: 8}
                align: Align{y: 0.5}
                show_bg: true
                draw_bg.color: theme.color_bg_app

                Label{
                    width: Fill
                    height: Fit
                    padding: 0
                    text: "Component library"
                    draw_text +: {
                        color: theme.color_text
                        text_style +: {font_size: 14.0}
                    }
                }
                Label{
                    width: Fit
                    height: Fit
                    text: "MAKEPAD"
                    draw_text +: {
                        color: theme.color_text_meta
                        text_style +: {font_size: 10.0}
                    }
                }
            }

            catalog_page := View{
                width: Fill
                height: Fill
                flow: Down
                spacing: 8
                padding: Inset{left: 28, right: 28, top: 18, bottom: 18}

                View{
                    width: Fill
                    height: Fit
                    flow: Right
                    spacing: 8
                    align: Align{y: 0.5}

                    Label{
                        width: Fill
                        text: "Components"
                        draw_text +: {
                            color: theme.color_text
                            text_style +: {font_size: 16.0}
                        }
                    }
                    Label{
                        width: Fit
                        text: "101 components"
                        draw_text +: {
                            color: theme.color_text_meta
                            text_style +: {font_size: 11.0}
                        }
                    }
                }
                component_catalog := ComponentCatalog{
                    width: Fill
                    height: Fill
                }
            }

        content_scroll := ScrollYView{
            width: Fill
            height: Fill
            visible: false
            flow: Down
            spacing: 14
            padding: Inset{left: 28, right: 28, top: 18, bottom: 22}

            View{
                width: Fill
                height: Fit
                flow: Down
                spacing: 8

                component_detail := View{
                    width: Fill
                    height: Fit
                    flow: Down
                    spacing: 7
                    padding: 0

                    View{
                        width: Fill
                        height: Fit
                        flow: Right
                        spacing: 8
                        View{
                            width: Fill
                            height: Fit
                            flow: Down
                            spacing: 3
                            component_name := Label{
                                width: Fill
                                height: Fit
                                text: "Button"
                                draw_text +: {
                                    color: theme.color_text
                                    text_style +: {font_size: 18.0}
                                    flow: Flow.Right{wrap: true}
                                }
                            }
                            component_category := Label{
                                width: Fill
                                height: Fit
                                text: "Base / General"
                                draw_text +: {
                                    color: theme.color_text_meta
                                    text_style +: {font_size: 10.0}
                                    flow: Flow.Right{wrap: true}
                                }
                            }
                        }
                        component_back := Button{
                            width: 58
                            height: 28
                            text: "Back"
                        }
                    }
                    component_surface := TesseraComponentDetail{
                        width: Fill
                        height: Fit
                    }
                    component_action_status := Label{
                        width: Fill
                        height: Fit
                        text: "Ready"
                        draw_text +: {
                            color: theme.color_text_val
                            text_style +: {font_size: 10.0}
                            flow: Flow.Right{wrap: true}
                        }
                    }
                    acceptance_toggle := Button{
                        width: 160
                        height: 30
                        text: "Details and acceptance"
                        draw_bg +: {border_radius: 3.0 color_2: vec4(-1.0)}
                    }
                    acceptance_panel := View{
                        width: Fill
                        height: Fit
                        visible: false
                        flow: Down
                        spacing: 5
                        padding: 0
                    component_summary := Label{
                        width: Fill
                        height: Fit
                        text: "Component summary"
                        draw_text +: {
                            color: theme.color_text_val
                            text_style +: {font_size: 11.0}
                            flow: Flow.Right{wrap: true}
                        }
                    }
                    component_code := Label{
                        width: Fill
                        height: Fit
                        text: "Makepad source"
                        draw_text +: {
                            color: theme.color_text_meta
                            text_style +: {font_size: 10.0}
                            flow: Flow.Right{wrap: true}
                        }
                    }
                    component_docs := Label{
                        width: Fill
                        height: Fit
                        text: "Documentation"
                        draw_text +: {
                            color: theme.color_text_meta
                            text_style +: {font_size: 10.0}
                            flow: Flow.Right{wrap: true}
                        }
                    }
                    View{
                        width: Fill
                        height: Fit
                        flow: Down
                        spacing: 5
                        padding: 0
                        acceptance_visual := Label{
                            width: Fill
                            height: Fit
                            text: "Visual: Light / Dark, desktop viewport matrix"
                            draw_text +: {
                                color: theme.color_text_meta
                                text_style +: {font_size: 10.0}
                                flow: Flow.Right{wrap: true}
                            }
                        }
                        acceptance_interaction := Label{
                            width: Fill
                            height: Fit
                            text: "Interaction: pointer, keyboard, focus, and IME where applicable"
                            draw_text +: {
                                color: theme.color_text_meta
                                text_style +: {font_size: 10.0}
                                flow: Flow.Right{wrap: true}
                            }
                        }
                        acceptance_performance := Label{
                            width: Fill
                            height: Fit
                            text: "Performance: bounded work, idle behavior, and recovery states"
                            draw_text +: {
                                color: theme.color_text_meta
                                text_style +: {font_size: 10.0}
                                flow: Flow.Right{wrap: true}
                            }
                        }
                        acceptance_evidence := Label{
                            width: Fill
                            height: Fit
                            text: "Evidence: same-revision GUI capture required; current record is blocked"
                            draw_text +: {
                                color: #xb9823c
                                text_style +: {font_size: 10.0}
                                flow: Flow.Right{wrap: true}
                            }
                        }
                    }
                    View{
                        width: Fill
                        height: Fit
                        flow: Right
                        spacing: 14
                        component_family := Label{text: "Action"}
                        component_interaction := Label{text: "activate"}
                    }
                    component_keyboard := Label{
                        width: Fill
                        height: Fit
                        text: "Keyboard"
                        draw_text +: {
                            color: theme.color_text_meta
                            text_style +: {font_size: 10.0}
                            flow: Flow.Right{wrap: true}
                        }
                    }
                    component_states := Label{
                        width: Fill
                        height: Fit
                        text: "States"
                        draw_text +: {
                            color: theme.color_text_meta
                            text_style +: {font_size: 10.0}
                            flow: Flow.Right{wrap: true}
                        }
                    }
                    component_sample := Label{
                        width: Fill
                        height: Fit
                        text: "Sample"
                        draw_text +: {
                            color: theme.color_text_meta
                            text_style +: {font_size: 10.0}
                            flow: Flow.Right{wrap: true}
                        }
                    }
                    }
                }
            }
        }
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraShell {
    #[deref]
    view: View,
    #[live]
    focus_frame: FocusFrame,
}

impl Widget for TesseraShell {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        if !self.view.visible() {
            return DrawStep::done();
        }
        let rect = cx.walk_turtle(walk);
        // Finish this window-root layout before reading clipped focus geometry.
        // Ordinary child turtles defer clipping until the enclosing root ends.
        cx.begin_root_turtle_for_pass(Layout::flow_overlay());
        self.view.draw_walk_all(cx, scope, Walk::abs_rect(rect));
        cx.end_pass_sized_turtle();
        self.focus_frame.draw(cx, &self.view);
        DrawStep::done()
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        self.focus_frame.handle_event(cx, event);
        self.view.handle_event(cx, event, scope);
        let Event::KeyDown(key) = event else {
            return;
        };
        if !self.view.visible() {
            return;
        }
        let detail_visible = self.view.view(cx, ids!(content_scroll)).visible();
        // Only bridge this host's buttons; child components own their activation.
        for (id, visible) in [
            (ids!(catalog_button), true),
            (ids!(toggle_theme), true),
            (ids!(component_back), detail_visible),
            (ids!(acceptance_toggle), detail_visible),
        ] {
            let button = self.view.button(cx, id);
            if visible
                && button.area().is_valid(cx)
                && button_keyboard_activation(&button, cx, event)
            {
                cx.widget_action(button.widget_uid(), ButtonAction::Clicked(key.modifiers));
                break;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn static_brand_mark_does_not_request_animation_frames() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let ui = cx.with_vm(|vm| {
            crate::makepad_widgets::script_mod(vm);
            register_resources(vm);
            script_mod(vm);
            let value = script_eval!(vm, {
                use mod.prelude.widgets.*
                use mod.widgets.*
                TesseraShell{}
            });
            WidgetRef::script_from_value(vm, value)
        });
        let logo = ui.widget(&cx, ids!(logo_icon));
        assert!(!logo.is_empty());
        assert!(!logo.borrow::<Svg>().unwrap().animating);
    }
}
