//! Component-owned ScatterChart widget with independent point hit testing.

use crate::foundation::focus::FocusRegion;
use crate::foundation::vector::AlignedVector as DrawVector;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct ScatterChartSurfaceCatalog;

impl ScatterChartSurfaceCatalog {
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::ScatterChart => Some("TesseraScatterChart"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct ScatterChartState {
    pub selected_point: Option<u32>,
    pub viewport_changes: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ScatterChartEvent {
    PointSelected(Option<u32>),
    ViewportChanged,
    Reset,
}

impl ScatterChartState {
    pub fn reduce(&mut self, event: ScatterChartEvent) {
        match event {
            ScatterChartEvent::PointSelected(point) => self.selected_point = point,
            ScatterChartEvent::ViewportChanged => {
                self.viewport_changes = self.viewport_changes.saturating_add(1);
            }
            ScatterChartEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum ScatterChartAction {
    PointSelected {
        point: Option<u32>,
    },
    ViewportChanged {
        changes: u32,
    },
    #[default]
    Reset,
}

const POINTS: [(f64, f64); 12] = [
    (0.12, 0.72),
    (0.2, 0.46),
    (0.28, 0.58),
    (0.35, 0.32),
    (0.43, 0.64),
    (0.52, 0.41),
    (0.61, 0.53),
    (0.68, 0.21),
    (0.74, 0.47),
    (0.81, 0.29),
    (0.88, 0.62),
    (0.94, 0.38),
];

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    use mod.text.*

    mod.widgets.TesseraScatterChartBase = #(TesseraScatterChart::register_widget(vm))
    mod.widgets.TesseraScatterChart = set_type_default() do mod.widgets.TesseraScatterChartBase{
        width: Fill
        height: 260
        point_color: theme.color_chart_positive
        selection: theme.color_chart_selection
        ink: theme.color_text
        muted: theme.color_text_meta
        draw_bg +: {color: theme.color_fg_app}
        draw_grid +: {color: theme.color_bevel}
        draw_text +: {color: theme.color_text text_style: theme.font_regular {font_size: 11.0}}
        draw_vector +: {draw_depth: 2.0}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraScatterChart {
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
    draw_vector: DrawVector,
    #[live]
    draw_text: DrawText,
    #[live]
    point_color: Vec4f,
    #[live]
    selection: Vec4f,
    #[live]
    muted: Vec4f,
    #[live]
    ink: Vec4f,
    #[rust]
    state: ScatterChartState,
    #[rust]
    zoom: f64,
    #[rust]
    focus_region: FocusRegion,
}

impl TesseraScatterChart {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.state.reduce(ScatterChartEvent::Reset);
        self.zoom = 1.0;
        self.draw_bg.redraw(cx);
        cx.widget_action(self.uid, ScatterChartAction::Reset);
    }

    fn emit(&mut self, cx: &mut Cx, event: ScatterChartEvent) {
        self.state.reduce(event);
        let action = match event {
            ScatterChartEvent::PointSelected(point) => ScatterChartAction::PointSelected { point },
            ScatterChartEvent::ViewportChanged => ScatterChartAction::ViewportChanged {
                changes: self.state.viewport_changes,
            },
            ScatterChartEvent::Reset => ScatterChartAction::Reset,
        };
        cx.widget_action(self.uid, action);
        self.draw_bg.redraw(cx);
    }

    fn plot(rect: Rect) -> Rect {
        Rect {
            pos: dvec2(rect.pos.x + 30.0, rect.pos.y + 36.0),
            size: dvec2((rect.size.x - 48.0).max(1.0), (rect.size.y - 66.0).max(1.0)),
        }
    }

    fn point_at(plot: Rect, source: (f64, f64), zoom: f64) -> DVec2 {
        let x = plot.pos.x + plot.size.x * (0.5 + (source.0 - 0.5) / zoom.max(1.0));
        let y = plot.pos.y + plot.size.y * (0.5 + (source.1 - 0.5) / zoom.max(1.0));
        dvec2(x, y)
    }

    fn closest_point(&self, plot: Rect, position: DVec2) -> usize {
        POINTS
            .iter()
            .enumerate()
            .min_by(|(_, left), (_, right)| {
                let left = Self::point_at(plot, **left, self.zoom).distance(&position);
                let right = Self::point_at(plot, **right, self.zoom).distance(&position);
                left.partial_cmp(&right)
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
            .map_or(0, |(index, _)| index)
    }

    fn select(&mut self, cx: &mut Cx, index: usize) {
        self.emit(
            cx,
            ScatterChartEvent::PointSelected(Some(index.min(POINTS.len() - 1) as u32)),
        );
    }

    fn draw_points(&mut self, cx: &mut Cx2d, plot: Rect) {
        self.draw_vector.begin();
        for (index, source) in POINTS.iter().copied().enumerate() {
            let point = Self::point_at(plot, source, self.zoom);
            let color = if self.state.selected_point == Some(index as u32) {
                self.selection
            } else {
                self.point_color
            };
            self.draw_vector
                .set_color(color.x, color.y, color.z, color.w);
            self.draw_vector.clear();
            self.draw_vector.circle(
                point.x as f32,
                point.y as f32,
                if color == self.selection { 6.0 } else { 4.0 },
            );
            self.draw_vector.fill();
        }
        self.draw_vector.end(cx);
    }
}

impl Widget for TesseraScatterChart {
    fn is_interactive(&self) -> bool {
        true
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, _scope: &mut Scope) {
        match event.hits_with_capture_overload(cx, self.draw_bg.area(), true) {
            Hit::KeyDown(key) if !key.is_repeat => match key.key_code {
                KeyCode::ArrowLeft | KeyCode::ArrowUp => {
                    let current = self.state.selected_point.unwrap_or(0).saturating_sub(1);
                    self.select(cx, current as usize);
                }
                KeyCode::ArrowRight | KeyCode::ArrowDown | KeyCode::Space => {
                    self.select(cx, self.state.selected_point.unwrap_or(0) as usize + 1);
                }
                KeyCode::Home => self.select(cx, 0),
                KeyCode::End => self.select(cx, POINTS.len() - 1),
                KeyCode::Equals => {
                    self.zoom = (self.zoom * 1.2).clamp(1.0, 6.0);
                    self.emit(cx, ScatterChartEvent::ViewportChanged);
                }
                KeyCode::Minus => {
                    self.zoom = (self.zoom / 1.2).clamp(1.0, 6.0);
                    self.emit(cx, ScatterChartEvent::ViewportChanged);
                }
                KeyCode::Escape => self.emit(cx, ScatterChartEvent::PointSelected(None)),
                _ => {}
            },
            Hit::FingerDown(fe) if fe.is_primary_hit() => {
                let plot = Self::plot(self.draw_bg.area().rect(cx));
                self.select(cx, self.closest_point(plot, fe.abs));
                cx.set_key_focus(self.draw_bg.area());
            }
            Hit::FingerScroll(scroll) => {
                self.zoom = if scroll.scroll.y < 0.0 {
                    (self.zoom * 1.2).clamp(1.0, 6.0)
                } else {
                    (self.zoom / 1.2).clamp(1.0, 6.0)
                };
                self.emit(cx, ScatterChartEvent::ViewportChanged);
            }
            _ => {}
        }
        self.draw_bg.redraw(cx);
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        let rect = self.draw_bg.draw_walk(cx, walk);
        let plot = Self::plot(rect);
        self.draw_text.color = self.ink;
        self.draw_text.text_style.font_size = 12.0;
        self.draw_text.draw_abs(
            cx,
            dvec2(rect.pos.x + 12.0, rect.pos.y + 9.0),
            "Scatter chart",
        );
        self.draw_text.color = self.muted;
        self.draw_text.text_style.font_size = 9.0;
        self.draw_text.draw_abs(
            cx,
            dvec2(rect.pos.x + 12.0, rect.pos.y + rect.size.y - 14.0),
            "Click point  Arrow select  +/- zoom",
        );
        self.draw_grid.color = vec4(self.muted.x, self.muted.y, self.muted.z, 0.16);
        for tick in 0..=4 {
            let ratio = tick as f64 / 4.0;
            self.draw_grid.draw_abs(
                cx,
                Rect {
                    pos: dvec2(plot.pos.x, plot.pos.y + plot.size.y * ratio),
                    size: dvec2(plot.size.x, 1.0),
                },
            );
            self.draw_grid.draw_abs(
                cx,
                Rect {
                    pos: dvec2(plot.pos.x + plot.size.x * ratio, plot.pos.y),
                    size: dvec2(1.0, plot.size.y),
                },
            );
        }
        self.draw_points(cx, plot);
        self.focus_region
            .register(cx, self.uid, self.draw_bg.area(), NavRole::Slider, 0.0);
        DrawStep::done()
    }
}

#[cfg(test)]
mod tests {
    use super::{ScatterChartEvent, ScatterChartState, ScatterChartSurfaceCatalog};
    use tessera_core::catalog::ComponentId;

    #[test]
    fn scatter_chart_has_exact_route_and_point_state() {
        assert_eq!(
            ScatterChartSurfaceCatalog::widget_name(ComponentId::ScatterChart),
            Some("TesseraScatterChart")
        );
        let mut state = ScatterChartState::default();
        state.reduce(ScatterChartEvent::PointSelected(Some(9)));
        assert_eq!(state.selected_point, Some(9));
    }
}
