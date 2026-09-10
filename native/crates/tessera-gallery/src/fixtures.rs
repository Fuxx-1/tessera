use std::fmt;

use tessera_core::catalog::ComponentId;

pub const MAX_MARKDOWN_BYTES: usize = 16 * 1024;
pub const INPUT_POINT_COUNT: usize = 10_000;
pub const DRAW_POINT_BUDGET: usize = 640;
pub const ROW_COUNT: usize = 10_000;
pub const COLUMN_COUNT: usize = 4;
pub const MAX_CURVE_SEGMENTS: usize = 64;
pub const TEXT_INPUT_MAX_BYTES: usize = 512;

#[derive(Clone, Copy, Debug)]
pub enum SankeyFixture {
    Sample,
    Empty,
    Cycle,
    Capacity,
    ZeroFlows,
    Overflow,
}

impl SankeyFixture {
    pub fn data(
        self,
    ) -> (
        Vec<tessera_makepad::components::surfaces::chart_common::GraphNode>,
        Vec<tessera_makepad::components::surfaces::chart_common::FlowLink>,
    ) {
        use tessera_makepad::components::surfaces::chart_common::{
            FlowLink, GraphNode, sankey_fixture,
        };
        match self {
            Self::Sample => sankey_fixture(),
            Self::Empty => (Vec::new(), Vec::new()),
            Self::Cycle => {
                let (nodes, mut links) = sankey_fixture();
                links.push(FlowLink {
                    id: 6,
                    from: 305,
                    to: 300,
                    value: 10.0,
                });
                (nodes, links)
            }
            Self::ZeroFlows => {
                let (mut nodes, mut links) = sankey_fixture();
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
                (nodes, links)
            }
            Self::Overflow => {
                let (nodes, mut links) = sankey_fixture();
                for link in &mut links {
                    link.value = 1e308;
                }
                (nodes, links)
            }
            Self::Capacity => {
                let nodes = (0..120)
                    .map(|index| GraphNode {
                        id: 1000 + index,
                        parent_id: None,
                        label: format!("Stage {} / {:02}", index / 40 + 1, index % 40 + 1),
                        weight: 1.0,
                    })
                    .collect();
                let links = (0..80)
                    .map(|index| FlowLink {
                        id: 1 + index,
                        from: 1000 + index,
                        to: 1040 + index,
                        value: 100.0,
                    })
                    .collect();
                (nodes, links)
            }
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct WindowSize {
    pub width: u16,
    pub height: u16,
}

impl WindowSize {
    #[must_use]
    pub const fn new(width: u16, height: u16) -> Self {
        Self { width, height }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TextSelection {
    pub start: usize,
    pub end: usize,
}

impl TextSelection {
    #[must_use]
    pub const fn new(start: usize, end: usize) -> Self {
        Self { start, end }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ShellFixture {
    pub default_window: WindowSize,
    pub compact_window: WindowSize,
    pub route_count: usize,
}

impl ShellFixture {
    pub const DEFAULT: Self = Self {
        default_window: WindowSize::new(1240, 800),
        compact_window: WindowSize::new(840, 600),
        route_count: 1 + ComponentId::ALL.len(),
    };

    #[must_use]
    pub fn route_slug(self, index: usize) -> Option<&'static str> {
        if index == 0 {
            Some("shell")
        } else {
            ComponentId::ALL.get(index - 1).map(|id| id.as_str())
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ComponentFixture {
    pub id: ComponentId,
    pub surface_route: &'static str,
}

impl ComponentFixture {
    #[must_use]
    pub const fn new(id: ComponentId) -> Self {
        Self {
            id,
            surface_route: id.as_str(),
        }
    }

    #[must_use]
    pub const fn slug(self) -> &'static str {
        self.id.as_str()
    }

    #[must_use]
    pub const fn title(self) -> &'static str {
        self.id.spec().name
    }

    #[must_use]
    pub const fn surface_key(self) -> &'static str {
        self.surface_route
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ButtonFixture {
    pub primary_label: &'static str,
    pub secondary_label: &'static str,
    pub states: [&'static str; 5],
}

impl ButtonFixture {
    pub const DEFAULT: Self = Self {
        primary_label: "Primary",
        secondary_label: "Secondary",
        states: ["default", "hover", "active", "focus", "disabled"],
    };
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TextInputFixture {
    pub placeholder: &'static str,
    pub sample_text: &'static str,
    pub sample_preedit: &'static str,
    pub selection: TextSelection,
    pub max_bytes: usize,
}

impl TextInputFixture {
    pub const DEFAULT: Self = Self {
        placeholder: "Type to exercise bounded input",
        sample_text: "Tessera keeps typed state explicit.",
        sample_preedit: "拼音 preedit",
        selection: TextSelection::new(0, 7),
        max_bytes: TEXT_INPUT_MAX_BYTES,
    };

    #[must_use]
    pub fn fits(self, candidate: &str) -> bool {
        candidate.len() <= self.max_bytes
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DataGridFixture {
    pub row_count: usize,
    pub column_count: usize,
    pub visible_row_budget: usize,
    pub overscan_rows: usize,
}

impl DataGridFixture {
    pub const DEFAULT: Self = Self {
        row_count: ROW_COUNT,
        column_count: COLUMN_COUNT,
        visible_row_budget: 24,
        overscan_rows: 6,
    };

    #[must_use]
    pub const fn visible_row_limit(self) -> usize {
        self.visible_row_budget + self.overscan_rows
    }

    #[must_use]
    pub const fn headers(self) -> [&'static str; COLUMN_COUNT] {
        ["Record", "Owner", "State", "Score"]
    }

    #[must_use]
    pub fn cell(self, row: usize, column: usize) -> String {
        match column {
            0 if row < self.row_count => format!("R-{row:05}"),
            1 if row < self.row_count => format!("Team {}", row % 17),
            2 if row < self.row_count => ["Ready", "Review", "Blocked"][row % 3].to_owned(),
            3 if row < self.row_count => format!("{}", (row * 37) % 1000),
            _ => String::new(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LinePoint {
    pub x: f64,
    pub y: f64,
}

#[must_use]
pub fn fixed_line_points() -> Vec<LinePoint> {
    (0..INPUT_POINT_COUNT)
        .map(|index| {
            let x = index as f64;
            let y = 52.0 + (x * 0.018).sin() * 22.0 + (x * 0.071).cos() * 7.0;
            LinePoint { x, y }
        })
        .collect()
}

#[must_use]
pub fn sample_for_draw(points: &[LinePoint], budget: usize) -> Vec<LinePoint> {
    if points.is_empty() || budget == 0 {
        return Vec::new();
    }
    if budget == 1 {
        return vec![points[0]];
    }
    if budget == 2 {
        return vec![points[0], points[points.len() - 1]];
    }
    if budget == 3 {
        return vec![
            points[0],
            points[points.len() / 2],
            points[points.len() - 1],
        ];
    }
    if points.len() <= budget {
        return points.to_vec();
    }

    let interior_len = points.len() - 2;
    let buckets = (budget - 2) / 2;
    let mut output = Vec::with_capacity(buckets * 2 + 2);
    output.push(points[0]);

    for bucket in 0..buckets {
        let start = 1 + interior_len * bucket / buckets;
        let end = 1 + interior_len * (bucket + 1) / buckets;
        let slice = &points[start..end.max(start + 1)];
        let mut low = 0;
        let mut high = 0;
        for (index, point) in slice.iter().enumerate().skip(1) {
            if point.y < slice[low].y {
                low = index;
            }
            if point.y > slice[high].y {
                high = index;
            }
        }
        if low <= high {
            output.push(slice[low]);
            if high != low {
                output.push(slice[high]);
            }
        } else {
            output.push(slice[high]);
            output.push(slice[low]);
        }
    }

    output.push(points[points.len() - 1]);
    output
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct LineChartFixture {
    pub input_point_count: usize,
    pub draw_point_budget: usize,
}

impl LineChartFixture {
    pub const DEFAULT: Self = Self {
        input_point_count: INPUT_POINT_COUNT,
        draw_point_budget: DRAW_POINT_BUDGET,
    };

    #[must_use]
    pub fn input_points(self) -> Vec<LinePoint> {
        fixed_line_points()
    }

    #[must_use]
    pub fn sampled_points(self) -> Vec<LinePoint> {
        let points = self.input_points();
        sample_for_draw(&points, self.draw_point_budget)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MarkdownRejectReason {
    Oversize,
    Html,
    LiveOrScript,
    DangerousScheme,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MarkdownRejectFixture {
    pub input: &'static str,
    pub max_bytes: usize,
    pub expected_reason: MarkdownRejectReason,
}

impl MarkdownRejectFixture {
    pub const DEFAULT: Self = Self {
        input: "[unsafe](data:text/plain,blocked)",
        max_bytes: MAX_MARKDOWN_BYTES,
        expected_reason: MarkdownRejectReason::DangerousScheme,
    };
}

impl MarkdownRejectReason {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Oversize => "oversize",
            Self::Html => "html",
            Self::LiveOrScript => "live-or-script",
            Self::DangerousScheme => "dangerous-scheme",
        }
    }
}

impl fmt::Display for MarkdownRejectReason {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

fn normalize_markdown(input: &str) -> String {
    input
        .to_ascii_lowercase()
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&colon;", ":")
        .replace("&#58;", ":")
        .replace("&#x3a;", ":")
}

pub fn validate_markdown(input: &str) -> Result<(), MarkdownRejectReason> {
    if input.len() > MAX_MARKDOWN_BYTES {
        return Err(MarkdownRejectReason::Oversize);
    }

    let normalized = normalize_markdown(input);
    if normalized.contains('<') || normalized.contains('>') {
        return Err(MarkdownRejectReason::Html);
    }
    if normalized.contains("live_design!")
        || normalized.contains("script_mod!")
        || normalized.contains("live {")
        || normalized.contains("script {")
    {
        return Err(MarkdownRejectReason::LiveOrScript);
    }
    if ["data:", "vbscript:", "file:", "shell:"]
        .iter()
        .any(|scheme| normalized.contains(scheme))
    {
        return Err(MarkdownRejectReason::DangerousScheme);
    }

    Ok(())
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CubicBezier {
    pub start: Point,
    pub control_a: Point,
    pub control_b: Point,
    pub end: Point,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

impl CubicBezier {
    #[must_use]
    pub fn point_at(self, t: f64) -> Point {
        let t = t.clamp(0.0, 1.0);
        let inverse = 1.0 - t;
        let weights = [
            inverse * inverse * inverse,
            3.0 * inverse * inverse * t,
            3.0 * inverse * t * t,
            t * t * t,
        ];
        Point {
            x: weights[0] * self.start.x
                + weights[1] * self.control_a.x
                + weights[2] * self.control_b.x
                + weights[3] * self.end.x,
            y: weights[0] * self.start.y
                + weights[1] * self.control_a.y
                + weights[2] * self.control_b.y
                + weights[3] * self.end.y,
        }
    }

    #[must_use]
    pub fn sample(self, requested_segments: usize) -> Vec<Point> {
        let segments = requested_segments.clamp(1, MAX_CURVE_SEGMENTS);
        (0..=segments)
            .map(|index| self.point_at(index as f64 / segments as f64))
            .collect()
    }
}

#[must_use]
pub const fn fixture_curve() -> CubicBezier {
    CubicBezier {
        start: Point { x: 0.08, y: 0.74 },
        control_a: Point { x: 0.34, y: 0.10 },
        control_b: Point { x: 0.66, y: 0.92 },
        end: Point { x: 0.92, y: 0.30 },
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MermaidCubicPathFixture {
    pub max_segments: usize,
    pub curve: CubicBezier,
}

impl MermaidCubicPathFixture {
    pub const DEFAULT: Self = Self {
        max_segments: MAX_CURVE_SEGMENTS,
        curve: fixture_curve(),
    };

    #[must_use]
    pub fn sampled_points(self) -> Vec<Point> {
        self.curve.sample(self.max_segments)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ModalFixture {
    pub title: &'static str,
    pub close_label: &'static str,
}

impl ModalFixture {
    pub const DEFAULT: Self = Self {
        title: "Modal",
        close_label: "Close",
    };
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum FixtureSpec {
    Shell(ShellFixture),
    Component(ComponentFixture),
    Button(ButtonFixture),
    TextInput(TextInputFixture),
    DataGrid(DataGridFixture),
    LineChart(LineChartFixture),
    MarkdownReject(MarkdownRejectFixture),
    MermaidCubicPath(MermaidCubicPathFixture),
    Modal(ModalFixture),
}

impl FixtureSpec {
    #[must_use]
    pub const fn shell() -> Self {
        Self::Shell(ShellFixture::DEFAULT)
    }

    #[must_use]
    pub const fn component(id: ComponentId) -> Self {
        Self::Component(ComponentFixture::new(id))
    }

    #[must_use]
    pub const fn button() -> Self {
        Self::Button(ButtonFixture::DEFAULT)
    }

    #[must_use]
    pub const fn text_input() -> Self {
        Self::TextInput(TextInputFixture::DEFAULT)
    }

    #[must_use]
    pub const fn data_grid() -> Self {
        Self::DataGrid(DataGridFixture::DEFAULT)
    }

    #[must_use]
    pub const fn line_chart() -> Self {
        Self::LineChart(LineChartFixture::DEFAULT)
    }

    #[must_use]
    pub const fn markdown_reject() -> Self {
        Self::MarkdownReject(MarkdownRejectFixture::DEFAULT)
    }

    #[must_use]
    pub const fn mermaid_cubic_path() -> Self {
        Self::MermaidCubicPath(MermaidCubicPathFixture::DEFAULT)
    }

    #[must_use]
    pub const fn modal() -> Self {
        Self::Modal(ModalFixture::DEFAULT)
    }

    #[must_use]
    pub const fn label(self) -> &'static str {
        match self {
            Self::Shell(_) => "Shell",
            Self::Component(fixture) => fixture.title(),
            Self::Button(_) => "Button",
            Self::TextInput(_) => "TextInput",
            Self::DataGrid(_) => "DataGrid",
            Self::LineChart(_) => "LineChart",
            Self::MarkdownReject(_) => "MarkdownReject",
            Self::MermaidCubicPath(_) => "MermaidCubicPath",
            Self::Modal(_) => "Modal",
        }
    }
}

impl fmt::Display for FixtureSpec {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.label())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shell_fixture_lists_the_frozen_route_slugs() {
        let fixture = ShellFixture::DEFAULT;
        assert_eq!(fixture.route_count, 102);
        assert_eq!(fixture.route_slug(0), Some("shell"));
        assert_eq!(fixture.route_slug(1), Some("button"));
        assert_eq!(
            fixture.route_slug(fixture.route_count - 1),
            Some("word-cloud")
        );
        assert_eq!(fixture.route_slug(fixture.route_count), None);
    }

    #[test]
    fn component_fixture_keeps_a_unique_catalog_identity() {
        let fixture = ComponentFixture::new(ComponentId::MermaidSvgViewer);
        assert_eq!(fixture.slug(), "mermaid-svg-viewer");
        assert_eq!(fixture.title(), "MermaidSvgViewer");
    }

    #[test]
    fn text_input_capacity_is_hard_bounded() {
        let fixture = TextInputFixture::DEFAULT;
        assert!(fixture.fits(&"x".repeat(fixture.max_bytes)));
        assert!(!fixture.fits(&"x".repeat(fixture.max_bytes + 1)));
    }

    #[test]
    fn data_grid_fixture_is_procedural_and_bounded() {
        let fixture = DataGridFixture::DEFAULT;
        assert_eq!(fixture.headers(), ["Record", "Owner", "State", "Score"]);
        assert_eq!(fixture.cell(0, 0), "R-00000");
        assert_eq!(fixture.cell(ROW_COUNT - 1, 3), "963");
        assert!(fixture.cell(ROW_COUNT, COLUMN_COUNT).is_empty());
        assert_eq!(fixture.visible_row_limit(), 30);
    }

    #[test]
    fn line_chart_sampling_is_bounded_and_preserves_endpoints() {
        let fixture = LineChartFixture::DEFAULT;
        let points = fixture.sampled_points();
        assert_eq!(fixture.input_point_count, INPUT_POINT_COUNT);
        assert!(points.len() <= DRAW_POINT_BUDGET);
        assert_eq!(points.first().map(|point| point.x), Some(0.0));
        assert_eq!(points.last().map(|point| point.x), Some(9_999.0));
    }

    #[test]
    fn markdown_policy_rejects_html_live_script_and_encoded_scheme() {
        assert_eq!(
            validate_markdown("<img src=x>"),
            Err(MarkdownRejectReason::Html)
        );
        assert_eq!(
            validate_markdown("script_mod! { user_payload }"),
            Err(MarkdownRejectReason::LiveOrScript)
        );
        assert_eq!(
            validate_markdown("[x](data&colon;text/plain,blocked)"),
            Err(MarkdownRejectReason::DangerousScheme)
        );
        assert_eq!(
            validate_markdown("&lt;img src=x&gt;"),
            Err(MarkdownRejectReason::Html)
        );
    }

    #[test]
    fn mermaid_sampling_is_bounded_even_for_untrusted_segment_counts() {
        let fixture = MermaidCubicPathFixture::DEFAULT;
        let points = fixture.curve.sample(usize::MAX);
        assert_eq!(points.len(), MAX_CURVE_SEGMENTS + 1);
        assert_eq!(points.first(), Some(&fixture.curve.start));
        assert_eq!(points.last(), Some(&fixture.curve.end));
    }

    #[test]
    fn bounded_sampling_handles_small_budgets_fail_closed() {
        let points = fixed_line_points();
        assert_eq!(sample_for_draw(&points, 0).len(), 0);
        assert_eq!(sample_for_draw(&points, 1).len(), 1);
        assert_eq!(sample_for_draw(&points, 2).len(), 2);
        assert_eq!(sample_for_draw(&points, 3).len(), 3);
    }
}
