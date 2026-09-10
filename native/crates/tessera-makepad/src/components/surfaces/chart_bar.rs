//! Component-owned BarChart widget with categorical native bars.

use crate::foundation::focus::FocusRegion;
use crate::foundation::vector::{AlignedVector as DrawVector, DpiStroke};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct BarChartSurfaceCatalog;

impl BarChartSurfaceCatalog {
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::BarChart => Some("TesseraBarChart"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct BarChartState {
    pub selected_category: Option<u32>,
    pub viewport_changes: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BarChartEvent {
    CategorySelected(Option<u32>),
    ViewportChanged,
    Reset,
}

impl BarChartState {
    pub fn reduce(&mut self, event: BarChartEvent) {
        match event {
            BarChartEvent::CategorySelected(category) => self.selected_category = category,
            BarChartEvent::ViewportChanged => {
                self.viewport_changes = self.viewport_changes.saturating_add(1);
            }
            BarChartEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum BarChartAction {
    CategorySelected {
        category: Option<u32>,
    },
    ViewportChanged {
        changes: u32,
    },
    #[default]
    Reset,
}

const BARS: [f64; 8] = [0.64, -0.28, 0.43, 0.71, -0.12, 0.52, 0.31, 0.82];

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    use mod.text.*

    mod.widgets.TesseraBarChartBase = #(TesseraBarChart::register_widget(vm))
    mod.widgets.TesseraBarChart = set_type_default() do mod.widgets.TesseraBarChartBase{
        width: Fill
        height: 260
        positive: theme.color_chart_primary
        negative: theme.color_chart_negative
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
pub struct TesseraBarChart {
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
    positive: Vec4f,
    #[live]
    negative: Vec4f,
    #[live]
    selection: Vec4f,
    #[live]
    muted: Vec4f,
    #[live]
    ink: Vec4f,
    #[rust]
    state: BarChartState,
    #[rust]
    scale: f64,
    #[rust]
    focus_region: FocusRegion,
}

impl TesseraBarChart {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.state.reduce(BarChartEvent::Reset);
        self.scale = 1.0;
        self.draw_bg.redraw(cx);
        cx.widget_action(self.uid, BarChartAction::Reset);
    }

    fn emit(&mut self, cx: &mut Cx, event: BarChartEvent) {
        self.state.reduce(event);
        let action = match event {
            BarChartEvent::CategorySelected(category) => {
                BarChartAction::CategorySelected { category }
            }
            BarChartEvent::ViewportChanged => BarChartAction::ViewportChanged {
                changes: self.state.viewport_changes,
            },
            BarChartEvent::Reset => BarChartAction::Reset,
        };
        cx.widget_action(self.uid, action);
        self.draw_bg.redraw(cx);
    }

    fn select(&mut self, cx: &mut Cx, index: usize) {
        self.emit(
            cx,
            BarChartEvent::CategorySelected(Some(index.min(BARS.len() - 1) as u32)),
        );
    }

    fn plot(rect: Rect) -> Rect {
        Rect {
            pos: dvec2(rect.pos.x + 30.0, rect.pos.y + 36.0),
            size: dvec2((rect.size.x - 48.0).max(1.0), (rect.size.y - 66.0).max(1.0)),
        }
    }

    fn draw_bars(&mut self, cx: &mut Cx2d, plot: Rect) {
        let baseline = plot.pos.y + plot.size.y * 0.55;
        let width = (plot.size.x / BARS.len() as f64 * 0.62).max(2.0);
        self.draw_vector.begin();
        for (index, value) in BARS.iter().copied().enumerate() {
            let x =
                plot.pos.x + plot.size.x * (index as f64 + 0.5) / BARS.len() as f64 - width * 0.5;
            let height = plot.size.y * value.abs() * 0.8 * self.scale;
            let y = if value >= 0.0 {
                baseline - height
            } else {
                baseline
            };
            let color = if value >= 0.0 {
                self.positive
            } else {
                self.negative
            };
            self.draw_vector
                .set_color(color.x, color.y, color.z, color.w);
            self.draw_vector.clear();
            self.draw_vector
                .rect(x as f32, y as f32, width as f32, height as f32);
            self.draw_vector.fill();
            if self.state.selected_category == Some(index as u32) {
                self.draw_vector.set_color(
                    self.selection.x,
                    self.selection.y,
                    self.selection.z,
                    self.selection.w,
                );
                self.draw_vector.clear();
                self.draw_vector.rect(
                    (x - 2.0) as f32,
                    (y - 2.0) as f32,
                    (width + 4.0) as f32,
                    (height + 4.0) as f32,
                );
                self.draw_vector.stroke_dip(cx, 2.0);
            }
        }
        self.draw_vector.end(cx);
    }
}

impl Widget for TesseraBarChart {
    fn is_interactive(&self) -> bool {
        true
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, _scope: &mut Scope) {
        match event.hits_with_capture_overload(cx, self.draw_bg.area(), true) {
            Hit::KeyDown(key) if !key.is_repeat => match key.key_code {
                KeyCode::ArrowLeft | KeyCode::ArrowUp => {
                    let current = self.state.selected_category.unwrap_or(0).saturating_sub(1);
                    self.select(cx, current as usize);
                }
                KeyCode::ArrowRight | KeyCode::ArrowDown | KeyCode::Space => {
                    self.select(cx, self.state.selected_category.unwrap_or(0) as usize + 1);
                }
                KeyCode::Home => self.select(cx, 0),
                KeyCode::End => self.select(cx, BARS.len() - 1),
                KeyCode::Equals => {
                    self.scale = (self.scale * 1.15).clamp(0.5, 1.8);
                    self.emit(cx, BarChartEvent::ViewportChanged);
                }
                KeyCode::Minus => {
                    self.scale = (self.scale / 1.15).clamp(0.5, 1.8);
                    self.emit(cx, BarChartEvent::ViewportChanged);
                }
                KeyCode::Escape => self.emit(cx, BarChartEvent::CategorySelected(None)),
                _ => {}
            },
            Hit::FingerDown(fe) if fe.is_primary_hit() => {
                let plot = Self::plot(self.draw_bg.area().rect(cx));
                let fraction = ((fe.abs.x - plot.pos.x) / plot.size.x).clamp(0.0, 0.999_999);
                self.select(cx, (fraction * BARS.len() as f64) as usize);
                cx.set_key_focus(self.draw_bg.area());
            }
            Hit::FingerScroll(scroll) => {
                self.scale = if scroll.scroll.y < 0.0 {
                    (self.scale * 1.15).clamp(0.5, 1.8)
                } else {
                    (self.scale / 1.15).clamp(0.5, 1.8)
                };
                self.emit(cx, BarChartEvent::ViewportChanged);
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
            .draw_abs(cx, dvec2(rect.pos.x + 12.0, rect.pos.y + 9.0), "Bar chart");
        self.draw_text.color = self.muted;
        self.draw_text.text_style.font_size = 9.0;
        self.draw_text.draw_abs(
            cx,
            dvec2(rect.pos.x + 12.0, rect.pos.y + rect.size.y - 14.0),
            "Arrow category  +/- scale  Escape clear",
        );
        self.draw_grid.color = vec4(self.muted.x, self.muted.y, self.muted.z, 0.16);
        self.draw_grid.draw_abs(
            cx,
            Rect {
                pos: dvec2(plot.pos.x, plot.pos.y + plot.size.y * 0.55),
                size: dvec2(plot.size.x, 1.0),
            },
        );
        self.draw_bars(cx, plot);
        self.focus_region
            .register(cx, self.uid, self.draw_bg.area(), NavRole::Slider, 0.0);
        DrawStep::done()
    }
}

#[cfg(test)]
mod tests {
    use super::{BarChartEvent, BarChartState, BarChartSurfaceCatalog};
    use tessera_core::catalog::ComponentId;

    #[test]
    fn bar_chart_has_exact_route_and_category_state() {
        assert_eq!(
            BarChartSurfaceCatalog::widget_name(ComponentId::BarChart),
            Some("TesseraBarChart")
        );
        let mut state = BarChartState::default();
        state.reduce(BarChartEvent::CategorySelected(Some(3)));
        assert_eq!(state.selected_category, Some(3));
    }
}
