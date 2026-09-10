//! Component-owned AreaChart widget with a filled native path.

use crate::foundation::focus::FocusRegion;
use crate::foundation::vector::{AlignedVector as DrawVector, DpiStroke};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct AreaChartSurfaceCatalog;

impl AreaChartSurfaceCatalog {
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::AreaChart => Some("TesseraAreaChart"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct AreaChartState {
    pub selected_point: Option<u32>,
    pub viewport_changes: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AreaChartEvent {
    PointSelected(Option<u32>),
    ViewportChanged,
    Reset,
}

impl AreaChartState {
    pub fn reduce(&mut self, event: AreaChartEvent) {
        match event {
            AreaChartEvent::PointSelected(point) => self.selected_point = point,
            AreaChartEvent::ViewportChanged => {
                self.viewport_changes = self.viewport_changes.saturating_add(1);
            }
            AreaChartEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum AreaChartAction {
    PointSelected {
        point: Option<u32>,
    },
    ViewportChanged {
        changes: u32,
    },
    #[default]
    Reset,
}

const AREA_POINTS: [f64; 10] = [0.74, 0.55, 0.66, 0.39, 0.57, 0.32, 0.47, 0.28, 0.43, 0.22];

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    use mod.text.*

    mod.widgets.TesseraAreaChartBase = #(TesseraAreaChart::register_widget(vm))
    mod.widgets.TesseraAreaChart = set_type_default() do mod.widgets.TesseraAreaChartBase{
        width: Fill
        height: 260
        fill_color: theme.color_chart_secondary
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
pub struct TesseraAreaChart {
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
    fill_color: Vec4f,
    #[live]
    selection: Vec4f,
    #[live]
    muted: Vec4f,
    #[live]
    ink: Vec4f,
    #[rust]
    state: AreaChartState,
    #[rust]
    zoom: f64,
    #[rust]
    focus_region: FocusRegion,
}

impl TesseraAreaChart {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.state.reduce(AreaChartEvent::Reset);
        self.zoom = 1.0;
        self.draw_bg.redraw(cx);
        cx.widget_action(self.uid, AreaChartAction::Reset);
    }

    fn emit(&mut self, cx: &mut Cx, event: AreaChartEvent) {
        self.state.reduce(event);
        let action = match event {
            AreaChartEvent::PointSelected(point) => AreaChartAction::PointSelected { point },
            AreaChartEvent::ViewportChanged => AreaChartAction::ViewportChanged {
                changes: self.state.viewport_changes,
            },
            AreaChartEvent::Reset => AreaChartAction::Reset,
        };
        cx.widget_action(self.uid, action);
        self.draw_bg.redraw(cx);
    }

    fn select(&mut self, cx: &mut Cx, index: usize) {
        self.emit(
            cx,
            AreaChartEvent::PointSelected(Some(index.min(AREA_POINTS.len() - 1) as u32)),
        );
    }

    fn plot(rect: Rect) -> Rect {
        Rect {
            pos: dvec2(rect.pos.x + 30.0, rect.pos.y + 36.0),
            size: dvec2((rect.size.x - 48.0).max(1.0), (rect.size.y - 66.0).max(1.0)),
        }
    }

    fn draw_area(&mut self, cx: &mut Cx2d, plot: Rect) {
        self.draw_vector.begin();
        self.draw_vector.set_color(
            self.fill_color.x,
            self.fill_color.y,
            self.fill_color.z,
            0.26,
        );
        self.draw_vector.clear();
        self.draw_vector
            .move_to(plot.pos.x as f32, (plot.pos.y + plot.size.y) as f32);
        for (index, value) in AREA_POINTS.iter().copied().enumerate() {
            let x = plot.pos.x + plot.size.x * index as f64 / (AREA_POINTS.len() - 1) as f64;
            let y = plot.pos.y + plot.size.y * (0.5 + (value - 0.5) / self.zoom.max(1.0));
            self.draw_vector.line_to(x as f32, y as f32);
        }
        self.draw_vector.line_to(
            (plot.pos.x + plot.size.x) as f32,
            (plot.pos.y + plot.size.y) as f32,
        );
        self.draw_vector.close();
        self.draw_vector.fill();
        self.draw_vector.set_color(
            self.fill_color.x,
            self.fill_color.y,
            self.fill_color.z,
            self.fill_color.w,
        );
        self.draw_vector.clear();
        for (index, value) in AREA_POINTS.iter().copied().enumerate() {
            let x = plot.pos.x + plot.size.x * index as f64 / (AREA_POINTS.len() - 1) as f64;
            let y = plot.pos.y + plot.size.y * (0.5 + (value - 0.5) / self.zoom.max(1.0));
            if index == 0 {
                self.draw_vector.move_to(x as f32, y as f32);
            } else {
                self.draw_vector.line_to(x as f32, y as f32);
            }
        }
        self.draw_vector.stroke_dip(cx, 2.0);
        if let Some(index) = self.state.selected_point.map(|value| value as usize) {
            if let Some(value) = AREA_POINTS.get(index).copied() {
                let x = plot.pos.x + plot.size.x * index as f64 / (AREA_POINTS.len() - 1) as f64;
                let y = plot.pos.y + plot.size.y * (0.5 + (value - 0.5) / self.zoom.max(1.0));
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

impl Widget for TesseraAreaChart {
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
                KeyCode::End => self.select(cx, AREA_POINTS.len() - 1),
                KeyCode::Equals => {
                    self.zoom = (self.zoom * 1.2).clamp(1.0, 8.0);
                    self.emit(cx, AreaChartEvent::ViewportChanged);
                }
                KeyCode::Minus => {
                    self.zoom = (self.zoom / 1.2).clamp(1.0, 8.0);
                    self.emit(cx, AreaChartEvent::ViewportChanged);
                }
                KeyCode::Escape => self.emit(cx, AreaChartEvent::PointSelected(None)),
                _ => {}
            },
            Hit::FingerDown(fe) if fe.is_primary_hit() => {
                let plot = Self::plot(self.draw_bg.area().rect(cx));
                let fraction = ((fe.abs.x - plot.pos.x) / plot.size.x).clamp(0.0, 0.999_999);
                self.select(cx, (fraction * AREA_POINTS.len() as f64) as usize);
                cx.set_key_focus(self.draw_bg.area());
            }
            Hit::FingerScroll(scroll) => {
                self.zoom = if scroll.scroll.y < 0.0 {
                    (self.zoom * 1.2).clamp(1.0, 8.0)
                } else {
                    (self.zoom / 1.2).clamp(1.0, 8.0)
                };
                self.emit(cx, AreaChartEvent::ViewportChanged);
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
        self.draw_text
            .draw_abs(cx, dvec2(rect.pos.x + 12.0, rect.pos.y + 9.0), "Area chart");
        self.draw_text.color = self.muted;
        self.draw_text.text_style.font_size = 9.0;
        self.draw_text.draw_abs(
            cx,
            dvec2(rect.pos.x + 12.0, rect.pos.y + rect.size.y - 14.0),
            "Arrow select  +/- zoom  Escape clear",
        );
        self.draw_grid.color = vec4(self.muted.x, self.muted.y, self.muted.z, 0.16);
        for tick in 0..=4 {
            self.draw_grid.draw_abs(
                cx,
                Rect {
                    pos: dvec2(plot.pos.x, plot.pos.y + plot.size.y * tick as f64 / 4.0),
                    size: dvec2(plot.size.x, 1.0),
                },
            );
        }
        self.draw_area(cx, plot);
        self.focus_region
            .register(cx, self.uid, self.draw_bg.area(), NavRole::Slider, 0.0);
        DrawStep::done()
    }
}

#[cfg(test)]
mod tests {
    use super::{AreaChartEvent, AreaChartState, AreaChartSurfaceCatalog};
    use tessera_core::catalog::ComponentId;

    #[test]
    fn area_chart_has_exact_route_and_local_state() {
        assert_eq!(
            AreaChartSurfaceCatalog::widget_name(ComponentId::AreaChart),
            Some("TesseraAreaChart")
        );
        let mut state = AreaChartState::default();
        state.reduce(AreaChartEvent::PointSelected(Some(2)));
        state.reduce(AreaChartEvent::ViewportChanged);
        assert_eq!(state.selected_point, Some(2));
        assert_eq!(state.viewport_changes, 1);
    }
}
