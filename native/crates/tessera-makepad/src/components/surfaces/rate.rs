use crate::foundation::input::{ButtonActivationExt, set_button_enabled};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct RateSurfaceCatalog;
impl RateSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Rate => Some("TesseraRate"),
            _ => None,
        }
    }
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct RateFixture {
    pub title: &'static str,
    pub max: u8,
}
impl RateFixture {
    pub const DEFAULT: Self = Self {
        title: "Service quality",
        max: 5,
    };
}
impl Default for RateFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct RateState {
    pub value: u8,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RateEvent {
    Set(u8),
    Clear,
    Reset,
}
impl RateState {
    pub fn reduce(&mut self, event: RateEvent) {
        self.reduce_with_max(event, 5);
    }

    pub fn reduce_with_max(&mut self, event: RateEvent, max: u8) {
        match event {
            RateEvent::Set(value) => self.value = value.min(max),
            RateEvent::Clear | RateEvent::Reset => self.value = 0,
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum RateAction {
    Changed {
        value: u8,
    },
    Cleared,
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraRateBase = #(TesseraRate::register_widget(vm))
    mod.widgets.TesseraRate = set_type_default() do mod.widgets.TesseraRateBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        rate_title := Label{width: Fill height: Fit text: "Service quality" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        rate_stars := View{width: Fit height: 34 flow: Right spacing: 4
            rate_one := Button{width: 30 height: 30 text: "★"}
            rate_two := Button{width: 30 height: 30 text: "★"}
            rate_three := Button{width: 30 height: 30 text: "★"}
            rate_four := Button{width: 30 height: 30 text: "★"}
            rate_five := Button{width: 30 height: 30 text: "★"}
        }
        rate_clear := Button{width: Fit height: 30 text: "Clear rating"}
        rate_status := Label{width: Fill height: Fit text: "0 of 5"}
    }
}
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraRate {
    #[deref]
    view: View,
    #[rust]
    fixture: RateFixture,
    #[rust]
    state: RateState,
}
impl TesseraRate {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = RateFixture::DEFAULT;
        self.state = RateState::default();
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: RateEvent) {
        self.state.reduce_with_max(event, self.fixture.max);
        self.sync(cx);
        let action = match event {
            RateEvent::Set(_) => RateAction::Changed {
                value: self.state.value,
            },
            RateEvent::Clear => RateAction::Cleared,
            RateEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }

    fn has_keyboard_focus(&self, cx: &Cx) -> bool {
        [
            self.view.widget(cx, ids!(rate_one)),
            self.view.widget(cx, ids!(rate_two)),
            self.view.widget(cx, ids!(rate_three)),
            self.view.widget(cx, ids!(rate_four)),
            self.view.widget(cx, ids!(rate_five)),
            self.view.widget(cx, ids!(rate_clear)),
        ]
        .iter()
        .any(|widget| widget.key_focus(cx))
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(rate_title))
            .set_text(cx, self.fixture.title);
        self.view
            .label(cx, ids!(rate_status))
            .set_text(cx, &format!("{} of {}", self.state.value, self.fixture.max));
        let stars = [
            ids!(rate_one),
            ids!(rate_two),
            ids!(rate_three),
            ids!(rate_four),
            ids!(rate_five),
        ];
        for (index, id) in stars.into_iter().enumerate() {
            let label = if index < self.state.value as usize {
                "★"
            } else {
                "☆"
            };
            self.view.button(cx, id).set_text(cx, label);
        }
        set_button_enabled(
            &self.view.button(cx, ids!(rate_clear)),
            cx,
            self.state.value > 0,
        );
        self.view.redraw(cx);
    }
}
impl Widget for TesseraRate {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        let has_keyboard_focus = self.has_keyboard_focus(cx);
        let clear_requested = self
            .view
            .button(cx, ids!(rate_clear))
            .activated(cx, event, &actions)
            || (self.state.value > 0
                && has_keyboard_focus
                && matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Escape));
        if self
            .view
            .button(cx, ids!(rate_one))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, RateEvent::Set(1));
        } else if self
            .view
            .button(cx, ids!(rate_two))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, RateEvent::Set(2));
        } else if self
            .view
            .button(cx, ids!(rate_three))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, RateEvent::Set(3));
        } else if self
            .view
            .button(cx, ids!(rate_four))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, RateEvent::Set(4));
        } else if self
            .view
            .button(cx, ids!(rate_five))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, RateEvent::Set(5));
        } else if clear_requested {
            self.apply_event(cx, RateEvent::Clear);
        } else if has_keyboard_focus && let Event::KeyDown(key) = event {
            match key.key_code {
                KeyCode::ArrowLeft => {
                    self.apply_event(cx, RateEvent::Set(self.state.value.saturating_sub(1)))
                }
                KeyCode::ArrowRight => self.apply_event(
                    cx,
                    RateEvent::Set(self.state.value.saturating_add(1).min(self.fixture.max)),
                ),
                KeyCode::Home => self.apply_event(cx, RateEvent::Clear),
                KeyCode::End => self.apply_event(cx, RateEvent::Set(self.fixture.max)),
                KeyCode::Space => self.apply_event(cx, RateEvent::Set(self.state.value.max(1))),
                _ => {}
            }
        }
    }
}
#[cfg(test)]
mod tests {
    use super::{RateEvent, RateState, RateSurfaceCatalog};
    use tessera_core::catalog::ComponentId;
    #[test]
    fn rate_clamps_and_clears_stars() {
        assert_eq!(
            RateSurfaceCatalog::widget_name(ComponentId::Rate),
            Some("TesseraRate")
        );
        let mut state = RateState::default();
        state.reduce(RateEvent::Set(99));
        assert_eq!(state.value, 5);
        state.reduce(RateEvent::Clear);
        assert_eq!(state.value, 0);
    }
}
