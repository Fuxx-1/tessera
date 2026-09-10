//! Markdown editing keeps the user buffer as its only text source.

use crate::foundation::document::{Document, MAX_DRAFT_BYTES, PreviewTask, parse_document};
use crate::foundation::document_view::SafeDocumentView;
use crate::foundation::input::ButtonActivationExt;
use crate::makepad_widgets::*;
use std::sync::Arc;
use tessera_core::catalog::ComponentId;

pub struct MarkdownEditorSurfaceCatalog;
impl MarkdownEditorSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::MarkdownEditor => Some("TesseraMarkdownEditor"),
            _ => None,
        }
    }
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct MarkdownEditorState {
    pub source: String,
    pub live_preview: bool,
}
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MarkdownEditorEvent {
    SourceChanged(String),
    TogglePreview,
    Reset,
}
impl MarkdownEditorState {
    pub fn reduce(&mut self, event: MarkdownEditorEvent) {
        match event {
            MarkdownEditorEvent::SourceChanged(source) => self.source = source,
            MarkdownEditorEvent::TogglePreview => self.live_preview = !self.live_preview,
            MarkdownEditorEvent::Reset => *self = Self::default(),
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum MarkdownEditorAction {
    SourceChanged {
        bytes: usize,
    },
    PreviewChanged {
        live_preview: bool,
    },
    Reset,
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraMarkdownEditorBase = #(TesseraMarkdownEditor::register_widget(vm))
    mod.widgets.TesseraMarkdownEditor = set_type_default() do mod.widgets.TesseraMarkdownEditorBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        markdown_editor_title := Label{width: Fill height: Fit text: "Markdown editor" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        markdown_editor_input := TextInputFlat{width: Fill height: 96 is_multiline: true empty_text: "Write markdown here"}
        markdown_editor_controls := View{width: Fill height: 30 flow: Right spacing: 6
            markdown_editor_preview := Button{width: Fit height: 30 text: "Preview"}
            markdown_editor_sample := Button{width: Fit height: 30 text: "Load sample"}
            markdown_editor_reset := Button{width: Fit height: 30 text: "Clear"}
        }
        markdown_editor_panel := ScrollYView{width: Fill height: 210 visible: false
            markdown_editor_document := SafeDocumentView{}
        }
        markdown_editor_status := Label{width: Fill height: Fit text: "Draft is empty" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraMarkdownEditor {
    #[deref]
    view: View,
    #[rust]
    state: MarkdownEditorState,
    #[rust]
    task: Option<PreviewTask<Document>>,
    #[rust]
    status: String,
}
impl TesseraMarkdownEditor {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.state.reduce(MarkdownEditorEvent::Reset);
        if let Some(task) = &self.task {
            task.cancel();
        }
        self.view
            .text_input(cx, ids!(markdown_editor_input))
            .set_text(cx, "");
        self.status = String::from("Draft is empty");
        self.clear_preview(cx);
        self.sync(cx);
    }
    fn clear_preview(&mut self, cx: &mut Cx) {
        if let Some(mut preview) = self
            .view
            .widget(cx, ids!(markdown_editor_document))
            .borrow_mut::<SafeDocumentView>()
        {
            preview.set_document(cx, Arc::default());
        }
    }
    fn request_preview(&mut self, cx: &mut Cx) {
        self.clear_preview(cx);
        if !self.state.live_preview {
            self.status = String::from("Preview paused; draft retained");
            return;
        }
        if self.task.is_none() {
            match PreviewTask::new(parse_document) {
                Ok(task) => self.task = Some(task),
                Err(error) => {
                    self.status = error.0.to_owned();
                    return;
                }
            }
        }
        self.task.as_ref().unwrap().submit(&self.state.source);
        self.status = String::from("Updating preview");
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .view(cx, ids!(markdown_editor_panel))
            .set_visible(cx, self.state.live_preview);
        self.view
            .button(cx, ids!(markdown_editor_preview))
            .set_text(
                cx,
                if self.state.live_preview {
                    "Preview on"
                } else {
                    "Preview off"
                },
            );
        self.view
            .label(cx, ids!(markdown_editor_status))
            .set_text(cx, &self.status);
        self.view.redraw(cx);
    }
}
impl Widget for TesseraMarkdownEditor {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if let Some(result) = self.task.as_ref().and_then(PreviewTask::take_ready) {
            match result {
                Ok(document) => {
                    self.status = if document.ops.is_empty() {
                        String::from("Draft is empty")
                    } else {
                        format!(
                            "Preview ready; {} HTML fragments omitted",
                            document.omitted_html
                        )
                    };
                    if let Some(mut preview) = self
                        .view
                        .widget(cx, ids!(markdown_editor_document))
                        .borrow_mut::<SafeDocumentView>()
                    {
                        preview.set_document(cx, Arc::new(document));
                    }
                }
                Err(error) => self.status = error.0.to_owned(),
            }
            self.sync(cx);
        }
        if let Some(source) = self
            .view
            .text_input(cx, ids!(markdown_editor_input))
            .changed(&actions)
        {
            if source.len() > MAX_DRAFT_BYTES {
                self.view
                    .text_input(cx, ids!(markdown_editor_input))
                    .set_text(cx, &self.state.source);
                self.status = String::from("Draft exceeds 80,000 bytes; previous draft retained");
                self.sync(cx);
                return;
            }
            let bytes = source.len();
            self.state
                .reduce(MarkdownEditorEvent::SourceChanged(source));
            self.request_preview(cx);
            self.sync(cx);
            cx.widget_action(
                self.widget_uid(),
                MarkdownEditorAction::SourceChanged { bytes },
            );
        }
        if self
            .view
            .button(cx, ids!(markdown_editor_preview))
            .activated(cx, event, &actions)
        {
            self.state.reduce(MarkdownEditorEvent::TogglePreview);
            if let Some(task) = &self.task {
                task.cancel();
            }
            self.request_preview(cx);
            self.sync(cx);
            cx.widget_action(
                self.widget_uid(),
                MarkdownEditorAction::PreviewChanged {
                    live_preview: self.state.live_preview,
                },
            );
        }
        if self
            .view
            .button(cx, ids!(markdown_editor_sample))
            .activated(cx, event, &actions)
        {
            self.state.source = String::from(
                "# Release notes\n\nA **native** preview with *shared* layout.\n\n- Draft retained\n- Preview updated\n\n```mermaid\nflowchart LR\nA[Draft] --> B{Review}\nB --> C[Ready]\n```",
            );
            self.view
                .text_input(cx, ids!(markdown_editor_input))
                .set_text(cx, &self.state.source);
            self.request_preview(cx);
            self.sync(cx);
        }
        if self
            .view
            .button(cx, ids!(markdown_editor_reset))
            .activated(cx, event, &actions)
        {
            self.reset(cx);
            cx.widget_action(self.widget_uid(), MarkdownEditorAction::Reset);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{MarkdownEditorEvent, MarkdownEditorState, MarkdownEditorSurfaceCatalog};
    use tessera_core::catalog::ComponentId;
    #[test]
    fn editor_owns_user_text_and_reset_clears_it() {
        let mut state = MarkdownEditorState::default();
        state.reduce(MarkdownEditorEvent::SourceChanged(String::from("# user")));
        state.reduce(MarkdownEditorEvent::TogglePreview);
        assert_eq!(state.source, "# user");
        assert!(state.live_preview);
        state.reduce(MarkdownEditorEvent::Reset);
        assert!(state.source.is_empty());
    }
    #[test]
    fn route_is_exact() {
        assert_eq!(
            MarkdownEditorSurfaceCatalog::widget_name(ComponentId::MarkdownEditor),
            Some("TesseraMarkdownEditor")
        );
    }
}
