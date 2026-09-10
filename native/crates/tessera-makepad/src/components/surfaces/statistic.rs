use crate::foundation::input::ButtonActivationExt;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct StatisticSurfaceCatalog;
impl StatisticSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Statistic => Some("TesseraStatistic"),
            _ => None,
        }
    }
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct StatisticFixture {
    pub label: &'static str,
    pub value: i64,
}
impl StatisticFixture {
    pub const DEFAULT: Self = Self {
        label: "Deployments",
        value: 128,
    };
}
impl Default for StatisticFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct StatisticState {
    pub value: i64,
    pub positive: bool,
}

impl Default for StatisticState {
    fn default() -> Self {
        Self {
            value: 0,
            positive: true,
        }
    }
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum StatisticEvent {
    Increment,
    ToggleTrend,
    Reset,
}
impl StatisticState {
    pub fn reduce(&mut self, event: StatisticEvent, initial: i64) {
        match event {
            StatisticEvent::Increment => self.value = self.value.saturating_add(1),
            StatisticEvent::ToggleTrend => self.positive = !self.positive,
            StatisticEvent::Reset => self.value = initial,
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum StatisticAction {
    ValueChanged {
        value: i64,
    },
    TrendChanged {
        positive: bool,
    },
    Reset,
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraStatisticBase = #(TesseraStatistic::register_widget(vm))
    mod.widgets.TesseraStatistic = set_type_default() do mod.widgets.TesseraStatisticBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        statistic_label := Label{width: Fill height: Fit text: "Deployments"}
        statistic_value := Label{width: Fill height: Fit text: "128" draw_text +: {color: theme.color_text text_style +: {font_size: 20.0}}}
        statistic_trend_bar := View{width: Fill height: 8 flow: Right
            statistic_trend_up := View{width: 70 height: Fill show_bg: true draw_bg +: {color: theme.color_low border_radius: 2.0}}
            statistic_trend_down := View{width: 30 height: Fill visible: false show_bg: true draw_bg +: {color: theme.color_warning border_radius: 2.0}}
        }
        statistic_trend := Label{width: Fill height: Fit text: "trend up"}
        statistic_increment := Button{width: Fit height: 30 text: "Increment"}
        statistic_toggle := Button{width: Fit height: 30 text: "Toggle trend"}
        statistic_reset := Button{width: Fit height: 30 text: "Reset statistic"}
    }
}
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraStatistic {
    #[deref]
    view: View,
    #[rust]
    fixture: StatisticFixture,
    #[rust]
    state: StatisticState,
}
impl TesseraStatistic {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = StatisticFixture::DEFAULT;
        self.state = StatisticState {
            value: self.fixture.value,
            ..StatisticState::default()
        };
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: StatisticEvent) {
        self.state.reduce(event, self.fixture.value);
        self.sync(cx);
        let action = match event {
            StatisticEvent::Increment => StatisticAction::ValueChanged {
                value: self.state.value,
            },
            StatisticEvent::ToggleTrend => StatisticAction::TrendChanged {
                positive: self.state.positive,
            },
            StatisticEvent::Reset => StatisticAction::Reset,
        };
        cx.widget_action(self.widget_uid(), action);
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(statistic_label))
            .set_text(cx, self.fixture.label);
        self.view
            .label(cx, ids!(statistic_value))
            .set_text(cx, &self.state.value.to_string());
        self.view
            .widget(cx, ids!(statistic_trend_up))
            .set_visible(cx, self.state.positive);
        self.view
            .widget(cx, ids!(statistic_trend_down))
            .set_visible(cx, !self.state.positive);
        self.view.label(cx, ids!(statistic_trend)).set_text(
            cx,
            if self.state.positive {
                "trend up"
            } else {
                "trend down"
            },
        );
    }
}
impl Widget for TesseraStatistic {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(statistic_increment))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, StatisticEvent::Increment);
        } else if self
            .view
            .button(cx, ids!(statistic_toggle))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, StatisticEvent::ToggleTrend);
        } else if self
            .view
            .button(cx, ids!(statistic_reset))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, StatisticEvent::Reset);
        }
    }
}
#[cfg(test)]
mod tests {
    use super::{StatisticEvent, StatisticState, StatisticSurfaceCatalog};
    use tessera_core::catalog::ComponentId;
    #[test]
    fn statistic_keeps_exact_value_and_trend() {
        assert_eq!(
            StatisticSurfaceCatalog::widget_name(ComponentId::Statistic),
            Some("TesseraStatistic")
        );
        let mut state = StatisticState {
            value: 128,
            ..StatisticState::default()
        };
        state.reduce(StatisticEvent::Increment, 128);
        state.reduce(StatisticEvent::ToggleTrend, 128);
        assert_eq!(state.value, 129);
        assert!(!state.positive);
        state.reduce(StatisticEvent::Reset, 128);
        assert_eq!(
            state,
            StatisticState {
                value: 128,
                positive: false
            }
        );
    }
}
