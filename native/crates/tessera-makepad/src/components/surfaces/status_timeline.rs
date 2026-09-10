use crate::foundation::input::ButtonActivationExt;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct StatusTimelineSurfaceCatalog;

impl StatusTimelineSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::StatusTimeline => Some("TesseraStatusTimeline"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct StatusTimelineFixture {
    pub title: &'static str,
    pub stages: [&'static str; 4],
    pub details: [&'static str; 4],
}

impl StatusTimelineFixture {
    pub const DEFAULT: Self = Self {
        title: "Release status timeline",
        stages: ["Queued", "Building", "Verifying", "Published"],
        details: [
            "Waiting for the pipeline to start.",
            "Compilers and tests are running.",
            "Smoke and runtime checks are in progress.",
            "Artifacts are available for review.",
        ],
    };
}

impl Default for StatusTimelineFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct StatusTimelineState {
    pub current: usize,
    pub failed: bool,
    pub retries: u32,
    pub advances: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum StatusTimelineEvent {
    Next,
    Fail,
    Retry,
    Reset,
}

impl StatusTimelineState {
    pub fn reduce(&mut self, event: StatusTimelineEvent, fixture: StatusTimelineFixture) {
        match event {
            StatusTimelineEvent::Next => {
                if self.current + 1 < fixture.stages.len() {
                    self.current += 1;
                    self.failed = false;
                    self.advances = self.advances.saturating_add(1);
                }
            }
            StatusTimelineEvent::Fail => self.failed = true,
            StatusTimelineEvent::Retry => {
                self.failed = false;
                self.retries = self.retries.saturating_add(1);
            }
            StatusTimelineEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum StatusTimelineAction {
    Advanced {
        current: usize,
    },
    Selected {
        current: usize,
    },
    Failed {
        current: usize,
    },
    Retried {
        retries: u32,
    },
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraStatusTimelineBase = #(TesseraStatusTimeline::register_widget(vm))
    mod.widgets.TesseraStatusTimeline = set_type_default() do mod.widgets.TesseraStatusTimelineBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        status_timeline_title := Label{width: Fill height: Fit text: "Release status timeline" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        status_timeline_rows := View{
            width: Fill
            height: Fit
            flow: Down
            spacing: 3
            status_timeline_stage_one := Label{width: Fill height: Fit text: "▶ Queued"}
            status_timeline_stage_two := Label{width: Fill height: Fit text: "  Building"}
            status_timeline_stage_three := Label{width: Fill height: Fit text: "  Verifying"}
            status_timeline_stage_four := Label{width: Fill height: Fit text: "  Published"}
        }
        status_timeline_controls := View{
            width: Fill
            height: 30
            flow: Right
            spacing: 6
            status_timeline_next := Button{width: Fit height: 30 text: "Next"}
            status_timeline_fail := Button{width: Fit height: 30 text: "Fail"}
            status_timeline_retry := Button{width: Fit height: 30 text: "Retry"}
            status_timeline_reset := Button{width: Fit height: 30 text: "Reset"}
        }
        status_timeline_status := Label{width: Fill height: Fit text: "Timeline queued" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraStatusTimeline {
    #[deref]
    view: View,
    #[rust]
    fixture: StatusTimelineFixture,
    #[rust]
    state: StatusTimelineState,
}

impl TesseraStatusTimeline {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = StatusTimelineFixture::DEFAULT;
        self.state = StatusTimelineState::default();
        self.sync(cx);
    }

    fn apply_event(&mut self, cx: &mut Cx, event: StatusTimelineEvent) {
        self.state.reduce(event, self.fixture);
        self.sync(cx);
        let action = match event {
            StatusTimelineEvent::Next => StatusTimelineAction::Advanced {
                current: self.state.current,
            },
            StatusTimelineEvent::Fail => StatusTimelineAction::Failed {
                current: self.state.current,
            },
            StatusTimelineEvent::Retry => StatusTimelineAction::Retried {
                retries: self.state.retries,
            },
            StatusTimelineEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }

    fn stage_text(&self, index: usize) -> String {
        let marker = if index == self.state.current {
            if self.state.failed { "×" } else { "▶" }
        } else if index < self.state.current {
            "✓"
        } else {
            "•"
        };
        format!(
            "{marker} {} — {}",
            self.fixture.stages[index], self.fixture.details[index]
        )
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(status_timeline_title))
            .set_text(cx, self.fixture.title);
        let stage_labels = [
            ids!(status_timeline_stage_one),
            ids!(status_timeline_stage_two),
            ids!(status_timeline_stage_three),
            ids!(status_timeline_stage_four),
        ];
        for (index, id) in stage_labels.into_iter().enumerate() {
            self.view
                .label(cx, id)
                .set_text(cx, &self.stage_text(index));
        }
        self.view.label(cx, ids!(status_timeline_status)).set_text(
            cx,
            &format!(
                "current {} / failed {} / retries {} / advances {}",
                self.state.current, self.state.failed, self.state.retries, self.state.advances
            ),
        );
        self.view.redraw(cx);
    }
}

impl Widget for TesseraStatusTimeline {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(status_timeline_next))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, StatusTimelineEvent::Next);
        } else if self
            .view
            .button(cx, ids!(status_timeline_fail))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, StatusTimelineEvent::Fail);
        } else if self
            .view
            .button(cx, ids!(status_timeline_retry))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, StatusTimelineEvent::Retry);
        } else if self
            .view
            .button(cx, ids!(status_timeline_reset))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, StatusTimelineEvent::Reset);
        } else if self.view.key_focus(cx) {
            if let Event::KeyDown(key) = event {
                match key.key_code {
                    KeyCode::ArrowRight
                    | KeyCode::ReturnKey
                    | KeyCode::NumpadEnter
                    | KeyCode::Space => {
                        if self.state.failed {
                            self.apply_event(cx, StatusTimelineEvent::Retry);
                        } else {
                            self.apply_event(cx, StatusTimelineEvent::Next);
                        }
                    }
                    KeyCode::ArrowLeft => {
                        if self.state.current > 0 {
                            self.state.current -= 1;
                            self.sync(cx);
                            cx.widget_action(
                                self.widget_uid(),
                                StatusTimelineAction::Selected {
                                    current: self.state.current,
                                },
                            );
                        }
                    }
                    KeyCode::Escape => self.apply_event(cx, StatusTimelineEvent::Reset),
                    _ => {}
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{StatusTimelineEvent, StatusTimelineState, StatusTimelineSurfaceCatalog};
    use tessera_core::catalog::ComponentId;

    #[test]
    fn status_timeline_routes_to_the_native_widget() {
        assert_eq!(
            StatusTimelineSurfaceCatalog::widget_name(ComponentId::StatusTimeline),
            Some("TesseraStatusTimeline")
        );
    }

    #[test]
    fn status_timeline_advances_fails_and_retries() {
        let fixture = super::StatusTimelineFixture::DEFAULT;
        let mut state = StatusTimelineState::default();
        state.reduce(StatusTimelineEvent::Next, fixture);
        state.reduce(StatusTimelineEvent::Fail, fixture);
        state.reduce(StatusTimelineEvent::Retry, fixture);
        assert_eq!(state.current, 1);
        assert!(!state.failed);
        assert_eq!(state.retries, 1);
        assert_eq!(state.advances, 1);
    }
}
