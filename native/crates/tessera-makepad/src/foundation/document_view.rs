//! Native paint consumers for the bounded document IR. No input is evaluated.
use super::document::{Diagram, DiagramShape, Document, DocumentOp, TextStyle as InlineStyle};
use super::focus::FocusRegion;
use super::vector::{AlignedVector, DpiStroke};
use crate::makepad_widgets::*;
use std::sync::Arc;

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    use mod.text.*
    mod.widgets.NativeDiagramBase = #(NativeDiagram::register_widget(vm))
    mod.widgets.NativeDiagram = set_type_default() do mod.widgets.NativeDiagramBase{
        width: Fill height: 220
        draw_bg +: {color: theme.color_bg_app}
        draw_vector +: {draw_depth: 1.0}
        draw_text +: {color: theme.color_text draw_depth: 2.0 text_style: theme.font_regular{font_size: 12.0}}
        ink: theme.color_text
        line: theme.color_chart_primary
        fill: theme.color_fg_app
    }
    mod.widgets.SafeDocumentViewBase = #(SafeDocumentView::register_widget(vm))
    mod.widgets.SafeDocumentView = set_type_default() do mod.widgets.SafeDocumentViewBase{
        width: Fill height: Fit flow: Flow.Right{wrap: true} padding: 10
        font_size: 13.0 font_color: theme.color_text
        selectable: false
        draw_text +: {color: theme.color_text extend_area: true}
        text_style_normal: theme.font_regular{font_size: 13.0}
        text_style_bold: theme.font_bold{font_size: 13.0}
        text_style_italic: theme.font_italic{font_size: 13.0}
        text_style_bold_italic: theme.font_bold_italic{font_size: 13.0}
        text_style_fixed: theme.font_code{font_size: 12.0}
        code_walk: Walk{width: Fill height: Fit}
        code_layout: Layout{flow: Flow.Right{wrap: true} padding: 8}
        quote_walk: Walk{width: Fill height: Fit}
        quote_layout: Layout{flow: Flow.Right{wrap: true} padding: 8}
        list_item_walk: Walk{width: Fill height: Fit}
        list_item_layout: Layout{flow: Flow.Right{wrap: true} padding: 2}
        inline_code_padding: 2
        inline_code_margin: 2
        sep_walk: Walk{width: Fill height: 4 margin: Inset{top: 4 bottom: 4}}
        table_walk: Walk{width: Fill height: Fit}
        table_layout: Layout{flow: Down}
        table_row_walk: Walk{width: Fill height: Fit}
        table_row_layout: Layout{flow: Right}
        table_cell_layout: Layout{flow: Flow.Right{wrap: true} padding: Inset{left: 6 right: 6 top: 4 bottom: 4}}
        draw_block +: {
            code_color: theme.color_bg_app
            quote_bg_color: theme.color_bg_app
            quote_fg_color: theme.color_bevel
            line_color: theme.color_text
            sep_color: theme.color_bevel
            table_header_bg_color: theme.color_bg_app
            table_border_color: theme.color_bevel
        }
        diagram := mod.widgets.NativeDiagram{}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct SafeDocumentView {
    #[deref]
    flow: TextFlow,
    #[rust]
    document: Arc<Document>,
}

impl SafeDocumentView {
    pub fn set_document(&mut self, cx: &mut Cx, document: Arc<Document>) {
        if !Arc::ptr_eq(&self.document, &document) {
            self.document = document;
            self.flow.clear_items();
            self.sync_children(cx);
            self.flow.redraw(cx);
        }
    }

    fn sync_children(&self, cx: &Cx) {
        let tree = cx.widget_tree();
        let uid = self.widget_uid();
        // TextFlow's lazy discovery updates lookup edges without necessarily
        // invalidating the dense snapshot index. Register dynamic edges explicitly.
        self.flow
            .children(&mut |id, child| tree.insert_child(uid, id, child));
        tree.refresh_from_borrowed(uid, |visit| self.flow.children(visit));
    }
}

impl Widget for SafeDocumentView {
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        self.flow.handle_event(cx, event, scope);
    }
    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        let tf = &mut self.flow;
        tf.begin(cx, walk);
        for op in &self.document.ops {
            match op {
                DocumentOp::Text(text) => tf.draw_text(cx, text),
                DocumentOp::Paragraph => tf.new_line_collapsed_with_spacing(cx, 8.0),
                DocumentOp::Break => tf.new_line_collapsed(cx),
                DocumentOp::Rule => {
                    tf.sep(cx);
                    tf.new_line_collapsed(cx);
                }
                DocumentOp::Heading(level) => {
                    tf.new_line_collapsed_with_spacing(cx, 10.0);
                    tf.push_size_abs_scale(match level {
                        1 => 1.6,
                        2 => 1.35,
                        _ => 1.1,
                    });
                    tf.bold.push();
                }
                DocumentOp::HeadingEnd => {
                    tf.bold.pop();
                    tf.font_sizes.pop();
                    tf.new_line_collapsed(cx);
                }
                DocumentOp::Start(style) => match style {
                    InlineStyle::Bold => tf.bold.push(),
                    InlineStyle::Italic => tf.italic.push(),
                    InlineStyle::Strike => tf.strikethrough.push(),
                    InlineStyle::Code => {
                        tf.fixed.push();
                        tf.inline_code.push();
                    }
                },
                DocumentOp::End(style) => match style {
                    InlineStyle::Bold => tf.bold.pop(),
                    InlineStyle::Italic => tf.italic.pop(),
                    InlineStyle::Strike => tf.strikethrough.pop(),
                    InlineStyle::Code => {
                        tf.fixed.pop();
                        tf.inline_code.pop();
                    }
                },
                DocumentOp::CodeStart => {
                    tf.new_line_collapsed(cx);
                    tf.begin_code(cx);
                    tf.fixed.push();
                    tf.combine_spaces.push(false);
                }
                DocumentOp::CodeEnd => {
                    tf.combine_spaces.pop();
                    tf.fixed.pop();
                    tf.end_code(cx);
                }
                DocumentOp::QuoteStart => tf.begin_quote(cx),
                DocumentOp::QuoteEnd => tf.end_quote(cx),
                DocumentOp::Item(marker) => {
                    tf.new_line_collapsed(cx);
                    tf.begin_list_item(cx, marker, 20.0);
                }
                DocumentOp::ItemEnd => tf.end_list_item(cx),
                DocumentOp::Table(columns) => {
                    tf.new_line_collapsed(cx);
                    tf.begin_table(cx, *columns);
                }
                DocumentOp::TableEnd => {
                    tf.end_table(cx);
                    tf.new_line_collapsed(cx);
                }
                DocumentOp::Row(header) => {
                    if *header {
                        tf.begin_table_header_row(cx);
                    } else {
                        tf.begin_table_row(cx);
                    }
                }
                DocumentOp::RowEnd => {
                    tf.end_table_row(cx);
                    tf.in_table_header = false;
                }
                DocumentOp::Cell => {
                    tf.begin_table_cell(cx, 0.0);
                    if tf.in_table_header {
                        tf.bold.push();
                    }
                }
                DocumentOp::CellEnd => {
                    if tf.in_table_header {
                        tf.bold.pop();
                    }
                    tf.end_table_cell(cx);
                }
                DocumentOp::Diagram(result) => {
                    tf.new_line_collapsed(cx);
                    match result {
                        Ok(diagram) => {
                            let entry = tf.new_counted_id();
                            tf.item_with(cx, entry, id!(diagram), |cx, item, _| {
                                if let Some(mut widget) = item.borrow_mut::<NativeDiagram>() {
                                    widget.diagram = Some(diagram.clone());
                                }
                                item.draw_all_unscoped(cx);
                            });
                        }
                        Err(error) => tf.draw_text(cx, error.0),
                    }
                    tf.new_line_collapsed(cx);
                }
            }
        }
        tf.end(cx);
        self.sync_children(cx);
        DrawStep::done()
    }
}

#[derive(Clone, Copy, Debug)]
pub struct DiagramViewport {
    pub zoom: f64,
    pub pan: DVec2,
}
impl Default for DiagramViewport {
    fn default() -> Self {
        Self {
            zoom: 1.0,
            pan: dvec2(0.0, 0.0),
        }
    }
}
impl DiagramViewport {
    pub fn zoom_by(&mut self, factor: f64) {
        if factor.is_finite() && factor > 0.0 {
            self.zoom = (self.zoom * factor).clamp(0.25, 4.0);
        }
    }
    pub fn pan_by(&mut self, offset: DVec2) {
        if offset.x.is_finite() && offset.y.is_finite() {
            self.pan.x = (self.pan.x + offset.x).clamp(-4096.0, 4096.0);
            self.pan.y = (self.pan.y + offset.y).clamp(-4096.0, 4096.0);
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct NativeDiagram {
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
    draw_vector: AlignedVector,
    #[live]
    draw_text: DrawText,
    #[live]
    ink: Vec4f,
    #[live]
    line: Vec4f,
    #[live]
    fill: Vec4f,
    #[rust]
    diagram: Option<Arc<Diagram>>,
    #[rust]
    viewport: DiagramViewport,
    #[rust]
    drag: Option<DVec2>,
    #[rust]
    focus: FocusRegion,
}
impl NativeDiagram {
    pub fn set_diagram(&mut self, cx: &mut Cx, diagram: Option<Arc<Diagram>>) {
        self.diagram = diagram;
        self.viewport = DiagramViewport::default();
        self.drag = None;
        self.draw_bg.redraw(cx);
    }
    pub fn zoom_by(&mut self, cx: &mut Cx, factor: f64) {
        self.viewport.zoom_by(factor);
        self.draw_bg.redraw(cx);
    }
    pub fn fit(&mut self, cx: &mut Cx) {
        self.viewport = DiagramViewport::default();
        self.draw_bg.redraw(cx);
    }

    fn label(&mut self, cx: &mut Cx2d, rect: Rect, text: &str, scale: f64) {
        self.draw_text.color = self.ink;
        self.draw_text.text_style.font_size = (12.0 * scale) as f32;
        let text_height = self
            .draw_text
            .layout(
                cx,
                0.0,
                0.0,
                Some(rect.size.x as f32),
                true,
                Align::default(),
                text,
            )
            .size_in_lpxs
            .height as f64;
        cx.begin_turtle(
            Walk {
                abs_pos: Some(rect.pos + dvec2(0.0, ((rect.size.y - text_height) * 0.5).max(0.0))),
                width: Size::Fixed(rect.size.x),
                height: Size::Fixed(rect.size.y),
                ..Walk::default()
            },
            Layout {
                clip_x: true,
                clip_y: true,
                flow: Flow::right_wrap(),
                align: Align { x: 0.5, y: 0.0 },
                ..Layout::default()
            },
        );
        self.draw_text.draw_walk(
            cx,
            Walk {
                width: Size::fill(),
                height: Size::fit(),
                ..Walk::default()
            },
            Align { x: 0.5, y: 0.5 },
            text,
        );
        cx.end_turtle();
    }
}
impl Widget for NativeDiagram {
    fn is_interactive(&self) -> bool {
        self.diagram.is_some()
    }
    fn text(&self) -> String {
        self.diagram
            .as_ref()
            .map_or_else(String::new, |d| d.description.clone())
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, _scope: &mut Scope) {
        if self.diagram.is_none() {
            return;
        }
        let mut changed = false;
        match event.hits(cx, self.draw_bg.area()) {
            Hit::FingerDown(fe) if fe.is_primary_hit() => {
                cx.set_key_focus(self.draw_bg.area());
                self.drag = Some(fe.abs);
            }
            Hit::FingerMove(fe) => {
                if let Some(previous) = self.drag {
                    self.viewport.pan_by(fe.abs - previous);
                    self.drag = Some(fe.abs);
                    changed = true;
                }
            }
            Hit::FingerUp(_) => self.drag = None,
            Hit::KeyDown(key) => {
                changed = true;
                match key.key_code {
                    KeyCode::ArrowLeft => self.viewport.pan_by(dvec2(-24.0, 0.0)),
                    KeyCode::ArrowRight => self.viewport.pan_by(dvec2(24.0, 0.0)),
                    KeyCode::ArrowUp => self.viewport.pan_by(dvec2(0.0, -24.0)),
                    KeyCode::ArrowDown => self.viewport.pan_by(dvec2(0.0, 24.0)),
                    KeyCode::Equals => self.viewport.zoom_by(1.25),
                    KeyCode::Minus => self.viewport.zoom_by(0.8),
                    KeyCode::Key0 | KeyCode::Home => self.viewport = DiagramViewport::default(),
                    _ => changed = false,
                }
            }
            _ => {}
        }
        if changed {
            self.draw_bg.redraw(cx);
        }
    }
    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        let rect = self.draw_bg.draw_walk(cx, walk);
        let Some(diagram) = self.diagram.clone() else {
            self.focus.clear();
            return DrawStep::done();
        };
        cx.begin_turtle(
            Walk {
                abs_pos: Some(rect.pos),
                width: Size::Fixed(rect.size.x),
                height: Size::Fixed(rect.size.y),
                ..Walk::default()
            },
            Layout {
                clip_x: true,
                clip_y: true,
                ..Layout::default()
            },
        );
        let fit = ((rect.size.x - 24.0).max(1.0) / diagram.size[0])
            .min((rect.size.y - 24.0).max(1.0) / diagram.size[1]);
        let scale = fit.min(1.5) * self.viewport.zoom;
        let origin = rect.pos
            + (rect.size - dvec2(diagram.size[0], diagram.size[1]) * scale) * 0.5
            + self.viewport.pan;
        let point = |p: [f64; 2]| origin + dvec2(p[0], p[1]) * scale;
        self.draw_vector.begin();
        self.draw_vector
            .set_color(self.line.x, self.line.y, self.line.z, self.line.w);
        for edge in &diagram.edges {
            self.draw_vector.clear();
            for (index, p) in edge.points.iter().enumerate() {
                let p = point(*p);
                if index == 0 {
                    self.draw_vector.move_to(p.x as f32, p.y as f32);
                } else {
                    self.draw_vector.line_to(p.x as f32, p.y as f32);
                }
            }
            self.draw_vector.stroke_dip(cx, 1.5);
            for start in [true, false] {
                if (start && !edge.arrow_start)
                    || (!start && !edge.arrow_end)
                    || edge.points.len() < 2
                {
                    continue;
                }
                let n = edge.points.len();
                let tip = point(edge.points[if start { 0 } else { n - 1 }]);
                let from = point(edge.points[if start { 1 } else { n - 2 }]);
                let delta = tip - from;
                let length = delta.length().max(0.001);
                let direction = delta / length;
                let side = dvec2(-direction.y, direction.x) * 3.5;
                let base = tip - direction * 7.0;
                self.draw_vector.clear();
                self.draw_vector.move_to(tip.x as f32, tip.y as f32);
                self.draw_vector
                    .line_to((base + side).x as f32, (base + side).y as f32);
                self.draw_vector
                    .line_to((base - side).x as f32, (base - side).y as f32);
                self.draw_vector.close();
                self.draw_vector.fill();
            }
        }
        for node in &diagram.nodes {
            let p = point([node.rect[0], node.rect[1]]);
            let w = (node.rect[2] * scale) as f32;
            let h = (node.rect[3] * scale) as f32;
            self.draw_vector.clear();
            let x = p.x as f32;
            let y = p.y as f32;
            for fill in [true, false] {
                self.draw_vector.clear();
                match node.shape {
                    DiagramShape::Box => self.draw_vector.rect(x, y, w, h),
                    DiagramShape::Round => {
                        self.draw_vector
                            .rounded_rect(x, y, w, h, 6.0_f32.min(h * 0.5))
                    }
                    DiagramShape::Circle | DiagramShape::DoubleCircle => {
                        self.draw_vector
                            .circle(x + w * 0.5, y + h * 0.5, w.min(h) * 0.5)
                    }
                    DiagramShape::Diamond => {
                        self.draw_vector.move_to(x + w * 0.5, y);
                        self.draw_vector.line_to(x + w, y + h * 0.5);
                        self.draw_vector.line_to(x + w * 0.5, y + h);
                        self.draw_vector.line_to(x, y + h * 0.5);
                        self.draw_vector.close();
                    }
                }
                if fill {
                    self.draw_vector
                        .set_color(self.fill.x, self.fill.y, self.fill.z, self.fill.w);
                    self.draw_vector.fill();
                } else {
                    self.draw_vector
                        .set_color(self.line.x, self.line.y, self.line.z, self.line.w);
                    self.draw_vector.stroke_dip(cx, 1.5);
                }
            }
            if node.shape == DiagramShape::DoubleCircle {
                self.draw_vector.clear();
                self.draw_vector
                    .circle(x + w * 0.5, y + h * 0.5, (w.min(h) * 0.5 - 4.0).max(0.5));
                self.draw_vector.stroke_dip(cx, 1.5);
            }
        }
        self.draw_vector.end(cx);
        self.draw_text.new_draw_call(cx);
        for node in &diagram.nodes {
            let inset = if node.shape == DiagramShape::Diamond {
                0.18
            } else {
                0.1
            };
            self.label(
                cx,
                Rect {
                    pos: point([
                        node.rect[0] + node.rect[2] * inset,
                        node.rect[1] + node.rect[3] * inset,
                    ]),
                    size: dvec2(node.rect[2], node.rect[3]) * scale * (1.0 - 2.0 * inset),
                },
                &node.label,
                scale,
            );
        }
        for edge in &diagram.edges {
            if let Some(anchor) = edge.label_anchor.filter(|_| !edge.label.is_empty()) {
                let center = point(anchor);
                self.label(
                    cx,
                    Rect {
                        pos: center - dvec2(70.0, 12.0) * scale,
                        size: dvec2(140.0, 24.0) * scale,
                    },
                    &edge.label,
                    scale,
                );
            }
        }
        cx.end_turtle();
        self.focus
            .register(cx, self.uid, self.draw_bg.area(), NavRole::Slider, 0.0);
        DrawStep::done()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn document_children_are_typed_reused_and_removed_on_reset() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let owner = cx.with_vm(|vm| {
            crate::script_mod(vm, tessera_core::ThemeMode::Light);
            let value = script_eval!(vm, { mod.widgets.SafeDocumentView{} });
            WidgetRef::script_from_value(vm, value)
        });
        cx.widget_tree().seed_from_widget(owner.clone());
        assert_eq!(cx.widget_tree().snapshot(&cx).len(), 1);
        let mut view = owner.borrow_mut::<SafeDocumentView>().unwrap();
        let entry = view.flow.new_counted_id();
        let item = view.flow.item(&mut cx, entry, id!(diagram));
        assert!(item.borrow::<NativeDiagram>().is_some());
        assert_eq!(
            item.widget_uid(),
            view.flow.item(&mut cx, entry, id!(diagram)).widget_uid()
        );
        view.sync_children(&cx);
        assert_eq!(
            cx.widget_tree()
                .find_within(view.widget_uid(), &[entry])
                .widget_uid(),
            item.widget_uid()
        );
        drop(view);
        assert!(
            cx.widget_tree()
                .snapshot(&cx)
                .iter()
                .any(|node| node.widget_type == "NativeDiagram"),
            "dynamic children must enter snapshots after the initial tree was indexed"
        );
        let mut view = owner.borrow_mut::<SafeDocumentView>().unwrap();
        view.set_document(&mut cx, Arc::default());
        assert!(
            cx.widget_tree()
                .find_within(view.widget_uid(), &[entry])
                .is_empty()
        );
        let mut children = Vec::new();
        view.children(&mut |id, _| children.push(id));
        assert!(children.is_empty());
    }

    #[test]
    fn viewport_rejects_nonfinite_changes_and_bounds_zoom() {
        let mut view = DiagramViewport::default();
        view.zoom_by(f64::NAN);
        view.pan_by(dvec2(f64::INFINITY, 0.0));
        assert_eq!(view.zoom, 1.0);
        assert_eq!(view.pan, dvec2(0.0, 0.0));
        view.zoom_by(100.0);
        assert_eq!(view.zoom, 4.0);
        view.zoom_by(0.001);
        assert_eq!(view.zoom, 0.25);
    }
}
