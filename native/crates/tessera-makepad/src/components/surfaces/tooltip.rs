//! Native tooltip disclosure with explicit dismissal and focus return.

use crate::foundation::input::ButtonActivationExt;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct TooltipSurfaceCatalog;

impl TooltipSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Tooltip => Some("TesseraTooltip"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct TooltipState {
    pub visible: bool,
    pub placement: TooltipPlacement,
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum TooltipPlacement {
    #[default]
    Below,
    Above,
}

pub fn tooltip_placement(
    viewport_height: f64,
    anchor_top: f64,
    anchor_height: f64,
    content_height: f64,
    margin: f64,
) -> TooltipPlacement {
    let below = viewport_height - (anchor_top + anchor_height) - margin;
    let above = anchor_top - margin;
    if below >= content_height || below >= above {
        TooltipPlacement::Below
    } else {
        TooltipPlacement::Above
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TooltipCloseReason {
    Explicit,
    Escape,
    Outside,
    Reset,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TooltipEvent {
    Show,
    Hide(TooltipCloseReason),
    Reset,
}

impl TooltipState {
    pub fn reduce(&mut self, event: TooltipEvent) {
        match event {
            TooltipEvent::Show => self.visible = true,
            TooltipEvent::Hide(_) | TooltipEvent::Reset => self.visible = false,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum TooltipAction {
    Shown,
    Hidden {
        reason: TooltipCloseReason,
    },
    Reset,
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*

    mod.widgets.TesseraTooltipBase = #(TesseraTooltip::register_widget(vm))
    mod.widgets.TesseraTooltip = set_type_default() do mod.widgets.TesseraTooltipBase{
        width: Fill height: Fit flow: Down spacing: 6
        padding: Inset{left: 12, right: 12, top: 10, bottom: 10}
        show_bg: true
        draw_bg +: {color: theme.color_fg_app border_radius: 4.0 border_size: 1.0 border_color: theme.color_bevel}
        tooltip_target := Button{width: Fit height: 30 text: "Release status"}
        tooltip_overlay := CalloutTooltip{}
        tooltip_status := Label{width: Fill height: Fit text: "Tooltip ready" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraTooltip {
    #[deref]
    view: View,
    #[rust]
    state: TooltipState,
}

impl TesseraTooltip {
    fn show(&mut self, cx: &mut Cx, refresh: bool) {
        if self.state.visible && !refresh {
            return;
        }
        self.state.reduce(TooltipEvent::Show);
        self.sync(cx);
        let target = self.view.button(cx, ids!(tooltip_target)).area().rect(cx);
        self.view
            .callout_tooltip(cx, ids!(tooltip_overlay))
            .show_with_options(
                cx,
                "Release status is ready. This native tooltip contains bounded plain text only.",
                target,
                CalloutTooltipOptions {
                    position: match self.state.placement {
                        TooltipPlacement::Below => TooltipPosition::Bottom,
                        TooltipPlacement::Above => TooltipPosition::Top,
                    },
                    ..Default::default()
                },
            );
        cx.widget_action(self.widget_uid(), TooltipAction::Shown);
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view.label(cx, ids!(tooltip_status)).set_text(
            cx,
            match (self.state.visible, self.state.placement) {
                (true, TooltipPlacement::Below) => "Tooltip visible / below anchor",
                (true, TooltipPlacement::Above) => "Tooltip visible / above anchor",
                (false, _) => "Tooltip ready",
            },
        );
        self.view.redraw(cx);
    }

    fn hide(&mut self, cx: &mut Cx, reason: TooltipCloseReason) {
        if !self.state.visible {
            return;
        }
        self.state.reduce(TooltipEvent::Hide(reason));
        self.view
            .callout_tooltip(cx, ids!(tooltip_overlay))
            .hide(cx);
        self.sync(cx);
        cx.widget_action(self.widget_uid(), TooltipAction::Hidden { reason });
    }

    pub fn reset(&mut self, cx: &mut Cx) {
        self.state.reduce(TooltipEvent::Reset);
        self.view
            .callout_tooltip(cx, ids!(tooltip_overlay))
            .hide(cx);
        self.sync(cx);
        cx.widget_action(self.widget_uid(), TooltipAction::Reset);
    }
}

impl Widget for TesseraTooltip {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        let step = self.view.draw_walk(cx, scope, walk);
        let target = self.view.button(cx, ids!(tooltip_target)).area().rect(cx);
        self.state.placement = tooltip_placement(
            cx.current_pass_size().y,
            target.pos.y,
            target.size.y,
            92.0,
            8.0,
        );
        step
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(tooltip_target))
            .activated(cx, event, &actions)
        {
            // The native tooltip dismisses on pointer down/up, including its opener.
            self.show(cx, true);
        } else if self.state.visible
            && matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Escape)
        {
            self.hide(cx, TooltipCloseReason::Escape);
        } else if self.state.visible && matches!(event, Event::Scroll(_)) {
            self.hide(cx, TooltipCloseReason::Explicit);
        } else if let Event::MouseDown(mouse) = event {
            let target = self.view.button(cx, ids!(tooltip_target)).area().rect(cx);
            if self.state.visible && !target.contains(mouse.abs) {
                self.hide(cx, TooltipCloseReason::Outside);
            }
        } else {
            let target = self.view.button(cx, ids!(tooltip_target)).area();
            match event.hits(cx, target) {
                Hit::FingerHoverIn(_) | Hit::KeyFocus(_) => self.show(cx, false),
                Hit::FingerHoverOut(_) | Hit::KeyFocusLost(_) => {
                    self.hide(cx, TooltipCloseReason::Explicit)
                }
                _ => {}
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        TooltipCloseReason, TooltipEvent, TooltipPlacement, TooltipState, TooltipSurfaceCatalog,
        tooltip_placement,
    };
    use tessera_core::catalog::ComponentId;

    #[test]
    fn tooltip_visibility_is_owned_by_its_native_surface() {
        assert_eq!(
            TooltipSurfaceCatalog::widget_name(ComponentId::Tooltip),
            Some("TesseraTooltip")
        );
        let mut state = TooltipState::default();
        state.reduce(TooltipEvent::Show);
        state.reduce(TooltipEvent::Hide(TooltipCloseReason::Escape));
        assert!(!state.visible);
    }

    #[test]
    fn tooltip_placement_flips_at_the_viewport_edge() {
        assert_eq!(
            tooltip_placement(600.0, 520.0, 30.0, 92.0, 8.0),
            TooltipPlacement::Above
        );
        assert_eq!(
            tooltip_placement(600.0, 120.0, 30.0, 92.0, 8.0),
            TooltipPlacement::Below
        );
    }
}
