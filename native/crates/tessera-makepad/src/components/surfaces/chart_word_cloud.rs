//! Native WordCloud widget with deterministic grid placement and ranked input.

use crate::foundation::focus::FocusRegion;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

use super::chart_common::{MAX_WORDS, WordDatum, validate_words, word_cloud_fixture};

pub struct WordCloudSurfaceCatalog;

impl WordCloudSurfaceCatalog {
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::WordCloud => Some("TesseraWordCloud"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct WordCloudConfig {
    pub max_words: usize,
    pub columns: usize,
}

impl Default for WordCloudConfig {
    fn default() -> Self {
        Self {
            max_words: MAX_WORDS,
            columns: 4,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct WordCloudState {
    pub selected_word: Option<u32>,
    pub viewport_changes: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum WordCloudEvent {
    WordSelected(Option<u32>),
    ViewportChanged,
    Reset,
}

impl WordCloudState {
    pub fn reduce(&mut self, event: WordCloudEvent) {
        match event {
            WordCloudEvent::WordSelected(word) => self.selected_word = word,
            WordCloudEvent::ViewportChanged => {
                self.viewport_changes = self.viewport_changes.saturating_add(1);
            }
            WordCloudEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum WordCloudAction {
    WordSelected {
        word: Option<u32>,
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

    mod.widgets.TesseraWordCloudBase = #(TesseraWordCloud::register_widget(vm))
    mod.widgets.TesseraWordCloud = set_type_default() do mod.widgets.TesseraWordCloudBase{
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
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraWordCloud {
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
    config: WordCloudConfig,
    #[rust]
    state: WordCloudState,
    #[rust]
    words: Vec<WordDatum>,
    #[rust]
    focus_region: FocusRegion,
}

impl TesseraWordCloud {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.config = WordCloudConfig::default();
        self.state.reduce(WordCloudEvent::Reset);
        self.words = word_cloud_fixture();
        self.draw_bg.redraw(cx);
        cx.widget_action(self.uid, WordCloudAction::Reset);
    }

    fn ensure_fixture(&mut self) {
        if self.words.is_empty() {
            self.words = word_cloud_fixture();
        }
    }

    fn emit(&mut self, cx: &mut Cx, event: WordCloudEvent) {
        self.state.reduce(event);
        let action = match event {
            WordCloudEvent::WordSelected(word) => WordCloudAction::WordSelected { word },
            WordCloudEvent::ViewportChanged => WordCloudAction::ViewportChanged {
                changes: self.state.viewport_changes,
            },
            WordCloudEvent::Reset => WordCloudAction::Reset,
        };
        cx.widget_action(self.uid, action);
        self.draw_bg.redraw(cx);
    }

    fn word_count(&self) -> usize {
        self.words.len().min(self.config.max_words).max(1)
    }

    fn selected_index(&self) -> usize {
        self.state
            .selected_word
            .and_then(|selected| self.words.iter().position(|word| word.id == selected))
            .unwrap_or(0)
    }

    fn select_index(&mut self, cx: &mut Cx, index: usize) {
        self.emit(
            cx,
            WordCloudEvent::WordSelected(
                self.words
                    .get(index.min(self.word_count() - 1))
                    .map(|word| word.id),
            ),
        );
    }

    fn draw_words(&mut self, cx: &mut Cx2d, rect: Rect) {
        self.ensure_fixture();
        let words = self.words[..self.word_count()].to_vec();
        let state = validate_words(&words);
        if !state.is_ready() {
            self.draw_text.color = super::chart_label::readable_on(self.draw_bg.color, self.danger);
            self.draw_text.text_style.font_size = 12.0;
            self.draw_text.draw_abs(
                cx,
                dvec2(rect.pos.x + 16.0, rect.pos.y + 50.0),
                state.label(),
            );
            return;
        }
        let columns = self.config.columns.max(1);
        let rows = words.len().div_ceil(columns).max(1);
        let plot = Rect {
            pos: dvec2(rect.pos.x + 22.0, rect.pos.y + 38.0),
            size: dvec2((rect.size.x - 44.0).max(1.0), (rect.size.y - 68.0).max(1.0)),
        };
        for (index, word) in words.iter().enumerate() {
            let column = index % columns;
            let row = index / columns;
            let cell_width = plot.size.x / columns as f64;
            let cell_height = plot.size.y / rows as f64;
            let x = plot.pos.x + cell_width * column as f64 + 6.0;
            let y = plot.pos.y + cell_height * row as f64;
            let color = if self.state.selected_word == Some(word.id) {
                self.selection
            } else if index % 2 == 0 {
                self.accent
            } else {
                self.accent_alt
            };
            self.draw_text.color = super::chart_label::readable_on(self.draw_bg.color, color);
            self.draw_text.text_style.font_size =
                (10.0 + word.weight.clamp(0.0, 1.0) * 12.0) as f32;
            super::chart_label::draw_label(
                &mut self.draw_text,
                cx,
                Rect {
                    pos: dvec2(x, y),
                    size: dvec2(cell_width - 12.0, cell_height),
                },
                &word.text,
                Align { x: 0.5, y: 0.5 },
            );
        }
    }
}

impl Widget for TesseraWordCloud {
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
                KeyCode::ArrowRight | KeyCode::ArrowDown | KeyCode::Space => {
                    self.select_index(cx, self.selected_index() + 1);
                }
                KeyCode::Home => self.select_index(cx, 0),
                KeyCode::End => self.select_index(cx, self.word_count() - 1),
                KeyCode::Escape => self.emit(cx, WordCloudEvent::WordSelected(None)),
                _ => {}
            },
            Hit::FingerDown(fe) if fe.is_primary_hit() => {
                let rect = self.draw_bg.area().rect(cx);
                let plot_x = rect.pos.x + 22.0;
                let plot_y = rect.pos.y + 38.0;
                let plot_width = (rect.size.x - 44.0).max(1.0);
                let plot_height = (rect.size.y - 68.0).max(1.0);
                let columns = self.config.columns.max(1);
                let rows = self.word_count().div_ceil(columns).max(1);
                let column = (((fe.abs.x - plot_x) / plot_width) * columns as f64)
                    .floor()
                    .clamp(0.0, (columns - 1) as f64) as usize;
                let row = (((fe.abs.y - plot_y) / plot_height) * rows as f64)
                    .floor()
                    .clamp(0.0, (rows - 1) as f64) as usize;
                let index = (row * columns + column).min(self.word_count() - 1);
                self.select_index(cx, index);
                cx.set_key_focus(self.draw_bg.area());
            }
            Hit::FingerScroll(_) => self.emit(cx, WordCloudEvent::ViewportChanged),
            _ => {}
        }
        self.draw_bg.redraw(cx);
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        let rect = self.draw_bg.draw_walk(cx, walk);
        self.draw_text.color = self.ink;
        self.draw_text.text_style.font_size = 12.0;
        self.draw_text
            .draw_abs(cx, dvec2(rect.pos.x + 12.0, rect.pos.y + 9.0), "Word cloud");
        self.draw_text.color = self.muted;
        self.draw_text.text_style.font_size = 9.0;
        self.draw_text.draw_abs(
            cx,
            dvec2(rect.pos.x + 12.0, rect.pos.y + rect.size.y - 14.0),
            "Arrow select  click rank  Escape clear",
        );
        self.draw_words(cx, rect);
        self.focus_region
            .register(cx, self.uid, self.draw_bg.area(), NavRole::Slider, 0.0);
        DrawStep::done()
    }
}

#[cfg(test)]
mod tests {
    use super::{WordCloudConfig, WordCloudEvent, WordCloudState, WordCloudSurfaceCatalog};
    use tessera_core::catalog::ComponentId;

    #[test]
    fn word_cloud_has_an_exact_route_and_capacity() {
        assert_eq!(
            WordCloudSurfaceCatalog::widget_name(ComponentId::WordCloud),
            Some("TesseraWordCloud")
        );
        assert!(WordCloudConfig::default().max_words > 0);
    }

    #[test]
    fn word_cloud_state_resets_without_cross_chart_state() {
        let mut state = WordCloudState::default();
        state.reduce(WordCloudEvent::WordSelected(Some(2)));
        state.reduce(WordCloudEvent::Reset);
        assert_eq!(state, WordCloudState::default());
    }
}
