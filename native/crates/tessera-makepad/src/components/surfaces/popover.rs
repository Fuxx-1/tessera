//! Component-owned native popover panel with explicit close semantics.

use crate::foundation::input::ButtonActivationExt;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct PopoverSurfaceCatalog;

impl PopoverSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Popover => Some("TesseraPopover"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct PopoverState {
    pub open: bool,
    pub toggles: u32,
    pub placement: PopoverPlacement,
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum PopoverPlacement {
    #[default]
    Right,
    Left,
    Below,
    Above,
}

pub fn popover_placement(
    viewport_width: f64,
    viewport_height: f64,
    anchor_x: f64,
    anchor_y: f64,
    anchor_width: f64,
    anchor_height: f64,
    content_width: f64,
    content_height: f64,
    margin: f64,
) -> PopoverPlacement {
    let right = viewport_width - (anchor_x + anchor_width) - margin;
    let left = anchor_x - margin;
    let below = viewport_height - (anchor_y + anchor_height) - margin;
    let above = anchor_y - margin;
    if right >= content_width {
        PopoverPlacement::Right
    } else if left >= content_width {
        PopoverPlacement::Left
    } else if below >= content_height || below >= above {
        PopoverPlacement::Below
    } else {
        PopoverPlacement::Above
    }
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PopoverCloseReason {
    Escape,
    Outside,
    Explicit,
    Reset,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PopoverEvent {
    Open,
    Close(PopoverCloseReason),
    Reset,
}

impl PopoverState {
    pub fn reduce(&mut self, event: PopoverEvent) {
        match event {
            PopoverEvent::Open => {
                self.open = true;
                self.toggles = self.toggles.saturating_add(1);
            }
            PopoverEvent::Close(_) => self.open = false,
            PopoverEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum PopoverAction {
    Opened {
        toggles: u32,
    },
    Closed {
        reason: PopoverCloseReason,
    },
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*

    mod.widgets.TesseraPopoverBase = #(TesseraPopover::register_widget(vm))
    mod.widgets.TesseraPopover = set_type_default() do mod.widgets.TesseraPopoverBase{
        width: Fill height: Fit flow: Down spacing: 6
        padding: Inset{left: 12, right: 12, top: 10, bottom: 10}
        show_bg: true
        draw_bg +: {color: theme.color_fg_app border_radius: 4.0 border_size: 1.0 border_color: theme.color_bevel}
        popover_title := Label{width: Fill height: Fit text: "Inspect revision" draw_text +: {color: theme.color_text}}
        popover_trigger := Button{width: Fit height: 30 text: "Open popover"}
        popover_anchor := Button{width: Fit height: 30 text: "Inspect revision"}
        popover_close := Button{width: Fit height: 30 visible: false text: "Close popover"}
        popover_overlay := CalloutTooltip{}
        popover_status := Label{width: Fill height: Fit text: "Popover ready" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraPopover {
    #[deref]
    view: View,
    #[rust]
    state: PopoverState,
}

impl TesseraPopover {
    fn tooltip_position(&self) -> TooltipPosition {
        match self.state.placement {
            PopoverPlacement::Right => TooltipPosition::Right,
            PopoverPlacement::Left => TooltipPosition::Left,
            PopoverPlacement::Below => TooltipPosition::Bottom,
            PopoverPlacement::Above => TooltipPosition::Top,
        }
    }

    fn show_overlay(&mut self, cx: &mut Cx) {
        let anchor = self.view.button(cx, ids!(popover_anchor)).area().rect(cx);
        self.view
            .callout_tooltip(cx, ids!(popover_overlay))
            .show_with_options(
                cx,
                "Revision r42 is ready for review. No external data or actions are loaded here.",
                anchor,
                CalloutTooltipOptions {
                    position: self.tooltip_position(),
                    ..Default::default()
                },
            );
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .button(cx, ids!(popover_close))
            .set_visible(cx, self.state.open);
        self.view.label(cx, ids!(popover_status)).set_text(
            cx,
            if self.state.open {
                match self.state.placement {
                    PopoverPlacement::Right => "Popover open / right",
                    PopoverPlacement::Left => "Popover open / left",
                    PopoverPlacement::Below => "Popover open / below",
                    PopoverPlacement::Above => "Popover open / above",
                }
            } else {
                "Popover ready"
            },
        );
        self.view.redraw(cx);
    }

    fn close(&mut self, cx: &mut Cx, reason: PopoverCloseReason) {
        if !self.state.open {
            return;
        }
        self.state.reduce(PopoverEvent::Close(reason));
        self.view
            .callout_tooltip(cx, ids!(popover_overlay))
            .hide(cx);
        self.sync(cx);
        cx.set_key_focus(self.view.button(cx, ids!(popover_anchor)).area());
        cx.widget_action(self.widget_uid(), PopoverAction::Closed { reason });
    }

    fn open(&mut self, cx: &mut Cx) {
        if self.state.open {
            return;
        }
        self.state.reduce(PopoverEvent::Open);
        self.sync(cx);
        self.show_overlay(cx);
        cx.widget_action(
            self.widget_uid(),
            PopoverAction::Opened {
                toggles: self.state.toggles,
            },
        );
    }

    pub fn reset(&mut self, cx: &mut Cx) {
        self.state.reduce(PopoverEvent::Reset);
        self.view
            .callout_tooltip(cx, ids!(popover_overlay))
            .hide(cx);
        self.sync(cx);
    }
}

impl Widget for TesseraPopover {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        let step = self.view.draw_walk(cx, scope, walk);
        let anchor = self.view.button(cx, ids!(popover_anchor)).area().rect(cx);
        let pass = cx.current_pass_size();
        self.state.placement = popover_placement(
            pass.x,
            pass.y,
            anchor.pos.x,
            anchor.pos.y,
            anchor.size.x,
            anchor.size.y,
            320.0,
            140.0,
            8.0,
        );
        step
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(popover_trigger))
            .activated(cx, event, &actions)
        {
            if self.state.open {
                self.close(cx, PopoverCloseReason::Explicit);
            } else {
                self.open(cx);
            }
        } else if self
            .view
            .button(cx, ids!(popover_anchor))
            .activated(cx, event, &actions)
        {
            self.open(cx);
        } else if self
            .view
            .button(cx, ids!(popover_close))
            .activated(cx, event, &actions)
        {
            self.close(cx, PopoverCloseReason::Explicit);
        } else if self.state.open
            && matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Escape)
        {
            self.close(cx, PopoverCloseReason::Escape);
        } else if let Event::MouseDown(mouse) = event {
            let trigger = self.view.button(cx, ids!(popover_trigger)).area().rect(cx);
            let anchor = self.view.button(cx, ids!(popover_anchor)).area().rect(cx);
            let close = self.view.button(cx, ids!(popover_close)).area().rect(cx);
            if self.state.open
                && !trigger.contains(mouse.abs)
                && !anchor.contains(mouse.abs)
                && !close.contains(mouse.abs)
            {
                self.close(cx, PopoverCloseReason::Outside);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        PopoverCloseReason, PopoverEvent, PopoverPlacement, PopoverState, popover_placement,
    };

    #[test]
    fn popover_close_reasons_do_not_change_toggle_count() {
        let mut state = PopoverState::default();
        state.reduce(PopoverEvent::Open);
        state.reduce(PopoverEvent::Close(PopoverCloseReason::Explicit));
        assert_eq!(state.toggles, 1);
        assert!(!state.open);
    }

    #[test]
    fn popover_placement_flips_and_clamps_to_an_available_side() {
        assert_eq!(
            popover_placement(360.0, 640.0, 316.0, 120.0, 36.0, 30.0, 300.0, 140.0, 8.0),
            PopoverPlacement::Left
        );
        assert_eq!(
            popover_placement(360.0, 640.0, 40.0, 560.0, 36.0, 30.0, 300.0, 140.0, 8.0),
            PopoverPlacement::Above
        );
    }
}
