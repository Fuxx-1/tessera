use crate::foundation::input::{ButtonActivationExt, set_button_enabled};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct TourSurfaceCatalog;

impl TourSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Tour => Some("TesseraTour"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TourFixture {
    pub title: &'static str,
    pub steps: [&'static str; 4],
    pub prompt: &'static str,
}

impl TourFixture {
    pub const DEFAULT: Self = Self {
        title: "Guided tour",
        steps: [
            "Open the route",
            "Review the current state",
            "Exercise the action path",
            "Close the tour",
        ],
        prompt: "Use arrows, Enter, Space, or Escape.",
    };
}

impl Default for TourFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct TourState {
    pub open: bool,
    pub step: usize,
    pub visits: u32,
    pub completions: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TourEvent {
    Start,
    Previous,
    Next,
    Finish,
    Reset,
}

impl TourState {
    pub fn reduce(&mut self, event: TourEvent, fixture: TourFixture) {
        match event {
            TourEvent::Start => {
                self.open = true;
                self.step = 0;
                self.visits = self.visits.saturating_add(1);
            }
            TourEvent::Previous if self.open && self.step > 0 => {
                self.step -= 1;
            }
            TourEvent::Next if self.open && self.step + 1 < fixture.steps.len() => {
                self.step += 1;
            }
            TourEvent::Next if self.open => {
                self.open = false;
                self.completions = self.completions.saturating_add(1);
            }
            TourEvent::Finish if self.open => {
                self.open = false;
                self.completions = self.completions.saturating_add(1);
            }
            TourEvent::Reset => *self = Self::default(),
            _ => {}
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum TourAction {
    Started {
        visits: u32,
    },
    StepChanged {
        step: usize,
    },
    Completed {
        completions: u32,
    },
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraTourBase = #(TesseraTour::register_widget(vm))
    mod.widgets.TesseraTour = set_type_default() do mod.widgets.TesseraTourBase{
        width: Fill
        height: Fit
        flow: Down
        spacing: 6
        padding: Inset{left: 12, right: 12, top: 10, bottom: 10}
        show_bg: true
        draw_bg +: {color: theme.color_fg_app border_radius: 4.0 border_size: 1.0 border_color: theme.color_bevel}
        tour_title := Label{width: Fill height: Fit text: "Guided tour" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        tour_prompt := Label{width: Fill height: Fit text: "Use arrows, Enter, Space, or Escape." draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
        tour_summary := Label{width: Fill height: Fit text: "Tour closed" draw_text +: {color: theme.color_text}}
        tour_steps := View{
            width: Fill
            height: Fit
            flow: Down
            spacing: 3
            tour_step_one := Label{width: Fill height: Fit text: "1. Open the route"}
            tour_step_two := Label{width: Fill height: Fit text: "2. Review the current state"}
            tour_step_three := Label{width: Fill height: Fit text: "3. Exercise the action path"}
            tour_step_four := Label{width: Fill height: Fit text: "4. Close the tour"}
        }
        tour_controls := View{
            width: Fill
            height: 30
            flow: Right
            spacing: 6
            tour_start := Button{width: Fit height: 30 text: "Start"}
            tour_previous := Button{width: Fit height: 30 text: "Previous"}
            tour_next := Button{width: Fit height: 30 text: "Next"}
            tour_finish := Button{width: Fit height: 30 text: "Finish"}
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraTour {
    #[deref]
    view: View,
    #[rust]
    fixture: TourFixture,
    #[rust]
    state: TourState,
}

impl TesseraTour {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = TourFixture::DEFAULT;
        self.state = TourState::default();
        self.sync(cx);
    }

    fn apply_event(&mut self, cx: &mut Cx, event: TourEvent) {
        self.state.reduce(event, self.fixture);
        self.sync(cx);
        let action = match event {
            TourEvent::Start => TourAction::Started {
                visits: self.state.visits,
            },
            TourEvent::Previous | TourEvent::Next if self.state.open => TourAction::StepChanged {
                step: self.state.step,
            },
            TourEvent::Next | TourEvent::Finish => TourAction::Completed {
                completions: self.state.completions,
            },
            TourEvent::Previous => return,
            TourEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(tour_title))
            .set_text(cx, self.fixture.title);
        self.view
            .label(cx, ids!(tour_prompt))
            .set_text(cx, self.fixture.prompt);
        self.view.label(cx, ids!(tour_summary)).set_text(
            cx,
            &format!(
                "{} / step {} / visits {} / completions {}",
                if self.state.open {
                    "Tour open"
                } else {
                    "Tour closed"
                },
                self.state.step + 1,
                self.state.visits,
                self.state.completions
            ),
        );
        let labels = [
            ids!(tour_step_one),
            ids!(tour_step_two),
            ids!(tour_step_three),
            ids!(tour_step_four),
        ];
        for (index, id) in labels.into_iter().enumerate() {
            let prefix = if index == self.state.step {
                if self.state.open { "> " } else { "* " }
            } else {
                "  "
            };
            self.view.label(cx, id).set_text(
                cx,
                &format!("{prefix}{}. {}", index + 1, self.fixture.steps[index]),
            );
        }
        set_button_enabled(
            &self.view.button(cx, ids!(tour_start)),
            cx,
            !self.state.open,
        );
        set_button_enabled(
            &self.view.button(cx, ids!(tour_previous)),
            cx,
            self.state.open && self.state.step > 0,
        );
        self.view
            .button(cx, ids!(tour_next))
            .set_text(cx, if self.state.open { "Next" } else { "Start" });
        set_button_enabled(
            &self.view.button(cx, ids!(tour_finish)),
            cx,
            self.state.open,
        );
        self.view.redraw(cx);
    }
}

impl Widget for TesseraTour {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(tour_start))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, TourEvent::Start);
        } else if self
            .view
            .button(cx, ids!(tour_previous))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, TourEvent::Previous);
        } else if self
            .view
            .button(cx, ids!(tour_next))
            .activated(cx, event, &actions)
        {
            if self.state.open {
                self.apply_event(cx, TourEvent::Next);
            } else {
                self.apply_event(cx, TourEvent::Start);
            }
        } else if self
            .view
            .button(cx, ids!(tour_finish))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, TourEvent::Finish);
        } else if self.view.key_focus(cx) {
            if let Event::KeyDown(key) = event {
                match key.key_code {
                    KeyCode::ArrowLeft => self.apply_event(cx, TourEvent::Previous),
                    KeyCode::ArrowRight => {
                        if self.state.open {
                            self.apply_event(cx, TourEvent::Next);
                        } else {
                            self.apply_event(cx, TourEvent::Start);
                        }
                    }
                    KeyCode::ReturnKey | KeyCode::NumpadEnter | KeyCode::Space => {
                        if self.state.open {
                            self.apply_event(cx, TourEvent::Next);
                        } else {
                            self.apply_event(cx, TourEvent::Start);
                        }
                    }
                    KeyCode::Escape => self.apply_event(cx, TourEvent::Finish),
                    _ => {}
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{TourEvent, TourState, TourSurfaceCatalog};
    use tessera_core::catalog::ComponentId;

    #[test]
    fn tour_routes_to_the_native_widget() {
        assert_eq!(
            TourSurfaceCatalog::widget_name(ComponentId::Tour),
            Some("TesseraTour")
        );
    }

    #[test]
    fn tour_tracks_start_step_and_completion() {
        let fixture = super::TourFixture::DEFAULT;
        let mut state = TourState::default();
        state.reduce(TourEvent::Start, fixture);
        state.reduce(TourEvent::Next, fixture);
        state.reduce(TourEvent::Finish, fixture);
        assert!(!state.open);
        assert_eq!(state.step, 1);
        assert_eq!(state.visits, 1);
        assert_eq!(state.completions, 1);
    }
}
