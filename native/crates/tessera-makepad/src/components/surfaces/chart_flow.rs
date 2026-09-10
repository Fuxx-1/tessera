//! Bounded, cached flow geometry shared by paint, hit testing and selection.

use std::collections::{BTreeMap, BTreeSet};

use petgraph::{algo::toposort, graph::DiGraph, visit::EdgeRef};

use super::chart_common::{
    ChartDataState, FlowLink, GraphNode, MAX_FLOW_LINKS, MAX_GRAPH_NODES, MAX_LABEL_BYTES,
    NormalizedPoint,
};

const NODE_WIDTH: f64 = 14.0;
const ROW_GAP: f64 = 20.0;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct FlowRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

impl FlowRect {
    pub fn contains(self, point: NormalizedPoint) -> bool {
        point.x >= self.x
            && point.x <= self.x + self.width
            && point.y >= self.y
            && point.y <= self.y + self.height
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct FlowNodePlacement {
    pub id: u32,
    pub layer: usize,
    pub value: f64,
    pub rect: FlowRect,
}

#[derive(Clone, Debug, PartialEq)]
pub struct FlowBand {
    pub id: u32,
    pub from: NormalizedPoint,
    pub to: NormalizedPoint,
    pub width: f64,
}

impl FlowBand {
    /// Matches the two cubic Bezier boundaries used by the native painter.
    pub fn center_at(&self, t: f64) -> NormalizedPoint {
        let t = t.clamp(0.0, 1.0);
        let u = 1.0 - t;
        let mid_x = (self.from.x + self.to.x) * 0.5;
        NormalizedPoint::new(
            u * u * u * self.from.x + 3.0 * u * t * mid_x + t * t * t * self.to.x,
            self.from.y + (self.to.y - self.from.y) * t * t * (3.0 - 2.0 * t) + self.width * 0.5,
        )
    }

    fn contains(&self, point: NormalizedPoint) -> bool {
        if point.x < self.from.x || point.x > self.to.x {
            return false;
        }
        let (mut low, mut high) = (0.0, 1.0);
        for _ in 0..18 {
            let t = (low + high) * 0.5;
            if self.center_at(t).x < point.x {
                low = t;
            } else {
                high = t;
            }
        }
        (self.center_at((low + high) * 0.5).y - point.y).abs() <= self.width * 0.5
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FlowTarget {
    Node(u32),
    Link(u32),
}

#[derive(Clone, Debug, PartialEq)]
pub struct FlowLayout {
    pub nodes: Vec<FlowNodePlacement>,
    pub bands: Vec<FlowBand>,
    pub layers: usize,
}

impl FlowLayout {
    pub fn hit(&self, point: NormalizedPoint) -> Option<FlowTarget> {
        self.nodes
            .iter()
            .find(|node| node.rect.contains(point))
            .map(|node| FlowTarget::Node(node.id))
            .or_else(|| {
                self.bands
                    .iter()
                    .rev()
                    .find(|band| band.contains(point))
                    .map(|band| FlowTarget::Link(band.id))
            })
    }
}

type FlowGraph = DiGraph<(u32, f64), (u32, f64)>;

fn graph(nodes: &[GraphNode], links: &[FlowLink]) -> Result<FlowGraph, ChartDataState> {
    if nodes.is_empty() || links.is_empty() {
        return Err(ChartDataState::Empty);
    }
    if nodes.len() > MAX_GRAPH_NODES || links.len() > MAX_FLOW_LINKS {
        return Err(ChartDataState::OverLimit(
            "sankey graph exceeds bounded capacity",
        ));
    }
    let mut graph = FlowGraph::with_capacity(nodes.len(), links.len());
    let mut ids = BTreeMap::new();
    let sorted: BTreeMap<_, _> = nodes.iter().map(|node| (node.id, node)).collect();
    if sorted.len() != nodes.len()
        || nodes.iter().any(|node| {
            node.label.is_empty()
                || node.label.len() > MAX_LABEL_BYTES
                || !node.weight.is_finite()
                || node.weight < 0.0
        })
    {
        return Err(ChartDataState::Invalid("invalid flow node"));
    }
    let mut link_ids = BTreeSet::new();
    let mut totals = BTreeMap::<u32, (f64, f64)>::new();
    let mut ordered: Vec<_> = links.iter().collect();
    ordered.sort_by_key(|link| link.id);
    for link in &ordered {
        if !link_ids.insert(link.id)
            || !link.value.is_finite()
            || link.value < 0.0
            || link.from == link.to && link.value > 0.0
            || !sorted.contains_key(&link.from)
            || !sorted.contains_key(&link.to)
        {
            return Err(ChartDataState::Invalid("invalid flow link"));
        }
        let from = totals.entry(link.from).or_default();
        from.1 += link.value;
        if !from.1.is_finite() {
            return Err(ChartDataState::Invalid("flow total is not finite"));
        }
        let to = totals.entry(link.to).or_default();
        to.0 += link.value;
        if !to.0.is_finite() {
            return Err(ChartDataState::Invalid("flow total is not finite"));
        }
    }
    // Zero flows remain in the caller's exact-value data, not the paint DAG.
    for id in sorted.keys() {
        let (incoming, outgoing) = totals.get(id).copied().unwrap_or_default();
        let value = incoming.max(outgoing);
        if value > 0.0 {
            ids.insert(*id, graph.add_node((*id, value)));
        }
    }
    if ids.is_empty() {
        return Err(ChartDataState::Empty);
    }
    for link in ordered.into_iter().filter(|link| link.value > 0.0) {
        graph.add_edge(ids[&link.from], ids[&link.to], (link.id, link.value));
    }
    Ok(graph)
}

pub fn validate_flows(nodes: &[GraphNode], links: &[FlowLink]) -> ChartDataState {
    match graph(nodes, links) {
        Err(state) => state,
        Ok(graph) if toposort(&graph, None).is_err() => {
            ChartDataState::Invalid("sankey flow contains a cycle")
        }
        Ok(_) => ChartDataState::Ready,
    }
}

#[derive(Clone)]
struct Slot {
    id: Option<u32>,
    layer: usize,
    value: f64,
    amount: f64,
    rect: FlowRect,
}

pub fn flow_layout(
    nodes: &[GraphNode],
    links: &[FlowLink],
    width: f64,
    height: f64,
) -> Result<FlowLayout, ChartDataState> {
    let graph = graph(nodes, links)?;
    let order = toposort(&graph, None)
        .map_err(|_| ChartDataState::Invalid("sankey flow contains a cycle"))?;
    if !width.is_finite()
        || !height.is_finite()
        || width < 40.0
        || height < 20.0
        || width > 32768.0
        || height > 32768.0
    {
        return Err(ChartDataState::OverLimit("flow needs a larger viewport"));
    }
    let maximum = links.iter().map(|link| link.value).fold(0.0, f64::max);
    if maximum == 0.0 {
        return Err(ChartDataState::Empty);
    }
    let mut depth = vec![0; nodes.len()];
    for from in &order {
        for edge in graph.edges(*from) {
            depth[edge.target().index()] =
                depth[edge.target().index()].max(depth[from.index()] + 1);
        }
    }
    let last_layer = *depth.iter().max().unwrap_or(&0);
    if last_layer == 0 || (width - NODE_WIDTH) / (last_layer as f64) < NODE_WIDTH + 12.0 {
        return Err(ChartDataState::OverLimit("flow needs a wider viewport"));
    }
    let mut slots = Vec::with_capacity(nodes.len() + links.len());
    for node in graph.node_indices() {
        slots.push(Slot {
            id: Some(graph[node].0),
            layer: depth[node.index()],
            value: graph[node].1 / maximum,
            amount: graph[node].1,
            rect: FlowRect {
                x: 0.0,
                y: 0.0,
                width: NODE_WIDTH,
                height: 0.0,
            },
        });
    }
    // Reserve a weighted lane in every crossed layer, so long edges do not
    // pass through an unrelated real node. Virtual slots never become widgets.
    let mut segments = Vec::new();
    for edge in graph.edge_references() {
        let (id, value) = *edge.weight();
        if value == 0.0 {
            continue;
        }
        let mut previous = edge.source().index();
        for layer in depth[previous] + 1..depth[edge.target().index()] {
            let next = slots.len();
            slots.push(Slot {
                id: None,
                layer,
                value: value / maximum,
                amount: value,
                rect: FlowRect {
                    x: 0.0,
                    y: 0.0,
                    width: 0.0,
                    height: 0.0,
                },
            });
            segments.push((id, previous, next, value / maximum));
            previous = next;
        }
        segments.push((id, previous, edge.target().index(), value / maximum));
    }
    let mut layers = vec![Vec::new(); last_layer + 1];
    for (index, slot) in slots.iter().enumerate() {
        layers[slot.layer].push(index);
    }
    let mut scale = f64::INFINITY;
    for layer in &layers {
        let zeros = layer
            .iter()
            .filter(|index| slots[**index].value == 0.0)
            .count();
        let available =
            height - ROW_GAP * layer.len().saturating_sub(1) as f64 - zeros as f64 * 4.0;
        let total: f64 = layer.iter().map(|index| slots[*index].value).sum();
        if available <= 0.0 {
            return Err(ChartDataState::OverLimit("flow needs a taller viewport"));
        }
        if total > 0.0 {
            scale = scale.min(available / total);
        }
    }
    if !scale.is_finite()
        || segments.iter().any(|segment| segment.3 * scale < 0.5)
        || slots
            .iter()
            .any(|slot| slot.id.is_some() && slot.value > 0.0 && slot.value * scale < 4.0)
    {
        return Err(ChartDataState::OverLimit(
            "flow range requires a tabular view",
        ));
    }
    for layer in &layers {
        let occupied: f64 = layer
            .iter()
            .map(|index| (slots[*index].value * scale).max(4.0))
            .sum::<f64>()
            + ROW_GAP * layer.len().saturating_sub(1) as f64;
        if occupied > height + 1e-8 {
            return Err(ChartDataState::OverLimit("flow needs a taller viewport"));
        }
        let mut y = (height - occupied) * 0.5;
        for index in layer {
            let slot = &mut slots[*index];
            slot.rect.x = (width - NODE_WIDTH) * slot.layer as f64 / last_layer as f64
                + if slot.id.is_none() {
                    NODE_WIDTH * 0.5
                } else {
                    0.0
                };
            slot.rect.y = y;
            slot.rect.height = (slot.value * scale).max(4.0);
            y += slot.rect.height + ROW_GAP;
        }
    }
    let mut source_ports = vec![0.0; segments.len()];
    let mut target_ports = vec![0.0; segments.len()];
    let mut source_segments = vec![Vec::new(); slots.len()];
    let mut target_segments = vec![Vec::new(); slots.len()];
    for (index, segment) in segments.iter().enumerate() {
        source_segments[segment.1].push(index);
        target_segments[segment.2].push(index);
    }
    for (index, slot) in slots.iter().enumerate() {
        for source in [true, false] {
            let attached = if source {
                &mut source_segments[index]
            } else {
                &mut target_segments[index]
            };
            attached.sort_by(|a, b| {
                let peer =
                    |segment: &(u32, usize, usize, f64)| if source { segment.2 } else { segment.1 };
                slots[peer(&segments[*a])]
                    .rect
                    .y
                    .total_cmp(&slots[peer(&segments[*b])].rect.y)
                    .then(segments[*a].0.cmp(&segments[*b].0))
            });
            let sum: f64 = attached
                .iter()
                .map(|index| segments[*index].3 * scale)
                .sum();
            let mut port = slot.rect.y + (slot.rect.height - sum) * 0.5;
            for segment_index in attached {
                (if source {
                    &mut source_ports
                } else {
                    &mut target_ports
                })[*segment_index] = port;
                port += segments[*segment_index].3 * scale;
            }
        }
    }
    let bands = segments
        .iter()
        .enumerate()
        .map(|(index, segment)| FlowBand {
            id: segment.0,
            from: NormalizedPoint::new(
                slots[segment.1].rect.x + slots[segment.1].rect.width,
                source_ports[index],
            ),
            to: NormalizedPoint::new(slots[segment.2].rect.x, target_ports[index]),
            width: segment.3 * scale,
        })
        .collect();
    let mut placements: Vec<_> = slots
        .iter()
        .filter_map(|slot| {
            slot.id.map(|id| FlowNodePlacement {
                id,
                layer: slot.layer,
                value: slot.amount,
                rect: slot.rect,
            })
        })
        .collect();
    placements.sort_by(|a, b| {
        a.layer
            .cmp(&b.layer)
            .then(a.rect.y.total_cmp(&b.rect.y))
            .then(a.id.cmp(&b.id))
    });
    Ok(FlowLayout {
        nodes: placements,
        bands,
        layers: last_layer + 1,
    })
}

#[derive(Default)]
pub struct FlowLayoutCache {
    key: Option<(u64, u64, u64)>,
    layout: Option<Result<FlowLayout, ChartDataState>>,
    #[cfg(test)]
    builds: usize,
}

impl FlowLayoutCache {
    pub fn get(
        &mut self,
        generation: u64,
        nodes: &[GraphNode],
        links: &[FlowLink],
        width: f64,
        height: f64,
    ) -> &Result<FlowLayout, ChartDataState> {
        let key = (generation, width.to_bits(), height.to_bits());
        if self.key != Some(key) {
            self.layout = Some(flow_layout(nodes, links, width, height));
            self.key = Some(key);
            #[cfg(test)]
            {
                self.builds += 1;
            }
        }
        self.layout.as_ref().expect("cache initialized")
    }
}

#[cfg(test)]
mod tests {
    use super::super::chart_common::sankey_fixture;
    use super::*;

    #[test]
    fn fixture_has_three_weighted_layers_and_exact_hits() {
        let (nodes, links) = sankey_fixture();
        let plan = flow_layout(&nodes, &links, 360.0, 160.0).unwrap();
        assert_eq!(plan.layers, 3);
        assert_eq!(
            plan.nodes.iter().map(|n| n.layer).collect::<Vec<_>>(),
            [0, 0, 0, 1, 2, 2]
        );
        let worker = plan.nodes.iter().find(|n| n.id == 303).unwrap();
        assert_eq!(worker.value, 154.0);
        let scale = plan.bands[0].width / links[0].value;
        for band in &plan.bands {
            let value = links.iter().find(|link| link.id == band.id).unwrap().value;
            assert!((band.width / value - scale).abs() < 1e-9);
            assert_eq!(
                plan.hit(band.center_at(0.5)),
                Some(FlowTarget::Link(band.id))
            );
        }
        for node in &plan.nodes {
            let p = NormalizedPoint::new(node.rect.x + 7.0, node.rect.y + node.rect.height * 0.5);
            assert_eq!(plan.hit(p), Some(FlowTarget::Node(node.id)));
        }
        assert_eq!(plan.hit(NormalizedPoint::new(-10.0, 80.0)), None);
        assert_eq!(plan.hit(NormalizedPoint::new(40.0, -10.0)), None);
    }

    #[test]
    fn input_order_and_resize_do_not_change_flow_identity_or_ratios() {
        let (mut nodes, mut links) = sankey_fixture();
        let a = flow_layout(&nodes, &links, 360.0, 160.0).unwrap();
        nodes.reverse();
        links.reverse();
        assert_eq!(a, flow_layout(&nodes, &links, 360.0, 160.0).unwrap());
        let b = flow_layout(&nodes, &links, 760.0, 160.0).unwrap();
        for (a, b) in a.bands.iter().zip(&b.bands) {
            assert_eq!((a.id, a.width), (b.id, b.width));
        }
    }

    #[test]
    fn long_edges_reserve_virtual_lanes_in_intermediate_layers() {
        let (nodes, mut links) = sankey_fixture();
        links.push(FlowLink {
            id: 6,
            from: 300,
            to: 305,
            value: 20.0,
        });
        let plan = flow_layout(&nodes, &links, 360.0, 200.0).unwrap();
        let segments: Vec<_> = plan.bands.iter().filter(|band| band.id == 6).collect();
        assert_eq!(segments.len(), 2);
        assert_eq!(segments[0].to, segments[1].from);
        assert_eq!(segments[0].width, segments[1].width);
        assert_eq!(plan.nodes.len(), nodes.len());
        assert!(
            plan.nodes
                .iter()
                .all(|node| !node.rect.contains(segments[0].to))
        );
    }

    #[test]
    fn invalid_empty_and_unpaintable_data_fail_with_explicit_states() {
        let (nodes, mut links) = sankey_fixture();
        links.push(FlowLink {
            id: 9,
            from: 305,
            to: 300,
            value: 10.0,
        });
        assert!(matches!(
            flow_layout(&nodes, &links, 360.0, 160.0),
            Err(ChartDataState::Invalid(_))
        ));
        links.pop();
        links[0].value = f64::NAN;
        assert!(matches!(
            flow_layout(&nodes, &links, 360.0, 160.0),
            Err(ChartDataState::Invalid(_))
        ));
        for link in &mut links {
            link.value = 0.0;
        }
        assert_eq!(
            flow_layout(&nodes, &links, 360.0, 160.0),
            Err(ChartDataState::Empty)
        );
        let (_, links) = sankey_fixture();
        assert!(matches!(
            flow_layout(&nodes, &links, f64::INFINITY, 160.0),
            Err(ChartDataState::OverLimit(_))
        ));
    }

    #[test]
    fn aggregate_overflow_is_rejected_before_data_can_become_ready() {
        let (nodes, mut links) = sankey_fixture();
        for link in &mut links {
            link.value = 1e308;
        }
        assert!(matches!(
            validate_flows(&nodes, &links),
            ChartDataState::Invalid(_)
        ));
    }

    #[test]
    fn zero_flows_and_zero_only_cycles_do_not_move_the_positive_graph() {
        let (mut nodes, mut links) = sankey_fixture();
        let expected = flow_layout(&nodes, &links, 360.0, 160.0).unwrap();
        nodes.push(GraphNode {
            id: 900,
            parent_id: None,
            label: "Inactive".into(),
            weight: 0.0,
        });
        links.push(FlowLink {
            id: 6,
            from: 305,
            to: 900,
            value: 0.0,
        });
        links.push(FlowLink {
            id: 7,
            from: 900,
            to: 300,
            value: 0.0,
        });
        assert!(validate_flows(&nodes, &links).is_ready());
        assert_eq!(flow_layout(&nodes, &links, 360.0, 160.0).unwrap(), expected);
    }

    #[test]
    fn selection_frames_reuse_geometry_but_generation_and_size_rebuild() {
        let (nodes, links) = sankey_fixture();
        let mut cache = FlowLayoutCache::default();
        for _ in 0..64 {
            assert!(cache.get(1, &nodes, &links, 360.0, 160.0).is_ok());
        }
        assert_eq!(cache.builds, 1);
        assert!(cache.get(1, &nodes, &links, 760.0, 160.0).is_ok());
        assert!(cache.get(2, &nodes, &links, 760.0, 160.0).is_ok());
        assert_eq!(cache.builds, 3);
    }
}
