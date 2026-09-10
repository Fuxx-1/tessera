//! Drawer content is hosted by Makepad's modal overlay, not an inline panel.

use crate::foundation::input::ButtonActivationExt;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct DrawerSurfaceCatalog;
impl DrawerSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Drawer => Some("TesseraDrawer"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct DrawerState {
    pub open: bool,
    pub opens: u32,
    pub focus: DrawerFocus,
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum DrawerFocus {
    #[default]
    Trigger,
    Review,
    Close,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DrawerCloseReason {
    Explicit,
    Escape,
    Outside,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DrawerEvent {
    Open,
    Close(DrawerCloseReason),
    CycleFocus { reverse: bool },
    Reset,
}
impl DrawerState {
    pub fn reduce(&mut self, event: DrawerEvent) {
        match event {
            DrawerEvent::Open => {
                self.open = true;
                self.opens = self.opens.saturating_add(1);
                self.focus = DrawerFocus::Review;
            }
            DrawerEvent::Close(_) => {
                self.open = false;
                self.focus = DrawerFocus::Trigger;
            }
            DrawerEvent::CycleFocus { reverse } if self.open => {
                self.focus = match (self.focus, reverse) {
                    (DrawerFocus::Review, false) => DrawerFocus::Close,
                    (DrawerFocus::Close, false) => DrawerFocus::Review,
                    (DrawerFocus::Review, true) => DrawerFocus::Close,
                    (DrawerFocus::Close, true) => DrawerFocus::Review,
                    (DrawerFocus::Trigger, _) => DrawerFocus::Review,
                };
            }
            DrawerEvent::CycleFocus { .. } => {}
            DrawerEvent::Reset => *self = Self::default(),
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum DrawerAction {
    Opened {
        opens: u32,
    },
    Closed {
        reason: DrawerCloseReason,
    },
    FocusTrapped {
        target: DrawerFocus,
    },
    #[default]
    None,
}

script_mod! { use mod.prelude.widgets_internal.* use mod.widgets.*
    mod.widgets.TesseraDrawerBase = #(TesseraDrawer::register_widget(vm))
    mod.widgets.TesseraDrawer = set_type_default() do mod.widgets.TesseraDrawerBase{
        width: Fill height: Fit flow: Down spacing: 6 padding: Inset{left: 12, right: 12, top: 10, bottom: 10} show_bg: true
        draw_bg +: {color: theme.color_fg_app border_radius: 4.0 border_size: 1.0 border_color: theme.color_bevel}
        drawer_title := Label{width: Fill height: Fit text: "Release details" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        drawer_open := Button{width: Fit height: 30 text: "Open drawer"}
        drawer_dialog := Modal{
            align: Align{x: 1.0 y: 0.0}
            content := TesseraDrawerSurface{
                width: 360 height: Fill
                // Reserve window-caption space above the overlay paint layer.
                margin: Inset{top: 40}
                padding: Inset{left: 16, right: 16, top: 18, bottom: 18}
                show_bg: true
                drawer_panel := View{
                    width: Fill height: Fill visible: false flow: Down spacing: 8
                    drawer_panel_title := Label{width: Fill height: Fit text: "Release details" draw_text +: {color: theme.color_text text_style +: {font_size: 16.0}}}
                    drawer_content := Label{width: Fill height: Fit text: "Review the release target before continuing." draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
                    drawer_focus_status := Label{width: Fill height: Fit text: "Focus: Review" draw_text +: {color: theme.color_text_meta}}
                    drawer_actions := View{width: Fill height: 30 flow: Right spacing: 8
                        drawer_review := Button{width: Fit height: 30 text: "Review"}
                        drawer_close := Button{width: Fit height: 30 text: "Close drawer"}
                    }
                }
            }
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraDrawer {
    #[deref]
    view: View,
    #[rust]
    state: DrawerState,
}
impl TesseraDrawer {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.view.modal(cx, ids!(drawer_dialog)).close(cx);
        self.state.reduce(DrawerEvent::Reset);
        self.sync(cx);
    }
    fn set_overlay_focus(&mut self, cx: &mut Cx) {
        match self.state.focus {
            DrawerFocus::Trigger => {
                cx.set_key_focus(self.view.button(cx, ids!(drawer_open)).area())
            }
            DrawerFocus::Review => {
                cx.set_key_focus(self.view.button(cx, ids!(drawer_review)).area())
            }
            DrawerFocus::Close => cx.set_key_focus(self.view.button(cx, ids!(drawer_close)).area()),
        }
    }
    fn apply(&mut self, cx: &mut Cx, event: DrawerEvent) {
        let was_open = self.state.open;
        match event {
            DrawerEvent::Open if !was_open => self.view.modal(cx, ids!(drawer_dialog)).open(cx),
            DrawerEvent::Close(_) if was_open => self.view.modal(cx, ids!(drawer_dialog)).close(cx),
            _ => {}
        }
        self.state.reduce(event);
        self.set_overlay_focus(cx);
        self.sync(cx);
        let action = match event {
            DrawerEvent::Open => DrawerAction::Opened {
                opens: self.state.opens,
            },
            DrawerEvent::Close(reason) => DrawerAction::Closed { reason },
            DrawerEvent::CycleFocus { .. } => DrawerAction::FocusTrapped {
                target: self.state.focus,
            },
            DrawerEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .view(cx, ids!(drawer_panel))
            .set_visible(cx, self.state.open);
        self.view.label(cx, ids!(drawer_focus_status)).set_text(
            cx,
            match self.state.focus {
                DrawerFocus::Trigger => "Focus returned to opener",
                DrawerFocus::Review => "Focus trapped: Review",
                DrawerFocus::Close => "Focus trapped: Close drawer",
            },
        );
        self.view.redraw(cx);
    }
}
impl Widget for TesseraDrawer {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(drawer_open))
            .activated(cx, event, &actions)
        {
            self.apply(cx, DrawerEvent::Open);
        } else if self
            .view
            .button(cx, ids!(drawer_review))
            .activated(cx, event, &actions)
        {
            self.apply(cx, DrawerEvent::CycleFocus { reverse: false });
        } else if self
            .view
            .button(cx, ids!(drawer_close))
            .activated(cx, event, &actions)
        {
            self.apply(cx, DrawerEvent::Close(DrawerCloseReason::Explicit));
        } else if self.view.modal(cx, ids!(drawer_dialog)).dismissed(&actions) {
            self.apply(cx, DrawerEvent::Close(DrawerCloseReason::Outside));
        } else if matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Escape)
            && self.state.open
        {
            self.apply(cx, DrawerEvent::Close(DrawerCloseReason::Escape));
        } else if let Event::KeyDown(key) = event {
            if self.state.open && key.key_code == KeyCode::Tab {
                crate::foundation::focus::claim_tab_navigation(cx);
                self.apply(
                    cx,
                    DrawerEvent::CycleFocus {
                        reverse: key.modifiers.shift,
                    },
                );
            }
        }
    }
}
#[cfg(test)]
mod tests {
    use super::{DrawerCloseReason, DrawerEvent, DrawerFocus, DrawerState, DrawerSurfaceCatalog};
    use tessera_core::catalog::ComponentId;
    #[test]
    fn drawer_state_tracks_open_focus_and_opener_return() {
        assert_eq!(
            DrawerSurfaceCatalog::widget_name(ComponentId::Drawer),
            Some("TesseraDrawer")
        );
        let mut state = DrawerState::default();
        state.reduce(DrawerEvent::Open);
        assert!(state.open);
        assert_eq!(state.focus, DrawerFocus::Review);
        state.reduce(DrawerEvent::CycleFocus { reverse: false });
        assert_eq!(state.focus, DrawerFocus::Close);
        state.reduce(DrawerEvent::CycleFocus { reverse: true });
        assert_eq!(state.focus, DrawerFocus::Review);
        state.reduce(DrawerEvent::Close(DrawerCloseReason::Escape));
        assert_eq!(state.opens, 1);
        assert!(!state.open);
        assert_eq!(state.focus, DrawerFocus::Trigger);
    }
}
