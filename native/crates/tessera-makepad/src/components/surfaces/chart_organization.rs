//! Native OrganizationChart widget with an independent hierarchy surface.

use std::collections::BTreeMap;

use crate::foundation::focus::FocusRegion;
use crate::foundation::vector::{AlignedVector as DrawVector, DpiStroke};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

use super::chart_common::{
    GraphNode, MAX_GRAPH_NODES, NodePlacement, hierarchy_layout, organization_fixture,
};

pub struct OrganizationChartSurfaceCatalog;

impl OrganizationChartSurfaceCatalog {
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::OrganizationChart => Some("TesseraOrganizationChart"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct OrganizationChartConfig {
    pub max_nodes: usize,
    pub node_width: f64,
    pub node_height: f64,
}

impl Default for OrganizationChartConfig {
    fn default() -> Self {
        Self {
            max_nodes: MAX_GRAPH_NODES,
            node_width: 72.0,
            node_height: 30.0,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct OrganizationChartState {
    pub selected_node: Option<u32>,
    pub viewport_changes: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OrganizationChartEvent {
    NodeSelected(Option<u32>),
    ViewportChanged,
    Reset,
}

impl OrganizationChartState {
    pub fn reduce(&mut self, event: OrganizationChartEvent) {
        match event {
            OrganizationChartEvent::NodeSelected(node) => self.selected_node = node,
            OrganizationChartEvent::ViewportChanged => {
                self.viewport_changes = self.viewport_changes.saturating_add(1);
            }
            OrganizationChartEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum OrganizationChartAction {
    NodeSelected {
        node: Option<u32>,
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

    mod.widgets.TesseraOrganizationChartBase = #(TesseraOrganizationChart::register_widget(vm))
    mod.widgets.TesseraOrganizationChart = set_type_default() do mod.widgets.TesseraOrganizationChartBase{
        width: Fill
        height: 260
        accent: theme.color_chart_primary
        selection: theme.color_chart_selection
        ink: theme.color_text
        muted: theme.color_text_meta
        danger: theme.color_chart_negative
        draw_bg +: {color: theme.color_fg_app}
        draw_grid +: {color: theme.color_bevel}
        draw_text +: {draw_depth: 3.0 color: theme.color_text text_style: theme.font_regular {font_size: 11.0}}
        draw_vector +: {draw_depth: 2.0}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraOrganizationChart {
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
    config: OrganizationChartConfig,
    #[rust]
    state: OrganizationChartState,
    #[rust]
    nodes: Vec<GraphNode>,
    #[rust]
    focus_region: FocusRegion,
}

impl TesseraOrganizationChart {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.config = OrganizationChartConfig::default();
        self.state.reduce(OrganizationChartEvent::Reset);
        self.nodes = organization_fixture();
        self.draw_bg.redraw(cx);
        cx.widget_action(self.uid, OrganizationChartAction::Reset);
    }

    fn ensure_fixture(&mut self) {
        if self.nodes.is_empty() {
            self.nodes = organization_fixture();
        }
    }

    fn placements(&self) -> Result<Vec<NodePlacement>, String> {
        if self.nodes.len() > self.config.max_nodes {
            return Err(String::from("organization exceeds node budget"));
        }
        hierarchy_layout(&self.nodes, false).map_err(|state| state.label().to_owned())
    }

    fn emit(&mut self, cx: &mut Cx, event: OrganizationChartEvent) {
        self.state.reduce(event);
        let action = match event {
            OrganizationChartEvent::NodeSelected(node) => {
                OrganizationChartAction::NodeSelected { node }
            }
            OrganizationChartEvent::ViewportChanged => OrganizationChartAction::ViewportChanged {
                changes: self.state.viewport_changes,
            },
            OrganizationChartEvent::Reset => OrganizationChartAction::Reset,
        };
        cx.widget_action(self.uid, action);
        self.draw_bg.redraw(cx);
    }

    fn selected_index(&self) -> usize {
        self.state
            .selected_node
            .and_then(|selected| self.nodes.iter().position(|node| node.id == selected))
            .unwrap_or(0)
    }

    fn select_index(&mut self, cx: &mut Cx, index: usize) {
        self.emit(
            cx,
            OrganizationChartEvent::NodeSelected(self.nodes.get(index).map(|node| node.id)),
        );
    }

    fn draw_organization(&mut self, cx: &mut Cx2d, rect: Rect) {
        self.ensure_fixture();
        let Ok(placements) = self.placements() else {
            self.draw_text.color = super::chart_label::readable_on(self.draw_bg.color, self.danger);
            self.draw_text.text_style.font_size = 12.0;
            self.draw_text.draw_abs(
                cx,
                dvec2(rect.pos.x + 16.0, rect.pos.y + 50.0),
                "invalid organization fixture",
            );
            return;
        };
        let plot = Rect {
            pos: dvec2(rect.pos.x + 18.0, rect.pos.y + 36.0),
            size: dvec2((rect.size.x - 36.0).max(1.0), (rect.size.y - 66.0).max(1.0)),
        };
        let positions: BTreeMap<u32, DVec2> = placements
            .iter()
            .map(|placement| {
                (
                    placement.id,
                    dvec2(
                        plot.pos.x + placement.center.x * plot.size.x,
                        plot.pos.y + placement.center.y * plot.size.y,
                    ),
                )
            })
            .collect();
        self.draw_vector.begin();
        self.draw_vector
            .set_color(self.muted.x, self.muted.y, self.muted.z, self.muted.w);
        for node in &self.nodes {
            if let Some(parent) = node.parent_id {
                if let (Some(from), Some(to)) = (positions.get(&parent), positions.get(&node.id)) {
                    self.draw_vector.clear();
                    self.draw_vector.move_to(from.x as f32, from.y as f32);
                    self.draw_vector.line_to(to.x as f32, to.y as f32);
                    self.draw_vector.stroke_dip(cx, 1.2);
                }
            }
        }
        for node in &self.nodes {
            let Some(center) = positions.get(&node.id).copied() else {
                continue;
            };
            let color = if self.state.selected_node == Some(node.id) {
                self.selection
            } else {
                self.accent
            };
            self.draw_vector
                .set_color(color.x, color.y, color.z, color.w);
            self.draw_vector.clear();
            self.draw_vector.rect(
                (center.x - self.config.node_width * 0.5) as f32,
                (center.y - self.config.node_height * 0.5) as f32,
                self.config.node_width as f32,
                self.config.node_height as f32,
            );
            self.draw_vector.fill();
        }
        self.draw_vector.end(cx);
        self.draw_text.new_draw_call(cx);
        for node in &self.nodes {
            let Some(center) = positions.get(&node.id).copied() else {
                continue;
            };
            let fill = if self.state.selected_node == Some(node.id) {
                self.selection
            } else {
                self.accent
            };
            self.draw_text.color = super::chart_label::on_fill(fill);
            self.draw_text.text_style.font_size = 8.0;
            super::chart_label::draw_label(
                &mut self.draw_text,
                cx,
                Rect {
                    pos: dvec2(
                        center.x - self.config.node_width * 0.5 + 4.0,
                        center.y - self.config.node_height * 0.5,
                    ),
                    size: dvec2(self.config.node_width - 8.0, self.config.node_height),
                },
                &node.label,
                Align { x: 0.5, y: 0.5 },
            );
        }
    }
}

impl Widget for TesseraOrganizationChart {
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
                KeyCode::End => self.select_index(cx, self.nodes.len().saturating_sub(1)),
                KeyCode::Escape => self.emit(cx, OrganizationChartEvent::NodeSelected(None)),
                _ => {}
            },
            Hit::FingerDown(fe) if fe.is_primary_hit() => {
                let rect = self.draw_bg.area().rect(cx);
                let plot = Rect {
                    pos: dvec2(rect.pos.x + 18.0, rect.pos.y + 36.0),
                    size: dvec2((rect.size.x - 36.0).max(1.0), (rect.size.y - 66.0).max(1.0)),
                };
                if let Ok(placements) = self.placements() {
                    let hit = placements.iter().min_by(|left, right| {
                        let left_point = dvec2(
                            plot.pos.x + left.center.x * plot.size.x,
                            plot.pos.y + left.center.y * plot.size.y,
                        );
                        let right_point = dvec2(
                            plot.pos.x + right.center.x * plot.size.x,
                            plot.pos.y + right.center.y * plot.size.y,
                        );
                        (fe.abs - left_point)
                            .lengthsquared()
                            .total_cmp(&(fe.abs - right_point).lengthsquared())
                    });
                    self.emit(
                        cx,
                        OrganizationChartEvent::NodeSelected(hit.map(|placement| placement.id)),
                    );
                }
                cx.set_key_focus(self.draw_bg.area());
            }
            Hit::FingerScroll(_) => self.emit(cx, OrganizationChartEvent::ViewportChanged),
            _ => {}
        }
        self.draw_bg.redraw(cx);
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        let rect = self.draw_bg.draw_walk(cx, walk);
        self.draw_text.color = self.ink;
        self.draw_text.text_style.font_size = 12.0;
        self.draw_text.draw_abs(
            cx,
            dvec2(rect.pos.x + 12.0, rect.pos.y + 9.0),
            "Organization chart",
        );
        self.draw_text.color = self.muted;
        self.draw_text.text_style.font_size = 9.0;
        self.draw_text.draw_abs(
            cx,
            dvec2(rect.pos.x + 12.0, rect.pos.y + rect.size.y - 14.0),
            "Arrow select  click node  Escape clear",
        );
        self.draw_organization(cx, rect);
        self.focus_region
            .register(cx, self.uid, self.draw_bg.area(), NavRole::Slider, 0.0);
        DrawStep::done()
    }
}

#[cfg(test)]
mod tests {
    use super::{
        OrganizationChartConfig, OrganizationChartEvent, OrganizationChartState,
        OrganizationChartSurfaceCatalog,
    };
    use tessera_core::catalog::ComponentId;

    #[test]
    fn organization_chart_has_an_exact_route_and_node_budget() {
        assert_eq!(
            OrganizationChartSurfaceCatalog::widget_name(ComponentId::OrganizationChart),
            Some("TesseraOrganizationChart")
        );
        assert!(OrganizationChartConfig::default().max_nodes > 0);
    }

    #[test]
    fn organization_chart_reducer_is_component_local() {
        let mut state = OrganizationChartState::default();
        state.reduce(OrganizationChartEvent::NodeSelected(Some(102)));
        state.reduce(OrganizationChartEvent::ViewportChanged);
        assert_eq!(state.selected_node, Some(102));
        assert_eq!(state.viewport_changes, 1);
    }
}
