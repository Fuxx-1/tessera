//! Native selector with a component-owned visible menu lifecycle.

use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct DropdownSurfaceCatalog;

impl DropdownSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Dropdown => Some("TesseraDropdown"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct DropdownState {
    pub open: bool,
    pub selected: usize,
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum DropdownPlacement {
    #[default]
    Below,
    Above,
}

pub fn dropdown_placement(
    viewport_height: f64,
    anchor_top: f64,
    anchor_height: f64,
    popup_height: f64,
    margin: f64,
) -> DropdownPlacement {
    let below = viewport_height - (anchor_top + anchor_height) - margin;
    let above = anchor_top - margin;
    if below >= popup_height || below >= above {
        DropdownPlacement::Below
    } else {
        DropdownPlacement::Above
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DropdownCloseReason {
    Escape,
    Selection,
    Explicit,
    Outside,
    Reset,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DropdownEvent {
    Open,
    Select(usize),
    Close(DropdownCloseReason),
    Reset,
}

impl DropdownState {
    pub fn reduce(&mut self, event: DropdownEvent) {
        match event {
            DropdownEvent::Open => self.open = true,
            DropdownEvent::Select(index) => {
                self.selected = index.min(2);
                self.open = false;
            }
            DropdownEvent::Close(_) => self.open = false,
            DropdownEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum DropdownAction {
    Opened,
    Selected {
        index: usize,
    },
    Closed {
        reason: DropdownCloseReason,
    },
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*

    mod.widgets.TesseraDropdownBase = #(TesseraDropdown::register_widget(vm))
    mod.widgets.TesseraDropdown = set_type_default() do mod.widgets.TesseraDropdownBase{
        width: Fill height: Fit flow: Down spacing: 6
        padding: Inset{left: 12, right: 12, top: 10, bottom: 10}
        show_bg: true
        draw_bg +: {color: theme.color_fg_app border_radius: 4.0 border_size: 1.0 border_color: theme.color_bevel}
        dropdown_title := Label{width: Fill height: Fit text: "Release channel" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        dropdown_trigger := DropDown2{width: Fill height: 34 labels: ["Preview" "Staging" "Production"]}
        dropdown_status := Label{width: Fill height: Fit text: "Preview selected / native popup" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraDropdown {
    #[deref]
    view: View,
    #[rust]
    state: DropdownState,
}

impl TesseraDropdown {
    const OPTIONS: [&'static str; 3] = ["Preview", "Staging", "Production"];

    pub fn reset(&mut self, cx: &mut Cx) {
        self.close_native(cx);
        self.state.reduce(DropdownEvent::Reset);
        self.sync(cx);
    }

    fn close_native(&mut self, cx: &mut Cx) {
        let widget = self.view.widget(cx, ids!(dropdown_trigger));
        if let Some(mut dropdown) = widget.borrow_mut::<DropDown2>() {
            dropdown.set_closed(cx);
        }
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .drop_down2(cx, ids!(dropdown_trigger))
            .set_selected_item(cx, self.state.selected);
        self.view.label(cx, ids!(dropdown_status)).set_text(
            cx,
            &format!(
                "{} selected / native popup",
                Self::OPTIONS[self.state.selected]
            ),
        );
        self.view.redraw(cx);
    }

    fn close(&mut self, cx: &mut Cx, reason: DropdownCloseReason) {
        if !self.state.open {
            return;
        }
        self.state.reduce(DropdownEvent::Close(reason));
        self.sync(cx);
        if reason == DropdownCloseReason::Escape {
            cx.set_key_focus(self.view.widget(cx, ids!(dropdown_trigger)).area());
        }
        self.close_native(cx);
        cx.widget_action(self.widget_uid(), DropdownAction::Closed { reason });
    }
}

impl Widget for TesseraDropdown {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if let Some(index) = self
            .view
            .drop_down2(cx, ids!(dropdown_trigger))
            .changed(&actions)
        {
            self.state.reduce(DropdownEvent::Select(index));
            self.sync(cx);
            cx.widget_action(
                self.widget_uid(),
                DropdownAction::Selected {
                    index: self.state.selected,
                },
            );
        } else if let Event::MouseDown(mouse) = event {
            let trigger = self.view.widget(cx, ids!(dropdown_trigger)).area().rect(cx);
            if trigger.contains(mouse.abs) && !self.state.open {
                self.state.reduce(DropdownEvent::Open);
                self.sync(cx);
                cx.widget_action(self.widget_uid(), DropdownAction::Opened);
            }
        } else if let Event::MouseUp(mouse) = event {
            // Native popup selection is emitted on release, including rows
            // outside the trigger. Consume that action before closing outside.
            let trigger = self.view.widget(cx, ids!(dropdown_trigger)).area().rect(cx);
            if self.state.open && !trigger.contains(mouse.abs) {
                self.close(cx, DropdownCloseReason::Outside);
            }
        } else if self.state.open
            && matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Escape)
        {
            self.close(cx, DropdownCloseReason::Escape);
        } else if self.state.open
            && matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Tab)
        {
            self.close(cx, DropdownCloseReason::Explicit);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        DropdownCloseReason, DropdownEvent, DropdownPlacement, DropdownState, dropdown_placement,
    };

    #[test]
    fn selector_close_never_mutates_the_committed_choice() {
        let mut state = DropdownState::default();
        state.reduce(DropdownEvent::Open);
        state.reduce(DropdownEvent::Close(DropdownCloseReason::Explicit));
        assert_eq!(state.selected, 0);
        assert!(!state.open);
        state.reduce(DropdownEvent::Select(9));
        assert_eq!(state.selected, 2);
    }

    #[test]
    fn escape_closes_without_changing_the_selected_item() {
        let mut state = DropdownState::default();
        state.reduce(DropdownEvent::Select(1));
        state.reduce(DropdownEvent::Open);
        state.reduce(DropdownEvent::Close(DropdownCloseReason::Escape));
        assert_eq!(state.selected, 1);
        assert!(!state.open);
    }

    #[test]
    fn reset_restores_initial_choice_after_selection() {
        let mut state = DropdownState::default();
        state.reduce(DropdownEvent::Open);
        state.reduce(DropdownEvent::Select(2));
        state.reduce(DropdownEvent::Reset);
        assert_eq!(state, DropdownState::default());
    }

    #[test]
    fn popup_placement_flips_above_when_below_space_is_insufficient() {
        assert_eq!(
            dropdown_placement(600.0, 520.0, 32.0, 160.0, 8.0),
            DropdownPlacement::Above
        );
        assert_eq!(
            dropdown_placement(600.0, 120.0, 32.0, 160.0, 8.0),
            DropdownPlacement::Below
        );
    }
}
