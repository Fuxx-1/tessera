use crate::foundation::input::ButtonActivationExt;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct MetricCardSurfaceCatalog;

impl MetricCardSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::MetricCard => Some("TesseraMetricCard"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct MetricCardFixture {
    pub title: &'static str,
    pub metric_name: &'static str,
    pub unit: &'static str,
    pub minimum: i32,
    pub maximum: i32,
    pub baseline: i32,
}

impl MetricCardFixture {
    pub const DEFAULT: Self = Self {
        title: "Service latency",
        metric_name: "p95",
        unit: "ms",
        minimum: 10,
        maximum: 180,
        baseline: 42,
    };
}

impl Default for MetricCardFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct MetricCardState {
    pub value: i32,
    pub trend_positive: bool,
    pub updates: u32,
}

impl Default for MetricCardState {
    fn default() -> Self {
        Self {
            value: MetricCardFixture::DEFAULT.baseline,
            trend_positive: true,
            updates: 0,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MetricCardEvent {
    Increase,
    Decrease,
    ToggleTrend,
    JumpToMinimum,
    JumpToMaximum,
    Reset,
}

impl MetricCardState {
    pub fn reduce(&mut self, event: MetricCardEvent, fixture: MetricCardFixture) {
        match event {
            MetricCardEvent::Increase => {
                self.value = (self.value + 3).min(fixture.maximum);
                self.updates = self.updates.saturating_add(1);
            }
            MetricCardEvent::Decrease => {
                self.value = (self.value - 3).max(fixture.minimum);
                self.updates = self.updates.saturating_add(1);
            }
            MetricCardEvent::ToggleTrend => {
                self.trend_positive = !self.trend_positive;
                self.updates = self.updates.saturating_add(1);
            }
            MetricCardEvent::JumpToMinimum => {
                self.value = fixture.minimum;
                self.updates = self.updates.saturating_add(1);
            }
            MetricCardEvent::JumpToMaximum => {
                self.value = fixture.maximum;
                self.updates = self.updates.saturating_add(1);
            }
            MetricCardEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum MetricCardAction {
    ValueChanged {
        value: i32,
        updates: u32,
    },
    TrendChanged {
        positive: bool,
    },
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraMetricCardBase = #(TesseraMetricCard::register_widget(vm))
    mod.widgets.TesseraMetricCard = set_type_default() do mod.widgets.TesseraMetricCardBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        metric_card_title := Label{width: Fill height: Fit text: "Service latency" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        metric_card_name := Label{width: Fill height: Fit text: "p95" draw_text +: {color: theme.color_text_meta}}
        metric_card_value := Label{width: Fill height: Fit text: "42 ms" draw_text +: {color: theme.color_text text_style +: {font_size: 24.0}}}
        metric_card_trend := Label{width: Fill height: Fit text: "Trend up" draw_text +: {color: theme.color_text_meta}}
        metric_card_controls := View{
            width: Fill
            height: 30
            flow: Right
            spacing: 6
            metric_card_decrease := Button{width: Fit height: 30 text: "-3"}
            metric_card_increase := Button{width: Fit height: 30 text: "+3"}
            metric_card_trend_button := Button{width: Fit height: 30 text: "Trend"}
            metric_card_min := Button{width: Fit height: 30 text: "Min"}
            metric_card_max := Button{width: Fit height: 30 text: "Max"}
        }
        metric_card_status := Label{width: Fill height: Fit text: "Metric card idle" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraMetricCard {
    #[deref]
    view: View,
    #[rust]
    fixture: MetricCardFixture,
    #[rust]
    state: MetricCardState,
}

impl TesseraMetricCard {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = MetricCardFixture::DEFAULT;
        self.state = MetricCardState::default();
        self.sync(cx);
    }

    fn apply_event(&mut self, cx: &mut Cx, event: MetricCardEvent) {
        self.state.reduce(event, self.fixture);
        self.sync(cx);
        let action = match event {
            MetricCardEvent::Increase
            | MetricCardEvent::Decrease
            | MetricCardEvent::JumpToMinimum
            | MetricCardEvent::JumpToMaximum => MetricCardAction::ValueChanged {
                value: self.state.value,
                updates: self.state.updates,
            },
            MetricCardEvent::ToggleTrend => MetricCardAction::TrendChanged {
                positive: self.state.trend_positive,
            },
            MetricCardEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(metric_card_title))
            .set_text(cx, self.fixture.title);
        self.view
            .label(cx, ids!(metric_card_name))
            .set_text(cx, self.fixture.metric_name);
        self.view
            .label(cx, ids!(metric_card_value))
            .set_text(cx, &format!("{} {}", self.state.value, self.fixture.unit));
        self.view.label(cx, ids!(metric_card_trend)).set_text(
            cx,
            if self.state.trend_positive {
                "Trend up"
            } else {
                "Trend down"
            },
        );
        self.view
            .button(cx, ids!(metric_card_trend_button))
            .set_text(
                cx,
                if self.state.trend_positive {
                    "Trend down"
                } else {
                    "Trend up"
                },
            );
        self.view.label(cx, ids!(metric_card_status)).set_text(
            cx,
            &format!(
                "{} / range {}..{} / updates {}",
                self.state.value, self.fixture.minimum, self.fixture.maximum, self.state.updates
            ),
        );
        self.view.redraw(cx);
    }
}

impl Widget for TesseraMetricCard {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(metric_card_decrease))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, MetricCardEvent::Decrease);
        } else if self
            .view
            .button(cx, ids!(metric_card_increase))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, MetricCardEvent::Increase);
        } else if self
            .view
            .button(cx, ids!(metric_card_trend_button))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, MetricCardEvent::ToggleTrend);
        } else if self
            .view
            .button(cx, ids!(metric_card_min))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, MetricCardEvent::JumpToMinimum);
        } else if self
            .view
            .button(cx, ids!(metric_card_max))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, MetricCardEvent::JumpToMaximum);
        } else if self.view.key_focus(cx) {
            if let Event::KeyDown(key) = event {
                match key.key_code {
                    KeyCode::ArrowUp => self.apply_event(cx, MetricCardEvent::Increase),
                    KeyCode::ArrowDown => self.apply_event(cx, MetricCardEvent::Decrease),
                    KeyCode::Home => self.apply_event(cx, MetricCardEvent::JumpToMinimum),
                    KeyCode::End => self.apply_event(cx, MetricCardEvent::JumpToMaximum),
                    KeyCode::Space => self.apply_event(cx, MetricCardEvent::ToggleTrend),
                    _ => {}
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{MetricCardEvent, MetricCardState, MetricCardSurfaceCatalog};
    use tessera_core::catalog::ComponentId;

    #[test]
    fn metric_card_routes_to_the_native_widget() {
        assert_eq!(
            MetricCardSurfaceCatalog::widget_name(ComponentId::MetricCard),
            Some("TesseraMetricCard")
        );
    }

    #[test]
    fn metric_card_clamps_value_and_toggles_trend() {
        let fixture = super::MetricCardFixture::DEFAULT;
        let mut state = MetricCardState::default();
        state.reduce(MetricCardEvent::Increase, fixture);
        state.reduce(MetricCardEvent::Decrease, fixture);
        state.reduce(MetricCardEvent::ToggleTrend, fixture);
        state.reduce(MetricCardEvent::JumpToMaximum, fixture);
        assert_eq!(state.value, fixture.maximum);
        assert!(!state.trend_positive);
    }
}
