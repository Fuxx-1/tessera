//! Native SankeyChart widget with a bounded DAG fixture and typed selection.

use crate::foundation::focus::FocusRegion;
use crate::foundation::vector::AlignedVector as DrawVector;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

use super::chart_common::{
    ChartDataController, ChartDataState, FlowLink, GraphNode, MAX_FLOW_LINKS, MAX_GRAPH_NODES,
    NormalizedPoint, sankey_fixture, validate_flows,
};
use super::chart_flow::{FlowLayoutCache, FlowTarget};

pub struct SankeyChartSurfaceCatalog;

impl SankeyChartSurfaceCatalog {
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::SankeyChart => Some("TesseraSankeyChart"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SankeyChartConfig {
    pub max_nodes: usize,
    pub max_links: usize,
}

impl Default for SankeyChartConfig {
    fn default() -> Self {
        Self {
            max_nodes: MAX_GRAPH_NODES,
            max_links: MAX_FLOW_LINKS,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct SankeyChartState {
    pub selected_node: Option<u32>,
    pub selected_link: Option<u32>,
    pub viewport_changes: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SankeyChartEvent {
    NodeSelected(Option<u32>),
    LinkSelected(Option<u32>),
    ViewportChanged,
    Reset,
}

impl SankeyChartState {
    pub fn reduce(&mut self, event: SankeyChartEvent) {
        match event {
            SankeyChartEvent::NodeSelected(node) => {
                self.selected_node = node;
                self.selected_link = None;
            }
            SankeyChartEvent::LinkSelected(link) => {
                self.selected_link = link;
                self.selected_node = None;
            }
            SankeyChartEvent::ViewportChanged => {
                self.viewport_changes = self.viewport_changes.saturating_add(1);
            }
            SankeyChartEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum SankeyChartAction {
    NodeSelected {
        node: Option<u32>,
    },
    LinkSelected {
        link: Option<u32>,
    },
    DataChanged {
        state: &'static str,
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

    mod.widgets.TesseraSankeyChartBase = #(TesseraSankeyChart::register_widget(vm))
    mod.widgets.TesseraSankeyChart = set_type_default() do mod.widgets.TesseraSankeyChartBase{
        width: Fill
        height: 260
        accent: theme.color_chart_primary
        accent_alt: theme.color_chart_secondary
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
pub struct TesseraSankeyChart {
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
    config: SankeyChartConfig,
    #[rust]
    state: SankeyChartState,
    #[rust]
    nodes: Vec<GraphNode>,
    #[rust]
    links: Vec<FlowLink>,
    #[rust]
    data: ChartDataController,
    #[rust]
    geometry: FlowLayoutCache,
    #[rust]
    focus_region: FocusRegion,
}

impl TesseraSankeyChart {
    fn replace_data(&mut self, mut nodes: Vec<GraphNode>, mut links: Vec<FlowLink>) {
        let generation = self.data.begin();
        let state = if nodes.len() > self.config.max_nodes || links.len() > self.config.max_links {
            ChartDataState::OverLimit("sankey graph exceeds bounded capacity")
        } else {
            validate_flows(&nodes, &links)
        };
        self.state = SankeyChartState::default();
        if state.is_ready() {
            nodes.sort_by_key(|node| node.id);
            links.sort_by_key(|link| link.id);
            self.nodes = nodes;
            self.links = links;
        } else {
            self.nodes.clear();
            self.links.clear();
        }
        self.data.resolve(generation, state);
    }

    pub fn set_data(&mut self, cx: &mut Cx, nodes: Vec<GraphNode>, links: Vec<FlowLink>) {
        self.replace_data(nodes, links);
        self.draw_bg.redraw(cx);
        cx.widget_action(
            self.uid,
            SankeyChartAction::DataChanged {
                state: self.data.state().label(),
            },
        );
    }

    pub fn reset(&mut self, cx: &mut Cx) {
        self.config = SankeyChartConfig::default();
        let (nodes, links) = sankey_fixture();
        self.replace_data(nodes, links);
        self.draw_bg.redraw(cx);
        cx.widget_action(self.uid, SankeyChartAction::Reset);
    }

    fn ensure_fixture(&mut self) {
        if self.data.generation() == 0 {
            let (nodes, links) = sankey_fixture();
            self.replace_data(nodes, links);
        }
    }

    fn emit(&mut self, cx: &mut Cx, event: SankeyChartEvent) {
        self.state.reduce(event);
        let action = match event {
            SankeyChartEvent::NodeSelected(node) => SankeyChartAction::NodeSelected { node },
            SankeyChartEvent::LinkSelected(link) => SankeyChartAction::LinkSelected { link },
            SankeyChartEvent::ViewportChanged => SankeyChartAction::ViewportChanged {
                changes: self.state.viewport_changes,
            },
            SankeyChartEvent::Reset => SankeyChartAction::Reset,
        };
        cx.widget_action(self.uid, action);
        self.draw_bg.redraw(cx);
    }

    fn plot(rect: Rect) -> Rect {
        Rect {
            pos: rect.pos + dvec2(86.0, 48.0),
            size: dvec2(
                (rect.size.x - 172.0).max(1.0),
                (rect.size.y - 100.0).max(1.0),
            ),
        }
    }

    fn link_label(&self, link: &FlowLink) -> String {
        let name = |id| {
            self.nodes
                .binary_search_by_key(&id, |node| node.id)
                .ok()
                .map(|index| self.nodes[index].label.as_str())
                .unwrap_or("?")
        };
        format!("{} -> {}: {}", name(link.from), name(link.to), link.value)
    }

    fn summary(&self) -> String {
        if let Some(link) = self
            .state
            .selected_link
            .and_then(|id| self.links.iter().find(|link| link.id == id))
        {
            return self.link_label(link);
        }
        if let Some(node) = self
            .state
            .selected_node
            .and_then(|id| self.nodes.iter().find(|node| node.id == id))
        {
            let incoming: f64 = self
                .links
                .iter()
                .filter(|link| link.to == node.id)
                .map(|link| link.value)
                .sum();
            let outgoing: f64 = self
                .links
                .iter()
                .filter(|link| link.from == node.id)
                .map(|link| link.value)
                .sum();
            return format!("{}: in {} / out {}", node.label, incoming, outgoing);
        }
        if !self.data.state().is_ready() {
            return self.data.state().label().to_owned();
        }
        format!(
            "{} nodes / {} connections",
            self.nodes.len(),
            self.links.len()
        )
    }

    fn table_page(&self, rect: Rect) -> (usize, usize) {
        let rows = (((rect.size.y - 100.0).max(22.0) / 22.0).floor() as usize).max(1);
        let selected = self
            .state
            .selected_link
            .and_then(|id| self.links.iter().position(|link| link.id == id))
            .unwrap_or(0);
        (selected / rows * rows, rows)
    }

    fn draw_table(&mut self, cx: &mut Cx2d, rect: Rect, reason: &str) {
        self.draw_text.color = self.muted;
        self.draw_text.text_style.font_size = 9.0;
        super::chart_label::draw_label(
            &mut self.draw_text,
            cx,
            Rect {
                pos: rect.pos + dvec2(12.0, 29.0),
                size: dvec2(rect.size.x - 24.0, 16.0),
            },
            reason,
            Align::default(),
        );
        let (start, count) = self.table_page(rect);
        for (row, link) in self.links.iter().skip(start).take(count).enumerate() {
            let prefix = if self.state.selected_link == Some(link.id) {
                "> "
            } else {
                "  "
            };
            let text = format!("{prefix}{}  {}", start + row + 1, self.link_label(link));
            self.draw_text.color = self.ink;
            self.draw_text.text_style.font_size = 10.0;
            super::chart_label::draw_label(
                &mut self.draw_text,
                cx,
                Rect {
                    pos: rect.pos + dvec2(12.0, 48.0 + row as f64 * 22.0),
                    size: dvec2(rect.size.x - 24.0, 20.0),
                },
                &text,
                Align::default(),
            );
        }
    }

    fn draw_flow(&mut self, cx: &mut Cx2d, rect: Rect) {
        self.ensure_fixture();
        if !self.data.state().is_ready() {
            self.draw_table(cx, rect, self.data.state().label());
            return;
        }
        let plot = Self::plot(rect);
        let layout = self.geometry.get(
            self.data.generation(),
            &self.nodes,
            &self.links,
            plot.size.x,
            plot.size.y,
        );
        let plan = match layout {
            Ok(plan) => plan,
            Err(state) => {
                let reason = state.label();
                self.draw_table(cx, rect, reason);
                return;
            }
        };
        self.draw_vector.begin();
        for band in &plan.bands {
            let mut color = if self.state.selected_link == Some(band.id) {
                self.selection
            } else {
                self.accent_alt
            };
            if self.state.selected_link != Some(band.id) {
                color.w *= 0.45;
            }
            self.draw_vector
                .set_color(color.x, color.y, color.z, color.w);
            let x0 = (plot.pos.x + band.from.x) as f32;
            let x1 = (plot.pos.x + band.to.x) as f32;
            let y0 = (plot.pos.y + band.from.y) as f32;
            let y1 = (plot.pos.y + band.to.y) as f32;
            let mid = (x0 + x1) * 0.5;
            let width = band.width as f32;
            self.draw_vector.clear();
            self.draw_vector.move_to(x0, y0);
            self.draw_vector.bezier_to(mid, y0, mid, y1, x1, y1);
            self.draw_vector.line_to(x1, y1 + width);
            self.draw_vector
                .bezier_to(mid, y1 + width, mid, y0 + width, x0, y0 + width);
            self.draw_vector.close();
            self.draw_vector.fill();
        }
        for node in &plan.nodes {
            let color = if self.state.selected_node == Some(node.id) {
                self.selection
            } else {
                self.accent
            };
            self.draw_vector
                .set_color(color.x, color.y, color.z, color.w);
            self.draw_vector.clear();
            self.draw_vector.rect(
                (plot.pos.x + node.rect.x) as f32,
                (plot.pos.y + node.rect.y) as f32,
                node.rect.width as f32,
                node.rect.height as f32,
            );
            self.draw_vector.fill();
            let Some(label) = self
                .nodes
                .binary_search_by_key(&node.id, |data| data.id)
                .ok()
                .map(|index| self.nodes[index].label.as_str())
            else {
                continue;
            };
            self.draw_text.color = self.ink;
            self.draw_text.text_style.font_size = 9.0;
            let label_height = node.rect.height.max(20.0);
            let label_y = plot.pos.y + node.rect.y + (node.rect.height - label_height) * 0.5;
            let (label_rect, align) = if node.layer == 0 {
                (
                    Rect {
                        pos: dvec2(rect.pos.x + 8.0, label_y),
                        size: dvec2(70.0, label_height),
                    },
                    Align { x: 1.0, y: 0.5 },
                )
            } else if node.layer + 1 == plan.layers {
                (
                    Rect {
                        pos: dvec2(plot.pos.x + node.rect.x + node.rect.width + 8.0, label_y),
                        size: dvec2(70.0, label_height),
                    },
                    Align { x: 0.0, y: 0.5 },
                )
            } else {
                (
                    Rect {
                        pos: dvec2(
                            plot.pos.x + node.rect.x - 28.0,
                            plot.pos.y + node.rect.y - 18.0,
                        ),
                        size: dvec2(70.0, 16.0),
                    },
                    Align { x: 0.5, y: 0.5 },
                )
            };
            super::chart_label::draw_label(&mut self.draw_text, cx, label_rect, label, align);
        }
        self.draw_vector.end(cx);
    }

    fn target_at(&mut self, rect: Rect, point: DVec2) -> Option<FlowTarget> {
        if !self.data.state().is_ready() {
            return None;
        }
        let plot = Self::plot(rect);
        match self.geometry.get(
            self.data.generation(),
            &self.nodes,
            &self.links,
            plot.size.x,
            plot.size.y,
        ) {
            Ok(plan) => plan.hit(NormalizedPoint::new(
                point.x - plot.pos.x,
                point.y - plot.pos.y,
            )),
            Err(_) => {
                let (start, count) = self.table_page(rect);
                let local = point - rect.pos;
                if local.x < 12.0 || local.x > rect.size.x - 12.0 || local.y < 48.0 {
                    return None;
                }
                let row = ((local.y - 48.0) / 22.0).floor() as usize;
                (row < count)
                    .then(|| self.links.get(start + row))
                    .flatten()
                    .map(|link| FlowTarget::Link(link.id))
            }
        }
    }

    fn navigate(&mut self, cx: &mut Cx, key: KeyCode) {
        if !self.data.state().is_ready() {
            return;
        }
        let plot = Self::plot(self.draw_bg.area().rect(cx));
        let plan = self.geometry.get(
            self.data.generation(),
            &self.nodes,
            &self.links,
            plot.size.x,
            plot.size.y,
        );
        let links = plan.is_err()
            || matches!(key, KeyCode::ArrowUp | KeyCode::ArrowDown)
            || self.state.selected_link.is_some()
                && matches!(
                    key,
                    KeyCode::Home | KeyCode::End | KeyCode::Space | KeyCode::ReturnKey
                );
        let ids: Vec<_> = if links {
            self.links.iter().map(|link| link.id).collect()
        } else {
            match plan {
                Ok(plan) => plan.nodes.iter().map(|node| node.id).collect(),
                Err(_) => self.nodes.iter().map(|node| node.id).collect(),
            }
        };
        if ids.is_empty() {
            return;
        }
        let selected = if links {
            self.state.selected_link
        } else {
            self.state.selected_node
        };
        let current = selected.and_then(|id| ids.iter().position(|item| *item == id));
        let index = match key {
            KeyCode::Home => 0,
            KeyCode::End => ids.len() - 1,
            KeyCode::ArrowLeft | KeyCode::ArrowUp => {
                current.map_or(0, |index| index.saturating_sub(1))
            }
            KeyCode::ArrowRight | KeyCode::ArrowDown => {
                current.map_or(0, |index| (index + 1).min(ids.len() - 1))
            }
            _ => current.unwrap_or(0),
        };
        self.emit(
            cx,
            if links {
                SankeyChartEvent::LinkSelected(Some(ids[index]))
            } else {
                SankeyChartEvent::NodeSelected(Some(ids[index]))
            },
        );
    }
}

impl Widget for TesseraSankeyChart {
    fn is_interactive(&self) -> bool {
        true
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, _scope: &mut Scope) {
        self.ensure_fixture();
        match event.hits_with_capture_overload(cx, self.draw_bg.area(), true) {
            Hit::KeyDown(key) if !key.is_repeat => match key.key_code {
                KeyCode::ArrowLeft
                | KeyCode::ArrowRight
                | KeyCode::ArrowUp
                | KeyCode::ArrowDown
                | KeyCode::Home
                | KeyCode::End
                | KeyCode::Space
                | KeyCode::ReturnKey => self.navigate(cx, key.key_code),
                KeyCode::Escape => self.emit(cx, SankeyChartEvent::NodeSelected(None)),
                _ => {}
            },
            Hit::FingerDown(fe) if fe.is_primary_hit() => {
                let target = self.target_at(self.draw_bg.area().rect(cx), fe.abs);
                self.emit(
                    cx,
                    match target {
                        Some(FlowTarget::Node(id)) => SankeyChartEvent::NodeSelected(Some(id)),
                        Some(FlowTarget::Link(id)) => SankeyChartEvent::LinkSelected(Some(id)),
                        None => SankeyChartEvent::NodeSelected(None),
                    },
                );
                cx.set_key_focus(self.draw_bg.area());
            }
            Hit::KeyFocus(_) | Hit::KeyFocusLost(_) => self.draw_bg.redraw(cx),
            _ => {}
        }
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        let rect = self.draw_bg.draw_walk(cx, walk);
        self.draw_text.color = self.ink;
        self.draw_text.text_style.font_size = 12.0;
        self.draw_text
            .draw_abs(cx, rect.pos + dvec2(12.0, 9.0), "Sankey chart");
        self.draw_flow(cx, rect);
        let summary = self.summary();
        self.draw_text.color = self.ink;
        self.draw_text.text_style.font_size = 10.0;
        super::chart_label::draw_label(
            &mut self.draw_text,
            cx,
            Rect {
                pos: rect.pos + dvec2(12.0, rect.size.y - 32.0),
                size: dvec2(rect.size.x - 24.0, 24.0),
            },
            &summary,
            Align { x: 0.0, y: 0.5 },
        );
        self.focus_region
            .register(cx, self.uid, self.draw_bg.area(), NavRole::Slider, 0.0);
        DrawStep::done()
    }
}

#[cfg(test)]
mod tests {
    use super::{SankeyChartConfig, SankeyChartEvent, SankeyChartState, SankeyChartSurfaceCatalog};
    use tessera_core::catalog::ComponentId;

    #[test]
    fn sankey_chart_has_an_exact_route_and_dag_budgets() {
        assert_eq!(
            SankeyChartSurfaceCatalog::widget_name(ComponentId::SankeyChart),
            Some("TesseraSankeyChart")
        );
        assert!(SankeyChartConfig::default().max_links > 0);
    }

    #[test]
    fn sankey_chart_reducer_keeps_node_selection_local() {
        let mut state = SankeyChartState::default();
        state.reduce(SankeyChartEvent::NodeSelected(Some(303)));
        state.reduce(SankeyChartEvent::Reset);
        assert_eq!(state, SankeyChartState::default());
    }

    #[test]
    fn empty_and_invalid_data_do_not_repopulate_the_sample_on_draw_or_input() {
        use super::*;
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let mut widget = cx.with_vm(|vm| {
            crate::script_mod(vm, tessera_core::ThemeMode::Light);
            let value = script_eval!(vm, { mod.widgets.TesseraSankeyChart });
            TesseraSankeyChart::script_from_value(vm, value)
        });
        widget.ensure_fixture();
        widget.replace_data(Vec::new(), Vec::new());
        let generation = widget.data.generation();
        for _ in 0..64 {
            widget.ensure_fixture();
        }
        assert_eq!(widget.data.generation(), generation);
        assert_eq!(widget.data.state(), &ChartDataState::Empty);
        assert!(widget.nodes.is_empty() && widget.links.is_empty());
        let (nodes, mut links) = sankey_fixture();
        links.push(FlowLink {
            id: 6,
            from: 305,
            to: 300,
            value: 10.0,
        });
        widget.replace_data(nodes, links);
        widget.ensure_fixture();
        assert!(matches!(widget.data.state(), ChartDataState::Invalid(_)));
        let (nodes, links) = sankey_fixture();
        widget.replace_data(nodes, links);
        assert!(widget.data.state().is_ready());
        widget.state.reduce(SankeyChartEvent::LinkSelected(Some(3)));
        assert_eq!(widget.summary(), "Cache -> Worker: 28");
        widget
            .state
            .reduce(SankeyChartEvent::NodeSelected(Some(303)));
        assert_eq!(widget.state.selected_link, None);
        assert_eq!(widget.summary(), "Worker: in 154 / out 154");
    }

    #[test]
    fn tabular_geometry_uses_flow_home_end_without_a_prior_selection() {
        use super::*;
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let mut widget = cx.with_vm(|vm| {
            crate::script_mod(vm, tessera_core::ThemeMode::Light);
            let value = script_eval!(vm, { mod.widgets.TesseraSankeyChart });
            TesseraSankeyChart::script_from_value(vm, value)
        });
        widget.ensure_fixture();
        // An undrawn/zero-size area takes the same cached table path as an
        // over-capacity viewport; physical capacity navigation is covered in GUI.
        widget.navigate(&mut cx, KeyCode::End);
        assert_eq!(widget.state.selected_link, Some(5));
        assert_eq!(widget.state.selected_node, None);
        widget.navigate(&mut cx, KeyCode::Home);
        assert_eq!(widget.state.selected_link, Some(1));
    }
}
