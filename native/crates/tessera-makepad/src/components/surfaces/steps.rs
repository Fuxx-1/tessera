use crate::foundation::input::ButtonActivationExt;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct StepsSurfaceCatalog;
impl StepsSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Steps => Some("TesseraSteps"),
            _ => None,
        }
    }
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct StepsFixture {
    pub total: usize,
}
impl StepsFixture {
    pub const DEFAULT: Self = Self { total: 3 };
}
impl Default for StepsFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct StepsState {
    pub current: usize,
    pub error: bool,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum StepsEvent {
    Next,
    Select(usize),
    MarkError,
    Retry,
    Reset,
}
impl StepsState {
    pub fn reduce(&mut self, event: StepsEvent, total: usize) {
        match event {
            StepsEvent::Next => {
                self.current = (self.current + 1).min(total.saturating_sub(1));
                self.error = false;
            }
            StepsEvent::Select(index) => {
                self.current = index.min(total.saturating_sub(1));
                self.error = false;
            }
            StepsEvent::MarkError => self.error = true,
            StepsEvent::Retry => self.error = false,
            StepsEvent::Reset => *self = Self::default(),
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum StepsAction {
    Advanced {
        current: usize,
    },
    Error,
    Retried,
    Reset,
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraStepsBase = #(TesseraSteps::register_widget(vm))
    mod.widgets.TesseraSteps = set_type_default() do mod.widgets.TesseraStepsBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        steps_title := Label{width: Fill height: Fit text: "Steps"}
        steps_indicators := View{width: Fill height: 34 flow: Right spacing: 6
            steps_indicator_one := Button{width: Fill height: 30 text: "[1] Prepare"}
            steps_indicator_two := Button{width: Fill height: 30 text: "[2] Review"}
            steps_indicator_three := Button{width: Fill height: 30 text: "[3] Publish"}
        }
        steps_connector := View{width: Fill height: 2 show_bg: true draw_bg +: {color: theme.color_bevel}}
        steps_status := Label{width: Fill height: Fit text: "Step 1 of 3"}
        steps_next := Button{width: Fit height: 30 text: "Next step"}
        steps_error := Button{width: Fit height: 30 text: "Mark error"}
        steps_retry := Button{width: Fit height: 30 text: "Retry"}
        steps_reset := Button{width: Fit height: 30 text: "Reset steps"}
    }
}
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraSteps {
    #[deref]
    view: View,
    #[rust]
    fixture: StepsFixture,
    #[rust]
    state: StepsState,
}
impl TesseraSteps {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = StepsFixture::DEFAULT;
        self.state = StepsState::default();
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: StepsEvent) {
        self.state.reduce(event, self.fixture.total);
        self.sync(cx);
        let action = match event {
            StepsEvent::Next => StepsAction::Advanced {
                current: self.state.current,
            },
            StepsEvent::Select(_) => StepsAction::Advanced {
                current: self.state.current,
            },
            StepsEvent::MarkError => StepsAction::Error,
            StepsEvent::Retry => StepsAction::Retried,
            StepsEvent::Reset => StepsAction::Reset,
        };
        cx.widget_action(self.widget_uid(), action);
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.view.label(cx, ids!(steps_status)).set_text(
            cx,
            &format!(
                "Step {} of {}{}",
                self.state.current + 1,
                self.fixture.total,
                if self.state.error { " / error" } else { "" }
            ),
        );
        let current = self.state.current;
        self.view.button(cx, ids!(steps_indicator_one)).set_text(
            cx,
            if current == 0 {
                "[>] Prepare"
            } else {
                "[x] Prepare"
            },
        );
        self.view.button(cx, ids!(steps_indicator_two)).set_text(
            cx,
            if current == 1 {
                "[>] Review"
            } else if current > 1 {
                "[x] Review"
            } else {
                "[ ] Review"
            },
        );
        self.view.button(cx, ids!(steps_indicator_three)).set_text(
            cx,
            if current == 2 {
                "[>] Publish"
            } else {
                "[ ] Publish"
            },
        );
    }
}
impl Widget for TesseraSteps {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(steps_next))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, StepsEvent::Next);
        } else if self
            .view
            .button(cx, ids!(steps_indicator_one))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, StepsEvent::Select(0));
        } else if self
            .view
            .button(cx, ids!(steps_indicator_two))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, StepsEvent::Select(1));
        } else if self
            .view
            .button(cx, ids!(steps_indicator_three))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, StepsEvent::Select(2));
        } else if self
            .view
            .button(cx, ids!(steps_error))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, StepsEvent::MarkError);
        } else if self
            .view
            .button(cx, ids!(steps_retry))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, StepsEvent::Retry);
        } else if self
            .view
            .button(cx, ids!(steps_reset))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, StepsEvent::Reset);
        }
    }
}
#[cfg(test)]
mod tests {
    use super::{StepsEvent, StepsState, StepsSurfaceCatalog};
    use tessera_core::catalog::ComponentId;
    #[test]
    fn steps_support_error_retry_and_bounds() {
        assert_eq!(
            StepsSurfaceCatalog::widget_name(ComponentId::Steps),
            Some("TesseraSteps")
        );
        let mut state = StepsState::default();
        state.reduce(StepsEvent::Next, 3);
        state.reduce(StepsEvent::MarkError, 3);
        assert!(state.error);
        state.reduce(StepsEvent::Retry, 3);
        assert!(!state.error);
    }
}
