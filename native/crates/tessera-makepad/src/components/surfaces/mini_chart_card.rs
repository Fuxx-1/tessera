use crate::foundation::input::ButtonActivationExt;
use crate::foundation::vector::{AlignedVector as DrawVector, DpiStroke};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct MiniChartCardSurfaceCatalog;

impl MiniChartCardSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::MiniChartCard => Some("TesseraMiniChartCard"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct MiniChartCardFixture {
    pub title: &'static str,
    pub series_names: [&'static str; 4],
    pub samples: [[u8; 5]; 4],
}

impl MiniChartCardFixture {
    pub const DEFAULT: Self = Self {
        title: "Mini chart card",
        series_names: ["Morning", "Noon", "Evening", "Night"],
        samples: [
            [2, 5, 3, 6, 4],
            [4, 4, 5, 7, 6],
            [1, 2, 3, 2, 1],
            [7, 6, 5, 4, 3],
        ],
    };
}

impl Default for MiniChartCardFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct MiniChartCardState {
    pub series: usize,
    pub paused: bool,
    pub reduced_motion: bool,
    pub frames: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MiniChartCardEvent {
    NextSeries,
    TogglePause,
    ToggleMotion,
    Reset,
}

impl MiniChartCardState {
    pub fn reduce(&mut self, event: MiniChartCardEvent, fixture: MiniChartCardFixture) {
        match event {
            MiniChartCardEvent::NextSeries if !self.paused => {
                self.series = (self.series + 1) % fixture.samples.len();
                self.frames = self.frames.saturating_add(1);
            }
            MiniChartCardEvent::TogglePause => {
                self.paused = !self.paused;
                self.frames = self.frames.saturating_add(1);
            }
            MiniChartCardEvent::ToggleMotion => {
                self.reduced_motion = !self.reduced_motion;
                self.frames = self.frames.saturating_add(1);
            }
            MiniChartCardEvent::Reset => *self = Self::default(),
            MiniChartCardEvent::NextSeries => {}
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum MiniChartCardAction {
    SeriesChanged {
        series: usize,
    },
    PlaybackChanged {
        paused: bool,
    },
    MotionChanged {
        reduced_motion: bool,
    },
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraMiniChartCardBase = #(TesseraMiniChartCard::register_widget(vm))
    mod.widgets.TesseraMiniChartCard = set_type_default() do mod.widgets.TesseraMiniChartCardBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        trend_color: theme.color_bevel_focus
        mini_chart_title := Label{width: Fill height: Fit text: "Mini chart card" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        mini_chart_caption := Label{width: Fill height: Fit text: "Morning" draw_text +: {color: theme.color_text_meta}}
        mini_chart_bars := View{
            width: Fill
            height: 100
        }
        mini_chart_values := Label{width: Fill height: Fit text: "" draw_text +: {color: theme.color_text_val flow: Flow.Right{wrap: true}}}
        mini_chart_controls := View{
            width: Fill
            height: 30
            flow: Right
            spacing: 6
            mini_chart_next := Button{width: Fit height: 30 text: "Next series"}
            mini_chart_pause := Button{width: Fit height: 30 text: "Pause"}
            mini_chart_motion := Button{width: Fit height: 30 text: "Motion"}
        }
        mini_chart_status := Label{width: Fill height: Fit text: "Mini chart idle" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraMiniChartCard {
    #[deref]
    view: View,
    #[live]
    draw_trend: DrawVector,
    #[live]
    trend_color: Vec4f,
    #[rust]
    fixture: MiniChartCardFixture,
    #[rust]
    state: MiniChartCardState,
}

impl TesseraMiniChartCard {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = MiniChartCardFixture::DEFAULT;
        self.state = MiniChartCardState::default();
        self.sync(cx);
    }

    fn apply_event(&mut self, cx: &mut Cx, event: MiniChartCardEvent) {
        self.state.reduce(event, self.fixture);
        self.sync(cx);
        let action = match event {
            MiniChartCardEvent::NextSeries => MiniChartCardAction::SeriesChanged {
                series: self.state.series,
            },
            MiniChartCardEvent::TogglePause => MiniChartCardAction::PlaybackChanged {
                paused: self.state.paused,
            },
            MiniChartCardEvent::ToggleMotion => MiniChartCardAction::MotionChanged {
                reduced_motion: self.state.reduced_motion,
            },
            MiniChartCardEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(mini_chart_title))
            .set_text(cx, self.fixture.title);
        self.view
            .label(cx, ids!(mini_chart_caption))
            .set_text(cx, self.fixture.series_names[self.state.series]);
        let sample = self.fixture.samples[self.state.series];
        self.view.label(cx, ids!(mini_chart_values)).set_text(
            cx,
            &format!(
                "Values: {}, {}, {}, {}, {}   Min {}   Max {}   Current {}",
                sample[0],
                sample[1],
                sample[2],
                sample[3],
                sample[4],
                sample.iter().min().unwrap(),
                sample.iter().max().unwrap(),
                sample[4],
            ),
        );
        self.view
            .button(cx, ids!(mini_chart_pause))
            .set_text(cx, if self.state.paused { "Resume" } else { "Pause" });
        self.view.button(cx, ids!(mini_chart_motion)).set_text(
            cx,
            if self.state.reduced_motion {
                "Motion off"
            } else {
                "Motion on"
            },
        );
        self.view.label(cx, ids!(mini_chart_status)).set_text(
            cx,
            &format!(
                "series {} / paused {} / reduced-motion {} / frames {}",
                self.state.series, self.state.paused, self.state.reduced_motion, self.state.frames
            ),
        );
        self.view.redraw(cx);
    }
}

impl Widget for TesseraMiniChartCard {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)?;
        let rect = self.view.widget(cx, ids!(mini_chart_bars)).area().rect(cx);
        let samples = self.fixture.samples[self.state.series];
        let maximum = f64::from(*samples.iter().max().unwrap()).max(1.0);
        self.draw_trend.begin();
        self.draw_trend.set_color(
            self.trend_color.x,
            self.trend_color.y,
            self.trend_color.z,
            self.trend_color.w,
        );
        for (index, value) in samples.iter().enumerate() {
            let x = rect.pos.x + 6.0 + index as f64 / 4.0 * (rect.size.x - 12.0).max(0.0);
            let y = rect.pos.y
                + 6.0
                + (1.0 - f64::from(*value) / maximum) * (rect.size.y - 12.0).max(0.0);
            if index == 0 {
                self.draw_trend.move_to(x as f32, y as f32);
            } else {
                self.draw_trend.line_to(x as f32, y as f32);
            }
        }
        self.draw_trend.stroke_dip(cx, 2.0);
        self.draw_trend.end(cx);
        DrawStep::done()
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(mini_chart_next))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, MiniChartCardEvent::NextSeries);
        } else if self
            .view
            .button(cx, ids!(mini_chart_pause))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, MiniChartCardEvent::TogglePause);
        } else if self
            .view
            .button(cx, ids!(mini_chart_motion))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, MiniChartCardEvent::ToggleMotion);
        } else if self.view.key_focus(cx) {
            if let Event::KeyDown(key) = event {
                match key.key_code {
                    KeyCode::ArrowRight => self.apply_event(cx, MiniChartCardEvent::NextSeries),
                    KeyCode::Space => self.apply_event(cx, MiniChartCardEvent::TogglePause),
                    KeyCode::ReturnKey | KeyCode::NumpadEnter => {
                        self.apply_event(cx, MiniChartCardEvent::ToggleMotion)
                    }
                    _ => {}
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{MiniChartCardEvent, MiniChartCardState, MiniChartCardSurfaceCatalog};
    use tessera_core::catalog::ComponentId;

    #[test]
    fn mini_chart_card_routes_to_the_native_widget() {
        assert_eq!(
            MiniChartCardSurfaceCatalog::widget_name(ComponentId::MiniChartCard),
            Some("TesseraMiniChartCard")
        );
    }

    #[test]
    fn mini_chart_card_cycles_series_and_motion_state() {
        let fixture = super::MiniChartCardFixture::DEFAULT;
        let mut state = MiniChartCardState::default();
        state.reduce(MiniChartCardEvent::NextSeries, fixture);
        state.reduce(MiniChartCardEvent::TogglePause, fixture);
        state.reduce(MiniChartCardEvent::ToggleMotion, fixture);
        assert_eq!(state.series, 1);
        assert!(state.paused);
        assert!(state.reduced_motion);
    }
}
