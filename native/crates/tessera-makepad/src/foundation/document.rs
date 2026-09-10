//! Bounded, non-executing document data shared by native document surfaces.

use mermaid_rs_renderer::{DiagramKind, NodeShape};
use pulldown_cmark::{CodeBlockKind, Event, Options, Parser, Tag, TagEnd};
use std::sync::{Arc, Condvar, Mutex};
use unicode_width::UnicodeWidthChar;

pub const MAX_DRAFT_BYTES: usize = 80_000;
pub const MAX_PREVIEW_BYTES: usize = 16_384;
pub const MAX_DIAGRAM_BYTES: usize = 12_000;
const MAX_OPS: usize = 2_048;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DocumentError(pub &'static str);

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TextStyle {
    Bold,
    Italic,
    Strike,
    Code,
}

#[derive(Clone, Debug)]
pub enum DocumentOp {
    Text(String),
    Start(TextStyle),
    End(TextStyle),
    Heading(u8),
    HeadingEnd,
    Paragraph,
    Break,
    Rule,
    CodeStart,
    CodeEnd,
    QuoteStart,
    QuoteEnd,
    Item(String),
    ItemEnd,
    Table(usize),
    TableEnd,
    Row(bool),
    RowEnd,
    Cell,
    CellEnd,
    Diagram(Result<Arc<Diagram>, DocumentError>),
}

#[derive(Clone, Debug, Default)]
pub struct Document {
    pub ops: Vec<DocumentOp>,
    pub omitted_html: usize,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DiagramShape {
    Box,
    Round,
    Diamond,
    Circle,
    DoubleCircle,
}

#[derive(Clone, Debug)]
pub struct DiagramNode {
    pub label: String,
    pub rect: [f64; 4],
    pub shape: DiagramShape,
}

#[derive(Clone, Debug)]
pub struct DiagramEdge {
    pub points: Vec<[f64; 2]>,
    pub label: String,
    pub label_anchor: Option<[f64; 2]>,
    pub arrow_start: bool,
    pub arrow_end: bool,
}

#[derive(Clone, Debug)]
pub struct Diagram {
    pub nodes: Vec<DiagramNode>,
    pub edges: Vec<DiagramEdge>,
    pub size: [f64; 2],
    pub description: String,
}

pub fn parse_document(source: &str) -> Result<Document, DocumentError> {
    if source.len() > MAX_PREVIEW_BYTES {
        return Err(DocumentError("Preview exceeds 16 KiB; draft retained"));
    }
    let mut document = Document::default();
    let mut lists: Vec<Option<u64>> = Vec::new();
    let mut diagram_source = None::<String>;
    let mut diagram_count = 0;
    let mut depth = 0usize;
    for (index, event) in Parser::new_ext(
        source,
        Options::ENABLE_TABLES | Options::ENABLE_STRIKETHROUGH | Options::ENABLE_TASKLISTS,
    )
    .enumerate()
    {
        if index >= MAX_OPS {
            return Err(DocumentError("Document exceeds preview complexity limit"));
        }
        if matches!(event, Event::Start(_)) {
            depth += 1;
        }
        if matches!(event, Event::End(_)) {
            depth = depth.saturating_sub(1);
        }
        if depth > 32 {
            return Err(DocumentError("Document nesting exceeds 32 levels"));
        }
        if let Some(code) = &mut diagram_source {
            match event {
                Event::Text(text) => code.push_str(&text),
                Event::End(TagEnd::CodeBlock) => {
                    let code = diagram_source.take().unwrap();
                    document
                        .ops
                        .push(DocumentOp::Diagram(parse_diagram(&code).map(Arc::new)));
                }
                _ => {}
            }
            continue;
        }
        let op = match event {
            Event::Text(text) | Event::InlineMath(text) | Event::DisplayMath(text) => {
                DocumentOp::Text(text.into_string())
            }
            Event::Code(text) => {
                document.ops.push(DocumentOp::Start(TextStyle::Code));
                document.ops.push(DocumentOp::Text(text.into_string()));
                DocumentOp::End(TextStyle::Code)
            }
            Event::Html(_) | Event::InlineHtml(_) => {
                document.omitted_html += 1;
                continue;
            }
            Event::Start(Tag::Heading { level, .. }) => DocumentOp::Heading(level as u8),
            Event::End(TagEnd::Heading(_)) => DocumentOp::HeadingEnd,
            Event::Start(Tag::Paragraph) => DocumentOp::Paragraph,
            Event::Start(Tag::Emphasis) => DocumentOp::Start(TextStyle::Italic),
            Event::End(TagEnd::Emphasis) => DocumentOp::End(TextStyle::Italic),
            Event::Start(Tag::Strong) => DocumentOp::Start(TextStyle::Bold),
            Event::End(TagEnd::Strong) => DocumentOp::End(TextStyle::Bold),
            Event::Start(Tag::Strikethrough) => DocumentOp::Start(TextStyle::Strike),
            Event::End(TagEnd::Strikethrough) => DocumentOp::End(TextStyle::Strike),
            Event::Start(Tag::CodeBlock(kind)) => {
                if matches!(&kind, CodeBlockKind::Fenced(language) if language.trim() == "mermaid")
                {
                    diagram_count += 1;
                    if diagram_count > 8 {
                        return Err(DocumentError("Document exceeds eight diagrams"));
                    }
                    diagram_source = Some(String::new());
                    continue;
                }
                DocumentOp::CodeStart
            }
            Event::End(TagEnd::CodeBlock) => DocumentOp::CodeEnd,
            Event::Start(Tag::BlockQuote(_)) => DocumentOp::QuoteStart,
            Event::End(TagEnd::BlockQuote(_)) => DocumentOp::QuoteEnd,
            Event::Start(Tag::List(first)) => {
                lists.push(first);
                continue;
            }
            Event::End(TagEnd::List(_)) => {
                lists.pop();
                continue;
            }
            Event::Start(Tag::Item) => DocumentOp::Item(match lists.last_mut() {
                Some(Some(number)) => {
                    let marker = format!("{number}.");
                    *number = number.saturating_add(1);
                    marker
                }
                _ => String::from("-"),
            }),
            Event::End(TagEnd::Item) => DocumentOp::ItemEnd,
            Event::Start(Tag::Table(columns)) => {
                if columns.len() > 8 {
                    return Err(DocumentError("Table exceeds eight preview columns"));
                }
                DocumentOp::Table(columns.len())
            }
            Event::End(TagEnd::Table) => DocumentOp::TableEnd,
            Event::Start(Tag::TableHead) => DocumentOp::Row(true),
            Event::Start(Tag::TableRow) => DocumentOp::Row(false),
            Event::End(TagEnd::TableHead | TagEnd::TableRow) => DocumentOp::RowEnd,
            Event::Start(Tag::TableCell) => DocumentOp::Cell,
            Event::End(TagEnd::TableCell) => DocumentOp::CellEnd,
            Event::SoftBreak => DocumentOp::Text(String::from(" ")),
            Event::HardBreak => DocumentOp::Break,
            Event::Rule => DocumentOp::Rule,
            Event::TaskListMarker(checked) => {
                DocumentOp::Text(String::from(if checked { "[x] " } else { "[ ] " }))
            }
            // Link/image labels stay plain text. Destinations never cross this boundary.
            _ => continue,
        };
        document.ops.push(op);
    }
    Ok(document)
}

fn metric_label(text: &str) -> String {
    // Upstream fast metrics still consult system fonts for non-ASCII text.
    // An ASCII width proxy prevents font/cache I/O; native paint retains the original.
    text.chars()
        .map(|ch| {
            if ch.is_ascii() {
                ch.to_string()
            } else {
                "M".repeat(ch.width().unwrap_or(0))
            }
        })
        .collect()
}

pub fn parse_diagram(source: &str) -> Result<Diagram, DocumentError> {
    if source.len() > MAX_DIAGRAM_BYTES {
        return Err(DocumentError("Diagram exceeds 12,000 bytes"));
    }
    if source.split(['\n', ';']).count() > 260 {
        return Err(DocumentError("Diagram exceeds 260 statements"));
    }
    let source = source.trim();
    if source.is_empty() {
        return Err(DocumentError("Diagram is empty"));
    }
    if !matches!(
        source.split_whitespace().next(),
        Some("graph" | "flowchart")
    ) {
        return Err(DocumentError("Expected a graph or flowchart diagram"));
    }
    if source.contains("%%{") || source.contains("@{") || source.contains('`') {
        return Err(DocumentError(
            "Dynamic configuration and rich labels are disabled",
        ));
    }
    let parsed = mermaid_rs_renderer::parse_mermaid_strict(source)
        .map_err(|_| DocumentError("Invalid Mermaid syntax; source retained"))?;
    let mut graph = parsed.graph;
    if graph.kind != DiagramKind::Flowchart
        || parsed.init_config.is_some()
        || !graph.node_links.is_empty()
        || !graph.node_styles.is_empty()
        || !graph.class_defs.is_empty()
        || !graph.node_classes.is_empty()
        || !graph.edge_styles.is_empty()
        || graph.edge_style_default.is_some()
        || !graph.subgraphs.is_empty()
    {
        return Err(DocumentError(
            "Links, styles, configuration and subgraphs are not supported",
        ));
    }
    if graph.nodes.is_empty() || graph.nodes.len() > 120 || graph.edges.len() > 180 {
        return Err(DocumentError(
            "Diagram requires 1-120 nodes and at most 180 edges",
        ));
    }
    let labels: std::collections::BTreeMap<_, _> = graph
        .nodes
        .iter()
        .map(|(id, node)| (id.clone(), node.label.clone()))
        .collect();
    for node in graph.nodes.values_mut() {
        safe_label(&node.label)?;
        if node.icon.is_some()
            || !matches!(
                node.shape,
                NodeShape::Rectangle
                    | NodeShape::RoundRect
                    | NodeShape::Stadium
                    | NodeShape::Diamond
                    | NodeShape::Circle
                    | NodeShape::DoubleCircle
            )
        {
            return Err(DocumentError("Unsupported node shape or icon"));
        }
        node.label = metric_label(&node.label);
    }
    let edge_labels: Vec<_> = graph
        .edges
        .iter()
        .map(|edge| edge.label.clone().unwrap_or_default())
        .collect();
    for edge in &mut graph.edges {
        if edge.style != mermaid_rs_renderer::EdgeStyle::Solid
            || edge.start_decoration.is_some()
            || edge.end_decoration.is_some()
        {
            return Err(DocumentError(
                "Only solid flowchart connectors are supported",
            ));
        }
        if let Some(label) = &mut edge.label {
            safe_label(label)?;
            *label = metric_label(label);
        }
    }
    let mut config = mermaid_rs_renderer::LayoutConfig::default();
    config.fast_text_metrics = true;
    let layout =
        mermaid_rs_renderer::compute_layout(&graph, &mermaid_rs_renderer::Theme::modern(), &config);
    if ![layout.width, layout.height]
        .iter()
        .all(|v| v.is_finite() && *v > 0.0 && *v < 100_000.0)
    {
        return Err(DocumentError("Diagram layout exceeds geometry limits"));
    }
    let nodes: Vec<_> = layout
        .nodes
        .values()
        .map(|node| DiagramNode {
            label: labels[&node.id].clone(),
            rect: [
                node.x as f64,
                node.y as f64,
                node.width as f64,
                node.height as f64,
            ],
            shape: match node.shape {
                NodeShape::Diamond => DiagramShape::Diamond,
                NodeShape::Circle => DiagramShape::Circle,
                NodeShape::DoubleCircle => DiagramShape::DoubleCircle,
                NodeShape::RoundRect | NodeShape::Stadium => DiagramShape::Round,
                _ => DiagramShape::Box,
            },
        })
        .collect();
    let mut point_count = 0;
    let edges: Vec<_> = layout
        .edges
        .iter()
        .enumerate()
        .map(|(index, edge)| {
            point_count += edge.points.len();
            DiagramEdge {
                points: edge
                    .points
                    .iter()
                    .map(|p| [p.0 as f64, p.1 as f64])
                    .collect(),
                label: edge_labels.get(index).cloned().unwrap_or_default(),
                label_anchor: edge.label_anchor.map(|p| [p.0 as f64, p.1 as f64]),
                arrow_start: edge.arrow_start,
                arrow_end: edge.arrow_end,
            }
        })
        .collect();
    if point_count > 8_192
        || nodes
            .iter()
            .any(|node| node.rect.iter().any(|v| !v.is_finite()))
        || edges
            .iter()
            .any(|edge| edge.points.iter().flatten().any(|v| !v.is_finite()))
    {
        return Err(DocumentError("Diagram exceeds path limits"));
    }
    let description = graph
        .edges
        .iter()
        .map(|edge| format!("{} -> {}", labels[&edge.from], labels[&edge.to]))
        .collect::<Vec<_>>()
        .join("; ");
    Ok(Diagram {
        nodes,
        edges,
        size: [layout.width as f64, layout.height as f64],
        description,
    })
}

fn safe_label(label: &str) -> Result<(), DocumentError> {
    if label.len() > 256
        || label.contains(['<', '>'])
        || label.chars().any(|c| c.is_control() && c != '\n')
    {
        Err(DocumentError("Diagram labels must be bounded plain text"))
    } else {
        Ok(())
    }
}

struct Mailbox<T> {
    generation: u64,
    pending: Option<(u64, String)>,
    ready: Option<Result<T, DocumentError>>,
    closed: bool,
}

/// One in-flight parse, one replaceable pending draft, one result. No frame polling.
pub struct PreviewTask<T> {
    shared: Arc<(Mutex<Mailbox<T>>, Condvar)>,
}

impl<T: Send + 'static> PreviewTask<T> {
    pub fn new(parse: fn(&str) -> Result<T, DocumentError>) -> Result<Self, DocumentError> {
        let shared = Arc::new((
            Mutex::new(Mailbox {
                generation: 0,
                pending: None,
                ready: None,
                closed: false,
            }),
            Condvar::new(),
        ));
        let worker = shared.clone();
        std::thread::Builder::new()
            .name(String::from("tessera-document"))
            .spawn(move || {
                loop {
                    let (lock, wake) = &*worker;
                    let mut mailbox = lock.lock().unwrap_or_else(|e| e.into_inner());
                    while mailbox.pending.is_none() && !mailbox.closed {
                        mailbox = wake.wait(mailbox).unwrap_or_else(|e| e.into_inner());
                    }
                    if mailbox.closed {
                        break;
                    }
                    let (generation, source) = mailbox.pending.take().unwrap();
                    drop(mailbox);
                    let result = parse(&source);
                    let mut mailbox = lock.lock().unwrap_or_else(|e| e.into_inner());
                    if !mailbox.closed && mailbox.generation == generation {
                        mailbox.ready = Some(result);
                        crate::makepad_widgets::SignalToUI::set_ui_signal();
                    }
                }
            })
            .map_err(|_| DocumentError("Preview worker unavailable; draft retained"))?;
        Ok(Self { shared })
    }

    pub fn submit(&self, source: &str) {
        let mut mailbox = self.shared.0.lock().unwrap_or_else(|e| e.into_inner());
        mailbox.generation = mailbox.generation.wrapping_add(1);
        mailbox.ready = None;
        mailbox.pending = Some((mailbox.generation, source.to_owned()));
        self.shared.1.notify_one();
    }

    pub fn cancel(&self) {
        let mut mailbox = self.shared.0.lock().unwrap_or_else(|e| e.into_inner());
        mailbox.generation = mailbox.generation.wrapping_add(1);
        mailbox.pending = None;
        mailbox.ready = None;
    }

    pub fn take_ready(&self) -> Option<Result<T, DocumentError>> {
        self.shared
            .0
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .ready
            .take()
    }
}

impl<T> Drop for PreviewTask<T> {
    fn drop(&mut self) {
        let mut mailbox = self.shared.0.lock().unwrap_or_else(|e| e.into_inner());
        mailbox.closed = true;
        mailbox.pending = None;
        mailbox.ready = None;
        self.shared.1.notify_one();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn safe_markdown_drops_html_and_resource_destinations() {
        let doc = parse_document("# Title\n\n**bold** and [link](javascript:alert)\n\n![alt](file:///secret)\n\n<script>bad</script>").unwrap();
        let debug = format!("{:?}", doc.ops);
        assert!(debug.contains("Title") && debug.contains("Bold") && debug.contains("alt"));
        assert!(
            !debug.contains("javascript") && !debug.contains("secret") && !debug.contains("script")
        );
        assert!(doc.omitted_html > 0);
    }
    #[test]
    fn diagrams_are_native_bounded_data_not_svg() {
        let diagram =
            parse_diagram("flowchart LR\nA[Start] --> B{Ready}\nB -->|yes| C[Done]").unwrap();
        assert_eq!(diagram.nodes.len(), 3);
        assert_eq!(diagram.edges.len(), 2);
        assert!(
            diagram
                .nodes
                .iter()
                .any(|node| node.shape == DiagramShape::Diamond)
        );
        assert!(diagram.size.iter().all(|v| *v > 0.0));
        assert!(parse_diagram("graph LR\nA-->B\nclick A \"file:///secret\"").is_err());
        assert!(parse_diagram("graph LR\nA[<img src=x>]-->B").is_err());
        assert!(parse_diagram("%%{init:{}}%%\ngraph LR\nA-->B").is_err());
        assert!(parse_diagram(&"x".repeat(MAX_DIAGRAM_BYTES + 1)).is_err());
    }
    #[test]
    fn unicode_metric_proxy_is_ascii_and_retains_native_labels() {
        assert!(metric_label("\u{4e2d}\u{6587}\u{1f680}").is_ascii());
        let diagram = parse_diagram("graph LR\nA[\u{4e2d}\u{6587}]-->B[Done]").unwrap();
        assert!(
            diagram
                .nodes
                .iter()
                .any(|node| node.label == "\u{4e2d}\u{6587}")
        );
    }
    #[test]
    fn document_and_embedded_diagram_limits_are_recoverable() {
        assert!(parse_document(&"x".repeat(MAX_PREVIEW_BYTES + 1)).is_err());
        let doc = parse_document("```mermaid\ngraph LR\nA-->B\n```\n\nKept").unwrap();
        assert!(matches!(&doc.ops[0], DocumentOp::Diagram(Ok(_))));
        assert!(matches!(doc.ops.last(), Some(DocumentOp::Text(s)) if s == "Kept"));
    }
    #[test]
    fn preview_mailbox_discards_stale_results_and_cancelled_requests() {
        fn parse(source: &str) -> Result<String, DocumentError> {
            std::thread::sleep(std::time::Duration::from_millis(10));
            Ok(source.to_owned())
        }
        let task = PreviewTask::new(parse).unwrap();
        task.submit("old");
        task.submit("latest");
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(2);
        loop {
            if let Some(result) = task.take_ready() {
                assert_eq!(result.unwrap(), "latest");
                break;
            }
            assert!(std::time::Instant::now() < deadline);
            std::thread::sleep(std::time::Duration::from_millis(2));
        }
        task.submit("cancelled");
        task.cancel();
        std::thread::sleep(std::time::Duration::from_millis(30));
        assert!(task.take_ready().is_none());
    }
}
