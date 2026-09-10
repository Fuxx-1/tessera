//! Native Makepad feedback surfaces owned by their exact catalog routes.
//!
//! These widgets share only low-level Makepad controls. Each catalog component
//! keeps its own fixture, typed state, event reducer, visible action and widget
//! registration so Gallery routes do not become a generic preview surface.

use crate::foundation::activity::{MotionClock, project_phase};
use crate::foundation::input::{ButtonActivationExt, checkbox_change};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

/// Exact route-to-widget discovery for this bounded feedback batch.
pub struct FeedbackSurfaceCatalog;

impl FeedbackSurfaceCatalog {
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Alert => Some("TesseraAlert"),
            ComponentId::Empty => Some("TesseraEmpty"),
            ComponentId::Progress => Some("TesseraProgress"),
            ComponentId::Result => Some("TesseraResult"),
            _ => None,
        }
    }

    #[must_use]
    pub const fn contains(id: ComponentId) -> bool {
        Self::widget_name(id).is_some()
    }
}

/// Static alert content used by the native Gallery fixture.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct AlertFixture {
    pub title: &'static str,
    pub description: &'static str,
    pub dismiss_label: &'static str,
}

impl AlertFixture {
    pub const DEFAULT: Self = Self {
        title: "Workspace policy changed",
        description: "Review the updated sharing policy before publishing.",
        dismiss_label: "Dismiss alert",
    };
}

impl Default for AlertFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

/// State local to `TesseraAlert`.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct AlertState {
    pub visible: bool,
    pub dismissals: u32,
    pub action_attempts: u32,
    pub action_failed: bool,
}

impl Default for AlertState {
    fn default() -> Self {
        Self {
            visible: true,
            dismissals: 0,
            action_attempts: 0,
            action_failed: false,
        }
    }
}

/// Typed events accepted only by `TesseraAlert`.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AlertEvent {
    Dismiss,
    Action,
    Reset,
}

impl AlertState {
    pub fn reduce(&mut self, event: AlertEvent) {
        match event {
            AlertEvent::Dismiss if self.visible => {
                self.visible = false;
                self.dismissals = self.dismissals.saturating_add(1);
            }
            AlertEvent::Action if self.visible => {
                self.action_attempts = self.action_attempts.saturating_add(1);
                self.action_failed = true;
            }
            AlertEvent::Reset => *self = Self::default(),
            AlertEvent::Dismiss | AlertEvent::Action => {}
        }
    }
}

/// Typed output emitted by `TesseraAlert`.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum AlertAction {
    Dismissed {
        dismissals: u32,
    },
    ActionFailed {
        attempts: u32,
    },
    Restored,
    #[default]
    None,
}

/// Static empty-state content used by the native Gallery fixture.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct EmptyFixture {
    pub title: &'static str,
    pub description: &'static str,
    pub action_label: &'static str,
}

impl EmptyFixture {
    pub const DEFAULT: Self = Self {
        title: "No projects yet",
        description: "Create a project to begin organizing work.",
        action_label: "Create project",
    };
}

impl Default for EmptyFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

/// State local to `TesseraEmpty`.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum EmptyStatus {
    #[default]
    Empty,
    Recovered,
    Failed,
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct EmptyState {
    pub status: EmptyStatus,
    pub recovery_attempts: u32,
}

/// Typed events accepted only by `TesseraEmpty`.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum EmptyEvent {
    CreateRequested,
    RecoveryFailed,
    Reset,
}

impl EmptyState {
    pub fn reduce(&mut self, event: EmptyEvent) {
        match event {
            EmptyEvent::CreateRequested => {
                self.status = EmptyStatus::Recovered;
                self.recovery_attempts = self.recovery_attempts.saturating_add(1);
            }
            EmptyEvent::RecoveryFailed => {
                self.status = EmptyStatus::Failed;
                self.recovery_attempts = self.recovery_attempts.saturating_add(1);
            }
            EmptyEvent::Reset => *self = Self::default(),
        }
    }
}

/// Typed output emitted by `TesseraEmpty`.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum EmptyAction {
    CreateRequested {
        count: u32,
    },
    Recovered {
        attempts: u32,
    },
    RecoveryFailed {
        attempts: u32,
    },
    Reset,
    #[default]
    None,
}

/// Static task state used by the native Gallery fixture.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ProgressFixture {
    pub title: &'static str,
    pub initial_percent: u8,
}

impl ProgressFixture {
    pub const DEFAULT: Self = Self {
        title: "Publishing changes",
        initial_percent: 40,
    };
}

impl Default for ProgressFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

/// State local to `TesseraProgress`.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ProgressState {
    pub reduced_motion: bool,
    pub mode: ProgressMode,
    pub percent: u8,
    pub retries: u32,
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum ProgressMode {
    #[default]
    Determinate,
    Indeterminate,
    Failed,
}

impl Default for ProgressState {
    fn default() -> Self {
        Self {
            mode: ProgressMode::Determinate,
            percent: ProgressFixture::DEFAULT.initial_percent,
            reduced_motion: false,
            retries: 0,
        }
    }
}

/// Typed events accepted only by `TesseraProgress`.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ProgressEvent {
    SetPercent(u8),
    ToggleIndeterminate,
    SetReducedMotion(bool),
    Fail,
    Retry,
    Reset,
}

impl ProgressState {
    pub fn reduce(&mut self, event: ProgressEvent) {
        match event {
            ProgressEvent::SetPercent(percent) => {
                self.mode = ProgressMode::Determinate;
                self.percent = percent.min(100);
            }
            ProgressEvent::ToggleIndeterminate => {
                self.mode = if self.mode == ProgressMode::Indeterminate {
                    ProgressMode::Determinate
                } else {
                    ProgressMode::Indeterminate
                };
            }
            ProgressEvent::SetReducedMotion(value) => self.reduced_motion = value,
            ProgressEvent::Fail => self.mode = ProgressMode::Failed,
            ProgressEvent::Retry => {
                self.mode = ProgressMode::Indeterminate;
                self.retries = self.retries.saturating_add(1);
            }
            ProgressEvent::Reset => *self = Self::default(),
        }
    }
}

/// Typed output emitted by `TesseraProgress`.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum ProgressAction {
    MotionChanged {
        reduced: bool,
    },
    Changed {
        percent: u8,
    },
    ModeChanged {
        mode: ProgressMode,
    },
    Failed,
    Retried {
        retries: u32,
    },
    Reset,
    #[default]
    None,
}

/// Static terminal result content used by the native Gallery fixture.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ResultFixture {
    pub success_title: &'static str,
    pub retry_title: &'static str,
    pub description: &'static str,
}

impl ResultFixture {
    pub const DEFAULT: Self = Self {
        success_title: "Changes published",
        retry_title: "Publish needs another attempt",
        description: "The native result surface tracks the next action locally.",
    };
}

impl Default for ResultFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

/// State local to `TesseraResult`.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum ResultStatus {
    #[default]
    Success,
    Retrying,
    Empty,
    Error,
}

/// State local to `TesseraResult`.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct ResultState {
    pub status: ResultStatus,
    pub retry_count: u32,
}

/// Typed events accepted only by `TesseraResult`.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ResultEvent {
    Retry,
    MarkSuccess,
    ShowEmpty,
    ShowError,
    Reset,
}

impl ResultState {
    pub fn reduce(&mut self, event: ResultEvent) {
        match event {
            ResultEvent::Retry => {
                self.status = ResultStatus::Retrying;
                self.retry_count = self.retry_count.saturating_add(1);
            }
            ResultEvent::ShowEmpty => self.status = ResultStatus::Empty,
            ResultEvent::ShowError => self.status = ResultStatus::Error,
            ResultEvent::MarkSuccess => self.status = ResultStatus::Success,
            ResultEvent::Reset => *self = Self::default(),
        }
    }
}

/// Typed output emitted by `TesseraResult`.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum ResultAction {
    RetryRequested {
        count: u32,
    },
    MarkedSuccess,
    EmptyShown,
    ErrorShown,
    Reset,
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*

    mod.widgets.TesseraAlertBase = #(TesseraAlert::register_widget(vm))
    mod.widgets.TesseraAlert = set_type_default() do mod.widgets.TesseraAlertBase{
        ..mod.widgets.TesseraSurfaceFrame
        alert_title := Label{
            width: Fill
            height: Fit
            text: "Workspace policy changed"
            draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}
        }
        alert_description := Label{
            width: Fill
            height: Fit
            text: "Review the updated sharing policy before publishing."
            draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}
        }
        alert_action := Button{
            width: Fit
            height: 30
            text: "Review policy"
        }
        alert_dismiss := Button{
            width: Fit
            height: 30
            text: "Dismiss alert"
        }
        alert_reset := Button{
            width: Fit
            height: 30
            visible: false
            text: "Restore alert"
        }
        alert_status := Label{width: Fill height: Fit text: "Alert active" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }

    mod.widgets.TesseraEmptyBase = #(TesseraEmpty::register_widget(vm))
    mod.widgets.TesseraEmpty = set_type_default() do mod.widgets.TesseraEmptyBase{
        ..mod.widgets.TesseraSurfaceFrame
        flow: Down
        spacing: 7
        align: Align{x: 0.5, y: 0.5}
        empty_mark := Label{
            width: Fit
            height: Fit
            text: "0"
            draw_text +: {color: theme.color_text_meta text_style +: {font_size: 28.0}}
        }
        empty_title := Label{
            width: Fit
            height: Fit
            text: "No projects yet"
            draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}
        }
        empty_description := Label{
            width: Fill
            height: Fit
            text: "Create a project to begin organizing work."
            draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}
        }
        empty_create := Button{
            width: Fit
            height: 32
            text: "Create project"
        }
        empty_fail := Button{width: Fit height: 30 text: "Report recovery failure"}
        empty_reset := Button{width: Fit height: 30 text: "Reset empty state"}
        empty_status := Label{width: Fill height: Fit text: "Empty state" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }

    mod.widgets.TesseraProgressBase = #(TesseraProgress::register_widget(vm))
    mod.widgets.TesseraProgress = set_type_default() do mod.widgets.TesseraProgressBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 7
        progress_title := Label{
            width: Fill
            height: Fit
            text: "Publishing changes"
            draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}
        }
        progress_visual := mod.widgets.TesseraProgressVisual{}
        progress_motion := CheckBox{width: Fit height: 28 text: "Reduced motion"}
        progress_value_control := View{width: Fill height: 40
            progress_slider := Slider{
                width: Fill height: 40
                min: 0.0 max: 100.0 step: 1.0 default: 40.0 text: "Value"
            }
        }
        progress_value := Label{
            width: Fill
            height: Fit
            text: "40%"
            draw_text +: {color: theme.color_text_meta}
        }
        progress_mode := Button{width: Fit height: 30 text: "Indeterminate"}
        progress_fail := Button{width: Fit height: 30 text: "Report failure"}
        progress_retry := Button{width: Fit height: 30 visible: false text: "Retry progress"}
        progress_reset := Button{
            width: Fit
            height: 30
            text: "Reset progress"
        }
    }

    mod.widgets.TesseraResultBase = #(TesseraResult::register_widget(vm))
    mod.widgets.TesseraResult = set_type_default() do mod.widgets.TesseraResultBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 7
        result_symbol := Label{
            width: Fit
            height: Fit
            text: "OK"
            draw_text +: {color: theme.color_text_val text_style +: {font_size: 18.0}}
        }
        result_title := Label{
            width: Fill
            height: Fit
            text: "Changes published"
            draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}
        }
        result_description := Label{
            width: Fill
            height: Fit
            text: "The native result surface tracks the next action locally."
            draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}
        }
        result_retry := Button{
            width: Fit
            height: 30
            text: "Retry publish"
        }
        result_success := Button{
            width: Fit
            height: 30
            text: "Mark success"
        }
        result_empty := Button{width: Fit height: 30 text: "Show empty result"}
        result_error := Button{width: Fit height: 30 text: "Show error result"}
        result_reset := Button{width: Fit height: 30 text: "Reset result"}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraAlert {
    #[deref]
    view: View,
    #[rust]
    fixture: AlertFixture,
    #[rust]
    state: AlertState,
}

impl TesseraAlert {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = AlertFixture::DEFAULT;
        self.state = AlertState::default();
        self.sync(cx);
    }

    fn apply_event(&mut self, cx: &mut Cx, event: AlertEvent) {
        self.state.reduce(event);
        self.sync(cx);
        let action = match event {
            AlertEvent::Dismiss => AlertAction::Dismissed {
                dismissals: self.state.dismissals,
            },
            AlertEvent::Action => AlertAction::ActionFailed {
                attempts: self.state.action_attempts,
            },
            AlertEvent::Reset => AlertAction::Restored,
        };
        cx.widget_action(self.widget_uid(), action);
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(alert_title))
            .set_text(cx, self.fixture.title);
        self.view
            .label(cx, ids!(alert_description))
            .set_text(cx, self.fixture.description);
        self.view
            .button(cx, ids!(alert_dismiss))
            .set_visible(cx, self.state.visible);
        self.view
            .button(cx, ids!(alert_reset))
            .set_visible(cx, !self.state.visible);
        self.view
            .button(cx, ids!(alert_action))
            .set_visible(cx, self.state.visible);
        self.view.button(cx, ids!(alert_action)).set_text(
            cx,
            if self.state.action_failed {
                "Review unavailable"
            } else {
                "Review policy"
            },
        );
        self.view.label(cx, ids!(alert_status)).set_text(
            cx,
            if self.state.action_failed {
                "Alert action unavailable"
            } else if self.state.visible {
                "Alert active"
            } else {
                "Alert dismissed"
            },
        );
        self.view.redraw(cx);
    }
}

impl Widget for TesseraAlert {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(alert_dismiss))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, AlertEvent::Dismiss);
        } else if self
            .view
            .button(cx, ids!(alert_action))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, AlertEvent::Action);
        } else if self
            .view
            .button(cx, ids!(alert_reset))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, AlertEvent::Reset);
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraEmpty {
    #[deref]
    view: View,
    #[rust]
    fixture: EmptyFixture,
    #[rust]
    state: EmptyState,
}

impl TesseraEmpty {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = EmptyFixture::DEFAULT;
        self.state = EmptyState::default();
        self.sync(cx);
    }

    fn apply_event(&mut self, cx: &mut Cx, event: EmptyEvent) {
        self.state.reduce(event);
        self.sync(cx);
        let action = match event {
            EmptyEvent::CreateRequested => EmptyAction::Recovered {
                attempts: self.state.recovery_attempts,
            },
            EmptyEvent::RecoveryFailed => EmptyAction::RecoveryFailed {
                attempts: self.state.recovery_attempts,
            },
            EmptyEvent::Reset => EmptyAction::Reset,
        };
        cx.widget_action(self.widget_uid(), action);
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(empty_title))
            .set_text(cx, self.fixture.title);
        self.view
            .label(cx, ids!(empty_description))
            .set_text(cx, self.fixture.description);
        self.view.label(cx, ids!(empty_mark)).set_text(
            cx,
            match self.state.status {
                EmptyStatus::Empty => "0",
                EmptyStatus::Recovered => "OK",
                EmptyStatus::Failed => "!",
            },
        );
        self.view.button(cx, ids!(empty_create)).set_text(
            cx,
            if self.state.status == EmptyStatus::Recovered {
                "Recover again"
            } else {
                self.fixture.action_label
            },
        );
        self.view.label(cx, ids!(empty_status)).set_text(
            cx,
            match self.state.status {
                EmptyStatus::Empty => "Empty state ready for recovery",
                EmptyStatus::Recovered => "Recovery completed locally",
                EmptyStatus::Failed => "Recovery failed: retry or inspect the broker",
            },
        );
        self.view.redraw(cx);
    }
}

impl Widget for TesseraEmpty {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(empty_create))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, EmptyEvent::CreateRequested);
        } else if self
            .view
            .button(cx, ids!(empty_fail))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, EmptyEvent::RecoveryFailed);
        } else if self
            .view
            .button(cx, ids!(empty_reset))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, EmptyEvent::Reset);
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraProgress {
    #[deref]
    view: View,
    #[rust]
    fixture: ProgressFixture,
    #[rust]
    state: ProgressState,
    #[rust]
    motion: MotionClock,
}

impl TesseraProgress {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = ProgressFixture::DEFAULT;
        self.state = ProgressState::default();
        self.motion.set_active(cx, false, false);
        self.sync(cx);
    }

    fn apply_event(&mut self, cx: &mut Cx, event: ProgressEvent) {
        self.state.reduce(event);
        self.sync(cx);
        let action = match event {
            ProgressEvent::SetPercent(_) => ProgressAction::Changed {
                percent: self.state.percent,
            },
            ProgressEvent::ToggleIndeterminate => ProgressAction::ModeChanged {
                mode: self.state.mode,
            },
            ProgressEvent::SetReducedMotion(value) => {
                ProgressAction::MotionChanged { reduced: value }
            }
            ProgressEvent::Fail => ProgressAction::Failed,
            ProgressEvent::Retry => ProgressAction::Retried {
                retries: self.state.retries,
            },
            ProgressEvent::Reset => ProgressAction::Reset,
        };
        cx.widget_action(self.widget_uid(), action);
    }

    fn paint(&mut self, cx: &mut Cx) {
        project_phase(
            &self.view,
            cx,
            &[ids!(progress_visual)],
            self.motion.phase(),
            self.state.mode == ProgressMode::Indeterminate,
        );
        if let Some(mut bar) = self
            .view
            .widget(cx, ids!(progress_visual))
            .borrow_mut::<View>()
        {
            bar.draw_bg
                .set_uniform(cx, id!(value), &[f32::from(self.state.percent) / 100.0]);
            bar.draw_bg.set_uniform(
                cx,
                id!(failed),
                &[if self.state.mode == ProgressMode::Failed {
                    1.0
                } else {
                    0.0
                }],
            );
        }
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.motion.set_active(
            cx,
            self.state.mode == ProgressMode::Indeterminate,
            self.state.reduced_motion,
        );
        self.view.check_box(cx, ids!(progress_motion)).set_active(
            cx,
            self.state.reduced_motion,
            Animate::No,
        );
        self.view
            .label(cx, ids!(progress_title))
            .set_text(cx, self.fixture.title);
        self.view
            .slider(cx, ids!(progress_slider))
            .set_value(cx, f64::from(self.state.percent));
        self.view
            .widget(cx, ids!(progress_value_control))
            .set_visible(cx, self.state.mode == ProgressMode::Determinate);
        self.view.label(cx, ids!(progress_value)).set_text(
            cx,
            &match self.state.mode {
                ProgressMode::Determinate => format!("{}%", self.state.percent),
                ProgressMode::Indeterminate => String::from("Working..."),
                ProgressMode::Failed => String::from("Failed: retry required"),
            },
        );
        self.view.button(cx, ids!(progress_mode)).set_text(
            cx,
            if self.state.mode == ProgressMode::Indeterminate {
                "Use determinate progress"
            } else {
                "Use indeterminate progress"
            },
        );
        self.view
            .button(cx, ids!(progress_retry))
            .set_visible(cx, self.state.mode == ProgressMode::Failed);
        self.view.redraw(cx);
    }
}

impl Widget for TesseraProgress {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.paint(cx);
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        if self
            .motion
            .handle_event(cx, event, self.view.visible(), "progress")
        {
            self.view.redraw(cx);
        }
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if let Some(value) = checkbox_change(
            &self.view.check_box(cx, ids!(progress_motion)),
            cx,
            event,
            &actions,
        ) {
            self.apply_event(cx, ProgressEvent::SetReducedMotion(value));
        } else if let Some(value) = self
            .view
            .slider(cx, ids!(progress_slider))
            .slided(&actions)
            .filter(|_| self.state.mode == ProgressMode::Determinate)
        {
            self.apply_event(cx, ProgressEvent::SetPercent(value.round() as u8));
        } else if self
            .view
            .button(cx, ids!(progress_mode))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, ProgressEvent::ToggleIndeterminate);
        } else if self
            .view
            .button(cx, ids!(progress_fail))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, ProgressEvent::Fail);
        } else if self
            .view
            .button(cx, ids!(progress_retry))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, ProgressEvent::Retry);
        } else if self
            .view
            .button(cx, ids!(progress_reset))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, ProgressEvent::Reset);
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraResult {
    #[deref]
    view: View,
    #[rust]
    fixture: ResultFixture,
    #[rust]
    state: ResultState,
}

impl TesseraResult {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = ResultFixture::DEFAULT;
        self.state = ResultState::default();
        self.sync(cx);
    }

    fn apply_event(&mut self, cx: &mut Cx, event: ResultEvent) {
        self.state.reduce(event);
        self.sync(cx);
        let action = match event {
            ResultEvent::Retry => ResultAction::RetryRequested {
                count: self.state.retry_count,
            },
            ResultEvent::ShowEmpty => ResultAction::EmptyShown,
            ResultEvent::ShowError => ResultAction::ErrorShown,
            ResultEvent::MarkSuccess => ResultAction::MarkedSuccess,
            ResultEvent::Reset => ResultAction::Reset,
        };
        cx.widget_action(self.widget_uid(), action);
    }

    fn sync(&mut self, cx: &mut Cx) {
        let (symbol, title, description) = match self.state.status {
            ResultStatus::Success => ("OK", self.fixture.success_title, self.fixture.description),
            ResultStatus::Retrying => ("!", self.fixture.retry_title, self.fixture.description),
            ResultStatus::Empty => (
                "--",
                "No result available",
                "The operation returned no result.",
            ),
            ResultStatus::Error => (
                "!",
                "Publish failed",
                "The operation failed; retry or inspect the error.",
            ),
        };
        self.view
            .label(cx, ids!(result_symbol))
            .set_text(cx, symbol);
        self.view.label(cx, ids!(result_title)).set_text(cx, title);
        self.view
            .label(cx, ids!(result_description))
            .set_text(cx, description);
        self.view
            .button(cx, ids!(result_success))
            .set_visible(cx, self.state.status != ResultStatus::Success);
        self.view
            .button(cx, ids!(result_retry))
            .set_visible(cx, self.state.status == ResultStatus::Error);
        self.view.redraw(cx);
    }
}

impl Widget for TesseraResult {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(result_retry))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, ResultEvent::Retry);
        } else if self
            .view
            .button(cx, ids!(result_success))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, ResultEvent::MarkSuccess);
        } else if self
            .view
            .button(cx, ids!(result_empty))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, ResultEvent::ShowEmpty);
        } else if self
            .view
            .button(cx, ids!(result_error))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, ResultEvent::ShowError);
        } else if self
            .view
            .button(cx, ids!(result_reset))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, ResultEvent::Reset);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        AlertEvent, AlertState, EmptyEvent, EmptyState, FeedbackSurfaceCatalog, ProgressEvent,
        ProgressFixture, ProgressState, ResultEvent, ResultState, ResultStatus,
    };
    use tessera_core::catalog::ComponentId;

    #[test]
    fn feedback_catalog_exposes_four_exact_widget_routes() {
        assert_eq!(
            FeedbackSurfaceCatalog::widget_name(ComponentId::Alert),
            Some("TesseraAlert")
        );
        assert_eq!(
            FeedbackSurfaceCatalog::widget_name(ComponentId::Empty),
            Some("TesseraEmpty")
        );
        assert_eq!(
            FeedbackSurfaceCatalog::widget_name(ComponentId::Progress),
            Some("TesseraProgress")
        );
        assert_eq!(
            FeedbackSurfaceCatalog::widget_name(ComponentId::Result),
            Some("TesseraResult")
        );
    }

    #[test]
    fn alert_state_dismisses_and_restores_its_own_fixture() {
        let mut state = AlertState::default();
        state.reduce(AlertEvent::Dismiss);
        state.reduce(AlertEvent::Action);
        assert!(!state.visible);
        assert_eq!(state.dismissals, 1);
        assert_eq!(state.action_attempts, 0);
        assert!(!state.action_failed);
        state.reduce(AlertEvent::Reset);
        assert!(state.visible);
        assert_eq!(state.dismissals, 0);
    }

    #[test]
    fn empty_state_counts_real_create_actions() {
        let mut state = EmptyState::default();
        state.reduce(EmptyEvent::CreateRequested);
        state.reduce(EmptyEvent::CreateRequested);
        assert_eq!(state.recovery_attempts, 2);
        state.reduce(EmptyEvent::Reset);
        assert_eq!(state.recovery_attempts, 0);
    }

    #[test]
    fn progress_state_clamps_the_slider_and_resets_to_fixture_value() {
        let mut state = ProgressState::default();
        state.reduce(ProgressEvent::SetPercent(250));
        assert_eq!(state.percent, 100);
        state.reduce(ProgressEvent::Reset);
        assert_eq!(state.percent, ProgressFixture::DEFAULT.initial_percent);
        assert_eq!(state.mode, super::ProgressMode::Determinate);
        assert_eq!(state.retries, 0);
    }

    #[test]
    fn result_state_tracks_retry_and_success_independently() {
        let mut state = ResultState::default();
        state.reduce(ResultEvent::Retry);
        assert_eq!(state.status, ResultStatus::Retrying);
        assert_eq!(state.retry_count, 1);
        state.reduce(ResultEvent::MarkSuccess);
        assert_eq!(state.status, ResultStatus::Success);
        assert_eq!(state.retry_count, 1);
        state.reduce(ResultEvent::Reset);
        assert_eq!(state, ResultState::default());
    }
}
