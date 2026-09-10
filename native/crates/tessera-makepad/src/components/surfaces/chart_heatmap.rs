//! Native Heatmap widget with a bounded cell model and local selection state.

use crate::foundation::focus::FocusRegion;
use crate::foundation::vector::AlignedVector as DrawVector;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

use super::chart_common::{
    HeatCell, MAX_HEATMAP_COLUMNS, MAX_HEATMAP_ROWS, heatmap_fixture, validate_heatmap,
};

pub struct HeatmapSurfaceCatalog;

impl HeatmapSurfaceCatalog {
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Heatmap => Some("TesseraHeatmap"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct HeatmapConfig {
    pub max_rows: usize,
    pub max_columns: usize,
}

impl Default for HeatmapConfig {
    fn default() -> Self {
        Self {
            max_rows: MAX_HEATMAP_ROWS,
            max_columns: MAX_HEATMAP_COLUMNS,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct HeatmapState {
    pub selected_cell: Option<u32>,
    pub viewport_changes: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum HeatmapEvent {
    CellSelected(Option<u32>),
    ViewportChanged,
    Reset,
}

impl HeatmapState {
    pub fn reduce(&mut self, event: HeatmapEvent) {
        match event {
            HeatmapEvent::CellSelected(cell) => self.selected_cell = cell,
            HeatmapEvent::ViewportChanged => {
                self.viewport_changes = self.viewport_changes.saturating_add(1);
            }
            HeatmapEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum HeatmapAction {
    CellSelected {
        cell: Option<u32>,
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

    mod.widgets.TesseraHeatmapBase = #(TesseraHeatmap::register_widget(vm))
    mod.widgets.TesseraHeatmap = set_type_default() do mod.widgets.TesseraHeatmapBase{
        width: Fill
        height: 260
        accent: theme.color_chart_primary
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
pub struct TesseraHeatmap {
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
    selection: Vec4f,
    #[live]
    muted: Vec4f,
    #[live]
    ink: Vec4f,
    #[live]
    danger: Vec4f,
    #[rust]
    config: HeatmapConfig,
    #[rust]
    state: HeatmapState,
    #[rust]
    rows: usize,
    #[rust]
    columns: usize,
    #[rust]
    cells: Vec<HeatCell>,
    #[rust]
    focus_region: FocusRegion,
}

impl TesseraHeatmap {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.config = HeatmapConfig::default();
        self.state.reduce(HeatmapEvent::Reset);
        self.rows = 7;
        self.columns = 12;
        self.cells = heatmap_fixture();
        self.draw_bg.redraw(cx);
        cx.widget_action(self.uid, HeatmapAction::Reset);
    }

    fn ensure_fixture(&mut self) {
        if self.rows == 0 || self.columns == 0 || self.cells.is_empty() {
            self.rows = 7;
            self.columns = 12;
            self.cells = heatmap_fixture();
        }
    }

    fn emit(&mut self, cx: &mut Cx, event: HeatmapEvent) {
        self.state.reduce(event);
        let action = match event {
            HeatmapEvent::CellSelected(cell) => HeatmapAction::CellSelected { cell },
            HeatmapEvent::ViewportChanged => HeatmapAction::ViewportChanged {
                changes: self.state.viewport_changes,
            },
            HeatmapEvent::Reset => HeatmapAction::Reset,
        };
        cx.widget_action(self.uid, action);
        self.draw_bg.redraw(cx);
    }

    fn select_index(&mut self, cx: &mut Cx, index: usize) {
        self.emit(
            cx,
            HeatmapEvent::CellSelected(self.cells.get(index).map(|cell| cell.id)),
        );
    }

    fn selected_index(&self) -> usize {
        self.state
            .selected_cell
            .and_then(|selected| self.cells.iter().position(|cell| cell.id == selected))
            .unwrap_or(0)
    }

    fn draw_cells(&mut self, cx: &mut Cx2d, rect: Rect) {
        self.ensure_fixture();
        let state = validate_heatmap(self.rows, self.columns, &self.cells);
        let plot = Rect {
            pos: dvec2(rect.pos.x + 32.0, rect.pos.y + 40.0),
            size: dvec2((rect.size.x - 48.0).max(1.0), (rect.size.y - 74.0).max(1.0)),
        };
        if !state.is_ready()
            || self.rows > self.config.max_rows
            || self.columns > self.config.max_columns
        {
            self.draw_text.color = super::chart_label::readable_on(self.draw_bg.color, self.danger);
            self.draw_text.text_style.font_size = 12.0;
            self.draw_text
                .draw_abs(cx, dvec2(plot.pos.x, plot.pos.y + 16.0), state.label());
            return;
        }

        let cell_width = plot.size.x / self.columns as f64;
        let cell_height = plot.size.y / self.rows as f64;
        self.draw_vector.begin();
        for cell in &self.cells {
            let amount = cell.value.unwrap_or(0.0).clamp(0.0, 1.0) as f32;
            let color = if self.state.selected_cell == Some(cell.id) {
                self.selection
            } else if cell.value.is_some() {
                vec4(
                    self.muted.x * (1.0 - amount) + self.accent.x * amount,
                    self.muted.y * (1.0 - amount) + self.accent.y * amount,
                    self.muted.z * (1.0 - amount) + self.accent.z * amount,
                    0.92,
                )
            } else {
                vec4(self.muted.x, self.muted.y, self.muted.z, 0.20)
            };
            self.draw_vector
                .set_color(color.x, color.y, color.z, color.w);
            self.draw_vector.clear();
            self.draw_vector.rect(
                (plot.pos.x + cell.column as f64 * cell_width + 1.0) as f32,
                (plot.pos.y + cell.row as f64 * cell_height + 1.0) as f32,
                (cell_width - 2.0).max(1.0) as f32,
                (cell_height - 2.0).max(1.0) as f32,
            );
            self.draw_vector.fill();
        }
        self.draw_vector.end(cx);
    }
}

impl Widget for TesseraHeatmap {
    fn is_interactive(&self) -> bool {
        true
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, _scope: &mut Scope) {
        self.ensure_fixture();
        match event.hits_with_capture_overload(cx, self.draw_bg.area(), true) {
            Hit::KeyDown(key) if !key.is_repeat => {
                let current = self.selected_index() as isize;
                let last = self.cells.len().saturating_sub(1) as isize;
                match key.key_code {
                    KeyCode::ArrowLeft => {
                        self.select_index(cx, (current - 1).clamp(0, last) as usize)
                    }
                    KeyCode::ArrowRight | KeyCode::Space => {
                        self.select_index(cx, (current + 1).clamp(0, last) as usize)
                    }
                    KeyCode::ArrowUp => self.select_index(
                        cx,
                        (current - self.columns as isize).clamp(0, last) as usize,
                    ),
                    KeyCode::ArrowDown => self.select_index(
                        cx,
                        (current + self.columns as isize).clamp(0, last) as usize,
                    ),
                    KeyCode::Home => self.select_index(cx, 0),
                    KeyCode::End => self.select_index(cx, self.cells.len().saturating_sub(1)),
                    KeyCode::Escape => self.emit(cx, HeatmapEvent::CellSelected(None)),
                    _ => {}
                }
            }
            Hit::FingerDown(fe) if fe.is_primary_hit() => {
                let rect = self.draw_bg.area().rect(cx);
                let plot_x = rect.pos.x + 32.0;
                let plot_y = rect.pos.y + 40.0;
                let plot_width = (rect.size.x - 48.0).max(1.0);
                let plot_height = (rect.size.y - 74.0).max(1.0);
                let column = (((fe.abs.x - plot_x) / plot_width) * self.columns as f64)
                    .floor()
                    .clamp(0.0, (self.columns - 1) as f64) as usize;
                let row = (((fe.abs.y - plot_y) / plot_height) * self.rows as f64)
                    .floor()
                    .clamp(0.0, (self.rows - 1) as f64) as usize;
                if let Some(index) = self
                    .cells
                    .iter()
                    .position(|cell| cell.row == row && cell.column == column)
                {
                    self.select_index(cx, index);
                }
                cx.set_key_focus(self.draw_bg.area());
            }
            Hit::FingerScroll(_) => self.emit(cx, HeatmapEvent::ViewportChanged),
            _ => {}
        }
        self.draw_bg.redraw(cx);
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        let rect = self.draw_bg.draw_walk(cx, walk);
        self.draw_text.color = self.ink;
        self.draw_text.text_style.font_size = 12.0;
        self.draw_text
            .draw_abs(cx, dvec2(rect.pos.x + 12.0, rect.pos.y + 9.0), "Heatmap");
        self.draw_text.color = self.muted;
        self.draw_text.text_style.font_size = 9.0;
        self.draw_text.draw_abs(
            cx,
            dvec2(rect.pos.x + 12.0, rect.pos.y + rect.size.y - 14.0),
            "Arrow move  Space select  Escape clear",
        );
        self.draw_cells(cx, rect);
        self.focus_region
            .register(cx, self.uid, self.draw_bg.area(), NavRole::Slider, 0.0);
        DrawStep::done()
    }
}

#[cfg(test)]
mod tests {
    use super::{HeatmapConfig, HeatmapEvent, HeatmapState, HeatmapSurfaceCatalog};
    use tessera_core::catalog::ComponentId;

    #[test]
    fn heatmap_route_and_config_are_exact() {
        assert_eq!(
            HeatmapSurfaceCatalog::widget_name(ComponentId::Heatmap),
            Some("TesseraHeatmap")
        );
        assert_eq!(
            HeatmapSurfaceCatalog::widget_name(ComponentId::RadarChart),
            None
        );
        assert!(HeatmapConfig::default().max_rows > 0);
    }

    #[test]
    fn heatmap_reducer_keeps_selection_local() {
        let mut state = HeatmapState::default();
        state.reduce(HeatmapEvent::CellSelected(Some(20)));
        state.reduce(HeatmapEvent::ViewportChanged);
        assert_eq!(state.selected_cell, Some(20));
        assert_eq!(state.viewport_changes, 1);
    }
}
