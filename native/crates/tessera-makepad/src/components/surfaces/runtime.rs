//! Native runtime-policy surfaces. Each catalog route owns its own state and action type.

use crate::foundation::input::ButtonActivationExt;
use crate::foundation::input::set_button_enabled;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct RuntimeSurfaceCatalog;

impl RuntimeSurfaceCatalog {
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::App => Some("TesseraApp"),
            ComponentId::ConfigProvider => Some("TesseraConfigProvider"),
            ComponentId::Util => Some("TesseraUtil"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct AppFixture {
    pub workspace: &'static str,
    pub policy: &'static str,
}
impl AppFixture {
    pub const DEFAULT: Self = Self {
        workspace: "Release workspace",
        policy: "Policy permits verified routes only",
    };
}
impl Default for AppFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct AppState {
    pub activated: bool,
    pub denied: bool,
    pub activations: u16,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AppEvent {
    Activate,
    Deny,
    Reset,
}
impl AppState {
    pub fn reduce(&mut self, event: AppEvent) {
        match event {
            AppEvent::Activate if !self.denied => {
                self.activated = true;
                self.activations = self.activations.saturating_add(1);
            }
            AppEvent::Deny => {
                self.denied = true;
                self.activated = false;
            }
            AppEvent::Activate => {}
            AppEvent::Reset => *self = Self::default(),
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum AppAction {
    Activated {
        count: u16,
    },
    Denied,
    #[default]
    None,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ConfigProviderFixture {
    pub tenant: &'static str,
    pub policy_name: &'static str,
}
impl ConfigProviderFixture {
    pub const DEFAULT: Self = Self {
        tenant: "release-control",
        policy_name: "verified-only",
    };
}
impl Default for ConfigProviderFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct ConfigProviderState {
    pub dark: bool,
    pub compact: bool,
    pub denied: bool,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ConfigProviderEvent {
    UseLight,
    UseDark,
    ToggleDensity,
    TogglePolicy,
    Reset,
}
impl ConfigProviderState {
    pub fn reduce(&mut self, event: ConfigProviderEvent) {
        match event {
            ConfigProviderEvent::UseLight => self.dark = false,
            ConfigProviderEvent::UseDark => self.dark = true,
            ConfigProviderEvent::ToggleDensity => self.compact = !self.compact,
            ConfigProviderEvent::TogglePolicy => self.denied = !self.denied,
            ConfigProviderEvent::Reset => *self = Self::default(),
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum ConfigProviderAction {
    ConfigurationChanged {
        dark: bool,
        compact: bool,
        denied: bool,
    },
    #[default]
    None,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct UtilFixture {
    pub operation: &'static str,
    pub denial: &'static str,
}
impl UtilFixture {
    pub const DEFAULT: Self = Self {
        operation: "Validate route metadata",
        denial: "Network access is denied by fixture policy",
    };
}
impl Default for UtilFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct UtilState {
    pub runs: u16,
    pub denied: bool,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum UtilEvent {
    Run,
    Deny,
    Reset,
}
impl UtilState {
    pub fn reduce(&mut self, event: UtilEvent) {
        match event {
            UtilEvent::Run if !self.denied => self.runs = self.runs.saturating_add(1),
            UtilEvent::Deny => self.denied = true,
            UtilEvent::Run => {}
            UtilEvent::Reset => *self = Self::default(),
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum UtilAction {
    Executed {
        runs: u16,
    },
    Denied,
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*

    mod.widgets.TesseraAppBase = #(TesseraApp::register_widget(vm))
    mod.widgets.TesseraApp = set_type_default() do mod.widgets.TesseraAppBase{
        ..mod.widgets.TesseraSurfaceFrame
        app_title := Label{width: Fill height: Fit text: "Release workspace" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        app_policy := Label{width: Fill height: Fit text: "Policy permits verified routes only" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
        app_state := View{width: Fill height: Fit flow: Down padding: Inset{left: 8, right: 8, top: 8, bottom: 8} show_bg: true draw_bg +: {color: theme.color_bg_app border_radius: 3.0 border_size: 1.0 border_color: theme.color_bevel}
            app_status := Label{width: Fill height: Fit text: "Inactive" draw_text +: {color: theme.color_text}}
        }
        app_controls := View{width: Fill height: 32 flow: Right spacing: 5
            app_activate := Button{width: Fit height: 30 text: "Activate workspace"}
            app_deny := Button{width: Fit height: 30 text: "Deny activation"}
        }
    }

    mod.widgets.TesseraConfigProviderBase = #(TesseraConfigProvider::register_widget(vm))
    mod.widgets.TesseraConfigProvider = set_type_default() do mod.widgets.TesseraConfigProviderBase{
        ..mod.widgets.TesseraSurfaceFrame
        config_provider_title := Label{width: Fill height: Fit text: "Configuration provider" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        config_provider_scope := Label{width: Fill height: Fit text: "release-control / verified-only" draw_text +: {color: theme.color_text_meta}}
        config_provider_current := Label{width: Fill height: Fit text: "Light / comfortable / permitted" draw_text +: {color: theme.color_text}}
        config_provider_controls := View{width: Fill height: 32 flow: Right spacing: 5
            config_provider_light := Button{width: Fit height: 30 text: "Light"}
            config_provider_dark := Button{width: Fit height: 30 text: "Dark"}
            config_provider_density := Button{width: Fit height: 30 text: "Compact"}
            config_provider_policy := Button{width: Fit height: 30 text: "Deny policy"}
        }
    }

    mod.widgets.TesseraUtilBase = #(TesseraUtil::register_widget(vm))
    mod.widgets.TesseraUtil = set_type_default() do mod.widgets.TesseraUtilBase{
        ..mod.widgets.TesseraSurfaceFrame
        util_title := Label{width: Fill height: Fit text: "Utility policy" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        util_operation := Label{width: Fill height: Fit text: "Validate route metadata" draw_text +: {color: theme.color_text}}
        util_status := Label{width: Fill height: Fit text: "Ready: local-only operation" draw_text +: {color: theme.color_text_meta}}
        util_controls := View{width: Fill height: 32 flow: Right spacing: 5
            util_run := Button{width: Fit height: 30 text: "Run local utility"}
            util_deny := Button{width: Fit height: 30 text: "Deny network policy"}
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraApp {
    #[deref]
    view: View,
    #[rust]
    fixture: AppFixture,
    #[rust]
    state: AppState,
}
impl TesseraApp {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = AppFixture::DEFAULT;
        self.state = AppState::default();
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: AppEvent) {
        self.state.reduce(event);
        self.sync(cx);
        let action = match event {
            AppEvent::Activate if self.state.activated => AppAction::Activated {
                count: self.state.activations,
            },
            AppEvent::Deny => AppAction::Denied,
            AppEvent::Activate | AppEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }
    fn sync(&mut self, cx: &mut Cx) {
        let status = if self.state.denied {
            String::from("Denied by workspace policy")
        } else if self.state.activated {
            format!("Activated locally (run {})", self.state.activations)
        } else {
            String::from("Inactive")
        };
        self.view
            .label(cx, ids!(app_title))
            .set_text(cx, self.fixture.workspace);
        self.view
            .label(cx, ids!(app_policy))
            .set_text(cx, self.fixture.policy);
        self.view.label(cx, ids!(app_status)).set_text(cx, &status);
        set_button_enabled(
            &self.view.button(cx, ids!(app_activate)),
            cx,
            !self.state.denied,
        );
        self.view.redraw(cx);
    }
}
impl Widget for TesseraApp {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(app_activate))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, AppEvent::Activate);
        } else if self
            .view
            .button(cx, ids!(app_deny))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, AppEvent::Deny);
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraConfigProvider {
    #[deref]
    view: View,
    #[rust]
    fixture: ConfigProviderFixture,
    #[rust]
    state: ConfigProviderState,
}
impl TesseraConfigProvider {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = ConfigProviderFixture::DEFAULT;
        self.state = ConfigProviderState::default();
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: ConfigProviderEvent) {
        self.state.reduce(event);
        self.sync(cx);
        if !matches!(event, ConfigProviderEvent::Reset) {
            cx.widget_action(
                self.widget_uid(),
                ConfigProviderAction::ConfigurationChanged {
                    dark: self.state.dark,
                    compact: self.state.compact,
                    denied: self.state.denied,
                },
            );
        }
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.view.label(cx, ids!(config_provider_scope)).set_text(
            cx,
            &format!("{} / {}", self.fixture.tenant, self.fixture.policy_name),
        );
        self.view.label(cx, ids!(config_provider_current)).set_text(
            cx,
            &format!(
                "{} / {} / {}",
                if self.state.dark { "Dark" } else { "Light" },
                if self.state.compact {
                    "compact"
                } else {
                    "comfortable"
                },
                if self.state.denied {
                    "denied"
                } else {
                    "permitted"
                }
            ),
        );
        set_button_enabled(
            &self.view.button(cx, ids!(config_provider_light)),
            cx,
            self.state.dark,
        );
        set_button_enabled(
            &self.view.button(cx, ids!(config_provider_dark)),
            cx,
            !self.state.dark,
        );
        self.view
            .button(cx, ids!(config_provider_density))
            .set_text(
                cx,
                if self.state.compact {
                    "Comfortable"
                } else {
                    "Compact"
                },
            );
        self.view.button(cx, ids!(config_provider_policy)).set_text(
            cx,
            if self.state.denied {
                "Permit policy"
            } else {
                "Deny policy"
            },
        );
        self.view.redraw(cx);
    }
}
impl Widget for TesseraConfigProvider {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(config_provider_light))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, ConfigProviderEvent::UseLight);
        } else if self
            .view
            .button(cx, ids!(config_provider_dark))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, ConfigProviderEvent::UseDark);
        } else if self
            .view
            .button(cx, ids!(config_provider_density))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, ConfigProviderEvent::ToggleDensity);
        } else if self
            .view
            .button(cx, ids!(config_provider_policy))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, ConfigProviderEvent::TogglePolicy);
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraUtil {
    #[deref]
    view: View,
    #[rust]
    fixture: UtilFixture,
    #[rust]
    state: UtilState,
}
impl TesseraUtil {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = UtilFixture::DEFAULT;
        self.state = UtilState::default();
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: UtilEvent) {
        self.state.reduce(event);
        self.sync(cx);
        let action = match event {
            UtilEvent::Run if !self.state.denied => UtilAction::Executed {
                runs: self.state.runs,
            },
            UtilEvent::Deny => UtilAction::Denied,
            UtilEvent::Run | UtilEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }
    fn sync(&mut self, cx: &mut Cx) {
        let status = if self.state.denied {
            String::from(self.fixture.denial)
        } else {
            format!("Local validation completed {} time(s)", self.state.runs)
        };
        self.view
            .label(cx, ids!(util_operation))
            .set_text(cx, self.fixture.operation);
        self.view.label(cx, ids!(util_status)).set_text(cx, &status);
        set_button_enabled(
            &self.view.button(cx, ids!(util_run)),
            cx,
            !self.state.denied,
        );
        self.view.redraw(cx);
    }
}
impl Widget for TesseraUtil {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(util_run))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, UtilEvent::Run);
        } else if self
            .view
            .button(cx, ids!(util_deny))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, UtilEvent::Deny);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        AppEvent, AppState, ConfigProviderEvent, ConfigProviderState, RuntimeSurfaceCatalog,
        UtilEvent, UtilState,
    };
    use tessera_core::catalog::ComponentId;

    #[test]
    fn catalog_has_exact_runtime_widgets() {
        assert_eq!(
            RuntimeSurfaceCatalog::widget_name(ComponentId::App),
            Some("TesseraApp")
        );
        assert_eq!(
            RuntimeSurfaceCatalog::widget_name(ComponentId::ConfigProvider),
            Some("TesseraConfigProvider")
        );
        assert_eq!(
            RuntimeSurfaceCatalog::widget_name(ComponentId::Util),
            Some("TesseraUtil")
        );
    }
    #[test]
    fn policy_denials_block_subsequent_operations() {
        let mut app = AppState::default();
        app.reduce(AppEvent::Deny);
        app.reduce(AppEvent::Activate);
        assert!(!app.activated);
        let mut config = ConfigProviderState::default();
        config.reduce(ConfigProviderEvent::TogglePolicy);
        assert!(config.denied);
        let mut util = UtilState::default();
        util.reduce(UtilEvent::Deny);
        util.reduce(UtilEvent::Run);
        assert_eq!(util.runs, 0);
    }
}
