use crate::foundation::input::ButtonActivationExt;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct TimelineSurfaceCatalog;
impl TimelineSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Timeline => Some("TesseraTimeline"),
            _ => None,
        }
    }
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TimelineFixture {
    pub events: [&'static str; 3],
}
impl TimelineFixture {
    pub const DEFAULT: Self = Self {
        events: ["Created", "Validated", "Published"],
    };
}
impl Default for TimelineFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct TimelineState {
    pub current: usize,
    pub failed: bool,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TimelineEvent {
    Next,
    MarkFailed,
    Retry,
    Reset,
}
impl TimelineState {
    pub fn reduce(&mut self, event: TimelineEvent) {
        match event {
            TimelineEvent::Next => self.current = (self.current + 1).min(2),
            TimelineEvent::MarkFailed => self.failed = true,
            TimelineEvent::Retry => self.failed = false,
            TimelineEvent::Reset => *self = Self::default(),
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum TimelineAction {
    Advanced {
        current: usize,
    },
    Failed,
    Retried,
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraTimelineBase = #(TesseraTimeline::register_widget(vm))
    mod.widgets.TesseraTimeline = set_type_default() do mod.widgets.TesseraTimelineBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        timeline_title := Label{width: Fill height: Fit text: "Timeline"}
        timeline_track := View{width: Fill height: 30 flow: Right spacing: 4
            timeline_marker_one := Label{width: 24 height: Fit text: "[ ]"}
            timeline_connector_one := View{width: Fill height: 2 show_bg: true draw_bg +: {color: theme.color_text}}
            timeline_marker_two := Label{width: 24 height: Fit text: "[ ]"}
            timeline_connector_two := View{width: Fill height: 2 show_bg: true draw_bg +: {color: theme.color_text}}
            timeline_marker_three := Label{width: 24 height: Fit text: "[ ]"}
        }
        timeline_events := Label{width: Fill height: Fit text: "Created / Validated / Published" draw_text.flow: Flow.Right{wrap: true}}
        timeline_status := Label{width: Fill height: Fit text: "Created"}
        timeline_next := Button{width: Fit height: 30 text: "Next event"}
        timeline_fail := Button{width: Fit height: 30 text: "Mark failed"}
        timeline_retry := Button{width: Fit height: 30 text: "Retry"}
    }
}
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraTimeline {
    #[deref]
    view: View,
    #[rust]
    fixture: TimelineFixture,
    #[rust]
    state: TimelineState,
}
impl TesseraTimeline {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = TimelineFixture::DEFAULT;
        self.state = TimelineState::default();
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: TimelineEvent) {
        self.state.reduce(event);
        self.sync(cx);
        let action = match event {
            TimelineEvent::Next => TimelineAction::Advanced {
                current: self.state.current,
            },
            TimelineEvent::MarkFailed => TimelineAction::Failed,
            TimelineEvent::Retry => TimelineAction::Retried,
            TimelineEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }
    fn sync(&mut self, cx: &mut Cx) {
        let current = self.state.current;
        self.view
            .label(cx, ids!(timeline_marker_one))
            .set_text(cx, if current == 0 { "[>]" } else { "[x]" });
        self.view.label(cx, ids!(timeline_marker_two)).set_text(
            cx,
            if current == 1 {
                "[>]"
            } else if current > 1 {
                "[x]"
            } else {
                "[ ]"
            },
        );
        self.view
            .label(cx, ids!(timeline_marker_three))
            .set_text(cx, if current == 2 { "[>]" } else { "[ ]" });
        self.view
            .label(cx, ids!(timeline_events))
            .set_text(cx, &self.fixture.events.join(" / "));
        self.view.label(cx, ids!(timeline_status)).set_text(
            cx,
            if self.state.failed {
                "failed / retry available"
            } else {
                self.fixture.events[self.state.current]
            },
        );
    }
}
impl Widget for TesseraTimeline {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(timeline_next))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, TimelineEvent::Next);
        } else if self
            .view
            .button(cx, ids!(timeline_fail))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, TimelineEvent::MarkFailed);
        } else if self
            .view
            .button(cx, ids!(timeline_retry))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, TimelineEvent::Retry);
        }
    }
}
#[cfg(test)]
mod tests {
    use super::{TimelineEvent, TimelineState, TimelineSurfaceCatalog};
    use tessera_core::catalog::ComponentId;
    #[test]
    fn timeline_tracks_failure_and_retry() {
        assert_eq!(
            TimelineSurfaceCatalog::widget_name(ComponentId::Timeline),
            Some("TesseraTimeline")
        );
        let mut state = TimelineState::default();
        state.reduce(TimelineEvent::Next);
        state.reduce(TimelineEvent::MarkFailed);
        assert!(state.failed && state.current == 1);
        state.reduce(TimelineEvent::Retry);
        assert!(!state.failed);
    }
}
