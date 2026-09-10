//! Native FunnelChart widget.
//!
//! Funnel geometry, selection, state, and typed output live here rather than
//! in a chart-family renderer so this route cannot inherit another chart's
//! implementation path.

use crate::foundation::focus::FocusRegion;
use crate::foundation::vector::AlignedVector as DrawVector;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

use super::chart_common::{CategoryDatum, MAX_CATEGORY_ITEMS, funnel_fixture, validate_categories};

pub struct FunnelChartSurfaceCatalog;

impl FunnelChartSurfaceCatalog {
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::FunnelChart => Some("TesseraFunnelChart"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct FunnelChartConfig {
    pub max_stages: usize,
}

impl Default for FunnelChartConfig {
    fn default() -> Self {
        Self {
            max_stages: MAX_CATEGORY_ITEMS,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct FunnelChartState {
    pub selected_stage: Option<u32>,
    pub viewport_changes: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum FunnelChartEvent {
    StageSelected(Option<u32>),
    ViewportChanged,
    Reset,
}

impl FunnelChartState {
    pub fn reduce(&mut self, event: FunnelChartEvent) {
        match event {
            FunnelChartEvent::StageSelected(stage) => self.selected_stage = stage,
            FunnelChartEvent::ViewportChanged => {
                self.viewport_changes = self.viewport_changes.saturating_add(1);
            }
            FunnelChartEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum FunnelChartAction {
    StageSelected {
        stage: Option<u32>,
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

    mod.widgets.TesseraFunnelChartBase = #(TesseraFunnelChart::register_widget(vm))
    mod.widgets.TesseraFunnelChart = set_type_default() do mod.widgets.TesseraFunnelChartBase{
        width: Fill
        height: 260
        accent: theme.color_chart_secondary
        accent_alt: theme.color_chart_primary
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
pub struct TesseraFunnelChart {
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
    accent_alt: Vec4f,
    #[live]
    selection: Vec4f,
    #[live]
    muted: Vec4f,
    #[live]
    ink: Vec4f,
    #[live]
    danger: Vec4f,
    #[rust]
    config: FunnelChartConfig,
    #[rust]
    state: FunnelChartState,
    #[rust]
    data: Vec<CategoryDatum>,
    #[rust]
    focus_region: FocusRegion,
}

impl TesseraFunnelChart {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.config = FunnelChartConfig::default();
        self.state.reduce(FunnelChartEvent::Reset);
        self.data = funnel_fixture();
        self.draw_bg.redraw(cx);
        cx.widget_action(self.uid, FunnelChartAction::Reset);
    }

    fn emit(&mut self, cx: &mut Cx, event: FunnelChartEvent) {
        self.state.reduce(event);
        let action = match event {
            FunnelChartEvent::StageSelected(stage) => FunnelChartAction::StageSelected { stage },
            FunnelChartEvent::ViewportChanged => FunnelChartAction::ViewportChanged {
                changes: self.state.viewport_changes,
            },
            FunnelChartEvent::Reset => FunnelChartAction::Reset,
        };
        cx.widget_action(self.uid, action);
        self.draw_bg.redraw(cx);
    }

    fn stage_count(&self) -> usize {
        self.data.len().min(self.config.max_stages).max(1)
    }

    fn select_stage(&mut self, cx: &mut Cx, stage: usize) {
        self.emit(
            cx,
            FunnelChartEvent::StageSelected(Some(stage.min(self.stage_count() - 1) as u32)),
        );
    }

    fn draw_funnel(&mut self, cx: &mut Cx2d, rect: Rect) {
        if self.data.is_empty() {
            self.data = funnel_fixture();
        }
        let count = self.stage_count();
        let values = &self.data[..count];
        let state = validate_categories(values, true);
        let plot = Rect {
            pos: dvec2(rect.pos.x + 28.0, rect.pos.y + 42.0),
            size: dvec2((rect.size.x - 56.0).max(1.0), (rect.size.y - 78.0).max(1.0)),
        };
        self.draw_grid.color = vec4(self.muted.x, self.muted.y, self.muted.z, 0.18);
        self.draw_grid.draw_abs(
            cx,
            Rect {
                pos: plot.pos,
                size: dvec2(plot.size.x, 1.0),
            },
        );
        self.draw_grid.draw_abs(
            cx,
            Rect {
                pos: dvec2(plot.pos.x, plot.pos.y + plot.size.y),
                size: dvec2(plot.size.x, 1.0),
            },
        );

        if !state.is_ready() {
            self.draw_text.color = super::chart_label::readable_on(self.draw_bg.color, self.danger);
            self.draw_text.text_style.font_size = 12.0;
            self.draw_text.draw_abs(
                cx,
                dvec2(plot.pos.x + 8.0, plot.pos.y + 16.0),
                state.label(),
            );
            return;
        }

        let maximum = values
            .iter()
            .map(|value| value.value)
            .fold(f64::EPSILON, f64::max);
        let stage_height = plot.size.y / count as f64;
        let label_width = 108.0_f64.min(plot.size.x * 0.32);
        let shape_width = (plot.size.x - label_width - 12.0).max(1.0);
        let shape_x = plot.pos.x + label_width + 12.0;
        self.draw_vector.begin();
        for (index, datum) in values.iter().enumerate() {
            let ratio = (datum.value / maximum).clamp(0.12, 1.0);
            let next_ratio = values
                .get(index + 1)
                .map_or(0.12, |next| (next.value / maximum).clamp(0.12, 1.0));
            let y0 = plot.pos.y + stage_height * index as f64 + 2.0;
            let y1 = plot.pos.y + stage_height * (index + 1) as f64 - 2.0;
            let width0 = shape_width * (0.20 + ratio * 0.72);
            let width1 = shape_width * (0.20 + next_ratio * 0.72);
            let x0 = shape_x + (shape_width - width0) * 0.5;
            let x1 = shape_x + (shape_width - width1) * 0.5;
            let color = if self.state.selected_stage == Some(datum.id) {
                self.selection
            } else if index % 2 == 0 {
                self.accent
            } else {
                self.accent_alt
            };
            self.draw_vector
                .set_color(color.x, color.y, color.z, color.w);
            self.draw_vector.clear();
            self.draw_vector.move_to(x0 as f32, y0 as f32);
            self.draw_vector.line_to((x0 + width0) as f32, y0 as f32);
            self.draw_vector.line_to((x1 + width1) as f32, y1 as f32);
            self.draw_vector.line_to(x1 as f32, y1 as f32);
            self.draw_vector.close();
            self.draw_vector.fill();
            self.draw_text.color = self.muted;
            self.draw_text.text_style.font_size = 9.0;
            super::chart_label::draw_label(
                &mut self.draw_text,
                cx,
                Rect {
                    pos: dvec2(plot.pos.x + 6.0, y0),
                    size: dvec2(label_width - 6.0, y1 - y0),
                },
                &datum.label,
                Align { x: 0.0, y: 0.5 },
            );
        }
        self.draw_vector.end(cx);
    }
}

impl Widget for TesseraFunnelChart {
    fn is_interactive(&self) -> bool {
        true
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, _scope: &mut Scope) {
        match event.hits_with_capture_overload(cx, self.draw_bg.area(), true) {
            Hit::KeyFocus(_) | Hit::KeyFocusLost(_) => self.draw_bg.redraw(cx),
            Hit::KeyDown(key) if !key.is_repeat => match key.key_code {
                KeyCode::ArrowUp | KeyCode::ArrowLeft => {
                    let current = self.state.selected_stage.unwrap_or(0).saturating_sub(1);
                    self.select_stage(cx, current as usize);
                }
                KeyCode::ArrowDown | KeyCode::ArrowRight | KeyCode::Space => {
                    self.select_stage(cx, self.state.selected_stage.unwrap_or(0) as usize + 1);
                }
                KeyCode::Home => self.select_stage(cx, 0),
                KeyCode::End => self.select_stage(cx, self.stage_count() - 1),
                KeyCode::Escape => self.emit(cx, FunnelChartEvent::StageSelected(None)),
                _ => {}
            },
            Hit::FingerDown(fe) if fe.is_primary_hit() => {
                let rect = self.draw_bg.area().rect(cx);
                let top = rect.pos.y + 42.0;
                let height = (rect.size.y - 78.0).max(1.0);
                let fraction = ((fe.abs.y - top) / height).clamp(0.0, 0.999_999);
                self.select_stage(cx, (fraction * self.stage_count() as f64) as usize);
                cx.set_key_focus(self.draw_bg.area());
            }
            Hit::FingerScroll(_) => self.emit(cx, FunnelChartEvent::ViewportChanged),
            _ => {}
        }
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        let rect = self.draw_bg.draw_walk(cx, walk);
        self.draw_text.color = self.ink;
        self.draw_text.text_style.font_size = 12.0;
        self.draw_text.draw_abs(
            cx,
            dvec2(rect.pos.x + 12.0, rect.pos.y + 9.0),
            "Funnel chart",
        );
        self.draw_text.color = self.muted;
        self.draw_text.text_style.font_size = 9.0;
        self.draw_text.draw_abs(
            cx,
            dvec2(rect.pos.x + 12.0, rect.pos.y + rect.size.y - 14.0),
            "Arrow select  Home/End bounds  Escape clear",
        );
        self.draw_funnel(cx, rect);
        self.focus_region
            .register(cx, self.uid, self.draw_bg.area(), NavRole::Slider, 0.0);
        DrawStep::done()
    }
}

#[cfg(test)]
mod tests {
    use super::{FunnelChartConfig, FunnelChartEvent, FunnelChartState, FunnelChartSurfaceCatalog};
    use tessera_core::catalog::ComponentId;

    #[test]
    fn funnel_chart_has_one_exact_route_and_bounded_config() {
        assert_eq!(
            FunnelChartSurfaceCatalog::widget_name(ComponentId::FunnelChart),
            Some("TesseraFunnelChart")
        );
        assert_eq!(
            FunnelChartSurfaceCatalog::widget_name(ComponentId::PieChart),
            None
        );
        assert!(FunnelChartConfig::default().max_stages > 0);
    }

    #[test]
    fn funnel_chart_selection_and_reset_stay_component_local() {
        let mut state = FunnelChartState::default();
        state.reduce(FunnelChartEvent::StageSelected(Some(3)));
        state.reduce(FunnelChartEvent::ViewportChanged);
        assert_eq!(state.selected_stage, Some(3));
        assert_eq!(state.viewport_changes, 1);
        state.reduce(FunnelChartEvent::Reset);
        assert_eq!(state, FunnelChartState::default());
    }
}
