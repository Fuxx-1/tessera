//! Component-owned LineChart widget.
//!
//! This is deliberately a complete native widget rather than a route wrapper
//! around the chart-family canvas. Its fixture, hit testing, keyboard handling
//! and draw path all belong to the LineChart component.

use crate::foundation::focus::FocusRegion;
use crate::foundation::vector::{AlignedVector as DrawVector, DpiStroke};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct LineChartSurfaceCatalog;

impl LineChartSurfaceCatalog {
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::LineChart => Some("TesseraLineChart"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct LineChartState {
    pub selected_point: Option<u32>,
    pub viewport_changes: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LineChartEvent {
    PointSelected(Option<u32>),
    ViewportChanged,
    Reset,
}

impl LineChartState {
    pub fn reduce(&mut self, event: LineChartEvent) {
        match event {
            LineChartEvent::PointSelected(point) => self.selected_point = point,
            LineChartEvent::ViewportChanged => {
                self.viewport_changes = self.viewport_changes.saturating_add(1);
            }
            LineChartEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum LineChartAction {
    PointSelected {
        point: Option<u32>,
    },
    ViewportChanged {
        changes: u32,
    },
    #[default]
    Reset,
}

const LINE_POINTS: [f64; 12] = [
    0.42, 0.35, 0.48, 0.29, 0.54, 0.41, 0.62, 0.45, 0.67, 0.51, 0.74, 0.38,
];

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    use mod.text.*

    mod.widgets.TesseraLineChartBase = #(TesseraLineChart::register_widget(vm))
    mod.widgets.TesseraLineChart = set_type_default() do mod.widgets.TesseraLineChartBase{
        width: Fill
        height: 260
        accent: theme.color_chart_primary
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
pub struct TesseraLineChart {
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
    accent: Vec4f,
    #[live]
    selection: Vec4f,
    #[live]
    muted: Vec4f,
    #[live]
    ink: Vec4f,
    #[rust]
    state: LineChartState,
    #[rust]
    zoom: f64,
    #[rust]
    focus_region: FocusRegion,
}

impl TesseraLineChart {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.state.reduce(LineChartEvent::Reset);
        self.zoom = 1.0;
        self.draw_bg.redraw(cx);
        cx.widget_action(self.uid, LineChartAction::Reset);
    }

    fn emit(&mut self, cx: &mut Cx, event: LineChartEvent) {
        self.state.reduce(event);
        let action = match event {
            LineChartEvent::PointSelected(point) => LineChartAction::PointSelected { point },
            LineChartEvent::ViewportChanged => LineChartAction::ViewportChanged {
                changes: self.state.viewport_changes,
            },
            LineChartEvent::Reset => LineChartAction::Reset,
        };
        cx.widget_action(self.uid, action);
        self.draw_bg.redraw(cx);
    }

    fn select_index(&mut self, cx: &mut Cx, index: usize) {
        self.emit(
            cx,
            LineChartEvent::PointSelected(Some(index.min(LINE_POINTS.len() - 1) as u32)),
        );
    }

    fn move_selection(&mut self, cx: &mut Cx, delta: isize) {
        let current = self.state.selected_point.unwrap_or(0) as isize;
        let last = LINE_POINTS.len().saturating_sub(1) as isize;
        self.select_index(cx, (current + delta).clamp(0, last) as usize);
    }

    fn plot_rect(rect: Rect) -> Rect {
        Rect {
            pos: dvec2(rect.pos.x + 34.0, rect.pos.y + 36.0),
            size: dvec2((rect.size.x - 52.0).max(1.0), (rect.size.y - 66.0).max(1.0)),
        }
    }

    fn draw_grid(&mut self, cx: &mut Cx2d, plot: Rect) {
        self.draw_grid.color = vec4(self.muted.x, self.muted.y, self.muted.z, 0.18);
        for tick in 0..=4 {
            let ratio = f64::from(tick) / 4.0;
            self.draw_grid.draw_abs(
                cx,
                Rect {
                    pos: dvec2(plot.pos.x, plot.pos.y + plot.size.y * ratio),
                    size: dvec2(plot.size.x, 1.0),
                },
            );
        }
    }

    fn draw_series(&mut self, cx: &mut Cx2d, plot: Rect) {
        self.draw_vector.begin();
        self.draw_vector
            .set_color(self.accent.x, self.accent.y, self.accent.z, self.accent.w);
        self.draw_vector.clear();
        for (index, value) in LINE_POINTS.iter().copied().enumerate() {
            let x = plot.pos.x + plot.size.x * index as f64 / (LINE_POINTS.len() - 1) as f64;
            let centered = 0.5 + (value - 0.5) / self.zoom.max(1.0);
            let y = plot.pos.y + plot.size.y * centered.clamp(0.03, 0.97);
            if index == 0 {
                self.draw_vector.move_to(x as f32, y as f32);
            } else {
                self.draw_vector.line_to(x as f32, y as f32);
            }
        }
        self.draw_vector.stroke_dip(cx, 2.0);
        if let Some(selected) = self.state.selected_point {
            let index = selected as usize;
            if let Some(value) = LINE_POINTS.get(index).copied() {
                let x = plot.pos.x + plot.size.x * index as f64 / (LINE_POINTS.len() - 1) as f64;
                let centered = 0.5 + (value - 0.5) / self.zoom.max(1.0);
                let y = plot.pos.y + plot.size.y * centered.clamp(0.03, 0.97);
                self.draw_vector.set_color(
                    self.selection.x,
                    self.selection.y,
                    self.selection.z,
                    self.selection.w,
                );
                self.draw_vector.clear();
                self.draw_vector.circle(x as f32, y as f32, 5.0);
                self.draw_vector.fill();
            }
        }
        self.draw_vector.end(cx);
    }
}

impl Widget for TesseraLineChart {
    fn is_interactive(&self) -> bool {
        true
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, _scope: &mut Scope) {
        match event.hits_with_capture_overload(cx, self.draw_bg.area(), true) {
            Hit::KeyFocus(_) | Hit::KeyFocusLost(_) => self.draw_bg.redraw(cx),
            Hit::KeyDown(key) if !key.is_repeat => match key.key_code {
                KeyCode::ArrowLeft | KeyCode::ArrowUp => self.move_selection(cx, -1),
                KeyCode::ArrowRight | KeyCode::ArrowDown | KeyCode::Space => {
                    self.move_selection(cx, 1)
                }
                KeyCode::Home => self.select_index(cx, 0),
                KeyCode::End => self.select_index(cx, LINE_POINTS.len() - 1),
                KeyCode::Equals => {
                    self.zoom = (self.zoom * 1.2).clamp(1.0, 8.0);
                    self.emit(cx, LineChartEvent::ViewportChanged);
                }
                KeyCode::Minus => {
                    self.zoom = (self.zoom / 1.2).clamp(1.0, 8.0);
                    self.emit(cx, LineChartEvent::ViewportChanged);
                }
                KeyCode::Escape => self.emit(cx, LineChartEvent::PointSelected(None)),
                _ => {}
            },
            Hit::FingerDown(fe) if fe.is_primary_hit() => {
                let rect = Self::plot_rect(self.draw_bg.area().rect(cx));
                let fraction = ((fe.abs.x - rect.pos.x) / rect.size.x).clamp(0.0, 0.999_999);
                self.select_index(cx, (fraction * LINE_POINTS.len() as f64) as usize);
                cx.set_key_focus(self.draw_bg.area());
            }
            Hit::FingerScroll(scroll) => {
                let delta = if scroll.scroll.y.abs() > f64::EPSILON {
                    scroll.scroll.y
                } else {
                    scroll.scroll.x
                };
                self.zoom = if delta < 0.0 {
                    (self.zoom * 1.2).clamp(1.0, 8.0)
                } else {
                    (self.zoom / 1.2).clamp(1.0, 8.0)
                };
                self.emit(cx, LineChartEvent::ViewportChanged);
            }
            _ => {}
        }
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        let rect = self.draw_bg.draw_walk(cx, walk);
        let plot = Self::plot_rect(rect);
        self.draw_text.color = self.ink;
        self.draw_text.text_style.font_size = 12.0;
        self.draw_text
            .draw_abs(cx, dvec2(rect.pos.x + 12.0, rect.pos.y + 9.0), "Line chart");
        self.draw_text.color = self.muted;
        self.draw_text.text_style.font_size = 9.0;
        self.draw_text.draw_abs(
            cx,
            dvec2(rect.pos.x + 12.0, rect.pos.y + rect.size.y - 14.0),
            "Arrow select  +/- zoom  Home/End range",
        );
        self.draw_grid(cx, plot);
        self.draw_series(cx, plot);
        self.focus_region
            .register(cx, self.uid, self.draw_bg.area(), NavRole::Slider, 0.0);
        DrawStep::done()
    }
}

#[cfg(test)]
mod tests {
    use super::{LineChartEvent, LineChartState, LineChartSurfaceCatalog};
    use tessera_core::catalog::ComponentId;

    #[test]
    fn line_chart_catalog_exposes_only_its_exact_route() {
        assert_eq!(
            LineChartSurfaceCatalog::widget_name(ComponentId::LineChart),
            Some("TesseraLineChart")
        );
        assert_eq!(
            LineChartSurfaceCatalog::widget_name(ComponentId::AreaChart),
            None
        );
    }

    #[test]
    fn line_chart_state_keeps_selection_and_viewport_local() {
        let mut state = LineChartState::default();
        state.reduce(LineChartEvent::PointSelected(Some(4)));
        state.reduce(LineChartEvent::ViewportChanged);
        assert_eq!(state.selected_point, Some(4));
        assert_eq!(state.viewport_changes, 1);
        state.reduce(LineChartEvent::Reset);
        assert_eq!(state, LineChartState::default());
    }
}
