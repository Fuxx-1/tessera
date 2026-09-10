//! Native composite inputs. `DropDown2` owns popup geometry, dismissal and
//! keyboard navigation; each widget owns only its committed domain value.

use crate::foundation::input::ButtonActivationExt;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct InputCompositeSurfaceCatalog;
impl InputCompositeSurfaceCatalog {
    #[must_use]
    pub const fn contains(id: ComponentId) -> bool {
        matches!(
            id,
            ComponentId::AutoComplete
                | ComponentId::Mentions
                | ComponentId::ColorPicker
                | ComponentId::DatePicker
                | ComponentId::TimePicker
        )
    }
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::AutoComplete => Some("TesseraAutoComplete"),
            ComponentId::Mentions => Some("TesseraMentions"),
            ComponentId::ColorPicker => Some("TesseraColorPicker"),
            ComponentId::DatePicker => Some("TesseraDatePicker"),
            ComponentId::TimePicker => Some("TesseraTimePicker"),
            _ => None,
        }
    }
}

macro_rules! selection_action {
    ($name:ident, $commit:ident) => {
        #[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
        pub enum $name {
            Opened {
                component: ComponentId,
            },
            Focused {
                component: ComponentId,
                index: usize,
            },
            $commit {
                component: ComponentId,
                index: usize,
            },
            Cancelled {
                component: ComponentId,
            },
            Reset {
                component: ComponentId,
            },
            #[default]
            None,
        }
    };
}
selection_action!(AutoCompleteAction, Committed);
selection_action!(MentionsAction, Inserted);

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum ColorPickerAction {
    Opened {
        component: ComponentId,
    },
    Focused {
        component: ComponentId,
        index: usize,
    },
    Selected {
        component: ComponentId,
        index: usize,
    },
    Committed {
        component: ComponentId,
    },
    Cancelled {
        component: ComponentId,
    },
    Reset {
        component: ComponentId,
    },
    #[default]
    None,
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum DatePickerAction {
    Opened {
        component: ComponentId,
    },
    Focused {
        component: ComponentId,
        index: usize,
    },
    Selected {
        component: ComponentId,
        index: usize,
    },
    Committed {
        component: ComponentId,
    },
    Cancelled {
        component: ComponentId,
    },
    Reset {
        component: ComponentId,
    },
    #[default]
    None,
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum TimePickerAction {
    Opened {
        component: ComponentId,
    },
    Focused {
        component: ComponentId,
        index: usize,
    },
    Selected {
        component: ComponentId,
        index: usize,
    },
    Committed {
        component: ComponentId,
    },
    Cancelled {
        component: ComponentId,
    },
    Reset {
        component: ComponentId,
    },
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*

    mod.widgets.TesseraAutoCompleteBase = #(TesseraAutoComplete::register_widget(vm))
    mod.widgets.TesseraAutoComplete = set_type_default() do mod.widgets.TesseraAutoCompleteBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        auto_complete_title := Label{width: Fill height: Fit text: "Auto-complete" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        auto_complete_input := TextInputFlat{width: Fill height: 34 empty_text: "Search a technology"}
        auto_complete_choices := DropDown2{width: Fill height: 34 labels: ["Rust" "Makepad" "Renderer"]}
        auto_complete_reset := Button{width: Fit height: 28 text: "Reset"}
        auto_complete_status := Label{width: Fill height: Fit text: "Type or choose a technology" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
    mod.widgets.TesseraMentionsBase = #(TesseraMentions::register_widget(vm))
    mod.widgets.TesseraMentions = set_type_default() do mod.widgets.TesseraMentionsBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        mentions_title := Label{width: Fill height: Fit text: "Mentions" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        mentions_input := TextInputFlat{width: Fill height: 64 is_multiline: true empty_text: "Write @ to mention a teammate"}
        mentions_choices := DropDown2{width: Fill height: 34 labels: ["Terra" "Makepad" "Review team"]}
        mentions_reset := Button{width: Fit height: 28 text: "Reset"}
        mentions_status := Label{width: Fill height: Fit text: "Type @ or choose a person" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
    mod.widgets.TesseraColorPickerBase = #(TesseraColorPicker::register_widget(vm))
    mod.widgets.TesseraColorPicker = set_type_default() do mod.widgets.TesseraColorPickerBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        color_picker_title := Label{width: Fill height: Fit text: "Color picker" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        color_picker_hex := TextInputFlat{width: Fill height: 34 empty_text: "#RRGGBB"}
        color_picker_choices := DropDown2{width: Fill height: 34 labels: ["Blue #0285FF" "Green #16A34A" "Orange #EA580C"]}
        color_picker_reset := Button{width: Fit height: 28 text: "Reset"}
        color_picker_status := Label{width: Fill height: Fit text: "#0285FF committed" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
    mod.widgets.TesseraDatePickerBase = #(TesseraDatePicker::register_widget(vm))
    mod.widgets.TesseraDatePicker = set_type_default() do mod.widgets.TesseraDatePickerBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        date_picker_title := Label{width: Fill height: Fit text: "Date picker" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        date_picker_input := TextInputFlat{width: Fill height: 34 empty_text: "YYYY-MM-DD"}
        date_picker_choices := DropDown2{width: Fill height: 34 labels: ["2026-08-28" "2026-08-29" "2026-08-30"]}
        date_picker_reset := Button{width: Fit height: 28 text: "Reset"}
        date_picker_status := Label{width: Fill height: Fit text: "2026-08-28 committed" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
    mod.widgets.TesseraTimePickerBase = #(TesseraTimePicker::register_widget(vm))
    mod.widgets.TesseraTimePicker = set_type_default() do mod.widgets.TesseraTimePickerBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        time_picker_title := Label{width: Fill height: Fit text: "Time picker" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        time_picker_input := TextInputFlat{width: Fill height: 34 empty_text: "HH:MM"}
        time_picker_choices := DropDown2{width: Fill height: 34 labels: ["09:30" "13:00" "17:45"]}
        time_picker_reset := Button{width: Fit height: 28 text: "Reset"}
        time_picker_status := Label{width: Fill height: Fit text: "09:30 committed" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
struct TextSelectionState {
    text: String,
    selected: usize,
    open: bool,
    committed_text: String,
    committed_selected: usize,
}
fn clamp(index: usize, len: usize) -> usize {
    index.min(len.saturating_sub(1))
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraAutoComplete {
    #[deref]
    view: View,
    #[rust]
    state: TextSelectionState,
}
impl TesseraAutoComplete {
    const OPTIONS: [&'static str; 3] = ["Rust", "Makepad", "Renderer"];
    pub fn reset(&mut self, cx: &mut Cx) {
        self.close_native(cx);
        self.state = TextSelectionState::default();
        self.sync(cx);
    }

    fn close_native(&mut self, cx: &mut Cx) {
        let widget = self.view.widget(cx, ids!(auto_complete_choices));
        if let Some(mut drop_down) = widget.borrow_mut::<DropDown2>() {
            drop_down.set_closed(cx);
        }
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .text_input(cx, ids!(auto_complete_input))
            .set_text(cx, &self.state.text);
        self.view
            .drop_down(cx, ids!(auto_complete_choices))
            .set_selected_item(cx, self.state.selected);
        self.view.label(cx, ids!(auto_complete_status)).set_text(
            cx,
            if self.state.text.is_empty() {
                "Type or choose a technology"
            } else {
                "Committed selection"
            },
        );
        self.view.redraw(cx);
    }
}
impl Widget for TesseraAutoComplete {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if let Event::MouseDown(mouse) = event {
            let trigger = self
                .view
                .widget(cx, ids!(auto_complete_choices))
                .area()
                .rect(cx);
            if trigger.contains(mouse.abs) && !self.state.open {
                self.state.open = true;
                cx.widget_action(
                    self.widget_uid(),
                    AutoCompleteAction::Opened {
                        component: ComponentId::AutoComplete,
                    },
                );
            } else if self.state.open && !trigger.contains(mouse.abs) {
                self.close_native(cx);
                self.state.text = self.state.committed_text.clone();
                self.state.selected = self.state.committed_selected;
                self.state.open = false;
                self.sync(cx);
                cx.widget_action(
                    self.widget_uid(),
                    AutoCompleteAction::Cancelled {
                        component: ComponentId::AutoComplete,
                    },
                );
            }
        }
        if let Some(text) = self
            .view
            .text_input(cx, ids!(auto_complete_input))
            .changed(&actions)
        {
            self.state.text = text;
        }
        if let Some(index) = self
            .view
            .drop_down(cx, ids!(auto_complete_choices))
            .changed(&actions)
        {
            self.state.selected = clamp(index, Self::OPTIONS.len());
            self.state.text = Self::OPTIONS[self.state.selected].into();
            self.state.committed_selected = self.state.selected;
            self.state.committed_text = self.state.text.clone();
            self.state.open = false;
            self.sync(cx);
            cx.widget_action(
                self.widget_uid(),
                AutoCompleteAction::Committed {
                    component: ComponentId::AutoComplete,
                    index: self.state.selected,
                },
            );
        }
        if self
            .view
            .button(cx, ids!(auto_complete_reset))
            .activated(cx, event, &actions)
        {
            self.reset(cx);
            cx.widget_action(
                self.widget_uid(),
                AutoCompleteAction::Reset {
                    component: ComponentId::AutoComplete,
                },
            );
        } else if self.state.open
            && matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Escape)
        {
            self.close_native(cx);
            self.state.text = self.state.committed_text.clone();
            self.state.selected = self.state.committed_selected;
            self.state.open = false;
            self.sync(cx);
            cx.widget_action(
                self.widget_uid(),
                AutoCompleteAction::Cancelled {
                    component: ComponentId::AutoComplete,
                },
            );
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraMentions {
    #[deref]
    view: View,
    #[rust]
    state: TextSelectionState,
}
impl TesseraMentions {
    const OPTIONS: [&'static str; 3] = ["Terra", "Makepad", "Review team"];
    pub fn reset(&mut self, cx: &mut Cx) {
        self.close_native(cx);
        self.state = TextSelectionState::default();
        self.sync(cx);
    }
    fn close_native(&mut self, cx: &mut Cx) {
        if let Some(mut drop_down) = self
            .view
            .widget(cx, ids!(mentions_choices))
            .borrow_mut::<DropDown2>()
        {
            drop_down.set_closed(cx);
        }
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .text_input(cx, ids!(mentions_input))
            .set_text(cx, &self.state.text);
        self.view
            .drop_down(cx, ids!(mentions_choices))
            .set_selected_item(cx, self.state.selected);
        self.view.label(cx, ids!(mentions_status)).set_text(
            cx,
            if self.state.text.is_empty() {
                "Type @ or choose a person"
            } else {
                "Mention inserted"
            },
        );
        self.view.redraw(cx);
    }
}
impl Widget for TesseraMentions {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if let Event::MouseDown(mouse) = event {
            let trigger = self.view.widget(cx, ids!(mentions_choices)).area().rect(cx);
            if trigger.contains(mouse.abs) && !self.state.open {
                self.state.open = true;
                cx.widget_action(
                    self.widget_uid(),
                    MentionsAction::Opened {
                        component: ComponentId::Mentions,
                    },
                );
            } else if self.state.open && !trigger.contains(mouse.abs) {
                self.close_native(cx);
                self.state.text = self.state.committed_text.clone();
                self.state.selected = self.state.committed_selected;
                self.state.open = false;
                self.sync(cx);
                cx.widget_action(
                    self.widget_uid(),
                    MentionsAction::Cancelled {
                        component: ComponentId::Mentions,
                    },
                );
            }
        }
        if let Some(text) = self
            .view
            .text_input(cx, ids!(mentions_input))
            .changed(&actions)
        {
            self.state.text = text;
        }
        if let Some(index) = self
            .view
            .drop_down(cx, ids!(mentions_choices))
            .changed(&actions)
        {
            self.state.selected = clamp(index, Self::OPTIONS.len());
            if !self.state.text.is_empty() && !self.state.text.ends_with('@') {
                self.state.text.push(' ');
            }
            self.state.text.push('@');
            self.state.text.push_str(Self::OPTIONS[self.state.selected]);
            self.state.committed_selected = self.state.selected;
            self.state.committed_text = self.state.text.clone();
            self.state.open = false;
            self.sync(cx);
            cx.widget_action(
                self.widget_uid(),
                MentionsAction::Inserted {
                    component: ComponentId::Mentions,
                    index: self.state.selected,
                },
            );
        }
        if self
            .view
            .button(cx, ids!(mentions_reset))
            .activated(cx, event, &actions)
        {
            self.reset(cx);
            cx.widget_action(
                self.widget_uid(),
                MentionsAction::Reset {
                    component: ComponentId::Mentions,
                },
            );
        } else if self.state.open
            && matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Escape)
        {
            self.close_native(cx);
            self.state.text = self.state.committed_text.clone();
            self.state.selected = self.state.committed_selected;
            self.state.open = false;
            self.sync(cx);
            cx.widget_action(
                self.widget_uid(),
                MentionsAction::Cancelled {
                    component: ComponentId::Mentions,
                },
            );
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ColorPickerConfig {
    pub default_swatch: usize,
}

impl Default for ColorPickerConfig {
    fn default() -> Self {
        Self { default_swatch: 0 }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct ColorPickerState {
    selected: usize,
    draft: String,
    committed_selected: usize,
    committed_draft: String,
    invalid_draft: bool,
    open: bool,
}

impl Default for ColorPickerState {
    fn default() -> Self {
        Self::from_config(ColorPickerConfig::default())
    }
}

enum ColorPickerEvent {
    Open,
    Cancel,
    DraftChanged(String),
    Commit,
    Selected(usize),
    Reset(ColorPickerConfig),
}

impl ColorPickerState {
    const SWATCHES: [&'static str; 3] = ["#0285FF", "#16A34A", "#EA580C"];

    fn from_config(config: ColorPickerConfig) -> Self {
        let selected = clamp(config.default_swatch, Self::SWATCHES.len());
        Self {
            selected,
            draft: Self::SWATCHES[selected].into(),
            committed_selected: selected,
            committed_draft: Self::SWATCHES[selected].into(),
            invalid_draft: false,
            open: false,
        }
    }

    fn reduce(&mut self, event: ColorPickerEvent) -> Option<ColorPickerAction> {
        match event {
            ColorPickerEvent::Open if !self.open => {
                self.open = true;
                Some(ColorPickerAction::Opened {
                    component: ComponentId::ColorPicker,
                })
            }
            ColorPickerEvent::Cancel if self.open => {
                self.selected = self.committed_selected;
                self.draft = self.committed_draft.clone();
                self.invalid_draft = false;
                self.open = false;
                Some(ColorPickerAction::Cancelled {
                    component: ComponentId::ColorPicker,
                })
            }
            ColorPickerEvent::Open | ColorPickerEvent::Cancel => None,
            ColorPickerEvent::DraftChanged(draft) => {
                self.invalid_draft = canonical_hex(&draft).is_none();
                self.draft = draft;
                None
            }
            ColorPickerEvent::Commit => {
                let value = canonical_hex(&self.draft)?;
                self.selected = Self::SWATCHES
                    .iter()
                    .position(|swatch| *swatch == value)
                    .unwrap_or(self.selected);
                self.draft = value;
                self.committed_selected = self.selected;
                self.committed_draft = self.draft.clone();
                self.invalid_draft = false;
                self.open = false;
                Some(ColorPickerAction::Committed {
                    component: ComponentId::ColorPicker,
                })
            }
            ColorPickerEvent::Selected(index) => {
                self.selected = clamp(index, Self::SWATCHES.len());
                self.draft = Self::SWATCHES[self.selected].into();
                self.committed_selected = self.selected;
                self.committed_draft = self.draft.clone();
                self.invalid_draft = false;
                self.open = false;
                Some(ColorPickerAction::Selected {
                    component: ComponentId::ColorPicker,
                    index: self.selected,
                })
            }
            ColorPickerEvent::Reset(config) => {
                *self = Self::from_config(config);
                Some(ColorPickerAction::Reset {
                    component: ComponentId::ColorPicker,
                })
            }
        }
    }
}

fn canonical_hex(value: &str) -> Option<String> {
    let trimmed = value.trim();
    let bytes = trimmed.as_bytes();
    if bytes.len() != 7
        || bytes.first() != Some(&b'#')
        || !bytes[1..].iter().all(u8::is_ascii_hexdigit)
    {
        return None;
    }
    Some(format!("#{}", trimmed[1..].to_ascii_uppercase()))
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraColorPicker {
    #[deref]
    view: View,
    #[rust]
    config: ColorPickerConfig,
    #[rust]
    state: ColorPickerState,
}

impl TesseraColorPicker {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.state.reduce(ColorPickerEvent::Reset(self.config));
        self.sync(cx);
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .text_input(cx, ids!(color_picker_hex))
            .set_text(cx, &self.state.draft);
        self.view
            .drop_down(cx, ids!(color_picker_choices))
            .set_selected_item(cx, self.state.selected);
        let status = if self.state.invalid_draft {
            "Use a six-digit #RRGGBB value".into()
        } else {
            format!("{} committed", self.state.draft)
        };
        self.view
            .label(cx, ids!(color_picker_status))
            .set_text(cx, &status);
        self.view.redraw(cx);
    }

    fn apply(&mut self, cx: &mut Cx, event: ColorPickerEvent) {
        let action = self.state.reduce(event);
        self.sync(cx);
        if let Some(action) = action {
            cx.widget_action(self.widget_uid(), action);
        }
    }
}

impl Widget for TesseraColorPicker {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if let Some(draft) = self
            .view
            .text_input(cx, ids!(color_picker_hex))
            .changed(&actions)
        {
            self.apply(cx, ColorPickerEvent::DraftChanged(draft));
        }
        if let Event::MouseDown(mouse) = event {
            let trigger = self
                .view
                .widget(cx, ids!(color_picker_choices))
                .area()
                .rect(cx);
            if trigger.contains(mouse.abs) {
                self.apply(cx, ColorPickerEvent::Open);
            } else if self.state.open {
                self.apply(cx, ColorPickerEvent::Cancel);
            }
        }
        if let Some(index) = self
            .view
            .drop_down(cx, ids!(color_picker_choices))
            .changed(&actions)
        {
            self.apply(cx, ColorPickerEvent::Selected(index));
            cx.widget_action(
                self.widget_uid(),
                ColorPickerAction::Committed {
                    component: ComponentId::ColorPicker,
                },
            );
        }
        if self
            .view
            .text_input(cx, ids!(color_picker_hex))
            .returned(&actions)
            .is_some()
        {
            self.apply(cx, ColorPickerEvent::Commit);
        }
        if self
            .view
            .button(cx, ids!(color_picker_reset))
            .activated(cx, event, &actions)
        {
            self.reset(cx);
            cx.widget_action(
                self.widget_uid(),
                ColorPickerAction::Reset {
                    component: ComponentId::ColorPicker,
                },
            );
        } else if matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Escape) {
            self.apply(cx, ColorPickerEvent::Cancel);
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct DatePickerConfig {
    pub default_option: usize,
}

impl Default for DatePickerConfig {
    fn default() -> Self {
        Self { default_option: 0 }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct DatePickerState {
    selected: usize,
    draft: String,
    committed_selected: usize,
    committed_draft: String,
    invalid_draft: bool,
    open: bool,
}

impl Default for DatePickerState {
    fn default() -> Self {
        Self::from_config(DatePickerConfig::default())
    }
}

enum DatePickerEvent {
    Open,
    Cancel,
    DraftChanged(String),
    Commit,
    Selected(usize),
    Reset(DatePickerConfig),
}

impl DatePickerState {
    const OPTIONS: [&'static str; 3] = ["2026-08-28", "2026-08-29", "2026-08-30"];

    fn from_config(config: DatePickerConfig) -> Self {
        let selected = clamp(config.default_option, Self::OPTIONS.len());
        Self {
            selected,
            draft: Self::OPTIONS[selected].into(),
            committed_selected: selected,
            committed_draft: Self::OPTIONS[selected].into(),
            invalid_draft: false,
            open: false,
        }
    }

    fn reduce(&mut self, event: DatePickerEvent) -> Option<DatePickerAction> {
        match event {
            DatePickerEvent::Open if !self.open => {
                self.open = true;
                Some(DatePickerAction::Opened {
                    component: ComponentId::DatePicker,
                })
            }
            DatePickerEvent::Cancel if self.open => {
                self.selected = self.committed_selected;
                self.draft = self.committed_draft.clone();
                self.invalid_draft = false;
                self.open = false;
                Some(DatePickerAction::Cancelled {
                    component: ComponentId::DatePicker,
                })
            }
            DatePickerEvent::Open | DatePickerEvent::Cancel => None,
            DatePickerEvent::DraftChanged(draft) => {
                self.invalid_draft = !is_iso_date(&draft);
                self.draft = draft;
                None
            }
            DatePickerEvent::Commit => {
                if !is_iso_date(&self.draft) {
                    self.invalid_draft = true;
                    return None;
                }
                self.selected = Self::OPTIONS
                    .iter()
                    .position(|option| *option == self.draft)
                    .unwrap_or(self.selected);
                self.committed_selected = self.selected;
                self.committed_draft = self.draft.clone();
                self.invalid_draft = false;
                self.open = false;
                Some(DatePickerAction::Committed {
                    component: ComponentId::DatePicker,
                })
            }
            DatePickerEvent::Selected(index) => {
                self.selected = clamp(index, Self::OPTIONS.len());
                self.draft = Self::OPTIONS[self.selected].into();
                self.committed_selected = self.selected;
                self.committed_draft = self.draft.clone();
                self.invalid_draft = false;
                self.open = false;
                Some(DatePickerAction::Selected {
                    component: ComponentId::DatePicker,
                    index: self.selected,
                })
            }
            DatePickerEvent::Reset(config) => {
                *self = Self::from_config(config);
                Some(DatePickerAction::Reset {
                    component: ComponentId::DatePicker,
                })
            }
        }
    }
}

fn is_iso_date(value: &str) -> bool {
    let bytes = value.as_bytes();
    if bytes.len() != 10
        || bytes[4] != b'-'
        || bytes[7] != b'-'
        || !bytes
            .iter()
            .enumerate()
            .filter(|(index, _)| *index != 4 && *index != 7)
            .all(|(_, byte)| byte.is_ascii_digit())
    {
        return false;
    }
    let year = value[..4].parse::<u16>().unwrap_or_default();
    let month = value[5..7].parse::<u8>().unwrap_or_default();
    let day = value[8..].parse::<u8>().unwrap_or_default();
    let days = match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if year % 400 == 0 || (year % 4 == 0 && year % 100 != 0) => 29,
        2 => 28,
        _ => return false,
    };
    year > 0 && day > 0 && day <= days
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraDatePicker {
    #[deref]
    view: View,
    #[rust]
    config: DatePickerConfig,
    #[rust]
    state: DatePickerState,
}

impl TesseraDatePicker {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.state.reduce(DatePickerEvent::Reset(self.config));
        self.sync(cx);
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .text_input(cx, ids!(date_picker_input))
            .set_text(cx, &self.state.draft);
        self.view
            .drop_down(cx, ids!(date_picker_choices))
            .set_selected_item(cx, self.state.selected);
        let status = if self.state.invalid_draft {
            "Use a valid YYYY-MM-DD date".into()
        } else {
            format!("{} committed", self.state.draft)
        };
        self.view
            .label(cx, ids!(date_picker_status))
            .set_text(cx, &status);
        self.view.redraw(cx);
    }

    fn apply(&mut self, cx: &mut Cx, event: DatePickerEvent) {
        let action = self.state.reduce(event);
        self.sync(cx);
        if let Some(action) = action {
            cx.widget_action(self.widget_uid(), action);
        }
    }
}

impl Widget for TesseraDatePicker {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if let Some(draft) = self
            .view
            .text_input(cx, ids!(date_picker_input))
            .changed(&actions)
        {
            self.apply(cx, DatePickerEvent::DraftChanged(draft));
        }
        if let Event::MouseDown(mouse) = event {
            let trigger = self
                .view
                .widget(cx, ids!(date_picker_choices))
                .area()
                .rect(cx);
            if trigger.contains(mouse.abs) {
                self.apply(cx, DatePickerEvent::Open);
            } else if self.state.open {
                self.apply(cx, DatePickerEvent::Cancel);
            }
        }
        if let Some(index) = self
            .view
            .drop_down(cx, ids!(date_picker_choices))
            .changed(&actions)
        {
            self.apply(cx, DatePickerEvent::Selected(index));
            cx.widget_action(
                self.widget_uid(),
                DatePickerAction::Committed {
                    component: ComponentId::DatePicker,
                },
            );
        }
        if self
            .view
            .text_input(cx, ids!(date_picker_input))
            .returned(&actions)
            .is_some()
        {
            self.apply(cx, DatePickerEvent::Commit);
        }
        if self
            .view
            .button(cx, ids!(date_picker_reset))
            .activated(cx, event, &actions)
        {
            self.reset(cx);
            cx.widget_action(
                self.widget_uid(),
                DatePickerAction::Reset {
                    component: ComponentId::DatePicker,
                },
            );
        } else if matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Escape) {
            self.apply(cx, DatePickerEvent::Cancel);
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TimePickerConfig {
    pub default_option: usize,
}

impl Default for TimePickerConfig {
    fn default() -> Self {
        Self { default_option: 0 }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct TimePickerState {
    selected: usize,
    draft: String,
    committed_selected: usize,
    committed_draft: String,
    invalid_draft: bool,
    open: bool,
}

impl Default for TimePickerState {
    fn default() -> Self {
        Self::from_config(TimePickerConfig::default())
    }
}

enum TimePickerEvent {
    Open,
    Cancel,
    DraftChanged(String),
    Commit,
    Selected(usize),
    Reset(TimePickerConfig),
}

impl TimePickerState {
    const OPTIONS: [&'static str; 3] = ["09:30", "13:00", "17:45"];

    fn from_config(config: TimePickerConfig) -> Self {
        let selected = clamp(config.default_option, Self::OPTIONS.len());
        Self {
            selected,
            draft: Self::OPTIONS[selected].into(),
            committed_selected: selected,
            committed_draft: Self::OPTIONS[selected].into(),
            invalid_draft: false,
            open: false,
        }
    }

    fn reduce(&mut self, event: TimePickerEvent) -> Option<TimePickerAction> {
        match event {
            TimePickerEvent::Open if !self.open => {
                self.open = true;
                Some(TimePickerAction::Opened {
                    component: ComponentId::TimePicker,
                })
            }
            TimePickerEvent::Cancel if self.open => {
                self.selected = self.committed_selected;
                self.draft = self.committed_draft.clone();
                self.invalid_draft = false;
                self.open = false;
                Some(TimePickerAction::Cancelled {
                    component: ComponentId::TimePicker,
                })
            }
            TimePickerEvent::Open | TimePickerEvent::Cancel => None,
            TimePickerEvent::DraftChanged(draft) => {
                self.invalid_draft = !is_time(&draft);
                self.draft = draft;
                None
            }
            TimePickerEvent::Commit => {
                if !is_time(&self.draft) {
                    self.invalid_draft = true;
                    return None;
                }
                self.selected = Self::OPTIONS
                    .iter()
                    .position(|option| *option == self.draft)
                    .unwrap_or(self.selected);
                self.committed_selected = self.selected;
                self.committed_draft = self.draft.clone();
                self.invalid_draft = false;
                self.open = false;
                Some(TimePickerAction::Committed {
                    component: ComponentId::TimePicker,
                })
            }
            TimePickerEvent::Selected(index) => {
                self.selected = clamp(index, Self::OPTIONS.len());
                self.draft = Self::OPTIONS[self.selected].into();
                self.committed_selected = self.selected;
                self.committed_draft = self.draft.clone();
                self.invalid_draft = false;
                self.open = false;
                Some(TimePickerAction::Selected {
                    component: ComponentId::TimePicker,
                    index: self.selected,
                })
            }
            TimePickerEvent::Reset(config) => {
                *self = Self::from_config(config);
                Some(TimePickerAction::Reset {
                    component: ComponentId::TimePicker,
                })
            }
        }
    }
}

fn is_time(value: &str) -> bool {
    let bytes = value.as_bytes();
    if bytes.len() != 5
        || bytes[2] != b':'
        || !bytes
            .iter()
            .enumerate()
            .filter(|(index, _)| *index != 2)
            .all(|(_, byte)| byte.is_ascii_digit())
    {
        return false;
    }
    let hour = value[..2].parse::<u8>().unwrap_or(u8::MAX);
    let minute = value[3..].parse::<u8>().unwrap_or(u8::MAX);
    hour < 24 && minute < 60
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraTimePicker {
    #[deref]
    view: View,
    #[rust]
    config: TimePickerConfig,
    #[rust]
    state: TimePickerState,
}

impl TesseraTimePicker {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.state.reduce(TimePickerEvent::Reset(self.config));
        self.sync(cx);
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .text_input(cx, ids!(time_picker_input))
            .set_text(cx, &self.state.draft);
        self.view
            .drop_down(cx, ids!(time_picker_choices))
            .set_selected_item(cx, self.state.selected);
        let status = if self.state.invalid_draft {
            "Use a valid 24-hour HH:MM time".into()
        } else {
            format!("{} committed", self.state.draft)
        };
        self.view
            .label(cx, ids!(time_picker_status))
            .set_text(cx, &status);
        self.view.redraw(cx);
    }

    fn apply(&mut self, cx: &mut Cx, event: TimePickerEvent) {
        let action = self.state.reduce(event);
        self.sync(cx);
        if let Some(action) = action {
            cx.widget_action(self.widget_uid(), action);
        }
    }
}

impl Widget for TesseraTimePicker {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if let Some(draft) = self
            .view
            .text_input(cx, ids!(time_picker_input))
            .changed(&actions)
        {
            self.apply(cx, TimePickerEvent::DraftChanged(draft));
        }
        if let Event::MouseDown(mouse) = event {
            let trigger = self
                .view
                .widget(cx, ids!(time_picker_choices))
                .area()
                .rect(cx);
            if trigger.contains(mouse.abs) {
                self.apply(cx, TimePickerEvent::Open);
            } else if self.state.open {
                self.apply(cx, TimePickerEvent::Cancel);
            }
        }
        if let Some(index) = self
            .view
            .drop_down(cx, ids!(time_picker_choices))
            .changed(&actions)
        {
            self.apply(cx, TimePickerEvent::Selected(index));
            cx.widget_action(
                self.widget_uid(),
                TimePickerAction::Committed {
                    component: ComponentId::TimePicker,
                },
            );
        }
        if self
            .view
            .text_input(cx, ids!(time_picker_input))
            .returned(&actions)
            .is_some()
        {
            self.apply(cx, TimePickerEvent::Commit);
        }
        if self
            .view
            .button(cx, ids!(time_picker_reset))
            .activated(cx, event, &actions)
        {
            self.reset(cx);
            cx.widget_action(
                self.widget_uid(),
                TimePickerAction::Reset {
                    component: ComponentId::TimePicker,
                },
            );
        } else if matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Escape) {
            self.apply(cx, TimePickerEvent::Cancel);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        ColorPickerConfig, ColorPickerEvent, ColorPickerState, DatePickerConfig, DatePickerEvent,
        DatePickerState, InputCompositeSurfaceCatalog, TextSelectionState, TimePickerConfig,
        TimePickerEvent, TimePickerState, canonical_hex, clamp, is_iso_date, is_time,
    };
    use tessera_core::catalog::ComponentId;
    #[test]
    fn catalog_has_exact_composite_routes() {
        assert_eq!(
            InputCompositeSurfaceCatalog::widget_name(ComponentId::AutoComplete),
            Some("TesseraAutoComplete")
        );
        assert_eq!(
            InputCompositeSurfaceCatalog::widget_name(ComponentId::TimePicker),
            Some("TesseraTimePicker")
        );
        assert!(!InputCompositeSurfaceCatalog::contains(ComponentId::Input));
    }
    #[test]
    fn controller_state_clamps_and_starts_closed() {
        assert_eq!(clamp(9, 3), 2);
        assert_eq!(TextSelectionState::default().text, "");
        assert!(!TextSelectionState::default().open);
    }

    #[test]
    fn picker_reducers_validate_and_reset_their_own_domain_values() {
        assert_eq!(canonical_hex(" #0aB2fF "), Some(String::from("#0AB2FF")));
        assert_eq!(canonical_hex("blue"), None);
        assert!(is_iso_date("2028-02-29"));
        assert!(!is_iso_date("2027-02-29"));
        assert!(is_time("23:59"));
        assert!(!is_time("24:00"));

        let mut color = ColorPickerState::from_config(ColorPickerConfig::default());
        color.reduce(ColorPickerEvent::DraftChanged(String::from("#123456")));
        assert!(color.reduce(ColorPickerEvent::Commit).is_some());
        assert_eq!(color.draft, "#123456");

        let mut date = DatePickerState::from_config(DatePickerConfig::default());
        date.reduce(DatePickerEvent::DraftChanged(String::from("2026-08-31")));
        assert!(date.reduce(DatePickerEvent::Commit).is_some());
        assert_eq!(date.draft, "2026-08-31");

        let mut time = TimePickerState::from_config(TimePickerConfig::default());
        time.reduce(TimePickerEvent::DraftChanged(String::from("18:05")));
        assert!(time.reduce(TimePickerEvent::Commit).is_some());
        assert_eq!(time.draft, "18:05");
        time.reduce(TimePickerEvent::Reset(TimePickerConfig::default()));
        assert_eq!(time.draft, "09:30");
    }
}
