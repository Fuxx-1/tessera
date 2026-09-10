//! Modal visibility and focus restoration are owned by Makepad's `Modal`.

use crate::foundation::input::ButtonActivationExt;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;
pub struct ModalSurfaceCatalog;
impl ModalSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Modal => Some("TesseraModal"),
            _ => None,
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct ModalState {
    pub open: bool,
    pub opens: u32,
    pub focus: ModalFocus,
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum ModalFocus {
    #[default]
    Trigger,
    Cancel,
    Confirm,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ModalCloseReason {
    Explicit,
    Escape,
    Outside,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ModalEvent {
    Open,
    Close(ModalCloseReason),
    CycleFocus { reverse: bool },
    Reset,
}
impl ModalState {
    pub fn reduce(&mut self, event: ModalEvent) {
        match event {
            ModalEvent::Open => {
                self.open = true;
                self.opens = self.opens.saturating_add(1);
                self.focus = ModalFocus::Cancel;
            }
            ModalEvent::Close(_) => {
                self.open = false;
                self.focus = ModalFocus::Trigger;
            }
            ModalEvent::CycleFocus { reverse } if self.open => {
                self.focus = match (self.focus, reverse) {
                    (ModalFocus::Cancel, false) => ModalFocus::Confirm,
                    (ModalFocus::Confirm, false) => ModalFocus::Cancel,
                    (ModalFocus::Cancel, true) => ModalFocus::Confirm,
                    (ModalFocus::Confirm, true) => ModalFocus::Cancel,
                    (ModalFocus::Trigger, _) => ModalFocus::Cancel,
                };
            }
            ModalEvent::CycleFocus { .. } => {}
            ModalEvent::Reset => *self = Self::default(),
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum ModalAction {
    Opened {
        opens: u32,
    },
    Closed {
        reason: ModalCloseReason,
    },
    FocusTrapped {
        target: ModalFocus,
    },
    #[default]
    None,
}
script_mod! { use mod.prelude.widgets_internal.* use mod.widgets.*
    mod.widgets.TesseraModalBase = #(TesseraModal::register_widget(vm))
    mod.widgets.TesseraModal = set_type_default() do mod.widgets.TesseraModalBase{
        width: Fill height: Fit flow: Down spacing: 6
        padding: Inset{left: 12, right: 12, top: 10, bottom: 10}
        show_bg: true
        draw_bg +: {color: theme.color_fg_app border_radius: 4.0 border_size: 1.0 border_color: theme.color_bevel}
        modal_title := Label{width: Fill height: Fit text: "Review release" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        modal_description := Label{width: Fill height: Fit text: "Confirm the release target before continuing." draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
        modal_open := Button{width: Fit height: 30 text: "Open modal"}
        modal_dialog := Modal{
            content := TesseraModalSurface{
                width: 380 height: Fit padding: Inset{left: 16, right: 16, top: 14, bottom: 14}
                show_bg: true
                modal_panel := View{
                    width: Fill height: Fit visible: false flow: Down spacing: 8
                    modal_panel_label := Label{width: Fill height: Fit text: "Review release" draw_text +: {color: theme.color_text text_style +: {font_size: 16.0}}}
                    modal_panel_description := Label{width: Fill height: Fit text: "Confirm the release target before continuing." draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
                    modal_focus_status := Label{width: Fill height: Fit text: "Focus: Cancel" draw_text +: {color: theme.color_text_meta}}
                    modal_actions := View{width: Fill height: 30 flow: Right spacing: 8
                        modal_cancel := Button{width: Fit height: 30 text: "Cancel"}
                        modal_confirm := Button{width: Fit height: 30 text: "Confirm"}
                    }
                }
            }
        }
    }
}
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraModal {
    #[deref]
    view: View,
    #[rust]
    state: ModalState,
}
impl TesseraModal {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.view.modal(cx, ids!(modal_dialog)).close(cx);
        self.state.reduce(ModalEvent::Reset);
        self.sync(cx);
    }
    fn set_overlay_focus(&mut self, cx: &mut Cx) {
        match self.state.focus {
            ModalFocus::Trigger => cx.set_key_focus(self.view.button(cx, ids!(modal_open)).area()),
            ModalFocus::Cancel => cx.set_key_focus(self.view.button(cx, ids!(modal_cancel)).area()),
            ModalFocus::Confirm => {
                cx.set_key_focus(self.view.button(cx, ids!(modal_confirm)).area())
            }
        }
    }
    fn apply(&mut self, cx: &mut Cx, event: ModalEvent) {
        let was_open = self.state.open;
        match event {
            ModalEvent::Open if !was_open => self.view.modal(cx, ids!(modal_dialog)).open(cx),
            ModalEvent::Close(_) if was_open => self.view.modal(cx, ids!(modal_dialog)).close(cx),
            _ => {}
        }
        self.state.reduce(event);
        self.set_overlay_focus(cx);
        self.sync(cx);
        let action = match event {
            ModalEvent::Open => ModalAction::Opened {
                opens: self.state.opens,
            },
            ModalEvent::Close(reason) => ModalAction::Closed { reason },
            ModalEvent::CycleFocus { .. } => ModalAction::FocusTrapped {
                target: self.state.focus,
            },
            ModalEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .view(cx, ids!(modal_panel))
            .set_visible(cx, self.state.open);
        self.view.label(cx, ids!(modal_focus_status)).set_text(
            cx,
            match self.state.focus {
                ModalFocus::Trigger => "Focus returned to opener",
                ModalFocus::Cancel => "Focus trapped: Cancel",
                ModalFocus::Confirm => "Focus trapped: Confirm",
            },
        );
        self.view.redraw(cx);
    }
}
impl Widget for TesseraModal {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(modal_open))
            .activated(cx, event, &actions)
        {
            self.apply(cx, ModalEvent::Open);
        } else if self
            .view
            .button(cx, ids!(modal_cancel))
            .activated(cx, event, &actions)
        {
            self.apply(cx, ModalEvent::Close(ModalCloseReason::Explicit));
        } else if self
            .view
            .button(cx, ids!(modal_confirm))
            .activated(cx, event, &actions)
        {
            self.apply(cx, ModalEvent::Close(ModalCloseReason::Explicit));
        } else if self.view.modal(cx, ids!(modal_dialog)).dismissed(&actions) {
            self.apply(cx, ModalEvent::Close(ModalCloseReason::Outside));
        } else if matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Escape)
            && self.state.open
        {
            self.apply(cx, ModalEvent::Close(ModalCloseReason::Escape));
        } else if let Event::KeyDown(key) = event {
            if self.state.open && key.key_code == KeyCode::Tab {
                crate::foundation::focus::claim_tab_navigation(cx);
                self.apply(
                    cx,
                    ModalEvent::CycleFocus {
                        reverse: key.modifiers.shift,
                    },
                );
            }
        }
    }
}
#[cfg(test)]
mod tests {
    use super::{ModalCloseReason, ModalEvent, ModalFocus, ModalState, ModalSurfaceCatalog};
    use tessera_core::catalog::ComponentId;
    #[test]
    fn modal_state_tracks_visibility_and_cycles_focus_within_the_dialog() {
        assert_eq!(
            ModalSurfaceCatalog::widget_name(ComponentId::Modal),
            Some("TesseraModal")
        );
        let mut state = ModalState::default();
        state.reduce(ModalEvent::Open);
        assert!(state.open);
        assert_eq!(state.focus, ModalFocus::Cancel);
        state.reduce(ModalEvent::CycleFocus { reverse: false });
        assert_eq!(state.focus, ModalFocus::Confirm);
        state.reduce(ModalEvent::CycleFocus { reverse: true });
        assert_eq!(state.focus, ModalFocus::Cancel);
        state.reduce(ModalEvent::Close(ModalCloseReason::Explicit));
        assert_eq!(state.opens, 1);
        assert!(!state.open);
        assert_eq!(state.focus, ModalFocus::Trigger);
    }
}
