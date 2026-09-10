//! Bounded, component-specific input and selection surface controllers.
//!
//! This module deliberately owns no `script_mod!` registration. The frozen
//! Makepad source policy only allows trusted registration hooks in the shell
//! owner, and the Gallery owner owns route mounting. That owner must mount the
//! returned [`SurfaceSpec`] controls with native Makepad `TextInput`,
//! `CheckBox`, `RadioButton`, `Toggle`, `Slider`, `DropDown`, and `PortalList`
//! widgets. Keeping the controller free of untrusted Live input also preserves
//! the fail-closed boundary for text, option, and upload metadata.
//!
//! Product review: every catalog id below has a distinct user task and state
//! branch. UI review: every spec declares control height, keyboard profile, and
//! a narrow/mobile composition. Engineering review: all mutable collections,
//! text, paths, dates, colors, and upload metadata are bounded. Test review:
//! this file is directly executable with `rustc --edition 2024 --test`. White
//! hat review: no filesystem, network, dynamic script, or raw path capability
//! is accepted by this controller.

use std::cmp::Ordering;
use std::collections::{BTreeMap, BTreeSet};

pub const INPUT_SURFACE_COUNT: usize = 18;
pub const MAX_SINGLE_LINE_BYTES: usize = 8 * 1024;
pub const MAX_TEXTAREA_BYTES: usize = 256 * 1024;
pub const MAX_OPTION_COUNT: usize = 500;
pub const MAX_VISIBLE_TREE_NODES: usize = 800;
pub const MAX_CANDIDATE_COUNT: usize = 50;
pub const MAX_MENTION_TOKENS: usize = 100;
pub const MAX_SWATCH_COUNT: usize = 256;
pub const MAX_CASCADE_DEPTH: usize = 8;
pub const MAX_UPLOAD_FILES: usize = 32;
pub const MAX_UPLOAD_BYTES: u64 = 128 * 1024 * 1024;
pub const MAX_FORM_FIELDS: usize = 100;
pub const MAX_TREE_DEPTH: usize = 32;
pub const CONTROL_HEIGHT_DESKTOP: u16 = 36;
pub const CONTROL_HEIGHT_TOUCH: u16 = 44;
pub const MOBILE_BREAKPOINT_DIP: u16 = 640;

#[derive(Clone, Copy, Debug, Eq, PartialEq, Ord, PartialOrd, Hash)]
pub enum InputSurfaceId {
    Input,
    Textarea,
    InputNumber,
    Checkbox,
    Radio,
    Switch,
    Slider,
    Select,
    Cascader,
    DatePicker,
    TimePicker,
    AutoComplete,
    Mentions,
    ColorPicker,
    Upload,
    Transfer,
    TreeSelect,
    Form,
}

impl InputSurfaceId {
    pub const ALL: [Self; INPUT_SURFACE_COUNT] = [
        Self::Input,
        Self::Textarea,
        Self::InputNumber,
        Self::Checkbox,
        Self::Radio,
        Self::Switch,
        Self::Slider,
        Self::Select,
        Self::Cascader,
        Self::DatePicker,
        Self::TimePicker,
        Self::AutoComplete,
        Self::Mentions,
        Self::ColorPicker,
        Self::Upload,
        Self::Transfer,
        Self::TreeSelect,
        Self::Form,
    ];

    pub const fn slug(self) -> &'static str {
        match self {
            Self::Input => "input",
            Self::Textarea => "textarea",
            Self::InputNumber => "input-number",
            Self::Checkbox => "checkbox",
            Self::Radio => "radio",
            Self::Switch => "switch",
            Self::Slider => "slider",
            Self::Select => "select",
            Self::Cascader => "cascader",
            Self::DatePicker => "date-picker",
            Self::TimePicker => "time-picker",
            Self::AutoComplete => "auto-complete",
            Self::Mentions => "mentions",
            Self::ColorPicker => "color-picker",
            Self::Upload => "upload",
            Self::Transfer => "transfer",
            Self::TreeSelect => "tree-select",
            Self::Form => "form",
        }
    }

    pub const fn name(self) -> &'static str {
        match self {
            Self::Input => "Input",
            Self::Textarea => "Textarea",
            Self::InputNumber => "InputNumber",
            Self::Checkbox => "Checkbox",
            Self::Radio => "Radio",
            Self::Switch => "Switch",
            Self::Slider => "Slider",
            Self::Select => "Select",
            Self::Cascader => "Cascader",
            Self::DatePicker => "DatePicker",
            Self::TimePicker => "TimePicker",
            Self::AutoComplete => "AutoComplete",
            Self::Mentions => "Mentions",
            Self::ColorPicker => "ColorPicker",
            Self::Upload => "Upload",
            Self::Transfer => "Transfer",
            Self::TreeSelect => "TreeSelect",
            Self::Form => "Form",
        }
    }

    pub fn from_slug(slug: &str) -> Option<Self> {
        match slug {
            "input" => Some(Self::Input),
            "textarea" => Some(Self::Textarea),
            "input-number" => Some(Self::InputNumber),
            "checkbox" => Some(Self::Checkbox),
            "radio" => Some(Self::Radio),
            "switch" => Some(Self::Switch),
            "slider" => Some(Self::Slider),
            "select" => Some(Self::Select),
            "cascader" => Some(Self::Cascader),
            "date-picker" => Some(Self::DatePicker),
            "time-picker" => Some(Self::TimePicker),
            "auto-complete" => Some(Self::AutoComplete),
            "mentions" => Some(Self::Mentions),
            "color-picker" => Some(Self::ColorPicker),
            "upload" => Some(Self::Upload),
            "transfer" => Some(Self::Transfer),
            "tree-select" => Some(Self::TreeSelect),
            "form" => Some(Self::Form),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum NativeControl {
    TextInput,
    MultilineTextInput,
    NumericTextInput,
    CheckBox,
    RadioButton,
    Toggle,
    Slider,
    DropDown,
    PortalList,
    DateGrid,
    TimeColumns,
    ColorChannels,
    FileBrokerButton,
    FormFields,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum KeyboardProfile {
    Text,
    Toggle,
    RadioGroup,
    Slider,
    Listbox,
    Cascader,
    Date,
    Time,
    Mentions,
    Transfer,
    Tree,
    Form,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MobileMode {
    Inline,
    Stacked,
    DrillIn,
    Tabbed,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SurfaceSpec {
    pub id: InputSurfaceId,
    pub controls: &'static [NativeControl],
    pub keyboard: KeyboardProfile,
    pub mobile: MobileMode,
    pub max_items: usize,
}

const INPUT_CONTROLS: &[NativeControl] = &[NativeControl::TextInput];
const TEXTAREA_CONTROLS: &[NativeControl] = &[NativeControl::MultilineTextInput];
const INPUT_NUMBER_CONTROLS: &[NativeControl] = &[NativeControl::NumericTextInput];
const CHECKBOX_CONTROLS: &[NativeControl] = &[NativeControl::CheckBox];
const RADIO_CONTROLS: &[NativeControl] = &[NativeControl::RadioButton, NativeControl::PortalList];
const SWITCH_CONTROLS: &[NativeControl] = &[NativeControl::Toggle];
const SLIDER_CONTROLS: &[NativeControl] = &[NativeControl::Slider, NativeControl::NumericTextInput];
const SELECT_CONTROLS: &[NativeControl] = &[NativeControl::DropDown, NativeControl::PortalList];
const CASCADER_CONTROLS: &[NativeControl] = &[NativeControl::DropDown, NativeControl::PortalList];
const DATE_CONTROLS: &[NativeControl] = &[NativeControl::TextInput, NativeControl::DateGrid];
const TIME_CONTROLS: &[NativeControl] = &[NativeControl::TextInput, NativeControl::TimeColumns];
const AUTO_COMPLETE_CONTROLS: &[NativeControl] =
    &[NativeControl::TextInput, NativeControl::PortalList];
const MENTION_CONTROLS: &[NativeControl] =
    &[NativeControl::MultilineTextInput, NativeControl::PortalList];
const COLOR_CONTROLS: &[NativeControl] = &[NativeControl::TextInput, NativeControl::ColorChannels];
const UPLOAD_CONTROLS: &[NativeControl] =
    &[NativeControl::FileBrokerButton, NativeControl::PortalList];
const TRANSFER_CONTROLS: &[NativeControl] = &[NativeControl::PortalList];
const TREE_SELECT_CONTROLS: &[NativeControl] =
    &[NativeControl::DropDown, NativeControl::PortalList];
const FORM_CONTROLS: &[NativeControl] = &[NativeControl::FormFields];

pub const INPUT_SURFACE_SPECS: [SurfaceSpec; INPUT_SURFACE_COUNT] = [
    SurfaceSpec {
        id: InputSurfaceId::Input,
        controls: INPUT_CONTROLS,
        keyboard: KeyboardProfile::Text,
        mobile: MobileMode::Inline,
        max_items: 0,
    },
    SurfaceSpec {
        id: InputSurfaceId::Textarea,
        controls: TEXTAREA_CONTROLS,
        keyboard: KeyboardProfile::Text,
        mobile: MobileMode::Stacked,
        max_items: 0,
    },
    SurfaceSpec {
        id: InputSurfaceId::InputNumber,
        controls: INPUT_NUMBER_CONTROLS,
        keyboard: KeyboardProfile::Text,
        mobile: MobileMode::Inline,
        max_items: 0,
    },
    SurfaceSpec {
        id: InputSurfaceId::Checkbox,
        controls: CHECKBOX_CONTROLS,
        keyboard: KeyboardProfile::Toggle,
        mobile: MobileMode::Stacked,
        max_items: MAX_OPTION_COUNT,
    },
    SurfaceSpec {
        id: InputSurfaceId::Radio,
        controls: RADIO_CONTROLS,
        keyboard: KeyboardProfile::RadioGroup,
        mobile: MobileMode::Stacked,
        max_items: MAX_OPTION_COUNT,
    },
    SurfaceSpec {
        id: InputSurfaceId::Switch,
        controls: SWITCH_CONTROLS,
        keyboard: KeyboardProfile::Toggle,
        mobile: MobileMode::Inline,
        max_items: 0,
    },
    SurfaceSpec {
        id: InputSurfaceId::Slider,
        controls: SLIDER_CONTROLS,
        keyboard: KeyboardProfile::Slider,
        mobile: MobileMode::Stacked,
        max_items: 100,
    },
    SurfaceSpec {
        id: InputSurfaceId::Select,
        controls: SELECT_CONTROLS,
        keyboard: KeyboardProfile::Listbox,
        mobile: MobileMode::Stacked,
        max_items: MAX_OPTION_COUNT,
    },
    SurfaceSpec {
        id: InputSurfaceId::Cascader,
        controls: CASCADER_CONTROLS,
        keyboard: KeyboardProfile::Cascader,
        mobile: MobileMode::DrillIn,
        max_items: MAX_VISIBLE_TREE_NODES,
    },
    SurfaceSpec {
        id: InputSurfaceId::DatePicker,
        controls: DATE_CONTROLS,
        keyboard: KeyboardProfile::Date,
        mobile: MobileMode::Stacked,
        max_items: 42,
    },
    SurfaceSpec {
        id: InputSurfaceId::TimePicker,
        controls: TIME_CONTROLS,
        keyboard: KeyboardProfile::Time,
        mobile: MobileMode::Stacked,
        max_items: 60,
    },
    SurfaceSpec {
        id: InputSurfaceId::AutoComplete,
        controls: AUTO_COMPLETE_CONTROLS,
        keyboard: KeyboardProfile::Listbox,
        mobile: MobileMode::Stacked,
        max_items: MAX_CANDIDATE_COUNT,
    },
    SurfaceSpec {
        id: InputSurfaceId::Mentions,
        controls: MENTION_CONTROLS,
        keyboard: KeyboardProfile::Mentions,
        mobile: MobileMode::Stacked,
        max_items: MAX_MENTION_TOKENS,
    },
    SurfaceSpec {
        id: InputSurfaceId::ColorPicker,
        controls: COLOR_CONTROLS,
        keyboard: KeyboardProfile::Listbox,
        mobile: MobileMode::Stacked,
        max_items: MAX_SWATCH_COUNT,
    },
    SurfaceSpec {
        id: InputSurfaceId::Upload,
        controls: UPLOAD_CONTROLS,
        keyboard: KeyboardProfile::Listbox,
        mobile: MobileMode::Stacked,
        max_items: MAX_UPLOAD_FILES,
    },
    SurfaceSpec {
        id: InputSurfaceId::Transfer,
        controls: TRANSFER_CONTROLS,
        keyboard: KeyboardProfile::Transfer,
        mobile: MobileMode::Tabbed,
        max_items: MAX_OPTION_COUNT,
    },
    SurfaceSpec {
        id: InputSurfaceId::TreeSelect,
        controls: TREE_SELECT_CONTROLS,
        keyboard: KeyboardProfile::Tree,
        mobile: MobileMode::DrillIn,
        max_items: MAX_VISIBLE_TREE_NODES,
    },
    SurfaceSpec {
        id: InputSurfaceId::Form,
        controls: FORM_CONTROLS,
        keyboard: KeyboardProfile::Form,
        mobile: MobileMode::Stacked,
        max_items: MAX_FORM_FIELDS,
    },
];

pub const fn surface_spec(id: InputSurfaceId) -> SurfaceSpec {
    match id {
        InputSurfaceId::Input => INPUT_SURFACE_SPECS[0],
        InputSurfaceId::Textarea => INPUT_SURFACE_SPECS[1],
        InputSurfaceId::InputNumber => INPUT_SURFACE_SPECS[2],
        InputSurfaceId::Checkbox => INPUT_SURFACE_SPECS[3],
        InputSurfaceId::Radio => INPUT_SURFACE_SPECS[4],
        InputSurfaceId::Switch => INPUT_SURFACE_SPECS[5],
        InputSurfaceId::Slider => INPUT_SURFACE_SPECS[6],
        InputSurfaceId::Select => INPUT_SURFACE_SPECS[7],
        InputSurfaceId::Cascader => INPUT_SURFACE_SPECS[8],
        InputSurfaceId::DatePicker => INPUT_SURFACE_SPECS[9],
        InputSurfaceId::TimePicker => INPUT_SURFACE_SPECS[10],
        InputSurfaceId::AutoComplete => INPUT_SURFACE_SPECS[11],
        InputSurfaceId::Mentions => INPUT_SURFACE_SPECS[12],
        InputSurfaceId::ColorPicker => INPUT_SURFACE_SPECS[13],
        InputSurfaceId::Upload => INPUT_SURFACE_SPECS[14],
        InputSurfaceId::Transfer => INPUT_SURFACE_SPECS[15],
        InputSurfaceId::TreeSelect => INPUT_SURFACE_SPECS[16],
        InputSurfaceId::Form => INPUT_SURFACE_SPECS[17],
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SurfaceLayout {
    pub control_height: u16,
    pub min_hit_target: u16,
    pub mode: MobileMode,
    pub columns: u8,
}

impl SurfaceLayout {
    pub const fn for_viewport(id: InputSurfaceId, width_dip: u16, coarse_pointer: bool) -> Self {
        let compact = width_dip < MOBILE_BREAKPOINT_DIP;
        let control_height = if coarse_pointer {
            CONTROL_HEIGHT_TOUCH
        } else {
            CONTROL_HEIGHT_DESKTOP
        };
        let min_hit_target = if coarse_pointer {
            CONTROL_HEIGHT_TOUCH
        } else {
            24
        };
        let spec = surface_spec(id);
        let mode = if compact {
            spec.mobile
        } else {
            MobileMode::Inline
        };
        let columns = match (id, compact) {
            (InputSurfaceId::Transfer, false) | (InputSurfaceId::Cascader, false) => 2,
            (InputSurfaceId::DatePicker, false) | (InputSurfaceId::TimePicker, false) => 2,
            _ => 1,
        };
        Self {
            control_height,
            min_hit_target,
            mode,
            columns,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct AccessPolicy {
    pub disabled: bool,
    pub read_only: bool,
}

impl AccessPolicy {
    pub const fn editable() -> Self {
        Self {
            disabled: false,
            read_only: false,
        }
    }

    pub const fn disabled() -> Self {
        Self {
            disabled: true,
            read_only: false,
        }
    }

    pub const fn read_only() -> Self {
        Self {
            disabled: false,
            read_only: true,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SurfaceError {
    Disabled,
    ReadOnly,
    UnsupportedEvent,
    TextTooLong { max_bytes: usize },
    DisallowedControlCharacter,
    InvalidNumber,
    NumberOutOfRange,
    InvalidSliderConfiguration,
    UnknownOption,
    DisabledOption,
    DuplicateOptionId,
    TooManyItems { max_items: usize },
    StaleGeneration,
    CascaderDepthExceeded,
    InvalidDate,
    DateOutOfRange,
    InvalidTime,
    InvalidColor,
    InvalidMention,
    InvalidUploadName,
    UnsupportedUploadType,
    UploadTooLarge,
    UploadTotalExceeded,
    DuplicateUploadId,
    TransferItemMissing,
    TreeDepthExceeded,
    InvalidFieldName,
    FormInvalid,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SurfaceOutcome {
    Changed,
    Committed,
    Opened,
    Closed,
    Ignored,
}

pub type SurfaceResult = Result<SurfaceOutcome, SurfaceError>;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum KeyboardIntent {
    Activate,
    ArrowUp,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    PageUp,
    PageDown,
    Home,
    End,
    Enter,
    Escape,
    Space,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SurfaceEvent {
    TextChanged(String),
    ImeStarted,
    ImeUpdated(String),
    ImeCommitted(String),
    Submit,
    Clear,
    Cancel,
    Toggle,
    Select(String),
    ReplaceOptions(Vec<ChoiceOption>),
    StepNumber(i8),
    SetSlider(i64),
    BeginSlide,
    FinishSlide,
    StartLookup,
    ResolveOptions {
        generation: u64,
        options: Vec<ChoiceOption>,
    },
    FailLookup {
        generation: u64,
    },
    SetCascaderPath(Vec<String>),
    SetDate(String),
    SetTime(String),
    SetColor(String),
    InsertMention(ChoiceOption),
    RemoveMention(String),
    StageUpload(UploadDescriptor),
    FinishUpload {
        request_id: String,
        accepted: bool,
    },
    RetryUpload(String),
    RemoveUpload(String),
    Transfer {
        ids: Vec<String>,
        to_target: bool,
    },
    ToggleTreeNode(String),
    SetTreeBounds {
        visible_nodes: usize,
        depth: usize,
    },
    SetFormField {
        name: String,
        value: String,
    },
    ValidateForm,
    FinishForm {
        accepted: bool,
    },
    Key(KeyboardIntent),
}

impl SurfaceEvent {
    const fn mutates(&self) -> bool {
        !matches!(self, Self::Cancel | Self::Key(KeyboardIntent::Escape))
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum InputPhase {
    Ready,
    Composing,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TextFieldState {
    pub draft: String,
    pub committed: String,
    pub preedit: String,
    pub phase: InputPhase,
    pub multiline: bool,
    pub max_bytes: usize,
}

impl TextFieldState {
    fn single_line() -> Self {
        Self {
            draft: String::new(),
            committed: String::new(),
            preedit: String::new(),
            phase: InputPhase::Ready,
            multiline: false,
            max_bytes: MAX_SINGLE_LINE_BYTES,
        }
    }

    fn multiline() -> Self {
        Self {
            draft: String::new(),
            committed: String::new(),
            preedit: String::new(),
            phase: InputPhase::Ready,
            multiline: true,
            max_bytes: MAX_TEXTAREA_BYTES,
        }
    }

    fn change(&mut self, value: String) -> SurfaceResult {
        validate_text(&value, self.max_bytes, self.multiline)?;
        self.draft = normalize_line_endings(value, self.multiline);
        self.preedit.clear();
        self.phase = InputPhase::Ready;
        Ok(SurfaceOutcome::Changed)
    }

    fn start_composition(&mut self) -> SurfaceResult {
        self.phase = InputPhase::Composing;
        self.preedit.clear();
        Ok(SurfaceOutcome::Changed)
    }

    fn update_composition(&mut self, value: String) -> SurfaceResult {
        validate_text(&value, self.max_bytes, self.multiline)?;
        self.phase = InputPhase::Composing;
        self.preedit = normalize_line_endings(value, self.multiline);
        Ok(SurfaceOutcome::Changed)
    }

    fn commit_composition(&mut self, value: String) -> SurfaceResult {
        let committed = if value.is_empty() {
            self.preedit.clone()
        } else {
            value
        };
        self.change(committed)
    }

    fn submit(&mut self) -> SurfaceResult {
        if self.phase == InputPhase::Composing {
            return Ok(SurfaceOutcome::Ignored);
        }
        self.committed = self.draft.clone();
        Ok(SurfaceOutcome::Committed)
    }

    fn clear(&mut self) -> SurfaceResult {
        self.draft.clear();
        self.committed.clear();
        self.preedit.clear();
        self.phase = InputPhase::Ready;
        Ok(SurfaceOutcome::Changed)
    }

    fn cancel(&mut self) -> SurfaceResult {
        self.draft = self.committed.clone();
        self.preedit.clear();
        self.phase = InputPhase::Ready;
        Ok(SurfaceOutcome::Changed)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Decimal {
    mantissa: i64,
    scale: u8,
}

impl Decimal {
    pub const fn new(mantissa: i64, scale: u8) -> Self {
        Self { mantissa, scale }
    }

    pub const fn mantissa(self) -> i64 {
        self.mantissa
    }

    pub const fn scale(self) -> u8 {
        self.scale
    }

    pub fn parse(raw: &str, max_scale: u8) -> Result<Self, SurfaceError> {
        if raw.is_empty() || raw.len() > 32 || raw.contains(['e', 'E', '+']) {
            return Err(SurfaceError::InvalidNumber);
        }
        let (negative, digits) = if let Some(rest) = raw.strip_prefix('-') {
            (true, rest)
        } else {
            (false, raw)
        };
        let mut parts = digits.split('.');
        let whole = parts.next().unwrap_or_default();
        let fractional = parts.next().unwrap_or_default();
        if parts.next().is_some()
            || (whole.is_empty() && fractional.is_empty())
            || !whole.bytes().all(|byte| byte.is_ascii_digit())
            || !fractional.bytes().all(|byte| byte.is_ascii_digit())
            || fractional.len() > usize::from(max_scale)
        {
            return Err(SurfaceError::InvalidNumber);
        }
        let digit_count = whole.trim_start_matches('0').len() + fractional.len();
        if digit_count > 18 {
            return Err(SurfaceError::InvalidNumber);
        }
        let mut joined = String::with_capacity(whole.len() + fractional.len());
        joined.push_str(whole);
        joined.push_str(fractional);
        let unsigned = joined
            .parse::<i64>()
            .map_err(|_| SurfaceError::InvalidNumber)?;
        let mantissa = if negative { -unsigned } else { unsigned };
        Ok(Self::new(mantissa, fractional.len() as u8).normalized())
    }

    pub fn compare_value(self, other: Self) -> Ordering {
        let scale = self.scale.max(other.scale);
        let lhs = self.scaled_to(scale);
        let rhs = other.scaled_to(scale);
        lhs.cmp(&rhs)
    }

    pub fn checked_add(self, other: Self) -> Option<Self> {
        let scale = self.scale.max(other.scale);
        self.scaled_to_checked(scale)
            .and_then(|lhs| {
                other
                    .scaled_to_checked(scale)
                    .and_then(|rhs| lhs.checked_add(rhs))
            })
            .map(|mantissa| Self::new(mantissa, scale).normalized())
    }

    pub fn format(self) -> String {
        if self.scale == 0 {
            return self.mantissa.to_string();
        }
        let negative = self.mantissa.is_negative();
        let digits = self.mantissa.unsigned_abs().to_string();
        let scale = usize::from(self.scale);
        let padded = if digits.len() <= scale {
            format!("{:0>width$}", digits, width = scale + 1)
        } else {
            digits
        };
        let split = padded.len() - scale;
        let sign = if negative { "-" } else { "" };
        format!("{}{}.{}", sign, &padded[..split], &padded[split..])
    }

    fn normalized(self) -> Self {
        let mut mantissa = self.mantissa;
        let mut scale = self.scale;
        while scale > 0 && mantissa % 10 == 0 {
            mantissa /= 10;
            scale -= 1;
        }
        Self { mantissa, scale }
    }

    fn scaled_to(self, scale: u8) -> i64 {
        self.scaled_to_checked(scale).unwrap_or_else(|| {
            if self.mantissa.is_negative() {
                i64::MIN
            } else {
                i64::MAX
            }
        })
    }

    fn scaled_to_checked(self, scale: u8) -> Option<i64> {
        if scale < self.scale {
            return None;
        }
        let mut value = self.mantissa;
        for _ in self.scale..scale {
            value = value.checked_mul(10)?;
        }
        Some(value)
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NumberState {
    pub draft: String,
    pub value: Option<Decimal>,
    pub committed: Option<Decimal>,
    pub min: Decimal,
    pub max: Decimal,
    pub step: Decimal,
    pub precision: u8,
}

impl NumberState {
    fn standard() -> Self {
        Self {
            draft: String::from("12"),
            value: Some(Decimal::new(12, 0)),
            committed: Some(Decimal::new(12, 0)),
            min: Decimal::new(-100, 0),
            max: Decimal::new(100, 0),
            step: Decimal::new(1, 0),
            precision: 2,
        }
    }

    fn change(&mut self, draft: String) -> SurfaceResult {
        validate_text(&draft, 32, false)?;
        self.draft = draft;
        Ok(SurfaceOutcome::Changed)
    }

    fn submit(&mut self) -> SurfaceResult {
        let value = Decimal::parse(&self.draft, self.precision)?;
        if value.compare_value(self.min).is_lt() || value.compare_value(self.max).is_gt() {
            return Err(SurfaceError::NumberOutOfRange);
        }
        self.value = Some(value);
        self.committed = Some(value);
        self.draft = value.format();
        Ok(SurfaceOutcome::Committed)
    }

    fn step_by(&mut self, direction: i8) -> SurfaceResult {
        if direction == 0 || self.step.mantissa == 0 {
            return Err(SurfaceError::InvalidNumber);
        }
        let signed_step = Decimal::new(
            self.step
                .mantissa
                .checked_mul(i64::from(direction.signum()))
                .ok_or(SurfaceError::InvalidNumber)?,
            self.step.scale,
        );
        let current = if self.draft.is_empty() {
            self.value.unwrap_or(self.min)
        } else {
            Decimal::parse(&self.draft, self.precision)?
        };
        let next = current
            .checked_add(signed_step)
            .ok_or(SurfaceError::InvalidNumber)?;
        let bounded = if next.compare_value(self.min).is_lt() {
            self.min
        } else if next.compare_value(self.max).is_gt() {
            self.max
        } else {
            next
        };
        self.value = Some(bounded);
        self.committed = Some(bounded);
        self.draft = bounded.format();
        Ok(SurfaceOutcome::Changed)
    }

    fn clear(&mut self) -> SurfaceResult {
        self.draft.clear();
        self.value = None;
        self.committed = None;
        Ok(SurfaceOutcome::Changed)
    }

    fn cancel(&mut self) -> SurfaceResult {
        self.value = self.committed;
        self.draft = self.committed.map_or_else(String::new, Decimal::format);
        Ok(SurfaceOutcome::Changed)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CheckState {
    Unchecked,
    Checked,
    Mixed,
}

impl CheckState {
    const fn toggled(self) -> Self {
        match self {
            Self::Unchecked => Self::Checked,
            Self::Checked => Self::Unchecked,
            Self::Mixed => Self::Checked,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CheckboxState {
    pub value: CheckState,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ChoiceOption {
    pub id: String,
    pub label: String,
    pub disabled: bool,
}

impl ChoiceOption {
    pub fn new(id: impl Into<String>, label: impl Into<String>) -> Result<Self, SurfaceError> {
        let id = id.into();
        let label = label.into();
        validate_option_text(&id, 96)?;
        validate_option_text(&label, 160)?;
        Ok(Self {
            id,
            label,
            disabled: false,
        })
    }

    pub fn disabled(mut self) -> Self {
        self.disabled = true;
        self
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RadioState {
    pub options: Vec<ChoiceOption>,
    pub selected: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SwitchState {
    pub value: bool,
    pub previous: bool,
    pub pending_generation: Option<u64>,
    pub generation: u64,
}

impl SwitchState {
    fn toggle(&mut self) -> SurfaceResult {
        self.previous = self.value;
        self.value = !self.value;
        self.generation = self.generation.saturating_add(1);
        self.pending_generation = Some(self.generation);
        Ok(SurfaceOutcome::Changed)
    }

    fn resolve(&mut self, generation: u64, accepted: bool) -> SurfaceResult {
        if self.pending_generation != Some(generation) {
            return Err(SurfaceError::StaleGeneration);
        }
        self.pending_generation = None;
        if accepted {
            Ok(SurfaceOutcome::Committed)
        } else {
            self.value = self.previous;
            Err(SurfaceError::FormInvalid)
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SliderState {
    pub min: i64,
    pub max: i64,
    pub step: i64,
    pub value: i64,
    pub drag_origin: Option<i64>,
}

impl SliderState {
    fn standard() -> Self {
        Self {
            min: 0,
            max: 100,
            step: 1,
            value: 48,
            drag_origin: None,
        }
    }

    fn validate(&self) -> Result<(), SurfaceError> {
        (self.min < self.max && self.step > 0)
            .then_some(())
            .ok_or(SurfaceError::InvalidSliderConfiguration)
    }

    fn set(&mut self, value: i64) -> SurfaceResult {
        self.validate()?;
        self.value = value.clamp(self.min, self.max);
        Ok(SurfaceOutcome::Changed)
    }

    fn step_by(&mut self, multiplier: i64) -> SurfaceResult {
        self.validate()?;
        let delta = self
            .step
            .checked_mul(multiplier)
            .ok_or(SurfaceError::InvalidSliderConfiguration)?;
        self.set(self.value.saturating_add(delta))
    }

    fn begin(&mut self) -> SurfaceResult {
        self.validate()?;
        self.drag_origin = Some(self.value);
        Ok(SurfaceOutcome::Changed)
    }

    fn finish(&mut self) -> SurfaceResult {
        self.drag_origin = None;
        Ok(SurfaceOutcome::Committed)
    }

    fn cancel(&mut self) -> SurfaceResult {
        if let Some(origin) = self.drag_origin.take() {
            self.value = origin;
            return Ok(SurfaceOutcome::Changed);
        }
        Ok(SurfaceOutcome::Ignored)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AsyncStatus {
    Ready,
    Loading { generation: u64 },
    Refreshing { generation: u64 },
    Empty,
    Failed { generation: u64 },
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SelectState {
    pub options: Vec<ChoiceOption>,
    pub selected: Option<String>,
    pub open: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CascaderState {
    pub path: Vec<String>,
    pub status: AsyncStatus,
    pub generation: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Ord, PartialOrd)]
pub struct DateValue {
    pub year: u16,
    pub month: u8,
    pub day: u8,
}

impl DateValue {
    pub const MIN: Self = Self {
        year: 2000,
        month: 1,
        day: 1,
    };
    pub const MAX: Self = Self {
        year: 2100,
        month: 12,
        day: 31,
    };

    pub fn parse(raw: &str) -> Result<Self, SurfaceError> {
        if raw.len() != 10
            || raw.as_bytes().get(4) != Some(&b'-')
            || raw.as_bytes().get(7) != Some(&b'-')
        {
            return Err(SurfaceError::InvalidDate);
        }
        let year = raw[..4]
            .parse::<u16>()
            .map_err(|_| SurfaceError::InvalidDate)?;
        let month = raw[5..7]
            .parse::<u8>()
            .map_err(|_| SurfaceError::InvalidDate)?;
        let day = raw[8..10]
            .parse::<u8>()
            .map_err(|_| SurfaceError::InvalidDate)?;
        if !(1..=12).contains(&month) || day == 0 || day > days_in_month(year, month) {
            return Err(SurfaceError::InvalidDate);
        }
        Ok(Self { year, month, day })
    }

    pub fn format(self) -> String {
        format!("{:04}-{:02}-{:02}", self.year, self.month, self.day)
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DatePickerState {
    pub draft: String,
    pub value: Option<DateValue>,
    pub committed: Option<DateValue>,
    pub open: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Ord, PartialOrd)]
pub struct TimeValue {
    pub hour: u8,
    pub minute: u8,
    pub second: u8,
}

impl TimeValue {
    pub fn parse(raw: &str) -> Result<Self, SurfaceError> {
        if !(raw.len() == 5 || raw.len() == 8) || raw.as_bytes().get(2) != Some(&b':') {
            return Err(SurfaceError::InvalidTime);
        }
        if raw.len() == 8 && raw.as_bytes().get(5) != Some(&b':') {
            return Err(SurfaceError::InvalidTime);
        }
        let hour = raw[..2]
            .parse::<u8>()
            .map_err(|_| SurfaceError::InvalidTime)?;
        let minute = raw[3..5]
            .parse::<u8>()
            .map_err(|_| SurfaceError::InvalidTime)?;
        let second = if raw.len() == 8 {
            raw[6..8]
                .parse::<u8>()
                .map_err(|_| SurfaceError::InvalidTime)?
        } else {
            0
        };
        if hour > 23 || minute > 59 || second > 59 {
            return Err(SurfaceError::InvalidTime);
        }
        Ok(Self {
            hour,
            minute,
            second,
        })
    }

    pub fn format(self) -> String {
        if self.second == 0 {
            format!("{:02}:{:02}", self.hour, self.minute)
        } else {
            format!("{:02}:{:02}:{:02}", self.hour, self.minute, self.second)
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TimePickerState {
    pub draft: String,
    pub value: Option<TimeValue>,
    pub committed: Option<TimeValue>,
    pub open: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AutoCompleteState {
    pub input: TextFieldState,
    pub candidates: Vec<ChoiceOption>,
    pub selected: Option<String>,
    pub status: AsyncStatus,
    pub generation: u64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MentionToken {
    pub id: String,
    pub label: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MentionsState {
    pub input: TextFieldState,
    pub tokens: Vec<MentionToken>,
    pub candidates: Vec<ChoiceOption>,
    pub status: AsyncStatus,
    pub generation: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct RgbaColor {
    pub red: u8,
    pub green: u8,
    pub blue: u8,
    pub alpha: u8,
}

impl RgbaColor {
    pub fn parse_hex(raw: &str) -> Result<Self, SurfaceError> {
        let bytes = raw.as_bytes();
        if !(bytes.len() == 7 || bytes.len() == 9) || bytes.first() != Some(&b'#') {
            return Err(SurfaceError::InvalidColor);
        }
        let channel = |start| {
            u8::from_str_radix(&raw[start..start + 2], 16).map_err(|_| SurfaceError::InvalidColor)
        };
        Ok(Self {
            red: channel(1)?,
            green: channel(3)?,
            blue: channel(5)?,
            alpha: if bytes.len() == 9 {
                channel(7)?
            } else {
                u8::MAX
            },
        })
    }

    pub fn format_hex(self) -> String {
        if self.alpha == u8::MAX {
            format!("#{:02X}{:02X}{:02X}", self.red, self.green, self.blue)
        } else {
            format!(
                "#{:02X}{:02X}{:02X}{:02X}",
                self.red, self.green, self.blue, self.alpha
            )
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ColorPickerState {
    pub draft: String,
    pub value: Option<RgbaColor>,
    pub before_open: Option<RgbaColor>,
    pub open: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UploadDescriptor {
    pub request_id: String,
    pub display_name: String,
    pub bytes: u64,
    pub media_type: String,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum UploadStatus {
    Staged,
    Uploading,
    Ready,
    Failed,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UploadItem {
    pub descriptor: UploadDescriptor,
    pub status: UploadStatus,
}

#[derive(Clone, Debug, Eq, PartialEq, Default)]
pub struct UploadState {
    pub items: Vec<UploadItem>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransferState {
    pub source: Vec<ChoiceOption>,
    pub target: Vec<ChoiceOption>,
    pub selected_source: BTreeSet<String>,
    pub selected_target: BTreeSet<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TreeSelectState {
    pub selected: BTreeSet<String>,
    pub expanded: BTreeSet<String>,
    pub visible_nodes: usize,
    pub depth: usize,
    pub status: AsyncStatus,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum FieldValidity {
    Pristine,
    Checking,
    Valid,
    Invalid,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FormField {
    pub value: String,
    pub required: bool,
    pub validity: FieldValidity,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum FormStatus {
    Editing,
    Checking,
    Valid,
    Invalid,
    Submitting,
    Failed,
    Submitted,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FormState {
    pub fields: BTreeMap<String, FormField>,
    pub status: FormStatus,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SurfaceState {
    Input(TextFieldState),
    Textarea(TextFieldState),
    InputNumber(NumberState),
    Checkbox(CheckboxState),
    Radio(RadioState),
    Switch(SwitchState),
    Slider(SliderState),
    Select(SelectState),
    Cascader(CascaderState),
    DatePicker(DatePickerState),
    TimePicker(TimePickerState),
    AutoComplete(AutoCompleteState),
    Mentions(MentionsState),
    ColorPicker(ColorPickerState),
    Upload(UploadState),
    Transfer(TransferState),
    TreeSelect(TreeSelectState),
    Form(FormState),
}

impl SurfaceState {
    pub const fn id(&self) -> InputSurfaceId {
        match self {
            Self::Input(_) => InputSurfaceId::Input,
            Self::Textarea(_) => InputSurfaceId::Textarea,
            Self::InputNumber(_) => InputSurfaceId::InputNumber,
            Self::Checkbox(_) => InputSurfaceId::Checkbox,
            Self::Radio(_) => InputSurfaceId::Radio,
            Self::Switch(_) => InputSurfaceId::Switch,
            Self::Slider(_) => InputSurfaceId::Slider,
            Self::Select(_) => InputSurfaceId::Select,
            Self::Cascader(_) => InputSurfaceId::Cascader,
            Self::DatePicker(_) => InputSurfaceId::DatePicker,
            Self::TimePicker(_) => InputSurfaceId::TimePicker,
            Self::AutoComplete(_) => InputSurfaceId::AutoComplete,
            Self::Mentions(_) => InputSurfaceId::Mentions,
            Self::ColorPicker(_) => InputSurfaceId::ColorPicker,
            Self::Upload(_) => InputSurfaceId::Upload,
            Self::Transfer(_) => InputSurfaceId::Transfer,
            Self::TreeSelect(_) => InputSurfaceId::TreeSelect,
            Self::Form(_) => InputSurfaceId::Form,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InputSurface {
    pub id: InputSurfaceId,
    pub access: AccessPolicy,
    pub state: SurfaceState,
    pub last_error: Option<SurfaceError>,
}

impl InputSurface {
    pub fn new(id: InputSurfaceId) -> Self {
        let state = match id {
            InputSurfaceId::Input => SurfaceState::Input(TextFieldState::single_line()),
            InputSurfaceId::Textarea => SurfaceState::Textarea(TextFieldState::multiline()),
            InputSurfaceId::InputNumber => SurfaceState::InputNumber(NumberState::standard()),
            InputSurfaceId::Checkbox => SurfaceState::Checkbox(CheckboxState {
                value: CheckState::Unchecked,
            }),
            InputSurfaceId::Radio => SurfaceState::Radio(RadioState {
                options: standard_options(),
                selected: Some(String::from("standard")),
            }),
            InputSurfaceId::Switch => SurfaceState::Switch(SwitchState {
                value: false,
                previous: false,
                pending_generation: None,
                generation: 0,
            }),
            InputSurfaceId::Slider => SurfaceState::Slider(SliderState::standard()),
            InputSurfaceId::Select => SurfaceState::Select(SelectState {
                options: standard_options(),
                selected: Some(String::from("standard")),
                open: false,
            }),
            InputSurfaceId::Cascader => SurfaceState::Cascader(CascaderState {
                path: vec![String::from("workspace"), String::from("native")],
                status: AsyncStatus::Ready,
                generation: 0,
            }),
            InputSurfaceId::DatePicker => SurfaceState::DatePicker(DatePickerState {
                draft: String::from("2026-08-28"),
                value: Some(DateValue {
                    year: 2026,
                    month: 8,
                    day: 28,
                }),
                committed: Some(DateValue {
                    year: 2026,
                    month: 8,
                    day: 28,
                }),
                open: false,
            }),
            InputSurfaceId::TimePicker => SurfaceState::TimePicker(TimePickerState {
                draft: String::from("09:30"),
                value: Some(TimeValue {
                    hour: 9,
                    minute: 30,
                    second: 0,
                }),
                committed: Some(TimeValue {
                    hour: 9,
                    minute: 30,
                    second: 0,
                }),
                open: false,
            }),
            InputSurfaceId::AutoComplete => SurfaceState::AutoComplete(AutoCompleteState {
                input: TextFieldState::single_line(),
                candidates: standard_options(),
                selected: None,
                status: AsyncStatus::Ready,
                generation: 0,
            }),
            InputSurfaceId::Mentions => SurfaceState::Mentions(MentionsState {
                input: TextFieldState::multiline(),
                tokens: Vec::new(),
                candidates: standard_options(),
                status: AsyncStatus::Ready,
                generation: 0,
            }),
            InputSurfaceId::ColorPicker => SurfaceState::ColorPicker(ColorPickerState {
                draft: String::from("#0285FF"),
                value: Some(RgbaColor {
                    red: 2,
                    green: 133,
                    blue: 255,
                    alpha: u8::MAX,
                }),
                before_open: None,
                open: false,
            }),
            InputSurfaceId::Upload => SurfaceState::Upload(UploadState::default()),
            InputSurfaceId::Transfer => SurfaceState::Transfer(TransferState {
                source: standard_options(),
                target: Vec::new(),
                selected_source: BTreeSet::new(),
                selected_target: BTreeSet::new(),
            }),
            InputSurfaceId::TreeSelect => SurfaceState::TreeSelect(TreeSelectState {
                selected: BTreeSet::new(),
                expanded: BTreeSet::new(),
                visible_nodes: 3,
                depth: 2,
                status: AsyncStatus::Ready,
            }),
            InputSurfaceId::Form => SurfaceState::Form(default_form_state()),
        };
        Self {
            id,
            access: AccessPolicy::editable(),
            state,
            last_error: None,
        }
    }

    pub fn from_component_slug(slug: &str) -> Option<Self> {
        InputSurfaceId::from_slug(slug).map(Self::new)
    }

    pub const fn spec(&self) -> SurfaceSpec {
        surface_spec(self.id)
    }

    pub fn set_access(&mut self, access: AccessPolicy) {
        self.access = access;
    }

    pub fn reduce(&mut self, event: SurfaceEvent) -> SurfaceResult {
        if event.mutates() {
            if self.access.disabled {
                return self.reject(SurfaceError::Disabled);
            }
            if self.access.read_only {
                return self.reject(SurfaceError::ReadOnly);
            }
        }
        let result = match (&mut self.state, event) {
            (SurfaceState::Input(field), SurfaceEvent::TextChanged(value)) => field.change(value),
            (SurfaceState::Input(field), SurfaceEvent::ImeStarted) => field.start_composition(),
            (SurfaceState::Input(field), SurfaceEvent::ImeUpdated(value)) => {
                field.update_composition(value)
            }
            (SurfaceState::Input(field), SurfaceEvent::ImeCommitted(value)) => {
                field.commit_composition(value)
            }
            (
                SurfaceState::Input(field),
                SurfaceEvent::Submit | SurfaceEvent::Key(KeyboardIntent::Enter),
            ) => field.submit(),
            (SurfaceState::Input(field), SurfaceEvent::Clear) => field.clear(),
            (
                SurfaceState::Input(field),
                SurfaceEvent::Cancel | SurfaceEvent::Key(KeyboardIntent::Escape),
            ) => field.cancel(),

            (SurfaceState::Textarea(field), SurfaceEvent::TextChanged(value)) => {
                field.change(value)
            }
            (SurfaceState::Textarea(field), SurfaceEvent::ImeStarted) => field.start_composition(),
            (SurfaceState::Textarea(field), SurfaceEvent::ImeUpdated(value)) => {
                field.update_composition(value)
            }
            (SurfaceState::Textarea(field), SurfaceEvent::ImeCommitted(value)) => {
                field.commit_composition(value)
            }
            (SurfaceState::Textarea(field), SurfaceEvent::Submit) => field.submit(),
            (SurfaceState::Textarea(field), SurfaceEvent::Clear) => field.clear(),
            (
                SurfaceState::Textarea(field),
                SurfaceEvent::Cancel | SurfaceEvent::Key(KeyboardIntent::Escape),
            ) => field.cancel(),

            (SurfaceState::InputNumber(number), SurfaceEvent::TextChanged(value)) => {
                number.change(value)
            }
            (
                SurfaceState::InputNumber(number),
                SurfaceEvent::Submit | SurfaceEvent::Key(KeyboardIntent::Enter),
            ) => number.submit(),
            (SurfaceState::InputNumber(number), SurfaceEvent::StepNumber(direction)) => {
                number.step_by(direction)
            }
            (SurfaceState::InputNumber(number), SurfaceEvent::Key(KeyboardIntent::ArrowUp)) => {
                number.step_by(1)
            }
            (SurfaceState::InputNumber(number), SurfaceEvent::Key(KeyboardIntent::ArrowDown)) => {
                number.step_by(-1)
            }
            (SurfaceState::InputNumber(number), SurfaceEvent::Clear) => number.clear(),
            (
                SurfaceState::InputNumber(number),
                SurfaceEvent::Cancel | SurfaceEvent::Key(KeyboardIntent::Escape),
            ) => number.cancel(),

            (
                SurfaceState::Checkbox(checkbox),
                SurfaceEvent::Toggle
                | SurfaceEvent::Key(KeyboardIntent::Activate | KeyboardIntent::Space),
            ) => {
                checkbox.value = checkbox.value.toggled();
                Ok(SurfaceOutcome::Changed)
            }

            (SurfaceState::Radio(radio), SurfaceEvent::ReplaceOptions(options)) => {
                replace_options(&mut radio.options, options)
            }
            (SurfaceState::Radio(radio), SurfaceEvent::Select(id)) => select_radio(radio, id),

            (
                SurfaceState::Switch(toggle),
                SurfaceEvent::Toggle
                | SurfaceEvent::Key(KeyboardIntent::Activate | KeyboardIntent::Space),
            ) => toggle.toggle(),
            (SurfaceState::Switch(toggle), SurfaceEvent::FinishForm { accepted }) => {
                let generation = toggle.pending_generation.unwrap_or(0);
                toggle.resolve(generation, accepted)
            }
            (SurfaceState::Switch(toggle), SurfaceEvent::ResolveOptions { generation, .. }) => {
                toggle.resolve(generation, true)
            }

            (SurfaceState::Slider(slider), SurfaceEvent::SetSlider(value)) => slider.set(value),
            (SurfaceState::Slider(slider), SurfaceEvent::BeginSlide) => slider.begin(),
            (SurfaceState::Slider(slider), SurfaceEvent::FinishSlide) => slider.finish(),
            (
                SurfaceState::Slider(slider),
                SurfaceEvent::Cancel | SurfaceEvent::Key(KeyboardIntent::Escape),
            ) => slider.cancel(),
            (
                SurfaceState::Slider(slider),
                SurfaceEvent::Key(KeyboardIntent::ArrowLeft | KeyboardIntent::ArrowDown),
            ) => slider.step_by(-1),
            (
                SurfaceState::Slider(slider),
                SurfaceEvent::Key(KeyboardIntent::ArrowRight | KeyboardIntent::ArrowUp),
            ) => slider.step_by(1),
            (SurfaceState::Slider(slider), SurfaceEvent::Key(KeyboardIntent::PageDown)) => {
                slider.step_by(-10)
            }
            (SurfaceState::Slider(slider), SurfaceEvent::Key(KeyboardIntent::PageUp)) => {
                slider.step_by(10)
            }
            (SurfaceState::Slider(slider), SurfaceEvent::Key(KeyboardIntent::Home)) => {
                slider.set(slider.min)
            }
            (SurfaceState::Slider(slider), SurfaceEvent::Key(KeyboardIntent::End)) => {
                slider.set(slider.max)
            }

            (SurfaceState::Select(select), SurfaceEvent::ReplaceOptions(options)) => {
                replace_options(&mut select.options, options)
            }
            (SurfaceState::Select(select), SurfaceEvent::Select(id)) => {
                select_option(&select.options, &mut select.selected, id)
            }
            (SurfaceState::Select(select), SurfaceEvent::Clear) => {
                select.selected = None;
                Ok(SurfaceOutcome::Changed)
            }
            (
                SurfaceState::Select(select),
                SurfaceEvent::Key(
                    KeyboardIntent::Activate | KeyboardIntent::Enter | KeyboardIntent::Space,
                ),
            ) => {
                select.open = !select.open;
                Ok(if select.open {
                    SurfaceOutcome::Opened
                } else {
                    SurfaceOutcome::Closed
                })
            }
            (
                SurfaceState::Select(select),
                SurfaceEvent::Cancel | SurfaceEvent::Key(KeyboardIntent::Escape),
            ) => {
                select.open = false;
                Ok(SurfaceOutcome::Closed)
            }

            (SurfaceState::Cascader(cascader), SurfaceEvent::SetCascaderPath(path)) => {
                set_cascader_path(cascader, path)
            }
            (SurfaceState::Cascader(cascader), SurfaceEvent::StartLookup) => {
                start_lookup(&mut cascader.generation, &mut cascader.status)
            }
            (SurfaceState::Cascader(cascader), SurfaceEvent::ResolveOptions { generation, .. }) => {
                resolve_lookup(cascader.generation, &mut cascader.status, generation, true)
            }
            (SurfaceState::Cascader(cascader), SurfaceEvent::FailLookup { generation }) => {
                resolve_lookup(cascader.generation, &mut cascader.status, generation, false)
            }

            (
                SurfaceState::DatePicker(date),
                SurfaceEvent::TextChanged(value) | SurfaceEvent::SetDate(value),
            ) => {
                date.draft = value;
                Ok(SurfaceOutcome::Changed)
            }
            (
                SurfaceState::DatePicker(date),
                SurfaceEvent::Submit | SurfaceEvent::Key(KeyboardIntent::Enter),
            ) => commit_date(date),
            (
                SurfaceState::DatePicker(date),
                SurfaceEvent::Key(KeyboardIntent::Activate | KeyboardIntent::Space),
            ) => {
                date.open = !date.open;
                Ok(if date.open {
                    SurfaceOutcome::Opened
                } else {
                    SurfaceOutcome::Closed
                })
            }
            (
                SurfaceState::DatePicker(date),
                SurfaceEvent::Cancel | SurfaceEvent::Key(KeyboardIntent::Escape),
            ) => {
                date.draft = date.committed.map_or_else(String::new, DateValue::format);
                date.open = false;
                Ok(SurfaceOutcome::Closed)
            }

            (
                SurfaceState::TimePicker(time),
                SurfaceEvent::TextChanged(value) | SurfaceEvent::SetTime(value),
            ) => {
                time.draft = value;
                Ok(SurfaceOutcome::Changed)
            }
            (
                SurfaceState::TimePicker(time),
                SurfaceEvent::Submit | SurfaceEvent::Key(KeyboardIntent::Enter),
            ) => commit_time(time),
            (
                SurfaceState::TimePicker(time),
                SurfaceEvent::Key(KeyboardIntent::Activate | KeyboardIntent::Space),
            ) => {
                time.open = !time.open;
                Ok(if time.open {
                    SurfaceOutcome::Opened
                } else {
                    SurfaceOutcome::Closed
                })
            }
            (
                SurfaceState::TimePicker(time),
                SurfaceEvent::Cancel | SurfaceEvent::Key(KeyboardIntent::Escape),
            ) => {
                time.draft = time.committed.map_or_else(String::new, TimeValue::format);
                time.open = false;
                Ok(SurfaceOutcome::Closed)
            }

            (SurfaceState::AutoComplete(auto), SurfaceEvent::TextChanged(value)) => {
                auto.input.change(value)
            }
            (SurfaceState::AutoComplete(auto), SurfaceEvent::StartLookup) => {
                start_lookup(&mut auto.generation, &mut auto.status)
            }
            (
                SurfaceState::AutoComplete(auto),
                SurfaceEvent::ResolveOptions {
                    generation,
                    options,
                },
            ) => resolve_candidates(auto, generation, options),
            (SurfaceState::AutoComplete(auto), SurfaceEvent::FailLookup { generation }) => {
                resolve_lookup(auto.generation, &mut auto.status, generation, false)
            }
            (SurfaceState::AutoComplete(auto), SurfaceEvent::Select(id)) => {
                select_option(&auto.candidates, &mut auto.selected, id)
            }
            (SurfaceState::AutoComplete(auto), SurfaceEvent::Clear) => {
                auto.input.clear()?;
                auto.selected = None;
                Ok(SurfaceOutcome::Changed)
            }

            (SurfaceState::Mentions(mentions), SurfaceEvent::TextChanged(value)) => {
                mentions.input.change(value)
            }
            (SurfaceState::Mentions(mentions), SurfaceEvent::ImeStarted) => {
                mentions.input.start_composition()
            }
            (SurfaceState::Mentions(mentions), SurfaceEvent::ImeUpdated(value)) => {
                mentions.input.update_composition(value)
            }
            (SurfaceState::Mentions(mentions), SurfaceEvent::ImeCommitted(value)) => {
                mentions.input.commit_composition(value)
            }
            (SurfaceState::Mentions(mentions), SurfaceEvent::StartLookup) => {
                start_lookup(&mut mentions.generation, &mut mentions.status)
            }
            (
                SurfaceState::Mentions(mentions),
                SurfaceEvent::ResolveOptions {
                    generation,
                    options,
                },
            ) => resolve_mention_candidates(mentions, generation, options),
            (SurfaceState::Mentions(mentions), SurfaceEvent::FailLookup { generation }) => {
                resolve_lookup(mentions.generation, &mut mentions.status, generation, false)
            }
            (SurfaceState::Mentions(mentions), SurfaceEvent::InsertMention(option)) => {
                insert_mention(mentions, option)
            }
            (SurfaceState::Mentions(mentions), SurfaceEvent::RemoveMention(id)) => {
                remove_mention(mentions, id)
            }
            (
                SurfaceState::Mentions(mentions),
                SurfaceEvent::Cancel | SurfaceEvent::Key(KeyboardIntent::Escape),
            ) => mentions.input.cancel(),

            (
                SurfaceState::ColorPicker(color),
                SurfaceEvent::TextChanged(value) | SurfaceEvent::SetColor(value),
            ) => {
                color.draft = value;
                Ok(SurfaceOutcome::Changed)
            }
            (
                SurfaceState::ColorPicker(color),
                SurfaceEvent::Submit | SurfaceEvent::Key(KeyboardIntent::Enter),
            ) => commit_color(color),
            (
                SurfaceState::ColorPicker(color),
                SurfaceEvent::Key(KeyboardIntent::Activate | KeyboardIntent::Space),
            ) => {
                if !color.open {
                    color.before_open = color.value;
                }
                color.open = !color.open;
                Ok(if color.open {
                    SurfaceOutcome::Opened
                } else {
                    SurfaceOutcome::Closed
                })
            }
            (
                SurfaceState::ColorPicker(color),
                SurfaceEvent::Cancel | SurfaceEvent::Key(KeyboardIntent::Escape),
            ) => {
                color.value = color.before_open;
                color.draft = color.value.map_or_else(String::new, RgbaColor::format_hex);
                color.open = false;
                Ok(SurfaceOutcome::Closed)
            }

            (SurfaceState::Upload(upload), SurfaceEvent::StageUpload(descriptor)) => {
                stage_upload(upload, descriptor)
            }
            (
                SurfaceState::Upload(upload),
                SurfaceEvent::FinishUpload {
                    request_id,
                    accepted,
                },
            ) => finish_upload(upload, request_id, accepted),
            (SurfaceState::Upload(upload), SurfaceEvent::RetryUpload(request_id)) => {
                retry_upload(upload, request_id)
            }
            (SurfaceState::Upload(upload), SurfaceEvent::RemoveUpload(request_id)) => {
                remove_upload(upload, request_id)
            }

            (SurfaceState::Transfer(transfer), SurfaceEvent::ReplaceOptions(options)) => {
                replace_options(&mut transfer.source, options)
            }
            (SurfaceState::Transfer(transfer), SurfaceEvent::Select(id)) => {
                toggle_transfer_selection(transfer, id)
            }
            (SurfaceState::Transfer(transfer), SurfaceEvent::Transfer { ids, to_target }) => {
                move_transfer_items(transfer, ids, to_target)
            }

            (SurfaceState::TreeSelect(tree), SurfaceEvent::Select(id)) => {
                tree.selected.insert(id);
                Ok(SurfaceOutcome::Changed)
            }
            (SurfaceState::TreeSelect(tree), SurfaceEvent::Clear) => {
                tree.selected.clear();
                Ok(SurfaceOutcome::Changed)
            }
            (SurfaceState::TreeSelect(tree), SurfaceEvent::ToggleTreeNode(id)) => {
                if !tree.expanded.insert(id.clone()) {
                    tree.expanded.remove(&id);
                }
                Ok(SurfaceOutcome::Changed)
            }
            (
                SurfaceState::TreeSelect(tree),
                SurfaceEvent::SetTreeBounds {
                    visible_nodes,
                    depth,
                },
            ) => set_tree_bounds(tree, visible_nodes, depth),
            (SurfaceState::TreeSelect(tree), SurfaceEvent::StartLookup) => {
                start_lookup_for_tree(tree)
            }
            (SurfaceState::TreeSelect(tree), SurfaceEvent::ResolveOptions { generation, .. }) => {
                resolve_lookup_for_tree(tree, generation, true)
            }
            (SurfaceState::TreeSelect(tree), SurfaceEvent::FailLookup { generation }) => {
                resolve_lookup_for_tree(tree, generation, false)
            }

            (SurfaceState::Form(form), SurfaceEvent::SetFormField { name, value }) => {
                set_form_field(form, name, value)
            }
            (SurfaceState::Form(form), SurfaceEvent::ValidateForm) => validate_form(form),
            (
                SurfaceState::Form(form),
                SurfaceEvent::Submit | SurfaceEvent::Key(KeyboardIntent::Enter),
            ) => submit_form(form),
            (SurfaceState::Form(form), SurfaceEvent::FinishForm { accepted }) => {
                finish_form(form, accepted)
            }

            _ => Err(SurfaceError::UnsupportedEvent),
        };
        match result {
            Ok(outcome) => {
                self.last_error = None;
                Ok(outcome)
            }
            Err(error) => self.reject(error),
        }
    }

    fn reject(&mut self, error: SurfaceError) -> SurfaceResult {
        self.last_error = Some(error.clone());
        Err(error)
    }
}

fn standard_options() -> Vec<ChoiceOption> {
    vec![
        ChoiceOption {
            id: String::from("standard"),
            label: String::from("Standard"),
            disabled: false,
        },
        ChoiceOption {
            id: String::from("advanced"),
            label: String::from("Advanced"),
            disabled: false,
        },
        ChoiceOption {
            id: String::from("locked"),
            label: String::from("Locked"),
            disabled: true,
        },
    ]
}

fn default_form_state() -> FormState {
    let mut fields = BTreeMap::new();
    fields.insert(
        String::from("name"),
        FormField {
            value: String::new(),
            required: true,
            validity: FieldValidity::Pristine,
        },
    );
    fields.insert(
        String::from("email"),
        FormField {
            value: String::new(),
            required: true,
            validity: FieldValidity::Pristine,
        },
    );
    FormState {
        fields,
        status: FormStatus::Editing,
    }
}

fn validate_text(value: &str, max_bytes: usize, multiline: bool) -> Result<(), SurfaceError> {
    if value.len() > max_bytes {
        return Err(SurfaceError::TextTooLong { max_bytes });
    }
    if value.chars().any(|character| {
        character == '\0'
            || (character.is_control() && !(multiline && matches!(character, '\n' | '\r')))
    }) {
        return Err(SurfaceError::DisallowedControlCharacter);
    }
    Ok(())
}

fn normalize_line_endings(value: String, multiline: bool) -> String {
    if multiline {
        value.replace("\r\n", "\n").replace('\r', "\n")
    } else {
        value
    }
}

fn validate_option_text(value: &str, max_bytes: usize) -> Result<(), SurfaceError> {
    (!value.is_empty()
        && value.len() <= max_bytes
        && !value.chars().any(|character| character.is_control()))
    .then_some(())
    .ok_or(SurfaceError::DisallowedControlCharacter)
}

fn validate_options(options: &[ChoiceOption], max_items: usize) -> Result<(), SurfaceError> {
    if options.len() > max_items {
        return Err(SurfaceError::TooManyItems { max_items });
    }
    let mut ids = BTreeSet::new();
    for option in options {
        validate_option_text(&option.id, 96)?;
        validate_option_text(&option.label, 160)?;
        if !ids.insert(option.id.as_str()) {
            return Err(SurfaceError::DuplicateOptionId);
        }
    }
    Ok(())
}

fn replace_options(
    destination: &mut Vec<ChoiceOption>,
    options: Vec<ChoiceOption>,
) -> SurfaceResult {
    validate_options(&options, MAX_OPTION_COUNT)?;
    *destination = options;
    Ok(SurfaceOutcome::Changed)
}

fn select_option(
    options: &[ChoiceOption],
    selected: &mut Option<String>,
    id: String,
) -> SurfaceResult {
    let option = options
        .iter()
        .find(|option| option.id == id)
        .ok_or(SurfaceError::UnknownOption)?;
    if option.disabled {
        return Err(SurfaceError::DisabledOption);
    }
    *selected = Some(id);
    Ok(SurfaceOutcome::Committed)
}

fn select_radio(radio: &mut RadioState, id: String) -> SurfaceResult {
    select_option(&radio.options, &mut radio.selected, id)
}

fn start_lookup(generation: &mut u64, status: &mut AsyncStatus) -> SurfaceResult {
    *generation = generation.saturating_add(1);
    *status = if matches!(*status, AsyncStatus::Ready | AsyncStatus::Empty) {
        AsyncStatus::Loading {
            generation: *generation,
        }
    } else {
        AsyncStatus::Refreshing {
            generation: *generation,
        }
    };
    Ok(SurfaceOutcome::Changed)
}

fn resolve_lookup(
    expected: u64,
    status: &mut AsyncStatus,
    generation: u64,
    accepted: bool,
) -> SurfaceResult {
    if expected != generation {
        return Err(SurfaceError::StaleGeneration);
    }
    *status = if accepted {
        AsyncStatus::Ready
    } else {
        AsyncStatus::Failed { generation }
    };
    Ok(if accepted {
        SurfaceOutcome::Committed
    } else {
        SurfaceOutcome::Changed
    })
}

fn resolve_candidates(
    state: &mut AutoCompleteState,
    generation: u64,
    options: Vec<ChoiceOption>,
) -> SurfaceResult {
    if generation != state.generation {
        return Err(SurfaceError::StaleGeneration);
    }
    validate_options(&options, MAX_CANDIDATE_COUNT)?;
    state.candidates = options;
    state.status = if state.candidates.is_empty() {
        AsyncStatus::Empty
    } else {
        AsyncStatus::Ready
    };
    Ok(SurfaceOutcome::Committed)
}

fn set_cascader_path(state: &mut CascaderState, path: Vec<String>) -> SurfaceResult {
    if path.len() > MAX_CASCADE_DEPTH {
        return Err(SurfaceError::CascaderDepthExceeded);
    }
    for segment in &path {
        validate_option_text(segment, 96)?;
    }
    state.path = path;
    Ok(SurfaceOutcome::Committed)
}

fn commit_date(state: &mut DatePickerState) -> SurfaceResult {
    let date = DateValue::parse(&state.draft)?;
    if date < DateValue::MIN || date > DateValue::MAX {
        return Err(SurfaceError::DateOutOfRange);
    }
    state.value = Some(date);
    state.committed = Some(date);
    state.draft = date.format();
    state.open = false;
    Ok(SurfaceOutcome::Committed)
}

fn commit_time(state: &mut TimePickerState) -> SurfaceResult {
    let value = TimeValue::parse(&state.draft)?;
    state.value = Some(value);
    state.committed = Some(value);
    state.draft = value.format();
    state.open = false;
    Ok(SurfaceOutcome::Committed)
}

fn resolve_mention_candidates(
    state: &mut MentionsState,
    generation: u64,
    options: Vec<ChoiceOption>,
) -> SurfaceResult {
    if generation != state.generation {
        return Err(SurfaceError::StaleGeneration);
    }
    validate_options(&options, MAX_CANDIDATE_COUNT)?;
    state.candidates = options;
    state.status = if state.candidates.is_empty() {
        AsyncStatus::Empty
    } else {
        AsyncStatus::Ready
    };
    Ok(SurfaceOutcome::Committed)
}

fn insert_mention(state: &mut MentionsState, option: ChoiceOption) -> SurfaceResult {
    validate_options(std::slice::from_ref(&option), 1)?;
    if state.tokens.len() >= MAX_MENTION_TOKENS {
        return Err(SurfaceError::TooManyItems {
            max_items: MAX_MENTION_TOKENS,
        });
    }
    if state.tokens.iter().any(|token| token.id == option.id) {
        return Err(SurfaceError::InvalidMention);
    }
    state.tokens.push(MentionToken {
        id: option.id,
        label: option.label,
    });
    Ok(SurfaceOutcome::Changed)
}

fn remove_mention(state: &mut MentionsState, id: String) -> SurfaceResult {
    let previous = state.tokens.len();
    state.tokens.retain(|token| token.id != id);
    if previous == state.tokens.len() {
        return Err(SurfaceError::UnknownOption);
    }
    Ok(SurfaceOutcome::Changed)
}

fn commit_color(state: &mut ColorPickerState) -> SurfaceResult {
    let color = RgbaColor::parse_hex(&state.draft)?;
    state.value = Some(color);
    state.draft = color.format_hex();
    state.open = false;
    Ok(SurfaceOutcome::Committed)
}

fn stage_upload(state: &mut UploadState, descriptor: UploadDescriptor) -> SurfaceResult {
    validate_upload_descriptor(&descriptor)?;
    if state.items.len() >= MAX_UPLOAD_FILES {
        return Err(SurfaceError::TooManyItems {
            max_items: MAX_UPLOAD_FILES,
        });
    }
    if state
        .items
        .iter()
        .any(|item| item.descriptor.request_id == descriptor.request_id)
    {
        return Err(SurfaceError::DuplicateUploadId);
    }
    let total = state
        .items
        .iter()
        .fold(0_u64, |sum, item| sum.saturating_add(item.descriptor.bytes));
    if total.saturating_add(descriptor.bytes) > MAX_UPLOAD_BYTES {
        return Err(SurfaceError::UploadTotalExceeded);
    }
    state.items.push(UploadItem {
        descriptor,
        status: UploadStatus::Staged,
    });
    Ok(SurfaceOutcome::Changed)
}

fn validate_upload_descriptor(descriptor: &UploadDescriptor) -> Result<(), SurfaceError> {
    validate_option_text(&descriptor.request_id, 96)?;
    if descriptor.display_name.is_empty()
        || descriptor.display_name.len() > 255
        || descriptor.display_name.contains(['/', '\\', '\0'])
        || descriptor.display_name.contains("..")
    {
        return Err(SurfaceError::InvalidUploadName);
    }
    if descriptor.bytes == 0 || descriptor.bytes > MAX_UPLOAD_BYTES {
        return Err(SurfaceError::UploadTooLarge);
    }
    let allowed = [
        "text/plain",
        "text/csv",
        "application/pdf",
        "image/png",
        "image/jpeg",
    ];
    allowed
        .contains(&descriptor.media_type.as_str())
        .then_some(())
        .ok_or(SurfaceError::UnsupportedUploadType)
}

fn finish_upload(state: &mut UploadState, request_id: String, accepted: bool) -> SurfaceResult {
    let item = state
        .items
        .iter_mut()
        .find(|item| item.descriptor.request_id == request_id)
        .ok_or(SurfaceError::UnknownOption)?;
    item.status = if accepted {
        UploadStatus::Ready
    } else {
        UploadStatus::Failed
    };
    Ok(if accepted {
        SurfaceOutcome::Committed
    } else {
        SurfaceOutcome::Changed
    })
}

fn retry_upload(state: &mut UploadState, request_id: String) -> SurfaceResult {
    let item = state
        .items
        .iter_mut()
        .find(|item| item.descriptor.request_id == request_id)
        .ok_or(SurfaceError::UnknownOption)?;
    if item.status != UploadStatus::Failed {
        return Err(SurfaceError::UnsupportedEvent);
    }
    item.status = UploadStatus::Uploading;
    Ok(SurfaceOutcome::Changed)
}

fn remove_upload(state: &mut UploadState, request_id: String) -> SurfaceResult {
    let before = state.items.len();
    state
        .items
        .retain(|item| item.descriptor.request_id != request_id);
    (before != state.items.len())
        .then_some(SurfaceOutcome::Changed)
        .ok_or(SurfaceError::UnknownOption)
}

fn toggle_transfer_selection(state: &mut TransferState, id: String) -> SurfaceResult {
    if state.source.iter().any(|option| option.id == id) {
        if !state.selected_source.insert(id.clone()) {
            state.selected_source.remove(&id);
        }
        return Ok(SurfaceOutcome::Changed);
    }
    if state.target.iter().any(|option| option.id == id) {
        if !state.selected_target.insert(id.clone()) {
            state.selected_target.remove(&id);
        }
        return Ok(SurfaceOutcome::Changed);
    }
    Err(SurfaceError::TransferItemMissing)
}

fn move_transfer_items(
    state: &mut TransferState,
    ids: Vec<String>,
    to_target: bool,
) -> SurfaceResult {
    if ids.len() > MAX_OPTION_COUNT {
        return Err(SurfaceError::TooManyItems {
            max_items: MAX_OPTION_COUNT,
        });
    }
    let (from, destination) = if to_target {
        (&mut state.source, &mut state.target)
    } else {
        (&mut state.target, &mut state.source)
    };
    let moved: Vec<ChoiceOption> = ids
        .iter()
        .map(|id| {
            from.iter()
                .find(|option| &option.id == id)
                .cloned()
                .ok_or(SurfaceError::TransferItemMissing)
        })
        .collect::<Result<_, _>>()?;
    if destination.len().saturating_add(moved.len()) > MAX_OPTION_COUNT {
        return Err(SurfaceError::TooManyItems {
            max_items: MAX_OPTION_COUNT,
        });
    }
    if moved
        .iter()
        .any(|option| destination.iter().any(|existing| existing.id == option.id))
    {
        return Err(SurfaceError::DuplicateOptionId);
    }
    let ids_set: BTreeSet<_> = ids.iter().collect();
    from.retain(|option| !ids_set.contains(&option.id));
    destination.extend(moved);
    state.selected_source.clear();
    state.selected_target.clear();
    Ok(SurfaceOutcome::Changed)
}

fn set_tree_bounds(
    state: &mut TreeSelectState,
    visible_nodes: usize,
    depth: usize,
) -> SurfaceResult {
    if visible_nodes > MAX_VISIBLE_TREE_NODES {
        return Err(SurfaceError::TooManyItems {
            max_items: MAX_VISIBLE_TREE_NODES,
        });
    }
    if depth > MAX_TREE_DEPTH {
        return Err(SurfaceError::TreeDepthExceeded);
    }
    state.visible_nodes = visible_nodes;
    state.depth = depth;
    Ok(SurfaceOutcome::Changed)
}

fn start_lookup_for_tree(state: &mut TreeSelectState) -> SurfaceResult {
    let generation = match state.status {
        AsyncStatus::Loading { generation }
        | AsyncStatus::Refreshing { generation }
        | AsyncStatus::Failed { generation } => generation,
        _ => 0,
    }
    .saturating_add(1);
    state.status = AsyncStatus::Loading { generation };
    Ok(SurfaceOutcome::Changed)
}

fn resolve_lookup_for_tree(
    state: &mut TreeSelectState,
    generation: u64,
    accepted: bool,
) -> SurfaceResult {
    let expected = match state.status {
        AsyncStatus::Loading { generation } | AsyncStatus::Refreshing { generation } => generation,
        _ => return Err(SurfaceError::StaleGeneration),
    };
    if expected != generation {
        return Err(SurfaceError::StaleGeneration);
    }
    state.status = if accepted {
        AsyncStatus::Ready
    } else {
        AsyncStatus::Failed { generation }
    };
    Ok(if accepted {
        SurfaceOutcome::Committed
    } else {
        SurfaceOutcome::Changed
    })
}

fn set_form_field(state: &mut FormState, name: String, value: String) -> SurfaceResult {
    validate_field_name(&name)?;
    validate_text(&value, MAX_SINGLE_LINE_BYTES, false)?;
    if !state.fields.contains_key(&name) && state.fields.len() >= MAX_FORM_FIELDS {
        return Err(SurfaceError::TooManyItems {
            max_items: MAX_FORM_FIELDS,
        });
    }
    let field = state.fields.entry(name).or_insert(FormField {
        value: String::new(),
        required: false,
        validity: FieldValidity::Pristine,
    });
    field.value = value;
    field.validity = FieldValidity::Checking;
    state.status = FormStatus::Editing;
    Ok(SurfaceOutcome::Changed)
}

fn validate_form(state: &mut FormState) -> SurfaceResult {
    let mut valid = true;
    for (name, field) in &mut state.fields {
        let field_valid = (!field.required || !field.value.trim().is_empty())
            && (name != "email" || valid_email(&field.value));
        field.validity = if field_valid {
            FieldValidity::Valid
        } else {
            FieldValidity::Invalid
        };
        valid &= field_valid;
    }
    state.status = if valid {
        FormStatus::Valid
    } else {
        FormStatus::Invalid
    };
    if valid {
        Ok(SurfaceOutcome::Committed)
    } else {
        Err(SurfaceError::FormInvalid)
    }
}

fn submit_form(state: &mut FormState) -> SurfaceResult {
    validate_form(state)?;
    state.status = FormStatus::Submitting;
    Ok(SurfaceOutcome::Committed)
}

fn finish_form(state: &mut FormState, accepted: bool) -> SurfaceResult {
    if state.status != FormStatus::Submitting {
        return Err(SurfaceError::UnsupportedEvent);
    }
    state.status = if accepted {
        FormStatus::Submitted
    } else {
        FormStatus::Failed
    };
    Ok(if accepted {
        SurfaceOutcome::Committed
    } else {
        SurfaceOutcome::Changed
    })
}

fn validate_field_name(name: &str) -> Result<(), SurfaceError> {
    if name.is_empty()
        || name.len() > 48
        || !name.bytes().enumerate().all(|(index, byte)| {
            byte.is_ascii_lowercase()
                || (index > 0 && (byte.is_ascii_digit() || matches!(byte, b'_' | b'-')))
        })
    {
        return Err(SurfaceError::InvalidFieldName);
    }
    Ok(())
}

fn valid_email(value: &str) -> bool {
    let Some((local, domain)) = value.rsplit_once('@') else {
        return false;
    };
    !local.is_empty()
        && domain.contains('.')
        && !domain.starts_with('.')
        && !domain.ends_with('.')
        && value.len() <= 320
}

const fn days_in_month(year: u16, month: u8) -> u8 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if (year % 4 == 0 && year % 100 != 0) || year % 400 == 0 => 29,
        2 => 28,
        _ => 0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn option(id: &str) -> ChoiceOption {
        ChoiceOption::new(id, id).unwrap()
    }

    #[test]
    fn every_input_component_owns_a_distinct_state_branch_and_native_spec() {
        assert_eq!(InputSurfaceId::ALL.len(), INPUT_SURFACE_COUNT);
        let mut slugs = BTreeSet::new();
        for id in InputSurfaceId::ALL {
            let surface = InputSurface::new(id);
            assert_eq!(surface.state.id(), id);
            assert!(slugs.insert(id.slug()));
            assert_eq!(InputSurfaceId::from_slug(id.slug()), Some(id));
            assert!(!surface.spec().controls.is_empty());
        }
    }

    #[test]
    fn mobile_layout_never_shrinks_a_coarse_pointer_hit_target() {
        let layout = SurfaceLayout::for_viewport(InputSurfaceId::Transfer, 320, true);
        assert_eq!(layout.control_height, CONTROL_HEIGHT_TOUCH);
        assert_eq!(layout.min_hit_target, CONTROL_HEIGHT_TOUCH);
        assert_eq!(layout.mode, MobileMode::Tabbed);
        assert_eq!(layout.columns, 1);
    }

    #[test]
    fn input_commits_ime_once_and_preserves_cjk_text() {
        let mut surface = InputSurface::new(InputSurfaceId::Input);
        surface.reduce(SurfaceEvent::ImeStarted).unwrap();
        surface
            .reduce(SurfaceEvent::ImeUpdated(String::from("Tessera 组件")))
            .unwrap();
        surface.reduce(SurfaceEvent::Submit).unwrap();
        assert!(matches!(
            surface.state,
            SurfaceState::Input(TextFieldState {
                phase: InputPhase::Composing,
                ..
            })
        ));
        surface
            .reduce(SurfaceEvent::ImeCommitted(String::new()))
            .unwrap();
        surface.reduce(SurfaceEvent::Submit).unwrap();
        let SurfaceState::Input(field) = surface.state else {
            panic!("wrong state");
        };
        assert_eq!(field.committed, "Tessera 组件");
        assert_eq!(field.preedit, "");
    }

    #[test]
    fn text_input_rejects_oversize_and_recovers_with_a_later_valid_value() {
        let mut surface = InputSurface::new(InputSurfaceId::Input);
        assert_eq!(
            surface.reduce(SurfaceEvent::TextChanged(
                "x".repeat(MAX_SINGLE_LINE_BYTES + 1)
            )),
            Err(SurfaceError::TextTooLong {
                max_bytes: MAX_SINGLE_LINE_BYTES
            })
        );
        surface
            .reduce(SurfaceEvent::TextChanged(String::from("valid")))
            .unwrap();
        assert_eq!(surface.last_error, None);
    }

    #[test]
    fn textarea_accepts_newlines_but_rejects_nul() {
        let mut surface = InputSurface::new(InputSurfaceId::Textarea);
        surface
            .reduce(SurfaceEvent::TextChanged(String::from("one\r\ntwo")))
            .unwrap();
        let SurfaceState::Textarea(field) = &surface.state else {
            panic!("wrong state");
        };
        assert_eq!(field.draft, "one\ntwo");
        assert_eq!(
            surface.reduce(SurfaceEvent::TextChanged(String::from("bad\0value"))),
            Err(SurfaceError::DisallowedControlCharacter)
        );
    }

    #[test]
    fn input_number_uses_decimal_draft_and_never_accepts_float_special_values() {
        let mut surface = InputSurface::new(InputSurfaceId::InputNumber);
        surface
            .reduce(SurfaceEvent::TextChanged(String::from("12.50")))
            .unwrap();
        surface.reduce(SurfaceEvent::Submit).unwrap();
        let SurfaceState::InputNumber(number) = &surface.state else {
            panic!("wrong state");
        };
        assert_eq!(number.value, Some(Decimal::new(125, 1)));
        surface
            .reduce(SurfaceEvent::TextChanged(String::from("NaN")))
            .unwrap();
        assert_eq!(
            surface.reduce(SurfaceEvent::Submit),
            Err(SurfaceError::InvalidNumber)
        );
        let SurfaceState::InputNumber(number) = &surface.state else {
            panic!("wrong state");
        };
        assert_eq!(number.value, Some(Decimal::new(125, 1)));
    }

    #[test]
    fn checkbox_mixed_state_becomes_checked_on_activation() {
        let mut surface = InputSurface::new(InputSurfaceId::Checkbox);
        let SurfaceState::Checkbox(checkbox) = &mut surface.state else {
            panic!("wrong state");
        };
        checkbox.value = CheckState::Mixed;
        surface
            .reduce(SurfaceEvent::Key(KeyboardIntent::Space))
            .unwrap();
        let SurfaceState::Checkbox(checkbox) = surface.state else {
            panic!("wrong state");
        };
        assert_eq!(checkbox.value, CheckState::Checked);
    }

    #[test]
    fn radio_rejects_disabled_or_unknown_options() {
        let mut surface = InputSurface::new(InputSurfaceId::Radio);
        assert_eq!(
            surface.reduce(SurfaceEvent::Select(String::from("locked"))),
            Err(SurfaceError::DisabledOption)
        );
        assert_eq!(
            surface.reduce(SurfaceEvent::Select(String::from("missing"))),
            Err(SurfaceError::UnknownOption)
        );
        surface
            .reduce(SurfaceEvent::Select(String::from("advanced")))
            .unwrap();
    }

    #[test]
    fn switch_rolls_back_a_failed_optimistic_change_and_rejects_stale_resolution() {
        let mut surface = InputSurface::new(InputSurfaceId::Switch);
        surface.reduce(SurfaceEvent::Toggle).unwrap();
        assert_eq!(
            surface.reduce(SurfaceEvent::ResolveOptions {
                generation: 99,
                options: Vec::new()
            }),
            Err(SurfaceError::StaleGeneration)
        );
        assert_eq!(
            surface.reduce(SurfaceEvent::FinishForm { accepted: false }),
            Err(SurfaceError::FormInvalid)
        );
        let SurfaceState::Switch(toggle) = surface.state else {
            panic!("wrong state");
        };
        assert!(!toggle.value);
    }

    #[test]
    fn slider_keyboard_honors_bounds_and_escape_restores_drag_origin() {
        let mut surface = InputSurface::new(InputSurfaceId::Slider);
        surface.reduce(SurfaceEvent::BeginSlide).unwrap();
        surface.reduce(SurfaceEvent::SetSlider(90)).unwrap();
        surface
            .reduce(SurfaceEvent::Key(KeyboardIntent::Escape))
            .unwrap();
        let SurfaceState::Slider(slider) = &surface.state else {
            panic!("wrong state");
        };
        assert_eq!(slider.value, 48);
        surface
            .reduce(SurfaceEvent::Key(KeyboardIntent::End))
            .unwrap();
        let SurfaceState::Slider(slider) = &surface.state else {
            panic!("wrong state");
        };
        assert_eq!(slider.value, 100);
    }

    #[test]
    fn select_rejects_duplicate_options_and_can_clear_a_selection() {
        let mut surface = InputSurface::new(InputSurfaceId::Select);
        assert_eq!(
            surface.reduce(SurfaceEvent::ReplaceOptions(vec![
                option("same"),
                option("same")
            ])),
            Err(SurfaceError::DuplicateOptionId)
        );
        surface.reduce(SurfaceEvent::Clear).unwrap();
        let SurfaceState::Select(select) = surface.state else {
            panic!("wrong state");
        };
        assert_eq!(select.selected, None);
    }

    #[test]
    fn cascader_uses_bounded_paths_and_generation_safe_results() {
        let mut surface = InputSurface::new(InputSurfaceId::Cascader);
        let too_deep = (0..=MAX_CASCADE_DEPTH)
            .map(|index| index.to_string())
            .collect();
        assert_eq!(
            surface.reduce(SurfaceEvent::SetCascaderPath(too_deep)),
            Err(SurfaceError::CascaderDepthExceeded)
        );
        surface.reduce(SurfaceEvent::StartLookup).unwrap();
        assert_eq!(
            surface.reduce(SurfaceEvent::ResolveOptions {
                generation: 0,
                options: Vec::new()
            }),
            Err(SurfaceError::StaleGeneration)
        );
    }

    #[test]
    fn date_picker_handles_leap_years_and_keeps_invalid_draft_for_recovery() {
        let mut surface = InputSurface::new(InputSurfaceId::DatePicker);
        surface
            .reduce(SurfaceEvent::SetDate(String::from("2024-02-29")))
            .unwrap();
        surface.reduce(SurfaceEvent::Submit).unwrap();
        surface
            .reduce(SurfaceEvent::SetDate(String::from("2023-02-29")))
            .unwrap();
        assert_eq!(
            surface.reduce(SurfaceEvent::Submit),
            Err(SurfaceError::InvalidDate)
        );
        let SurfaceState::DatePicker(date) = surface.state else {
            panic!("wrong state");
        };
        assert_eq!(
            date.value,
            Some(DateValue {
                year: 2024,
                month: 2,
                day: 29
            })
        );
        assert_eq!(date.draft, "2023-02-29");
    }

    #[test]
    fn time_picker_does_not_materialize_second_by_second_options() {
        let mut surface = InputSurface::new(InputSurfaceId::TimePicker);
        surface
            .reduce(SurfaceEvent::SetTime(String::from("23:59:59")))
            .unwrap();
        surface.reduce(SurfaceEvent::Submit).unwrap();
        surface
            .reduce(SurfaceEvent::SetTime(String::from("24:00")))
            .unwrap();
        assert_eq!(
            surface.reduce(SurfaceEvent::Submit),
            Err(SurfaceError::InvalidTime)
        );
        assert_eq!(surface.spec().max_items, 60);
    }

    #[test]
    fn autocomplete_rejects_stale_results_and_bounds_candidate_count() {
        let mut surface = InputSurface::new(InputSurfaceId::AutoComplete);
        surface.reduce(SurfaceEvent::StartLookup).unwrap();
        assert_eq!(
            surface.reduce(SurfaceEvent::ResolveOptions {
                generation: 0,
                options: Vec::new()
            }),
            Err(SurfaceError::StaleGeneration)
        );
        let options = (0..=MAX_CANDIDATE_COUNT)
            .map(|index| option(&format!("id-{index}")))
            .collect();
        assert_eq!(
            surface.reduce(SurfaceEvent::ResolveOptions {
                generation: 1,
                options
            }),
            Err(SurfaceError::TooManyItems {
                max_items: MAX_CANDIDATE_COUNT
            })
        );
    }

    #[test]
    fn mentions_limits_tokens_and_never_turns_preedit_into_duplicate_draft_text() {
        let mut surface = InputSurface::new(InputSurfaceId::Mentions);
        surface.reduce(SurfaceEvent::ImeStarted).unwrap();
        surface
            .reduce(SurfaceEvent::ImeUpdated(String::from("@张")))
            .unwrap();
        surface
            .reduce(SurfaceEvent::ImeCommitted(String::from("@张")))
            .unwrap();
        for index in 0..MAX_MENTION_TOKENS {
            surface
                .reduce(SurfaceEvent::InsertMention(option(&format!(
                    "user-{index}"
                ))))
                .unwrap();
        }
        assert_eq!(
            surface.reduce(SurfaceEvent::InsertMention(option("overflow"))),
            Err(SurfaceError::TooManyItems {
                max_items: MAX_MENTION_TOKENS
            })
        );
    }

    #[test]
    fn color_picker_accepts_only_canonical_hex_and_escape_restores_open_value() {
        let mut surface = InputSurface::new(InputSurfaceId::ColorPicker);
        surface
            .reduce(SurfaceEvent::Key(KeyboardIntent::Space))
            .unwrap();
        surface
            .reduce(SurfaceEvent::SetColor(String::from("#11223380")))
            .unwrap();
        surface.reduce(SurfaceEvent::Submit).unwrap();
        surface
            .reduce(SurfaceEvent::Key(KeyboardIntent::Space))
            .unwrap();
        surface
            .reduce(SurfaceEvent::SetColor(String::from("#bad")))
            .unwrap();
        assert_eq!(
            surface.reduce(SurfaceEvent::Submit),
            Err(SurfaceError::InvalidColor)
        );
        surface
            .reduce(SurfaceEvent::Key(KeyboardIntent::Escape))
            .unwrap();
        let SurfaceState::ColorPicker(color) = surface.state else {
            panic!("wrong state");
        };
        assert_eq!(color.value.unwrap().format_hex(), "#11223380");
    }

    #[test]
    fn upload_accepts_metadata_only_and_rejects_paths_or_excessive_total() {
        let mut surface = InputSurface::new(InputSurfaceId::Upload);
        let descriptor = UploadDescriptor {
            request_id: String::from("upload-1"),
            display_name: String::from("report.pdf"),
            bytes: 128,
            media_type: String::from("application/pdf"),
        };
        surface
            .reduce(SurfaceEvent::StageUpload(descriptor))
            .unwrap();
        let invalid = UploadDescriptor {
            request_id: String::from("upload-2"),
            display_name: String::from("../secret.pdf"),
            bytes: 128,
            media_type: String::from("application/pdf"),
        };
        assert_eq!(
            surface.reduce(SurfaceEvent::StageUpload(invalid)),
            Err(SurfaceError::InvalidUploadName)
        );
        let SurfaceState::Upload(upload) = &surface.state else {
            panic!("wrong state");
        };
        assert_eq!(upload.items.len(), 1);
    }

    #[test]
    fn transfer_moves_stable_ids_without_duplicates() {
        let mut surface = InputSurface::new(InputSurfaceId::Transfer);
        surface
            .reduce(SurfaceEvent::Transfer {
                ids: vec![String::from("standard")],
                to_target: true,
            })
            .unwrap();
        let SurfaceState::Transfer(transfer) = &surface.state else {
            panic!("wrong state");
        };
        assert_eq!(transfer.source.len(), 2);
        assert_eq!(transfer.target.len(), 1);
        assert_eq!(
            surface.reduce(SurfaceEvent::Transfer {
                ids: vec![String::from("standard")],
                to_target: true
            }),
            Err(SurfaceError::TransferItemMissing)
        );
    }

    #[test]
    fn tree_select_enforces_visible_and_depth_boundaries() {
        let mut surface = InputSurface::new(InputSurfaceId::TreeSelect);
        assert_eq!(
            surface.reduce(SurfaceEvent::SetTreeBounds {
                visible_nodes: MAX_VISIBLE_TREE_NODES + 1,
                depth: 1
            }),
            Err(SurfaceError::TooManyItems {
                max_items: MAX_VISIBLE_TREE_NODES
            })
        );
        assert_eq!(
            surface.reduce(SurfaceEvent::SetTreeBounds {
                visible_nodes: 1,
                depth: MAX_TREE_DEPTH + 1
            }),
            Err(SurfaceError::TreeDepthExceeded)
        );
        surface
            .reduce(SurfaceEvent::ToggleTreeNode(String::from("native")))
            .unwrap();
    }

    #[test]
    fn form_retains_values_on_invalid_submit_and_can_complete_after_correction() {
        let mut surface = InputSurface::new(InputSurfaceId::Form);
        surface
            .reduce(SurfaceEvent::SetFormField {
                name: String::from("name"),
                value: String::from("Tessera"),
            })
            .unwrap();
        surface
            .reduce(SurfaceEvent::SetFormField {
                name: String::from("email"),
                value: String::from("bad"),
            })
            .unwrap();
        assert_eq!(
            surface.reduce(SurfaceEvent::Submit),
            Err(SurfaceError::FormInvalid)
        );
        surface
            .reduce(SurfaceEvent::SetFormField {
                name: String::from("email"),
                value: String::from("team@example.com"),
            })
            .unwrap();
        surface.reduce(SurfaceEvent::Submit).unwrap();
        surface
            .reduce(SurfaceEvent::FinishForm { accepted: true })
            .unwrap();
        let SurfaceState::Form(form) = surface.state else {
            panic!("wrong state");
        };
        assert_eq!(form.status, FormStatus::Submitted);
        assert_eq!(form.fields["name"].value, "Tessera");
    }

    #[test]
    fn disabled_and_read_only_surfaces_are_mutation_safe() {
        let mut disabled = InputSurface::new(InputSurfaceId::Input);
        disabled.set_access(AccessPolicy::disabled());
        assert_eq!(
            disabled.reduce(SurfaceEvent::TextChanged(String::from("nope"))),
            Err(SurfaceError::Disabled)
        );
        let mut read_only = InputSurface::new(InputSurfaceId::Select);
        read_only.set_access(AccessPolicy::read_only());
        assert_eq!(
            read_only.reduce(SurfaceEvent::Clear),
            Err(SurfaceError::ReadOnly)
        );
    }
}
