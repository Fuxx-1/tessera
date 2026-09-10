//! Native MindMap widget with a deterministic radial hierarchy layout.

use std::collections::BTreeMap;

use crate::foundation::focus::FocusRegion;
use crate::foundation::vector::{AlignedVector as DrawVector, DpiStroke};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

use super::chart_common::{
    GraphNode, MAX_GRAPH_NODES, NodePlacement, hierarchy_layout, mind_map_fixture,
};

pub struct MindMapSurfaceCatalog;

impl MindMapSurfaceCatalog {
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::MindMap => Some("TesseraMindMap"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct MindMapConfig {
    pub max_nodes: usize,
    pub minimum_zoom: f64,
    pub maximum_zoom: f64,
}

impl Default for MindMapConfig {
    fn default() -> Self {
        Self {
            max_nodes: MAX_GRAPH_NODES,
            minimum_zoom: 0.7,
            maximum_zoom: 1.8,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct MindMapState {
    pub selected_node: Option<u32>,
    pub collapsed: bool,
    pub zoom: f64,
    pub viewport_changes: u32,
}

impl Default for MindMapState {
    fn default() -> Self {
        Self {
            selected_node: None,
            collapsed: false,
            zoom: 1.0,
            viewport_changes: 0,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum MindMapEvent {
    NodeSelected(Option<u32>),
    Collapsed(bool),
    Zoomed(f64),
    Reset,
}

impl MindMapState {
    pub fn reduce(&mut self, event: MindMapEvent, config: MindMapConfig) {
        match event {
            MindMapEvent::NodeSelected(node) => self.selected_node = node,
            MindMapEvent::Collapsed(collapsed) => self.collapsed = collapsed,
            MindMapEvent::Zoomed(zoom) => {
                self.zoom = zoom.clamp(config.minimum_zoom, config.maximum_zoom);
                self.viewport_changes = self.viewport_changes.saturating_add(1);
            }
            MindMapEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub enum MindMapAction {
    NodeSelected {
        node: Option<u32>,
    },
    Collapsed {
        collapsed: bool,
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

    mod.widgets.TesseraMindMapBase = #(TesseraMindMap::register_widget(vm))
    mod.widgets.TesseraMindMap = set_type_default() do mod.widgets.TesseraMindMapBase{
        width: Fill
        height: 260
        accent: theme.color_chart_secondary
        selection: theme.color_chart_selection
        ink: theme.color_text
        muted: theme.color_text_meta
        danger: theme.color_chart_negative
        draw_bg +: {color: theme.color_fg_app}
        draw_grid +: {color: theme.color_bevel}
        draw_label_bg +: {color: theme.color_fg_app draw_depth: 2.5}
        draw_text +: {color: theme.color_text draw_depth: 3.0 text_style: theme.font_regular {font_size: 11.0}}
        draw_vector +: {draw_depth: 2.0}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraMindMap {
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
    draw_label_bg: DrawColor,
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
    config: MindMapConfig,
    #[rust]
    state: MindMapState,
    #[rust]
    nodes: Vec<GraphNode>,
    #[rust]
    focus_region: FocusRegion,
}

impl TesseraMindMap {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.config = MindMapConfig::default();
        self.state.reduce(MindMapEvent::Reset, self.config);
        self.nodes = mind_map_fixture();
        self.draw_bg.redraw(cx);
        cx.widget_action(self.uid, MindMapAction::Reset);
    }

    fn ensure_fixture(&mut self) {
        if self.nodes.is_empty() {
            self.nodes = mind_map_fixture();
        }
    }

    fn visible_nodes(&self) -> Vec<GraphNode> {
        if !self.state.collapsed {
            return self.nodes.clone();
        }
        let roots: Vec<u32> = self
            .nodes
            .iter()
            .filter(|node| node.parent_id.is_none())
            .map(|node| node.id)
            .collect();
        self.nodes
            .iter()
            .filter(|node| {
                node.parent_id.is_none() || node.parent_id.is_some_and(|id| roots.contains(&id))
            })
            .cloned()
            .collect()
    }

    fn emit(&mut self, cx: &mut Cx, event: MindMapEvent) {
        self.state.reduce(event, self.config);
        let action = match event {
            MindMapEvent::NodeSelected(node) => MindMapAction::NodeSelected { node },
            MindMapEvent::Collapsed(collapsed) => MindMapAction::Collapsed { collapsed },
            MindMapEvent::Zoomed(_) => MindMapAction::ViewportChanged {
                changes: self.state.viewport_changes,
            },
            MindMapEvent::Reset => MindMapAction::Reset,
        };
        cx.widget_action(self.uid, action);
        self.draw_bg.redraw(cx);
    }

    fn placements(&self) -> Result<(Vec<GraphNode>, Vec<NodePlacement>), String> {
        let nodes = self.visible_nodes();
        if nodes.len() > self.config.max_nodes {
            return Err(String::from("mind map exceeds node budget"));
        }
        hierarchy_layout(&nodes, true)
            .map(|placements| (nodes, placements))
            .map_err(|state| state.label().to_owned())
    }

    fn select_index(&mut self, cx: &mut Cx, index: usize) {
        let id = self.visible_nodes().get(index).map(|node| node.id);
        self.emit(cx, MindMapEvent::NodeSelected(id));
    }

    fn selected_index(&self) -> usize {
        self.state
            .selected_node
            .and_then(|selected| {
                self.visible_nodes()
                    .iter()
                    .position(|node| node.id == selected)
            })
            .unwrap_or(0)
    }

    fn draw_nodes(&mut self, cx: &mut Cx2d, rect: Rect) {
        self.ensure_fixture();
        let Ok((nodes, placements)) = self.placements() else {
            self.draw_text.color = super::chart_label::readable_on(self.draw_bg.color, self.danger);
            self.draw_text.text_style.font_size = 12.0;
            self.draw_text.draw_abs(
                cx,
                dvec2(rect.pos.x + 16.0, rect.pos.y + 50.0),
                "invalid mind-map fixture",
            );
            return;
        };
        let plot = Rect {
            pos: dvec2(rect.pos.x + 24.0, rect.pos.y + 36.0),
            size: dvec2((rect.size.x - 48.0).max(1.0), (rect.size.y - 66.0).max(1.0)),
        };
        let center = dvec2(
            plot.pos.x + plot.size.x * 0.5,
            plot.pos.y + plot.size.y * 0.5,
        );
        let positions: BTreeMap<u32, DVec2> = placements
            .iter()
            .map(|placement| {
                let point = dvec2(
                    center.x + (placement.center.x - 0.5) * plot.size.x * self.state.zoom,
                    center.y + (placement.center.y - 0.5) * plot.size.y * self.state.zoom,
                );
                (placement.id, point)
            })
            .collect();
        self.draw_vector.begin();
        self.draw_vector
            .set_color(self.muted.x, self.muted.y, self.muted.z, self.muted.w);
        for node in &nodes {
            if let Some(parent) = node.parent_id {
                if let (Some(from), Some(to)) = (positions.get(&parent), positions.get(&node.id)) {
                    self.draw_vector.clear();
                    self.draw_vector.move_to(from.x as f32, from.y as f32);
                    self.draw_vector.line_to(to.x as f32, to.y as f32);
                    self.draw_vector.stroke_dip(cx, 1.5);
                }
            }
        }
        for node in &nodes {
            let Some(point) = positions.get(&node.id).copied() else {
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
            self.draw_vector.circle(point.x as f32, point.y as f32, 7.0);
            self.draw_vector.fill();
        }
        self.draw_vector.end(cx);
        self.draw_text.new_draw_call(cx);
        for node in &nodes {
            let Some(point) = positions.get(&node.id).copied() else {
                continue;
            };
            self.draw_text.color = self.muted;
            self.draw_text.text_style.font_size = 9.0;
            let text_layout =
                self.draw_text
                    .layout(cx, 0.0, 0.0, None, false, Align::default(), &node.label);
            let text_width = text_layout
                .rows
                .first()
                .map_or(0.0, |row| row.width_in_lpxs as f64);
            // Keep outer labels inside the plot and mask connectors behind their glyphs.
            let label_width = (text_width + 6.0).min(92.0).min(plot.size.x * 0.25);
            let label_x = if point.x > center.x {
                point.x - label_width - 10.0
            } else {
                point.x + 10.0
            };
            let label_rect = Rect {
                pos: dvec2(label_x, point.y - 9.0),
                size: dvec2(label_width, 18.0),
            };
            self.draw_label_bg.draw_abs(cx, label_rect);
            super::chart_label::draw_label(
                &mut self.draw_text,
                cx,
                label_rect,
                &node.label,
                Align {
                    x: if point.x > center.x { 1.0 } else { 0.0 },
                    y: 0.5,
                },
            );
        }
    }
}

impl Widget for TesseraMindMap {
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
                KeyCode::ArrowRight | KeyCode::ArrowDown => {
                    self.select_index(cx, self.selected_index() + 1);
                }
                KeyCode::Home => self.select_index(cx, 0),
                KeyCode::End => self.select_index(cx, self.visible_nodes().len().saturating_sub(1)),
                KeyCode::Space => {
                    self.emit(cx, MindMapEvent::Collapsed(!self.state.collapsed));
                }
                KeyCode::Equals => self.emit(cx, MindMapEvent::Zoomed(self.state.zoom * 1.15)),
                KeyCode::Minus => self.emit(cx, MindMapEvent::Zoomed(self.state.zoom / 1.15)),
                KeyCode::Escape => self.emit(cx, MindMapEvent::NodeSelected(None)),
                _ => {}
            },
            Hit::FingerDown(fe) if fe.is_primary_hit() => {
                let rect = self.draw_bg.area().rect(cx);
                let plot = Rect {
                    pos: dvec2(rect.pos.x + 24.0, rect.pos.y + 36.0),
                    size: dvec2((rect.size.x - 48.0).max(1.0), (rect.size.y - 66.0).max(1.0)),
                };
                if let Ok((_, placements)) = self.placements() {
                    let center = dvec2(
                        plot.pos.x + plot.size.x * 0.5,
                        plot.pos.y + plot.size.y * 0.5,
                    );
                    let hit = placements.iter().min_by(|left, right| {
                        let left_point = dvec2(
                            center.x + (left.center.x - 0.5) * plot.size.x * self.state.zoom,
                            center.y + (left.center.y - 0.5) * plot.size.y * self.state.zoom,
                        );
                        let right_point = dvec2(
                            center.x + (right.center.x - 0.5) * plot.size.x * self.state.zoom,
                            center.y + (right.center.y - 0.5) * plot.size.y * self.state.zoom,
                        );
                        let left_distance = (fe.abs - left_point).lengthsquared();
                        let right_distance = (fe.abs - right_point).lengthsquared();
                        left_distance.total_cmp(&right_distance)
                    });
                    self.emit(
                        cx,
                        MindMapEvent::NodeSelected(hit.map(|placement| placement.id)),
                    );
                }
                cx.set_key_focus(self.draw_bg.area());
            }
            Hit::FingerScroll(scroll) => {
                let zoom = if scroll.scroll.y < 0.0 {
                    self.state.zoom * 1.1
                } else {
                    self.state.zoom / 1.1
                };
                self.emit(cx, MindMapEvent::Zoomed(zoom));
            }
            _ => {}
        }
        self.draw_bg.redraw(cx);
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        let rect = self.draw_bg.draw_walk(cx, walk);
        self.draw_text.color = self.ink;
        self.draw_text.text_style.font_size = 12.0;
        self.draw_text
            .draw_abs(cx, dvec2(rect.pos.x + 12.0, rect.pos.y + 9.0), "Mind map");
        self.draw_text.color = self.muted;
        self.draw_text.text_style.font_size = 9.0;
        self.draw_text.draw_abs(
            cx,
            dvec2(rect.pos.x + 12.0, rect.pos.y + rect.size.y - 14.0),
            "Arrow select  Space collapse  +/- zoom",
        );
        self.draw_nodes(cx, rect);
        self.focus_region
            .register(cx, self.uid, self.draw_bg.area(), NavRole::Slider, 0.0);
        DrawStep::done()
    }
}

#[cfg(test)]
mod tests {
    use super::{MindMapConfig, MindMapEvent, MindMapState, MindMapSurfaceCatalog};
    use tessera_core::catalog::ComponentId;

    #[test]
    fn mind_map_has_an_exact_route_and_bounded_config() {
        assert_eq!(
            MindMapSurfaceCatalog::widget_name(ComponentId::MindMap),
            Some("TesseraMindMap")
        );
        assert!(MindMapConfig::default().max_nodes > 0);
    }

    #[test]
    fn mind_map_reducer_preserves_component_local_collapsed_state() {
        let config = MindMapConfig::default();
        let mut state = MindMapState::default();
        state.reduce(MindMapEvent::NodeSelected(Some(3)), config);
        state.reduce(MindMapEvent::Collapsed(true), config);
        assert_eq!(state.selected_node, Some(3));
        assert!(state.collapsed);
    }
}
