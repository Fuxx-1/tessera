//! Native PieChart widget with deterministic native sector drawing.

use crate::foundation::focus::FocusRegion;
use crate::foundation::vector::AlignedVector as DrawVector;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

use super::chart_common::{CategoryDatum, MAX_CATEGORY_ITEMS, pie_fixture, validate_categories};

pub struct PieChartSurfaceCatalog;

impl PieChartSurfaceCatalog {
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::PieChart => Some("TesseraPieChart"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct PieChartConfig {
    pub max_slices: usize,
}

impl Default for PieChartConfig {
    fn default() -> Self {
        Self {
            max_slices: MAX_CATEGORY_ITEMS,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct PieChartState {
    pub selected_slice: Option<u32>,
    pub viewport_changes: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PieChartEvent {
    SliceSelected(Option<u32>),
    ViewportChanged,
    Reset,
}

impl PieChartState {
    pub fn reduce(&mut self, event: PieChartEvent) {
        match event {
            PieChartEvent::SliceSelected(slice) => self.selected_slice = slice,
            PieChartEvent::ViewportChanged => {
                self.viewport_changes = self.viewport_changes.saturating_add(1);
            }
            PieChartEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum PieChartAction {
    SliceSelected {
        slice: Option<u32>,
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

    mod.widgets.TesseraPieChartBase = #(TesseraPieChart::register_widget(vm))
    mod.widgets.TesseraPieChart = set_type_default() do mod.widgets.TesseraPieChartBase{
        width: Fill
        height: 260
        accent: theme.color_chart_primary
        accent_alt: theme.color_chart_secondary
        positive: theme.color_chart_positive
        warning: theme.color_chart_warning
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
pub struct TesseraPieChart {
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
    positive: Vec4f,
    #[live]
    warning: Vec4f,
    #[live]
    selection: Vec4f,
    #[live]
    muted: Vec4f,
    #[live]
    ink: Vec4f,
    #[live]
    danger: Vec4f,
    #[rust]
    config: PieChartConfig,
    #[rust]
    state: PieChartState,
    #[rust]
    data: Vec<CategoryDatum>,
    #[rust]
    focus_region: FocusRegion,
}

impl TesseraPieChart {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.config = PieChartConfig::default();
        self.state.reduce(PieChartEvent::Reset);
        self.data = pie_fixture();
        self.draw_bg.redraw(cx);
        cx.widget_action(self.uid, PieChartAction::Reset);
    }

    fn ensure_fixture(&mut self) {
        if self.data.is_empty() {
            self.data = pie_fixture();
        }
    }

    fn emit(&mut self, cx: &mut Cx, event: PieChartEvent) {
        self.state.reduce(event);
        let action = match event {
            PieChartEvent::SliceSelected(slice) => PieChartAction::SliceSelected { slice },
            PieChartEvent::ViewportChanged => PieChartAction::ViewportChanged {
                changes: self.state.viewport_changes,
            },
            PieChartEvent::Reset => PieChartAction::Reset,
        };
        cx.widget_action(self.uid, action);
        self.draw_bg.redraw(cx);
    }

    fn slice_count(&self) -> usize {
        self.data.len().min(self.config.max_slices).max(1)
    }

    fn select_index(&mut self, cx: &mut Cx, index: usize) {
        self.emit(
            cx,
            PieChartEvent::SliceSelected(
                self.data
                    .get(index.min(self.slice_count() - 1))
                    .map(|item| item.id),
            ),
        );
    }

    fn selected_index(&self) -> usize {
        self.state
            .selected_slice
            .and_then(|selected| self.data.iter().position(|item| item.id == selected))
            .unwrap_or(0)
    }

    fn draw_pie(&mut self, cx: &mut Cx2d, rect: Rect) {
        self.ensure_fixture();
        let count = self.slice_count();
        let values = &self.data[..count];
        let state = validate_categories(values, true);
        if !state.is_ready() {
            self.draw_text.color = super::chart_label::readable_on(self.draw_bg.color, self.danger);
            self.draw_text.text_style.font_size = 12.0;
            self.draw_text.draw_abs(
                cx,
                dvec2(rect.pos.x + 16.0, rect.pos.y + 50.0),
                state.label(),
            );
            return;
        }
        let center = dvec2(
            rect.pos.x + rect.size.x * 0.50,
            rect.pos.y + rect.size.y * 0.56,
        );
        let radius = (rect.size.x.min(rect.size.y) * 0.30).max(20.0);
        let total = values.iter().map(|value| value.value).sum::<f64>();
        let colors = [self.accent, self.accent_alt, self.positive, self.warning];
        let mut angle = -std::f64::consts::FRAC_PI_2;
        self.draw_vector.begin();
        for (index, datum) in values.iter().enumerate() {
            let sweep = datum.value / total * std::f64::consts::TAU;
            let selected = self.state.selected_slice == Some(datum.id);
            let center_offset = if selected { 5.0 } else { 0.0 };
            let mid = angle + sweep * 0.5;
            let origin = dvec2(
                center.x + mid.cos() * center_offset,
                center.y + mid.sin() * center_offset,
            );
            let color = if selected {
                self.selection
            } else {
                colors[index % colors.len()]
            };
            self.draw_vector
                .set_color(color.x, color.y, color.z, color.w);
            self.draw_vector.clear();
            self.draw_vector.move_to(origin.x as f32, origin.y as f32);
            let steps = ((sweep * 18.0).ceil() as usize).clamp(2, 24);
            for step in 0..=steps {
                let theta = angle + sweep * step as f64 / steps as f64;
                self.draw_vector.line_to(
                    (origin.x + theta.cos() * radius) as f32,
                    (origin.y + theta.sin() * radius) as f32,
                );
            }
            self.draw_vector.close();
            self.draw_vector.fill();
            angle += sweep;
        }
        self.draw_vector.end(cx);
        self.draw_text.color = self.muted;
        self.draw_text.text_style.font_size = 9.0;
        for (index, datum) in values.iter().enumerate() {
            self.draw_text.draw_abs(
                cx,
                dvec2(rect.pos.x + 16.0, rect.pos.y + 42.0 + index as f64 * 13.0),
                &format!("{} {:.0}", datum.label, datum.value),
            );
        }
    }
}

impl Widget for TesseraPieChart {
    fn is_interactive(&self) -> bool {
        true
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, _scope: &mut Scope) {
        self.ensure_fixture();
        match event.hits_with_capture_overload(cx, self.draw_bg.area(), true) {
            Hit::KeyDown(key) if !key.is_repeat => match key.key_code {
                KeyCode::ArrowLeft | KeyCode::ArrowUp => {
                    self.select_index(cx, self.selected_index().saturating_sub(1));
                }
                KeyCode::ArrowRight | KeyCode::ArrowDown | KeyCode::Space => {
                    self.select_index(cx, self.selected_index() + 1);
                }
                KeyCode::Home => self.select_index(cx, 0),
                KeyCode::End => self.select_index(cx, self.slice_count() - 1),
                KeyCode::Escape => self.emit(cx, PieChartEvent::SliceSelected(None)),
                _ => {}
            },
            Hit::FingerDown(fe) if fe.is_primary_hit() => {
                let rect = self.draw_bg.area().rect(cx);
                let center = dvec2(
                    rect.pos.x + rect.size.x * 0.50,
                    rect.pos.y + rect.size.y * 0.56,
                );
                let raw_angle =
                    (fe.abs.y - center.y).atan2(fe.abs.x - center.x) + std::f64::consts::FRAC_PI_2;
                let fraction = raw_angle.rem_euclid(std::f64::consts::TAU) / std::f64::consts::TAU;
                let total = self
                    .data
                    .iter()
                    .take(self.slice_count())
                    .map(|item| item.value)
                    .sum::<f64>();
                let mut sum = 0.0;
                for (index, datum) in self.data.iter().take(self.slice_count()).enumerate() {
                    sum += datum.value / total;
                    if fraction <= sum {
                        self.select_index(cx, index);
                        break;
                    }
                }
                cx.set_key_focus(self.draw_bg.area());
            }
            Hit::FingerScroll(_) => self.emit(cx, PieChartEvent::ViewportChanged),
            _ => {}
        }
        self.draw_bg.redraw(cx);
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        let rect = self.draw_bg.draw_walk(cx, walk);
        self.draw_text.color = self.ink;
        self.draw_text.text_style.font_size = 12.0;
        self.draw_text
            .draw_abs(cx, dvec2(rect.pos.x + 12.0, rect.pos.y + 9.0), "Pie chart");
        self.draw_text.color = self.muted;
        self.draw_text.text_style.font_size = 9.0;
        self.draw_text.draw_abs(
            cx,
            dvec2(rect.pos.x + 12.0, rect.pos.y + rect.size.y - 14.0),
            "Arrow select  click slice  Escape clear",
        );
        self.draw_pie(cx, rect);
        self.focus_region
            .register(cx, self.uid, self.draw_bg.area(), NavRole::Slider, 0.0);
        DrawStep::done()
    }
}

#[cfg(test)]
mod tests {
    use super::{PieChartConfig, PieChartEvent, PieChartState, PieChartSurfaceCatalog};
    use tessera_core::catalog::ComponentId;

    #[test]
    fn pie_chart_has_an_exact_route_and_bound() {
        assert_eq!(
            PieChartSurfaceCatalog::widget_name(ComponentId::PieChart),
            Some("TesseraPieChart")
        );
        assert!(PieChartConfig::default().max_slices > 0);
    }

    #[test]
    fn pie_chart_selection_resets_independently() {
        let mut state = PieChartState::default();
        state.reduce(PieChartEvent::SliceSelected(Some(3)));
        state.reduce(PieChartEvent::Reset);
        assert_eq!(state, PieChartState::default());
    }
}
