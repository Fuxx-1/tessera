//! Native GaugeChart widget with its own bounded value model and input path.

use crate::foundation::focus::FocusRegion;
use crate::foundation::vector::{AlignedVector as DrawVector, DpiStroke};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

use super::chart_common::{GaugeDatum, gauge_fixture, validate_gauge};

pub struct GaugeChartSurfaceCatalog;

impl GaugeChartSurfaceCatalog {
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::GaugeChart => Some("TesseraGaugeChart"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct GaugeChartConfig {
    pub keyboard_step: f64,
    pub minimum_size: f64,
}

impl Default for GaugeChartConfig {
    fn default() -> Self {
        Self {
            keyboard_step: 5.0,
            minimum_size: 96.0,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct GaugeChartState {
    pub value: f64,
    pub viewport_changes: u32,
}

impl Default for GaugeChartState {
    fn default() -> Self {
        Self {
            value: gauge_fixture().value,
            viewport_changes: 0,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum GaugeChartEvent {
    ValueChanged(f64),
    ViewportChanged,
    Reset,
}

impl GaugeChartState {
    pub fn reduce(&mut self, event: GaugeChartEvent, datum: GaugeDatum) {
        match event {
            GaugeChartEvent::ValueChanged(value) => {
                self.value = value.clamp(datum.min, datum.max);
            }
            GaugeChartEvent::ViewportChanged => {
                self.viewport_changes = self.viewport_changes.saturating_add(1);
            }
            GaugeChartEvent::Reset => *self = Self::default(),
        }
    }
}

struct GaugeLayout {
    center: DVec2,
    radius: f64,
    value: Rect,
}

impl GaugeLayout {
    fn new(rect: Rect) -> Option<Self> {
        let value_height = 36.0;
        let gap = 12.0;
        let center = dvec2(
            rect.pos.x + rect.size.x * 0.5,
            rect.pos.y + (rect.size.y * 0.60).min(rect.size.y - 26.0 - value_height - gap),
        );
        let radius = (rect.size.x.min(rect.size.y) * 0.31)
            .min((rect.size.x - 44.0) * 0.5)
            .min(center.y - rect.pos.y - 42.0);
        if !radius.is_finite() || radius < 24.0 {
            return None;
        }
        Some(Self {
            center,
            radius,
            // The needle and target sweep stay above the baseline plus 10 DIP.
            value: Rect {
                pos: dvec2(rect.pos.x + 12.0, center.y + gap),
                size: dvec2(rect.size.x - 24.0, value_height),
            },
        })
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub enum GaugeChartAction {
    ValueChanged {
        value: f64,
    },
    ViewportChanged {
        changes: u32,
    },
    #[default]
    Reset,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    use mod.text.*

    mod.widgets.TesseraGaugeChartBase = #(TesseraGaugeChart::register_widget(vm))
    mod.widgets.TesseraGaugeChart = set_type_default() do mod.widgets.TesseraGaugeChartBase{
        width: Fill
        height: 260
        accent: theme.color_chart_primary
        target: theme.color_chart_warning
        selection: theme.color_chart_selection
        ink: theme.color_text
        muted: theme.color_text_meta
        danger: theme.color_chart_negative
        draw_bg +: {color: theme.color_fg_app}
        draw_grid +: {color: theme.color_bevel}
        draw_text +: {color: theme.color_text text_style: theme.font_regular {font_size: 11.0}}
        draw_vector +: {draw_depth: 2.0}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraGaugeChart {
    #[uid]
    uid: WidgetUid,
    #[source]
    source: ScriptObjectRef,
    #[walk]
    walk: Walk,
    #[layout]
    layout: Layout,
    #[redraw]
    #[live]
    draw_bg: DrawColor,
    #[live]
    draw_grid: DrawColor,
    #[live]
    draw_text: DrawText,
    #[live]
    draw_vector: DrawVector,
    #[live]
    accent: Vec4f,
    #[live]
    target: Vec4f,
    #[live]
    selection: Vec4f,
    #[live]
    muted: Vec4f,
    #[live]
    ink: Vec4f,
    #[live]
    danger: Vec4f,
    #[rust]
    config: GaugeChartConfig,
    #[rust]
    datum: GaugeDatum,
    #[rust]
    state: GaugeChartState,
    #[rust]
    focus_region: FocusRegion,
}

impl TesseraGaugeChart {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.config = GaugeChartConfig::default();
        self.datum = gauge_fixture();
        self.state.reduce(GaugeChartEvent::Reset, self.datum);
        self.draw_bg.redraw(cx);
        cx.widget_action(self.uid, GaugeChartAction::Reset);
    }

    fn ensure_fixture(&mut self) {
        if !self.datum.max.is_finite() || self.datum.max <= self.datum.min {
            self.datum = gauge_fixture();
        }
        if !self.state.value.is_finite() {
            self.state = GaugeChartState::default();
        }
    }

    fn emit(&mut self, cx: &mut Cx, event: GaugeChartEvent) {
        self.state.reduce(event, self.datum);
        let action = match event {
            GaugeChartEvent::ValueChanged(_) => GaugeChartAction::ValueChanged {
                value: self.state.value,
            },
            GaugeChartEvent::ViewportChanged => GaugeChartAction::ViewportChanged {
                changes: self.state.viewport_changes,
            },
            GaugeChartEvent::Reset => GaugeChartAction::Reset,
        };
        cx.widget_action(self.uid, action);
        self.draw_bg.redraw(cx);
    }

    fn ratio(&self) -> f64 {
        ((self.state.value - self.datum.min) / (self.datum.max - self.datum.min)).clamp(0.0, 1.0)
    }

    fn set_ratio(&mut self, cx: &mut Cx, ratio: f64) {
        self.emit(
            cx,
            GaugeChartEvent::ValueChanged(
                self.datum.min + (self.datum.max - self.datum.min) * ratio.clamp(0.0, 1.0),
            ),
        );
    }

    fn draw_arc(&mut self, cx: &mut Cx2d, center: DVec2, radius: f64, ratio: f64) {
        self.draw_vector.begin();
        self.draw_vector
            .set_color(self.muted.x, self.muted.y, self.muted.z, 0.34);
        self.draw_vector.clear();
        for step in 0..=40 {
            let theta = std::f64::consts::PI + std::f64::consts::PI * step as f64 / 40.0;
            let point = dvec2(
                center.x + theta.cos() * radius,
                center.y + theta.sin() * radius,
            );
            if step == 0 {
                self.draw_vector.move_to(point.x as f32, point.y as f32);
            } else {
                self.draw_vector.line_to(point.x as f32, point.y as f32);
            }
        }
        self.draw_vector.stroke_dip(cx, 10.0);

        self.draw_vector
            .set_color(self.accent.x, self.accent.y, self.accent.z, self.accent.w);
        self.draw_vector.clear();
        let completed = (ratio * 40.0).round() as usize;
        for step in 0..=completed {
            let theta = std::f64::consts::PI + std::f64::consts::PI * step as f64 / 40.0;
            let point = dvec2(
                center.x + theta.cos() * radius,
                center.y + theta.sin() * radius,
            );
            if step == 0 {
                self.draw_vector.move_to(point.x as f32, point.y as f32);
            } else {
                self.draw_vector.line_to(point.x as f32, point.y as f32);
            }
        }
        self.draw_vector.stroke_dip(cx, 10.0);

        let needle_theta = std::f64::consts::PI + std::f64::consts::PI * ratio;
        self.draw_vector.set_color(
            self.selection.x,
            self.selection.y,
            self.selection.z,
            self.selection.w,
        );
        self.draw_vector.clear();
        self.draw_vector.move_to(center.x as f32, center.y as f32);
        self.draw_vector.line_to(
            (center.x + needle_theta.cos() * (radius - 12.0)) as f32,
            (center.y + needle_theta.sin() * (radius - 12.0)) as f32,
        );
        self.draw_vector.stroke_dip(cx, 3.0);
        self.draw_vector
            .circle(center.x as f32, center.y as f32, 5.0);
        self.draw_vector.fill();

        if let Some(target) = self.datum.target {
            let target_ratio =
                ((target - self.datum.min) / (self.datum.max - self.datum.min)).clamp(0.0, 1.0);
            let theta = std::f64::consts::PI + std::f64::consts::PI * target_ratio;
            let from = dvec2(
                center.x + theta.cos() * (radius - 8.0),
                center.y + theta.sin() * (radius - 8.0),
            );
            let to = dvec2(
                center.x + theta.cos() * (radius + 10.0),
                center.y + theta.sin() * (radius + 10.0),
            );
            self.draw_vector
                .set_color(self.target.x, self.target.y, self.target.z, self.target.w);
            self.draw_vector.clear();
            self.draw_vector.move_to(from.x as f32, from.y as f32);
            self.draw_vector.line_to(to.x as f32, to.y as f32);
            self.draw_vector.stroke_dip(cx, 2.0);
        }
        self.draw_vector.end(cx);
    }
}

impl Widget for TesseraGaugeChart {
    fn is_interactive(&self) -> bool {
        true
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, _scope: &mut Scope) {
        self.ensure_fixture();
        match event.hits_with_capture_overload(cx, self.draw_bg.area(), true) {
            Hit::KeyFocus(_) | Hit::KeyFocusLost(_) => self.draw_bg.redraw(cx),
            Hit::KeyDown(key) if !key.is_repeat => match key.key_code {
                KeyCode::ArrowLeft | KeyCode::ArrowDown => self.emit(
                    cx,
                    GaugeChartEvent::ValueChanged(self.state.value - self.config.keyboard_step),
                ),
                KeyCode::ArrowRight | KeyCode::ArrowUp | KeyCode::Space => self.emit(
                    cx,
                    GaugeChartEvent::ValueChanged(self.state.value + self.config.keyboard_step),
                ),
                KeyCode::Home => self.emit(cx, GaugeChartEvent::ValueChanged(self.datum.min)),
                KeyCode::End => self.emit(cx, GaugeChartEvent::ValueChanged(self.datum.max)),
                KeyCode::Escape => {
                    self.emit(cx, GaugeChartEvent::ValueChanged(gauge_fixture().value))
                }
                _ => {}
            },
            Hit::FingerDown(fe) if fe.is_primary_hit() => {
                let rect = self.draw_bg.area().rect(cx);
                self.set_ratio(
                    cx,
                    ((fe.abs.x - rect.pos.x) / rect.size.x.max(1.0)).clamp(0.0, 1.0),
                );
                cx.set_key_focus(self.draw_bg.area());
            }
            Hit::FingerScroll(scroll) => {
                let delta = if scroll.scroll.y.abs() > f64::EPSILON {
                    scroll.scroll.y
                } else {
                    scroll.scroll.x
                };
                let direction = if delta < 0.0 { 1.0 } else { -1.0 };
                self.emit(
                    cx,
                    GaugeChartEvent::ValueChanged(
                        self.state.value + direction * self.config.keyboard_step,
                    ),
                );
                self.emit(cx, GaugeChartEvent::ViewportChanged);
            }
            _ => {}
        }
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        self.ensure_fixture();
        let rect = self.draw_bg.draw_walk(cx, walk);
        self.draw_text.color = self.ink;
        self.draw_text.text_style.font_size = 12.0;
        self.draw_text.draw_abs(
            cx,
            dvec2(rect.pos.x + 12.0, rect.pos.y + 9.0),
            "Gauge chart",
        );
        let state = validate_gauge(self.datum);
        let layout = GaugeLayout::new(rect).filter(|_| {
            state.is_ready() && rect.size.x.min(rect.size.y) >= self.config.minimum_size
        });
        if let Some(layout) = layout {
            self.draw_arc(cx, layout.center, layout.radius, self.ratio());
            self.draw_text.color = self.ink;
            self.draw_text.text_style.font_size = 24.0;
            super::chart_label::draw_label(
                &mut self.draw_text,
                cx,
                layout.value,
                &format!("{:.0}", self.state.value),
                Align { x: 0.5, y: 0.5 },
            );
            self.draw_text.color = self.muted;
            self.draw_text.text_style.font_size = 9.0;
            self.draw_text.draw_abs(
                cx,
                dvec2(rect.pos.x + 12.0, rect.pos.y + rect.size.y - 14.0),
                "Arrow adjust  Home/End bounds  Escape reset",
            );
        } else {
            self.draw_text.color = super::chart_label::readable_on(self.draw_bg.color, self.danger);
            self.draw_text.text_style.font_size = 12.0;
            self.draw_text.draw_abs(
                cx,
                dvec2(rect.pos.x + 16.0, rect.pos.y + 48.0),
                if state.is_ready() {
                    "Viewport too small"
                } else {
                    state.label()
                },
            );
        }
        self.focus_region
            .register(cx, self.uid, self.draw_bg.area(), NavRole::Slider, 0.0);
        DrawStep::done()
    }
}

#[cfg(test)]
mod tests {
    use super::{GaugeChartConfig, GaugeChartEvent, GaugeChartState, GaugeChartSurfaceCatalog};
    use tessera_core::catalog::ComponentId;

    #[test]
    fn gauge_value_stays_below_the_sweep_and_inside_the_footer_boundary() {
        use super::{GaugeLayout, Rect, dvec2};
        for width in [96.0, 240.0, 532.0, 932.0] {
            for height in [144.0, 180.0, 260.0, 400.0] {
                let rect = Rect {
                    pos: dvec2(280.0, 203.0),
                    size: dvec2(width, height),
                };
                let layout = GaugeLayout::new(rect).unwrap();
                assert!(layout.center.y - layout.radius - 10.0 >= rect.pos.y + 32.0);
                assert!(layout.value.pos.y > layout.center.y + 10.0);
                assert!(layout.value.pos.y + layout.value.size.y <= rect.pos.y + height - 26.0);
                assert!(layout.center.x - layout.radius - 10.0 >= rect.pos.x + 12.0);
                assert!(layout.center.x + layout.radius + 10.0 <= rect.pos.x + width - 12.0);
                assert_eq!(
                    layout.value.pos.x + layout.value.size.x * 0.5,
                    layout.center.x
                );
            }
        }
        assert!(
            GaugeLayout::new(Rect {
                pos: dvec2(0.0, 0.0),
                size: dvec2(96.0, 96.0)
            })
            .is_none()
        );
    }

    #[test]
    fn gauge_chart_has_one_exact_route_and_own_config() {
        assert_eq!(
            GaugeChartSurfaceCatalog::widget_name(ComponentId::GaugeChart),
            Some("TesseraGaugeChart")
        );
        assert_eq!(
            GaugeChartSurfaceCatalog::widget_name(ComponentId::FunnelChart),
            None
        );
        assert!(GaugeChartConfig::default().keyboard_step > 0.0);
    }

    #[test]
    fn gauge_state_clamps_values_and_resets() {
        let datum = super::gauge_fixture();
        let mut state = GaugeChartState::default();
        state.reduce(GaugeChartEvent::ValueChanged(999.0), datum);
        assert_eq!(state.value, datum.max);
        state.reduce(GaugeChartEvent::ViewportChanged, datum);
        assert_eq!(state.viewport_changes, 1);
        state.reduce(GaugeChartEvent::Reset, datum);
        assert_eq!(state, GaugeChartState::default());
    }
}
