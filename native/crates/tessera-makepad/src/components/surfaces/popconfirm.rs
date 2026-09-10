//! Native confirmation panel. Only Confirm changes the component effect.

use crate::foundation::input::ButtonActivationExt;
use crate::foundation::popup::{PopupPlacement, popup_rect, position_popup, safe_popup_rect};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct PopconfirmSurfaceCatalog;

impl PopconfirmSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Popconfirm => Some("TesseraPopconfirm"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct PopconfirmState {
    pub open: bool,
    pub confirmed: bool,
    pub focus: PopconfirmFocus,
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum PopconfirmFocus {
    #[default]
    Trigger,
    Cancel,
    Confirm,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PopconfirmCloseReason {
    Cancel,
    Escape,
    Outside,
    Reset,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PopconfirmEvent {
    Open,
    Confirm,
    Close(PopconfirmCloseReason),
    CycleFocus { reverse: bool },
    Reset,
}

impl PopconfirmState {
    pub fn reduce(&mut self, event: PopconfirmEvent) {
        match event {
            PopconfirmEvent::Open => {
                self.open = true;
                self.focus = PopconfirmFocus::Cancel;
            }
            PopconfirmEvent::Confirm => {
                self.confirmed = true;
                self.open = false;
                self.focus = PopconfirmFocus::Trigger;
            }
            PopconfirmEvent::Close(_) => {
                self.open = false;
                self.focus = PopconfirmFocus::Trigger;
            }
            PopconfirmEvent::CycleFocus { reverse } if self.open => {
                self.focus = match (self.focus, reverse) {
                    (PopconfirmFocus::Cancel, false) => PopconfirmFocus::Confirm,
                    (PopconfirmFocus::Confirm, false) => PopconfirmFocus::Cancel,
                    (PopconfirmFocus::Cancel, true) => PopconfirmFocus::Confirm,
                    (PopconfirmFocus::Confirm, true) => PopconfirmFocus::Cancel,
                    (PopconfirmFocus::Trigger, _) => PopconfirmFocus::Cancel,
                };
            }
            PopconfirmEvent::CycleFocus { .. } => {}
            PopconfirmEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum PopconfirmAction {
    Opened,
    Confirmed,
    Closed {
        reason: PopconfirmCloseReason,
    },
    FocusTrapped {
        target: PopconfirmFocus,
    },
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*

    mod.widgets.TesseraPopconfirmBase = #(TesseraPopconfirm::register_widget(vm))
    mod.widgets.TesseraPopconfirm = set_type_default() do mod.widgets.TesseraPopconfirmBase{
        width: Fill height: Fit flow: Down spacing: 6
        padding: Inset{left: 12, right: 12, top: 10, bottom: 10}
        show_bg: true
        draw_bg +: {color: theme.color_fg_app border_radius: 4.0 border_size: 1.0 border_color: theme.color_bevel}
        popconfirm_title := Label{width: Fill height: Fit text: "Remove this release target?" draw_text +: {color: theme.color_text}}
        popconfirm_trigger := Button{width: Fit height: 30 text: "Remove target"}
        popconfirm_panel := PopupNotification{
            align: Align{x: 0.0 y: 0.0}
            content := TesseraPopupSurface{
                width: 330 height: 128 flow: Down spacing: 6
                padding: Inset{left: 12, right: 12, top: 10, bottom: 10}
                show_bg: true
                popconfirm_prompt := Label{width: Fill height: Fit text: "This cannot be undone." draw_text +: {color: theme.color_text_meta}}
                popconfirm_actions := View{width: Fill height: 30 flow: Right spacing: 8
                    popconfirm_cancel := Button{width: Fit height: 30 text: "Cancel"}
                    popconfirm_confirm := Button{width: Fit height: 30 text: "Confirm removal"}
                }
                popconfirm_focus_status := Label{width: Fill height: Fit text: "Focus: Cancel"}
            }
        }
        popconfirm_result := Label{width: Fill height: Fit text: "No deletion confirmed" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraPopconfirm {
    #[deref]
    view: View,
    #[rust]
    state: PopconfirmState,
    #[rust]
    pending_focus: bool,
    #[rust]
    anchor: Rect,
}

impl TesseraPopconfirm {
    fn set_panel_visible(&self, cx: &mut Cx, visible: bool) {
        self.view
            .widget(cx, ids!(popconfirm_panel))
            .set_visible(cx, visible);
    }

    fn set_overlay_focus(&mut self, cx: &mut Cx) {
        match self.state.focus {
            PopconfirmFocus::Trigger => {
                cx.set_key_focus(self.view.button(cx, ids!(popconfirm_trigger)).area())
            }
            PopconfirmFocus::Cancel => {
                cx.set_key_focus(self.view.button(cx, ids!(popconfirm_cancel)).area())
            }
            PopconfirmFocus::Confirm => {
                cx.set_key_focus(self.view.button(cx, ids!(popconfirm_confirm)).area())
            }
        }
    }
    fn sync(&mut self, cx: &mut Cx) {
        if !self.state.open {
            self.pending_focus = false;
            self.view
                .popup_notification(cx, ids!(popconfirm_panel))
                .close(cx);
            self.set_panel_visible(cx, false);
        }
        self.view.label(cx, ids!(popconfirm_result)).set_text(
            cx,
            if self.state.confirmed {
                "Deletion confirmed"
            } else {
                "No deletion confirmed"
            },
        );
        self.view.label(cx, ids!(popconfirm_focus_status)).set_text(
            cx,
            match self.state.focus {
                PopconfirmFocus::Trigger => "Focus returned to opener",
                PopconfirmFocus::Cancel => "Focus trapped: Cancel",
                PopconfirmFocus::Confirm => "Focus trapped: Confirm removal",
            },
        );
        self.view.redraw(cx);
    }

    fn close(&mut self, cx: &mut Cx, reason: PopconfirmCloseReason) {
        if !self.state.open {
            return;
        }
        self.state.reduce(PopconfirmEvent::Close(reason));
        self.view
            .popup_notification(cx, ids!(popconfirm_panel))
            .close(cx);
        self.sync(cx);
        self.set_overlay_focus(cx);
        cx.widget_action(self.widget_uid(), PopconfirmAction::Closed { reason });
    }

    fn confirm(&mut self, cx: &mut Cx) {
        if !self.state.open {
            return;
        }
        self.state.reduce(PopconfirmEvent::Confirm);
        self.sync(cx);
        self.set_overlay_focus(cx);
        cx.widget_action(self.widget_uid(), PopconfirmAction::Confirmed);
    }

    pub fn reset(&mut self, cx: &mut Cx) {
        self.state.reduce(PopconfirmEvent::Reset);
        self.sync(cx);
    }
}

impl Widget for TesseraPopconfirm {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        if self.state.open {
            let rect = popup_rect(
                safe_popup_rect(cx.current_pass_size(), 48.0),
                dvec2(330.0, 128.0),
                PopupPlacement::BelowAnchor(self.anchor),
            );
            position_popup(
                &self.view.popup_notification(cx, ids!(popconfirm_panel)),
                cx,
                rect,
            );
        }
        let step = self.view.draw_walk(cx, scope, walk);
        if step.is_done() && self.state.open {
            let anchor = self
                .view
                .button(cx, ids!(popconfirm_trigger))
                .area()
                .rect(cx);
            if anchor.size.x > 0.0 && anchor.size.y > 0.0 && anchor != self.anchor {
                self.anchor = anchor;
                self.view.redraw(cx);
            }
        }
        if step.is_done() && self.pending_focus && self.state.open {
            self.pending_focus = false;
            self.set_overlay_focus(cx);
        }
        step
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(popconfirm_trigger))
            .activated(cx, event, &actions)
        {
            if !self.state.open {
                self.anchor = self
                    .view
                    .button(cx, ids!(popconfirm_trigger))
                    .area()
                    .rect(cx);
                self.state.reduce(PopconfirmEvent::Open);
                self.sync(cx);
                self.set_panel_visible(cx, true);
                self.view
                    .popup_notification(cx, ids!(popconfirm_panel))
                    .open(cx);
                self.pending_focus = true;
                cx.widget_action(self.widget_uid(), PopconfirmAction::Opened);
            }
        } else if self
            .view
            .button(cx, ids!(popconfirm_cancel))
            .activated(cx, event, &actions)
        {
            self.close(cx, PopconfirmCloseReason::Cancel);
        } else if self
            .view
            .button(cx, ids!(popconfirm_confirm))
            .activated(cx, event, &actions)
        {
            self.confirm(cx);
        } else if self.state.open
            && matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Escape)
        {
            self.close(cx, PopconfirmCloseReason::Escape);
        } else if let Event::MouseDown(mouse) = event {
            let trigger = self
                .view
                .button(cx, ids!(popconfirm_trigger))
                .area()
                .rect(cx);
            let panel = self
                .view
                .view(cx, ids!(popconfirm_panel.content))
                .area()
                .rect(cx);
            if self.state.open && !trigger.contains(mouse.abs) && !panel.contains(mouse.abs) {
                self.close(cx, PopconfirmCloseReason::Outside);
            }
        } else if let Event::KeyDown(key) = event {
            if self.state.open && key.key_code == KeyCode::Tab {
                crate::foundation::focus::claim_tab_navigation(cx);
                self.state.reduce(PopconfirmEvent::CycleFocus {
                    reverse: key.modifiers.shift,
                });
                self.sync(cx);
                self.set_overlay_focus(cx);
                cx.widget_action(
                    self.widget_uid(),
                    PopconfirmAction::FocusTrapped {
                        target: self.state.focus,
                    },
                );
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{PopconfirmCloseReason, PopconfirmEvent, PopconfirmFocus, PopconfirmState};

    #[test]
    fn only_confirm_changes_effect() {
        let mut state = PopconfirmState::default();
        for reason in [
            PopconfirmCloseReason::Cancel,
            PopconfirmCloseReason::Escape,
            PopconfirmCloseReason::Outside,
        ] {
            state.reduce(PopconfirmEvent::Open);
            state.reduce(PopconfirmEvent::CycleFocus { reverse: false });
            assert_eq!(state.focus, PopconfirmFocus::Confirm);
            state.reduce(PopconfirmEvent::Close(reason));
            assert!(!state.confirmed);
            assert_eq!(state.focus, PopconfirmFocus::Trigger);
        }
        state.reduce(PopconfirmEvent::Confirm);
        assert!(state.confirmed);
    }
}
