//! Owned Mermaid source, background validation, and native path rendering.
use crate::foundation::document::{Diagram, MAX_DRAFT_BYTES, PreviewTask, parse_diagram};
use crate::foundation::document_view::NativeDiagram;
use crate::foundation::input::{ButtonActivationExt, set_button_enabled};
use crate::makepad_widgets::*;
use std::sync::Arc;
use tessera_core::catalog::ComponentId;

const SAMPLE: &str = "flowchart LR\nA[Draft] --> B{Review}\nB -->|approved| C[Ready]";

pub struct MermaidSvgViewerSurfaceCatalog;
impl MermaidSvgViewerSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::MermaidSvgViewer => Some("TesseraMermaidSvgViewer"),
            _ => None,
        }
    }
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct MermaidSvgViewerState {
    pub source: String,
    pub source_valid: bool,
    pub preview_visible: bool,
    pub edits: u32,
    pub validations: u32,
}
impl MermaidSvgViewerState {
    pub fn edit(&mut self, source: String) {
        self.source = source;
        self.source_valid = false;
        self.preview_visible = false;
        self.edits = self.edits.saturating_add(1);
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum MermaidSvgViewerAction {
    Edited {
        edits: u32,
    },
    Validated {
        valid: bool,
        validations: u32,
    },
    PreviewToggled {
        visible: bool,
    },
    Blocked {
        blocks: u32,
    },
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraMermaidSvgViewerBase = #(TesseraMermaidSvgViewer::register_widget(vm))
    mod.widgets.TesseraMermaidSvgViewer = set_type_default() do mod.widgets.TesseraMermaidSvgViewerBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        mermaid_title := Label{width: Fill height: Fit text: "Mermaid diagram" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        mermaid_source := TextInputFlat{width: Fill height: 90 is_multiline: true empty_text: "flowchart LR"}
        mermaid_controls := View{width: Fill height: 30 flow: Right spacing: 6
            mermaid_validate := Button{width: Fit height: 30 text: "Render"}
            mermaid_preview := Button{width: Fit height: 30 text: "Hide"}
            mermaid_reset := Button{width: Fit height: 30 text: "Reset"}
            mermaid_zoom_out := Button{width: 30 height: 30 text: "-"}
            mermaid_zoom_in := Button{width: 30 height: 30 text: "+"}
            mermaid_fit := Button{width: Fit height: 30 text: "Fit"}
        }
        mermaid_preview_panel := View{width: Fill height: 210 visible: false
            mermaid_diagram := NativeDiagram{height: Fill}
        }
        mermaid_status := Label{width: Fill height: Fit text: "Ready to render" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
        mermaid_description := Label{width: Fill height: Fit text: "" draw_text +: {color: theme.color_text flow: Flow.Right{wrap: true}}}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraMermaidSvgViewer {
    #[deref]
    view: View,
    #[rust]
    state: MermaidSvgViewerState,
    #[rust]
    task: Option<PreviewTask<Diagram>>,
    #[rust]
    status: String,
}
impl TesseraMermaidSvgViewer {
    pub fn reset(&mut self, cx: &mut Cx) {
        if let Some(task) = &self.task {
            task.cancel();
        }
        self.state = MermaidSvgViewerState {
            source: SAMPLE.to_owned(),
            ..Default::default()
        };
        self.view
            .text_input(cx, ids!(mermaid_source))
            .set_text(cx, &self.state.source);
        self.status = String::from("Ready to render");
        self.clear_diagram(cx);
        self.sync(cx);
    }
    fn clear_diagram(&mut self, cx: &mut Cx) {
        if let Some(mut diagram) = self
            .view
            .widget(cx, ids!(mermaid_diagram))
            .borrow_mut::<NativeDiagram>()
        {
            diagram.set_diagram(cx, None);
        }
        self.view
            .label(cx, ids!(mermaid_description))
            .set_text(cx, "");
    }
    fn render(&mut self, cx: &mut Cx) {
        self.state.source_valid = false;
        self.state.preview_visible = false;
        self.clear_diagram(cx);
        if self.task.is_none() {
            match PreviewTask::new(parse_diagram) {
                Ok(task) => self.task = Some(task),
                Err(error) => {
                    self.status = error.0.to_owned();
                    self.sync(cx);
                    return;
                }
            }
        }
        self.task.as_ref().unwrap().submit(&self.state.source);
        self.status = String::from("Rendering diagram");
        self.sync(cx);
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .view(cx, ids!(mermaid_preview_panel))
            .set_visible(cx, self.state.source_valid && self.state.preview_visible);
        for name in [
            ids!(mermaid_preview),
            ids!(mermaid_zoom_in),
            ids!(mermaid_zoom_out),
            ids!(mermaid_fit),
        ] {
            set_button_enabled(&self.view.button(cx, name), cx, self.state.source_valid);
        }
        self.view.button(cx, ids!(mermaid_preview)).set_text(
            cx,
            if self.state.preview_visible {
                "Hide"
            } else {
                "Show"
            },
        );
        self.view
            .label(cx, ids!(mermaid_status))
            .set_text(cx, &self.status);
        self.view.redraw(cx);
    }
}
impl Widget for TesseraMermaidSvgViewer {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if let Some(result) = self.task.as_ref().and_then(PreviewTask::take_ready) {
            self.state.validations = self.state.validations.saturating_add(1);
            match result {
                Ok(diagram) => {
                    self.state.source_valid = true;
                    self.state.preview_visible = true;
                    self.status = format!(
                        "{} nodes / {} connections",
                        diagram.nodes.len(),
                        diagram.edges.len()
                    );
                    self.view
                        .label(cx, ids!(mermaid_description))
                        .set_text(cx, &diagram.description);
                    if let Some(mut widget) = self
                        .view
                        .widget(cx, ids!(mermaid_diagram))
                        .borrow_mut::<NativeDiagram>()
                    {
                        widget.set_diagram(cx, Some(Arc::new(diagram)));
                    }
                }
                Err(error) => {
                    self.status = error.0.to_owned();
                }
            }
            self.sync(cx);
            cx.widget_action(
                self.widget_uid(),
                MermaidSvgViewerAction::Validated {
                    valid: self.state.source_valid,
                    validations: self.state.validations,
                },
            );
        }
        if let Some(source) = self
            .view
            .text_input(cx, ids!(mermaid_source))
            .changed(&actions)
        {
            if source.len() > MAX_DRAFT_BYTES {
                self.view
                    .text_input(cx, ids!(mermaid_source))
                    .set_text(cx, &self.state.source);
                self.status = String::from("Source exceeds 80,000 bytes; previous source retained");
            } else {
                if let Some(task) = &self.task {
                    task.cancel();
                }
                self.state.edit(source);
                self.clear_diagram(cx);
                self.status = String::from("Source changed; ready to render");
                cx.widget_action(
                    self.widget_uid(),
                    MermaidSvgViewerAction::Edited {
                        edits: self.state.edits,
                    },
                );
            }
            self.sync(cx);
        }
        if self
            .view
            .button(cx, ids!(mermaid_validate))
            .activated(cx, event, &actions)
        {
            self.render(cx);
        }
        if self
            .view
            .button(cx, ids!(mermaid_reset))
            .activated(cx, event, &actions)
        {
            self.reset(cx);
        }
        if self.state.source_valid
            && self
                .view
                .button(cx, ids!(mermaid_preview))
                .activated(cx, event, &actions)
        {
            self.state.preview_visible = !self.state.preview_visible;
            self.sync(cx);
            cx.widget_action(
                self.widget_uid(),
                MermaidSvgViewerAction::PreviewToggled {
                    visible: self.state.preview_visible,
                },
            );
        }
        let zoom_in = self
            .view
            .button(cx, ids!(mermaid_zoom_in))
            .activated(cx, event, &actions);
        let zoom_out = self
            .view
            .button(cx, ids!(mermaid_zoom_out))
            .activated(cx, event, &actions);
        let fit = self
            .view
            .button(cx, ids!(mermaid_fit))
            .activated(cx, event, &actions);
        if self.state.source_valid && (zoom_in || zoom_out || fit) {
            if let Some(mut diagram) = self
                .view
                .widget(cx, ids!(mermaid_diagram))
                .borrow_mut::<NativeDiagram>()
            {
                if fit {
                    diagram.fit(cx);
                } else {
                    diagram.zoom_by(cx, if zoom_in { 1.25 } else { 0.8 });
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn edited_source_is_retained_and_invalidates_only_its_preview() {
        let mut state = MermaidSvgViewerState {
            source: SAMPLE.to_owned(),
            source_valid: true,
            preview_visible: true,
            ..Default::default()
        };
        state.edit(String::from("graph LR\nUser-->Draft"));
        assert_eq!(state.source, "graph LR\nUser-->Draft");
        assert!(!state.source_valid && !state.preview_visible);
        assert_eq!(state.edits, 1);
    }
    #[test]
    fn exact_native_route() {
        assert_eq!(
            MermaidSvgViewerSurfaceCatalog::widget_name(ComponentId::MermaidSvgViewer),
            Some("TesseraMermaidSvgViewer")
        );
    }
}
