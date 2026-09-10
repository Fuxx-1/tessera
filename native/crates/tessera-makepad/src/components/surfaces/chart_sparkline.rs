//! Component-owned Sparkline widget for compact trend inspection.

use crate::foundation::focus::FocusRegion;
use crate::foundation::vector::{AlignedVector as DrawVector, DpiStroke};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct SparklineSurfaceCatalog;

impl SparklineSurfaceCatalog {
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Sparkline => Some("TesseraSparkline"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct SparklineState {
    pub selected_endpoint: Option<u32>,
    pub viewport_changes: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SparklineEvent {
    EndpointSelected(Option<u32>),
    ViewportChanged,
    Reset,
}

impl SparklineState {
    pub fn reduce(&mut self, event: SparklineEvent) {
        match event {
            SparklineEvent::EndpointSelected(point) => self.selected_endpoint = point,
            SparklineEvent::ViewportChanged => {
                self.viewport_changes = self.viewport_changes.saturating_add(1);
            }
            SparklineEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum SparklineAction {
    EndpointSelected {
        point: Option<u32>,
    },
    ViewportChanged {
        changes: u32,
    },
    #[default]
    Reset,
}

const SAMPLES: [f64; 14] = [
    0.58, 0.44, 0.52, 0.37, 0.47, 0.3, 0.42, 0.25, 0.35, 0.2, 0.31, 0.17, 0.27, 0.14,
];

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    use mod.text.*

    mod.widgets.TesseraSparklineBase = #(TesseraSparkline::register_widget(vm))
    mod.widgets.TesseraSparkline = set_type_default() do mod.widgets.TesseraSparklineBase{
        width: Fill
        height: 160
        trend: theme.color_chart_positive
        selection: theme.color_chart_selection
        ink: theme.color_text
        muted: theme.color_text_meta
        draw_bg +: {color: theme.color_fg_app}
        draw_dot +: {color: theme.color_chart_positive}
        draw_text +: {color: theme.color_text text_style: theme.font_regular {font_size: 11.0}}
        draw_vector +: {draw_depth: 2.0}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraSparkline {
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
    draw_vector: DrawVector,
    #[live]
    draw_focus: DrawVector,
    #[live]
    draw_dot: DrawColor,
    #[live]
    draw_text: DrawText,
    #[live]
    trend: Vec4f,
    #[live]
    selection: Vec4f,
    #[live]
    muted: Vec4f,
    #[live]
    ink: Vec4f,
    #[rust]
    state: SparklineState,
    #[rust]
    zoom: f64,
    #[rust]
    focus_region: FocusRegion,
}

impl TesseraSparkline {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.state.reduce(SparklineEvent::Reset);
        self.zoom = 1.0;
        self.draw_bg.redraw(cx);
        cx.widget_action(self.uid, SparklineAction::Reset);
    }

    fn emit(&mut self, cx: &mut Cx, event: SparklineEvent) {
        self.state.reduce(event);
        let action = match event {
            SparklineEvent::EndpointSelected(point) => SparklineAction::EndpointSelected { point },
            SparklineEvent::ViewportChanged => SparklineAction::ViewportChanged {
                changes: self.state.viewport_changes,
            },
            SparklineEvent::Reset => SparklineAction::Reset,
        };
        cx.widget_action(self.uid, action);
        self.draw_bg.redraw(cx);
    }

    fn select(&mut self, cx: &mut Cx, index: usize) {
        self.emit(
            cx,
            SparklineEvent::EndpointSelected(Some(index.min(SAMPLES.len() - 1) as u32)),
        );
    }

    fn plot(rect: Rect) -> Rect {
        Rect {
            pos: dvec2(rect.pos.x + 14.0, rect.pos.y + 30.0),
            size: dvec2((rect.size.x - 28.0).max(1.0), (rect.size.y - 52.0).max(1.0)),
        }
    }

    fn draw_sparkline(&mut self, cx: &mut Cx2d, plot: Rect) {
        self.draw_vector.begin();
        self.draw_vector
            .set_color(self.trend.x, self.trend.y, self.trend.z, self.trend.w);
        self.draw_vector.clear();
        for (index, value) in SAMPLES.iter().copied().enumerate() {
            let x = plot.pos.x + plot.size.x * index as f64 / (SAMPLES.len() - 1) as f64;
            let y = plot.pos.y + plot.size.y * (0.5 + (value - 0.5) / self.zoom.max(1.0));
            if index == 0 {
                self.draw_vector.move_to(x as f32, y as f32);
            } else {
                self.draw_vector.line_to(x as f32, y as f32);
            }
        }
        self.draw_vector.stroke_dip(cx, 2.0);
        for source in SAMPLES.iter().copied() {
            let index = SAMPLES
                .iter()
                .position(|candidate| *candidate == source)
                .expect("sparkline sample belongs to the bounded fixture");
            let x = plot.pos.x + plot.size.x * index as f64 / (SAMPLES.len() - 1) as f64;
            let y = plot.pos.y + plot.size.y * (0.5 + (source - 0.5) / self.zoom.max(1.0));
            self.draw_dot.color = self.trend;
            self.draw_dot.draw_abs(
                cx,
                Rect {
                    pos: dvec2(x - 2.0, y - 2.0),
                    size: dvec2(4.0, 4.0),
                },
            );
        }
        if let Some(index) = self.state.selected_endpoint.map(|value| value as usize) {
            if let Some(value) = SAMPLES.get(index).copied() {
                let x = plot.pos.x + plot.size.x * index as f64 / (SAMPLES.len() - 1) as f64;
                let y = plot.pos.y + plot.size.y * (0.5 + (value - 0.5) / self.zoom.max(1.0));
                self.draw_vector.set_color(
                    self.selection.x,
                    self.selection.y,
                    self.selection.z,
                    self.selection.w,
                );
                self.draw_vector.clear();
                self.draw_vector.circle(x as f32, y as f32, 4.5);
                self.draw_vector.fill();
            }
        }
        self.draw_vector.end(cx);
    }
}

impl Widget for TesseraSparkline {
    fn is_interactive(&self) -> bool {
        true
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, _scope: &mut Scope) {
        match event.hits_with_capture_overload(cx, self.draw_bg.area(), true) {
            Hit::KeyDown(key) if !key.is_repeat => match key.key_code {
                KeyCode::ArrowLeft | KeyCode::ArrowUp => {
                    let current = self.state.selected_endpoint.unwrap_or(0).saturating_sub(1);
                    self.select(cx, current as usize);
                }
                KeyCode::ArrowRight | KeyCode::ArrowDown | KeyCode::Space => {
                    self.select(cx, self.state.selected_endpoint.unwrap_or(0) as usize + 1);
                }
                KeyCode::Home => self.select(cx, 0),
                KeyCode::End => self.select(cx, SAMPLES.len() - 1),
                KeyCode::Equals => {
                    self.zoom = (self.zoom * 1.2).clamp(1.0, 6.0);
                    self.emit(cx, SparklineEvent::ViewportChanged);
                }
                KeyCode::Minus => {
                    self.zoom = (self.zoom / 1.2).clamp(1.0, 6.0);
                    self.emit(cx, SparklineEvent::ViewportChanged);
                }
                KeyCode::Escape => self.emit(cx, SparklineEvent::EndpointSelected(None)),
                _ => {}
            },
            Hit::FingerDown(fe) if fe.is_primary_hit() => {
                let plot = Self::plot(self.draw_bg.area().rect(cx));
                let fraction = ((fe.abs.x - plot.pos.x) / plot.size.x).clamp(0.0, 0.999_999);
                self.select(cx, (fraction * SAMPLES.len() as f64) as usize);
                cx.set_key_focus(self.draw_bg.area());
            }
            Hit::FingerScroll(scroll) => {
                self.zoom = if scroll.scroll.y < 0.0 {
                    (self.zoom * 1.2).clamp(1.0, 6.0)
                } else {
                    (self.zoom / 1.2).clamp(1.0, 6.0)
                };
                self.emit(cx, SparklineEvent::ViewportChanged);
            }
            _ => {}
        }
        self.draw_bg.redraw(cx);
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        let rect = self.draw_bg.draw_walk(cx, walk);
        let plot = Self::plot(rect);
        self.draw_text.color = self.ink;
        self.draw_text.text_style.font_size = 11.0;
        self.draw_text
            .draw_abs(cx, dvec2(rect.pos.x + 12.0, rect.pos.y + 8.0), "Sparkline");
        self.draw_text.color = self.muted;
        self.draw_text.text_style.font_size = 8.0;
        self.draw_text.draw_abs(
            cx,
            dvec2(rect.pos.x + 12.0, rect.pos.y + rect.size.y - 12.0),
            "Arrow select  +/- zoom",
        );
        self.draw_sparkline(cx, plot);
        self.focus_region
            .register(cx, self.uid, self.draw_bg.area(), NavRole::Slider, 0.0);
        DrawStep::done()
    }
}

#[cfg(test)]
mod tests {
    use super::{SparklineEvent, SparklineState, SparklineSurfaceCatalog};
    use tessera_core::catalog::ComponentId;

    #[test]
    fn sparkline_has_exact_route_and_endpoint_state() {
        assert_eq!(
            SparklineSurfaceCatalog::widget_name(ComponentId::Sparkline),
            Some("TesseraSparkline")
        );
        let mut state = SparklineState::default();
        state.reduce(SparklineEvent::EndpointSelected(Some(11)));
        assert_eq!(state.selected_endpoint, Some(11));
    }
}
