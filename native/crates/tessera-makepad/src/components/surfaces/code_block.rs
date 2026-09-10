use crate::foundation::focus::FocusRegion;
use crate::foundation::input::ButtonActivationExt;
use crate::makepad_widgets::scroll_bars::ScrollBars;
use crate::makepad_widgets::*;
use std::sync::Arc;
use tessera_core::catalog::ComponentId;

const MAX_SOURCE_BYTES: usize = 80_000;
const SOURCE_LIMIT_ERROR: &str = "Source exceeds 80,000 bytes; previous source retained";

pub struct CodeBlockSurfaceCatalog;
impl CodeBlockSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::CodeBlock => Some("TesseraCodeBlock"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CodeBlockFixture {
    pub title: &'static str,
    pub language: &'static str,
    pub code: &'static str,
}
impl CodeBlockFixture {
    pub const DEFAULT: Self = Self {
        title: "Release gate script",
        language: "rust",
        code: "fn main() {\n    println!(\"blocked until verified\");\n}",
    };
}
impl Default for CodeBlockFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct CodeBlockState {
    pub wrapped: bool,
    pub copy_denied: bool,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CodeBlockEvent {
    Copy,
    ToggleWrap,
    Reset,
}
impl CodeBlockState {
    pub fn reduce(&mut self, event: CodeBlockEvent) {
        match event {
            CodeBlockEvent::Copy => self.copy_denied = true,
            CodeBlockEvent::ToggleWrap => self.wrapped = !self.wrapped,
            CodeBlockEvent::Reset => *self = Self::default(),
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum CodeBlockAction {
    CopyDenied,
    WrapChanged {
        wrapped: bool,
    },
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    use mod.text.*
    mod.widgets.CodeTextViewportBase = #(CodeTextViewport::register_widget(vm))
    mod.widgets.CodeTextViewport = set_type_default() do mod.widgets.CodeTextViewportBase{
        width: Fill height: 180 flow: Down
        padding: Inset{left: 8 right: 16 top: 8 bottom: 16}
        clip_x: true clip_y: true
        draw_bg +: {color: theme.color_bg_app}
        draw_text +: {color: theme.color_text text_style: theme.font_code{font_size: 12.0}}
        scroll_bars: ScrollBars{}
    }
    mod.widgets.TesseraCodeBlockBase = #(TesseraCodeBlock::register_widget(vm))
    mod.widgets.TesseraCodeBlock = set_type_default() do mod.widgets.TesseraCodeBlockBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        code_block_title := Label{width: Fill height: Fit text: "Release gate script" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        code_block_language := Label{width: Fill height: Fit text: "rust" draw_text.color: theme.color_text_meta}
        code_block_source := mod.widgets.CodeTextViewport{}
        code_block_controls := View{width: Fill height: Fit flow: Flow.Right{wrap: true} spacing: 6
            code_block_copy := Button{width: Fit height: 30 text: "Copy"}
            code_block_wrap := Button{width: Fit height: 30 text: "Wrap"}
            code_block_long := Button{width: Fit height: 30 text: "Long sample"}
            code_block_empty := Button{width: Fit height: 30 text: "Empty"}
            code_block_limit := Button{width: Fit height: 30 text: "Over limit"}
            code_block_reset := Button{width: Fit height: 30 text: "Reset"}
        }
        code_block_status := Label{width: Fill height: Fit text: "Source is empty" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
}

// The viewport owns only plain text and native scrolling. No parser, evaluator,
// clipboard access or timer is reachable from the supplied source.
#[derive(Script, ScriptHook, Widget)]
struct CodeTextViewport {
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
    draw_text: DrawText,
    #[live]
    scroll_bars: ScrollBars,
    #[rust]
    text: Arc<str>,
    #[rust]
    wrapped: bool,
    #[rust]
    focus: FocusRegion,
}
impl CodeTextViewport {
    fn replace_source(&mut self, cx: &mut Cx, source: &str) -> Result<(), &'static str> {
        if source.len() > MAX_SOURCE_BYTES {
            return Err(SOURCE_LIMIT_ERROR);
        }
        if self.text.as_ref() != source {
            self.text = Arc::from(source);
            self.scroll_bars.set_scroll_pos(cx, dvec2(0.0, 0.0));
            self.draw_bg.redraw(cx);
        }
        Ok(())
    }

    fn set_wrapped(&mut self, cx: &mut Cx, wrapped: bool) {
        if self.wrapped != wrapped {
            self.wrapped = wrapped;
            self.scroll_bars.set_scroll_pos(cx, dvec2(0.0, 0.0));
            self.draw_bg.redraw(cx);
        }
    }
}
impl Widget for CodeTextViewport {
    fn text(&self) -> String {
        self.text.to_string()
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        self.scroll_bars.handle_event(cx, event, scope);
        match event.hits(cx, self.draw_bg.area()) {
            Hit::FingerDown(_) => cx.set_key_focus(self.draw_bg.area()),
            Hit::KeyDown(key)
                if !key.modifiers.control && !key.modifiers.logo && !key.modifiers.alt =>
            {
                let mut pos = self.scroll_bars.get_scroll_pos();
                let total = self.scroll_bars.get_scroll_view_total();
                let visible = self.scroll_bars.get_scroll_view_visible();
                match key.key_code {
                    KeyCode::ArrowLeft => pos.x -= 32.0,
                    KeyCode::ArrowRight => pos.x += 32.0,
                    KeyCode::ArrowUp => pos.y -= 24.0,
                    KeyCode::ArrowDown => pos.y += 24.0,
                    KeyCode::PageUp => pos.y -= visible.y.max(24.0),
                    KeyCode::PageDown => pos.y += visible.y.max(24.0),
                    KeyCode::Home => pos = dvec2(0.0, 0.0),
                    KeyCode::End => pos = dvec2(0.0, (total.y - visible.y).max(0.0)),
                    _ => return,
                }
                if self.scroll_bars.set_scroll_pos(cx, pos) {
                    self.draw_bg.redraw(cx);
                }
            }
            _ => {}
        }
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        self.draw_bg.begin(cx, walk, Layout::default());
        let layout = Layout {
            flow: if self.wrapped {
                Flow::right_wrap()
            } else {
                Flow::right()
            },
            ..self.layout
        };
        self.scroll_bars.begin(cx, Walk::fill(), layout);
        self.draw_text.draw_walk(
            cx,
            Walk {
                width: if self.wrapped {
                    Size::fill()
                } else {
                    Size::fit()
                },
                height: Size::fit(),
                ..Walk::default()
            },
            Align::default(),
            &self.text,
        );
        self.scroll_bars.end(cx);
        self.draw_bg.end(cx);
        self.focus
            .register(cx, self.uid, self.draw_bg.area(), NavRole::TextInput, 0.0);
        DrawStep::done()
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraCodeBlock {
    #[deref]
    view: View,
    #[rust]
    fixture: CodeBlockFixture,
    #[rust]
    state: CodeBlockState,
    #[rust]
    source_error: Option<String>,
}
impl TesseraCodeBlock {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = CodeBlockFixture::DEFAULT;
        self.state.reduce(CodeBlockEvent::Reset);
        let _ = self.set_source(cx, self.fixture.code);
        if let Some(mut source) = self
            .view
            .widget(cx, ids!(code_block_source))
            .borrow_mut::<CodeTextViewport>()
        {
            source.scroll_bars.set_scroll_pos(cx, dvec2(0.0, 0.0));
        }
    }

    pub fn set_source(&mut self, cx: &mut Cx, text: &str) -> Result<(), &'static str> {
        let result = self
            .view
            .widget(cx, ids!(code_block_source))
            .borrow_mut::<CodeTextViewport>()
            .ok_or("Code viewport is unavailable")
            .and_then(|mut source| source.replace_source(cx, text));
        self.source_error = result.err().map(str::to_owned);
        self.state.copy_denied = false;
        self.sync(cx);
        result
    }

    fn apply_event(&mut self, cx: &mut Cx, event: CodeBlockEvent) {
        self.state.reduce(event);
        self.sync(cx);
        let action = match event {
            CodeBlockEvent::Copy => CodeBlockAction::CopyDenied,
            CodeBlockEvent::ToggleWrap => CodeBlockAction::WrapChanged {
                wrapped: self.state.wrapped,
            },
            CodeBlockEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(code_block_title))
            .set_text(cx, self.fixture.title);
        self.view
            .label(cx, ids!(code_block_language))
            .set_text(cx, self.fixture.language);
        let bytes = if let Some(mut source) = self
            .view
            .widget(cx, ids!(code_block_source))
            .borrow_mut::<CodeTextViewport>()
        {
            source.set_wrapped(cx, self.state.wrapped);
            source.text.len()
        } else {
            0
        };
        self.view
            .button(cx, ids!(code_block_wrap))
            .set_text(cx, if self.state.wrapped { "Unwrap" } else { "Wrap" });
        let status = if let Some(error) = &self.source_error {
            error.clone()
        } else if self.state.copy_denied {
            "Clipboard denied: no authorized clipboard broker".to_owned()
        } else if bytes == 0 {
            "Source is empty".to_owned()
        } else {
            format!(
                "{bytes} bytes / {}",
                if self.state.wrapped {
                    "Wrapped"
                } else {
                    "Horizontal scroll"
                }
            )
        };
        self.view
            .label(cx, ids!(code_block_status))
            .set_text(cx, &status);
        self.view.redraw(cx);
    }
}
impl Widget for TesseraCodeBlock {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(code_block_copy))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, CodeBlockEvent::Copy);
        } else if self
            .view
            .button(cx, ids!(code_block_wrap))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, CodeBlockEvent::ToggleWrap);
        } else if self
            .view
            .button(cx, ids!(code_block_long))
            .activated(cx, event, &actions)
        {
            let source = (0..24)
                .map(|line| {
                    format!(
                        "// Line {line:02}\nlet endpoint_{line} = \"https://example.test/{}\";\n",
                        "segment/".repeat(32)
                    )
                })
                .collect::<String>();
            let _ = self.set_source(cx, &source);
        } else if self
            .view
            .button(cx, ids!(code_block_empty))
            .activated(cx, event, &actions)
        {
            let _ = self.set_source(cx, "");
        } else if self
            .view
            .button(cx, ids!(code_block_limit))
            .activated(cx, event, &actions)
        {
            let _ = self.set_source(cx, &"x".repeat(MAX_SOURCE_BYTES + 1));
        } else if self
            .view
            .button(cx, ids!(code_block_reset))
            .activated(cx, event, &actions)
        {
            self.reset(cx);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn code_block_routes_to_the_native_widget() {
        assert_eq!(
            CodeBlockSurfaceCatalog::widget_name(ComponentId::CodeBlock),
            Some("TesseraCodeBlock")
        );
    }

    #[test]
    fn code_block_never_reports_unperformed_copy() {
        let mut state = CodeBlockState::default();
        state.reduce(CodeBlockEvent::Copy);
        state.reduce(CodeBlockEvent::ToggleWrap);
        assert!(state.copy_denied);
        assert!(state.wrapped);
        state.reduce(CodeBlockEvent::Reset);
        assert_eq!(state, CodeBlockState::default());
    }

    #[test]
    fn native_code_source_is_plain_bounded_and_retained_on_failure() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let widget = cx.with_vm(|vm| {
            crate::script_mod(vm, tessera_core::ThemeMode::Light);
            let value = script_eval!(vm, { mod.widgets.TesseraCodeBlock{} });
            WidgetRef::script_from_value(vm, value)
        });
        cx.widget_tree().seed_from_widget(widget.clone());
        let mut owner = widget.borrow_mut::<TesseraCodeBlock>().unwrap();
        owner.reset(&mut cx);
        let viewport = owner.view.widget(&mut cx, ids!(code_block_source));
        let input =
            "<script>alert(1)</script>\n  let x = \"file:///private\";\n\u{4e2d}\u{6587} \u{1f680}";
        owner.set_source(&mut cx, input).unwrap();
        owner.apply_event(&mut cx, CodeBlockEvent::ToggleWrap);
        assert_eq!(viewport.borrow::<CodeTextViewport>().unwrap().text(), input);
        assert!(viewport.borrow::<CodeTextViewport>().unwrap().wrapped);
        let bounded = "x".repeat(MAX_SOURCE_BYTES);
        owner.set_source(&mut cx, &bounded).unwrap();
        let prior = viewport.borrow::<CodeTextViewport>().unwrap().text.clone();
        assert_eq!(
            owner.set_source(&mut cx, &"x".repeat(MAX_SOURCE_BYTES + 1)),
            Err(SOURCE_LIMIT_ERROR)
        );
        assert!(Arc::ptr_eq(
            &prior,
            &viewport.borrow::<CodeTextViewport>().unwrap().text
        ));
        owner.set_source(&mut cx, "").unwrap();
        assert!(
            viewport
                .borrow::<CodeTextViewport>()
                .unwrap()
                .text
                .is_empty()
        );
        owner.reset(&mut cx);
        assert_eq!(
            viewport.borrow::<CodeTextViewport>().unwrap().text(),
            CodeBlockFixture::DEFAULT.code
        );
        assert!(!viewport.borrow::<CodeTextViewport>().unwrap().wrapped);
    }
}
