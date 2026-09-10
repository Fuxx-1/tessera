//! Pure chart fixtures, bounds checks, and deterministic geometry plans.
//!
//! This module deliberately knows nothing about Makepad widgets, Live values,
//! component IDs, or actions. Each chart owns its native widget and consumes
//! these bounded values as input only.

use std::collections::{BTreeMap, BTreeSet};

pub use super::chart_flow::validate_flows;

pub const MAX_CATEGORY_ITEMS: usize = 40;
pub const MAX_HEATMAP_ROWS: usize = 30;
pub const MAX_HEATMAP_COLUMNS: usize = 30;
pub const MAX_HEATMAP_CELLS: usize = MAX_HEATMAP_ROWS * MAX_HEATMAP_COLUMNS;
pub const MAX_GRAPH_NODES: usize = 120;
pub const MAX_FLOW_LINKS: usize = 180;
pub const MAX_RADAR_AXES: usize = 12;
pub const MAX_RADAR_SERIES: usize = 12;
pub const MAX_WORDS: usize = 80;
pub const MAX_LABEL_BYTES: usize = 256;

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ChartDataState {
    Loading,
    Ready,
    Empty,
    OverLimit(&'static str),
    Invalid(&'static str),
}

impl ChartDataState {
    #[must_use]
    pub const fn is_ready(&self) -> bool {
        matches!(self, Self::Ready)
    }

    #[must_use]
    pub const fn label(&self) -> &'static str {
        match self {
            Self::Loading => "loading",
            Self::Ready => "ready",
            Self::Empty => "empty fixture",
            Self::OverLimit(reason) | Self::Invalid(reason) => reason,
        }
    }

    #[must_use]
    pub const fn is_loading(&self) -> bool {
        matches!(self, Self::Loading)
    }
}

/// Small generation-aware controller shared by chart hosts. A result from an
/// older request cannot replace the current Loading/Ready/Empty/error state.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ChartDataController {
    state: ChartDataState,
    generation: u64,
}

impl Default for ChartDataController {
    fn default() -> Self {
        Self {
            state: ChartDataState::Loading,
            generation: 0,
        }
    }
}

impl ChartDataController {
    #[must_use]
    pub const fn state(&self) -> &ChartDataState {
        &self.state
    }

    #[must_use]
    pub const fn generation(&self) -> u64 {
        self.generation
    }

    pub fn begin(&mut self) -> u64 {
        self.generation = self.generation.saturating_add(1);
        self.state = ChartDataState::Loading;
        self.generation
    }

    /// Resolve only the currently active request generation.
    pub fn resolve(&mut self, generation: u64, state: ChartDataState) -> bool {
        if generation != self.generation || matches!(state, ChartDataState::Loading) {
            return false;
        }
        self.state = state;
        true
    }

    pub fn reset(&mut self) {
        self.generation = 0;
        self.state = ChartDataState::Loading;
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct CategoryDatum {
    pub id: u32,
    pub label: String,
    pub value: f64,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct GaugeDatum {
    pub min: f64,
    pub max: f64,
    pub value: f64,
    pub target: Option<f64>,
}

impl Default for GaugeDatum {
    fn default() -> Self {
        gauge_fixture()
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct HeatCell {
    pub id: u32,
    pub row: usize,
    pub column: usize,
    pub value: Option<f64>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct GraphNode {
    pub id: u32,
    pub parent_id: Option<u32>,
    pub label: String,
    pub weight: f64,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct FlowLink {
    pub id: u32,
    pub from: u32,
    pub to: u32,
    pub value: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct RadarData {
    pub axes: Vec<String>,
    pub series: Vec<(String, Vec<f64>)>,
}

impl Default for RadarData {
    fn default() -> Self {
        radar_fixture()
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct WordDatum {
    pub id: u32,
    pub text: String,
    pub weight: f64,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct NormalizedPoint {
    pub x: f64,
    pub y: f64,
}

impl NormalizedPoint {
    #[must_use]
    pub const fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct NodePlacement {
    pub id: u32,
    pub center: NormalizedPoint,
    pub level: usize,
}

#[must_use]
pub fn funnel_fixture() -> Vec<CategoryDatum> {
    categories(&[
        ("Visitors", 1_000.0),
        ("Qualified", 720.0),
        ("Trial", 430.0),
        ("Activated", 260.0),
        ("Retained", 148.0),
    ])
}

#[must_use]
pub const fn gauge_fixture() -> GaugeDatum {
    GaugeDatum {
        min: 0.0,
        max: 100.0,
        value: 72.0,
        target: Some(80.0),
    }
}

#[must_use]
pub fn heatmap_fixture() -> Vec<HeatCell> {
    let rows = 7;
    let columns = 12;
    (0..rows)
        .flat_map(|row| {
            (0..columns).map(move |column| HeatCell {
                id: (row * columns + column) as u32,
                row,
                column,
                value: (row == 3 && column == 6)
                    .then_some(None)
                    .unwrap_or_else(|| {
                        Some(((row * 13 + column * 7 + row * column) % 100) as f64 / 100.0)
                    }),
            })
        })
        .collect()
}

#[must_use]
pub fn mind_map_fixture() -> Vec<GraphNode> {
    hierarchy(&[
        (1, None, "Release plan", 1.0),
        (2, Some(1), "Design", 1.0),
        (3, Some(1), "Engineering", 1.0),
        (4, Some(1), "Validation", 1.0),
        (5, Some(2), "Tokens", 1.0),
        (6, Some(2), "Flows", 1.0),
        (7, Some(3), "Native draw", 1.0),
        (8, Some(3), "State", 1.0),
        (9, Some(4), "Mobile", 1.0),
        (10, Some(4), "A11y", 1.0),
    ])
}

#[must_use]
pub fn organization_fixture() -> Vec<GraphNode> {
    hierarchy(&[
        (100, None, "Tessera", 1.0),
        (101, Some(100), "Product", 1.0),
        (102, Some(100), "Platform", 1.0),
        (103, Some(100), "Quality", 1.0),
        (104, Some(101), "Design", 1.0),
        (105, Some(101), "Research", 1.0),
        (106, Some(102), "Makepad", 1.0),
        (107, Some(102), "Core", 1.0),
        (108, Some(103), "Runtime", 1.0),
    ])
}

#[must_use]
pub fn pie_fixture() -> Vec<CategoryDatum> {
    categories(&[
        ("Direct", 38.0),
        ("Search", 27.0),
        ("Referral", 19.0),
        ("Other", 16.0),
    ])
}

#[must_use]
pub fn radar_fixture() -> RadarData {
    RadarData {
        axes: ["Speed", "Clarity", "Coverage", "Safety", "Reach"]
            .into_iter()
            .map(str::to_owned)
            .collect(),
        series: vec![
            ("Current".to_owned(), vec![0.78, 0.68, 0.86, 0.74, 0.62]),
            ("Target".to_owned(), vec![0.90, 0.84, 0.92, 0.90, 0.80]),
        ],
    }
}

#[must_use]
pub fn sankey_fixture() -> (Vec<GraphNode>, Vec<FlowLink>) {
    let nodes = hierarchy(&[
        (300, None, "Input", 1.0),
        (301, None, "API", 1.0),
        (302, None, "Cache", 1.0),
        (303, None, "Worker", 1.0),
        (304, None, "Store", 1.0),
        (305, None, "Report", 1.0),
    ]);
    let links = vec![
        FlowLink {
            id: 1,
            from: 300,
            to: 303,
            value: 72.0,
        },
        FlowLink {
            id: 2,
            from: 301,
            to: 303,
            value: 54.0,
        },
        FlowLink {
            id: 3,
            from: 302,
            to: 303,
            value: 28.0,
        },
        FlowLink {
            id: 4,
            from: 303,
            to: 304,
            value: 112.0,
        },
        FlowLink {
            id: 5,
            from: 303,
            to: 305,
            value: 42.0,
        },
    ];
    (nodes, links)
}

#[must_use]
pub fn treemap_fixture() -> Vec<GraphNode> {
    hierarchy(&[
        (200, None, "Workspace", 1.0),
        (201, Some(200), "Core", 34.0),
        (202, Some(200), "Makepad", 42.0),
        (203, Some(200), "Gallery", 24.0),
        (204, Some(202), "Widgets", 25.0),
        (205, Some(202), "Themes", 17.0),
        (206, Some(203), "Fixtures", 14.0),
        (207, Some(203), "Contracts", 10.0),
    ])
}

#[must_use]
pub fn word_cloud_fixture() -> Vec<WordDatum> {
    [
        ("native", 1.0),
        ("geometry", 0.95),
        ("Makepad", 0.88),
        ("quality", 0.82),
        ("mobile", 0.76),
        ("state", 0.70),
        ("latency", 0.64),
        ("focus", 0.59),
        ("safety", 0.54),
        ("evidence", 0.49),
        ("sampling", 0.44),
        ("stable", 0.39),
    ]
    .into_iter()
    .enumerate()
    .map(|(id, (text, weight))| WordDatum {
        id: id as u32,
        text: text.to_owned(),
        weight,
    })
    .collect()
}

#[must_use]
pub fn validate_categories(values: &[CategoryDatum], non_negative: bool) -> ChartDataState {
    if values.is_empty() {
        return ChartDataState::Empty;
    }
    if values.len() > MAX_CATEGORY_ITEMS {
        return ChartDataState::OverLimit("too many categories");
    }
    if values.iter().any(|value| {
        value.label.is_empty()
            || value.label.len() > MAX_LABEL_BYTES
            || !value.value.is_finite()
            || (non_negative && value.value < 0.0)
    }) {
        return ChartDataState::Invalid("invalid category data");
    }
    ChartDataState::Ready
}

#[must_use]
pub fn validate_gauge(value: GaugeDatum) -> ChartDataState {
    if !value.min.is_finite()
        || !value.max.is_finite()
        || !value.value.is_finite()
        || value.target.is_some_and(|target| !target.is_finite())
        || value.max <= value.min
    {
        ChartDataState::Invalid("invalid gauge range")
    } else {
        ChartDataState::Ready
    }
}

#[must_use]
pub fn validate_heatmap(rows: usize, columns: usize, cells: &[HeatCell]) -> ChartDataState {
    let Some(expected) = rows.checked_mul(columns) else {
        return ChartDataState::OverLimit("heatmap dimensions overflow");
    };
    if expected == 0 || cells.is_empty() {
        return ChartDataState::Empty;
    }
    if rows > MAX_HEATMAP_ROWS || columns > MAX_HEATMAP_COLUMNS || expected > MAX_HEATMAP_CELLS {
        return ChartDataState::OverLimit("heatmap exceeds 30 by 30 cells");
    }
    if cells.len() != expected {
        return ChartDataState::Invalid("heatmap dimensions do not match cells");
    }
    let mut ids = BTreeSet::new();
    if cells.iter().any(|cell| {
        cell.row >= rows
            || cell.column >= columns
            || !ids.insert(cell.id)
            || cell.value.is_some_and(|value| !value.is_finite())
    }) {
        ChartDataState::Invalid("invalid heatmap cell")
    } else {
        ChartDataState::Ready
    }
}

#[must_use]
pub fn validate_radar(data: &RadarData) -> ChartDataState {
    if data.axes.is_empty() || data.series.is_empty() {
        return ChartDataState::Empty;
    }
    if data.axes.len() > MAX_RADAR_AXES || data.series.len() > MAX_RADAR_SERIES {
        return ChartDataState::OverLimit("radar exceeds axis or series budget");
    }
    let mut axes = BTreeSet::new();
    if data
        .axes
        .iter()
        .any(|axis| axis.is_empty() || axis.len() > MAX_LABEL_BYTES || !axes.insert(axis.as_str()))
        || data.series.iter().any(|(_, values)| {
            values.len() != data.axes.len()
                || values
                    .iter()
                    .any(|value| !value.is_finite() || *value < 0.0)
        })
    {
        ChartDataState::Invalid("invalid radar data")
    } else {
        ChartDataState::Ready
    }
}

#[must_use]
pub fn validate_words(words: &[WordDatum]) -> ChartDataState {
    if words.is_empty() {
        return ChartDataState::Empty;
    }
    if words.len() > MAX_WORDS {
        return ChartDataState::OverLimit("word cloud exceeds 80 words");
    }
    if words.iter().any(|word| {
        word.text.is_empty()
            || word.text.len() > MAX_LABEL_BYTES
            || !word.weight.is_finite()
            || word.weight < 0.0
    }) {
        ChartDataState::Invalid("invalid word data")
    } else {
        ChartDataState::Ready
    }
}

#[must_use]
pub fn hierarchy_layout(
    nodes: &[GraphNode],
    radial: bool,
) -> Result<Vec<NodePlacement>, ChartDataState> {
    if nodes.is_empty() {
        return Err(ChartDataState::Empty);
    }
    if nodes.len() > MAX_GRAPH_NODES {
        return Err(ChartDataState::OverLimit("hierarchy exceeds 120 nodes"));
    }
    let ids: BTreeSet<u32> = nodes.iter().map(|node| node.id).collect();
    if ids.len() != nodes.len()
        || nodes.iter().any(|node| {
            node.label.is_empty()
                || node.label.len() > MAX_LABEL_BYTES
                || !node.weight.is_finite()
                || node.parent_id.is_some_and(|parent| !ids.contains(&parent))
        })
    {
        return Err(ChartDataState::Invalid("invalid hierarchy node"));
    }

    let mut levels = BTreeMap::<u32, usize>::new();
    for node in nodes.iter().filter(|node| node.parent_id.is_none()) {
        levels.insert(node.id, 0);
    }
    if levels.is_empty() {
        return Err(ChartDataState::Invalid("hierarchy has no root"));
    }
    while levels.len() < nodes.len() {
        let mut progressed = false;
        for node in nodes {
            if let Some(parent) = node.parent_id {
                if let Some(level) = levels.get(&parent).copied() {
                    if levels.insert(node.id, level + 1).is_none() {
                        progressed = true;
                    }
                }
            }
        }
        if !progressed {
            return Err(ChartDataState::Invalid("hierarchy contains a cycle"));
        }
    }

    let max_level = levels.values().copied().max().unwrap_or(0);
    let mut buckets = BTreeMap::<usize, Vec<u32>>::new();
    for (&id, &level) in &levels {
        buckets.entry(level).or_default().push(id);
    }
    let mut positions = BTreeMap::<u32, NormalizedPoint>::new();
    if radial {
        let root_count = buckets.get(&0).map_or(0, Vec::len).max(1);
        for (&level, ids) in &buckets {
            if level == 0 {
                for (index, id) in ids.iter().enumerate() {
                    let angle = std::f64::consts::TAU * index as f64 / root_count as f64;
                    positions.insert(
                        *id,
                        NormalizedPoint::new(0.5 + angle.cos() * 0.03, 0.5 + angle.sin() * 0.03),
                    );
                }
                continue;
            }
            let radius = 0.18 + 0.30 * level as f64 / max_level.max(1) as f64;
            for (index, id) in ids.iter().enumerate() {
                let angle = std::f64::consts::TAU * index as f64 / ids.len().max(1) as f64;
                positions.insert(
                    *id,
                    NormalizedPoint::new(0.5 + angle.cos() * radius, 0.5 + angle.sin() * radius),
                );
            }
        }
    } else {
        for (&level, ids) in &buckets {
            let x = 0.08 + 0.84 * level as f64 / max_level.max(1) as f64;
            for (index, id) in ids.iter().enumerate() {
                let y = (index + 1) as f64 / (ids.len() + 1) as f64;
                positions.insert(*id, NormalizedPoint::new(x, y));
            }
        }
    }
    Ok(nodes
        .iter()
        .map(|node| NodePlacement {
            id: node.id,
            center: positions[&node.id],
            level: levels[&node.id],
        })
        .collect())
}

fn categories(items: &[(&str, f64)]) -> Vec<CategoryDatum> {
    items
        .iter()
        .enumerate()
        .map(|(id, (label, value))| CategoryDatum {
            id: id as u32,
            label: (*label).to_owned(),
            value: *value,
        })
        .collect()
}

fn hierarchy(items: &[(u32, Option<u32>, &str, f64)]) -> Vec<GraphNode> {
    items
        .iter()
        .map(|(id, parent_id, label, weight)| GraphNode {
            id: *id,
            parent_id: *parent_id,
            label: (*label).to_owned(),
            weight: *weight,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{
        ChartDataController, ChartDataState, GraphNode, funnel_fixture, hierarchy_layout,
        radar_fixture, sankey_fixture, validate_categories, validate_flows, validate_radar,
    };

    #[test]
    fn fixtures_stay_within_their_bounded_validation_contracts() {
        assert!(validate_categories(&funnel_fixture(), true).is_ready());
        assert!(validate_radar(&radar_fixture()).is_ready());
        let (nodes, links) = sankey_fixture();
        assert!(validate_flows(&nodes, &links).is_ready());
    }

    #[test]
    fn hierarchy_layout_rejects_cycles_and_is_deterministic() {
        let cyclic = vec![
            GraphNode {
                id: 1,
                parent_id: Some(2),
                label: String::from("one"),
                weight: 1.0,
            },
            GraphNode {
                id: 2,
                parent_id: Some(1),
                label: String::from("two"),
                weight: 1.0,
            },
        ];
        assert_eq!(
            hierarchy_layout(&cyclic, false),
            Err(ChartDataState::Invalid("hierarchy has no root"))
        );
        let first = hierarchy_layout(&super::mind_map_fixture(), true).expect("layout");
        let second = hierarchy_layout(&super::mind_map_fixture(), true).expect("layout");
        assert_eq!(first, second);
    }

    #[test]
    fn chart_data_controller_exposes_loading_and_all_terminal_states() {
        let mut controller = ChartDataController::default();
        assert!(controller.state().is_loading());
        let first = controller.begin();
        assert!(controller.resolve(first, ChartDataState::Empty));
        assert_eq!(controller.state().label(), "empty fixture");

        let second = controller.begin();
        assert!(!controller.resolve(first, ChartDataState::Ready));
        assert!(controller.resolve(second, ChartDataState::Invalid("bad input")));
        assert_eq!(controller.state().label(), "bad input");
        let third = controller.begin();
        assert!(controller.resolve(third, ChartDataState::OverLimit("too large")));
        assert_eq!(controller.state().label(), "too large");
    }
}
