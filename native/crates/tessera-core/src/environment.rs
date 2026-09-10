//! Renderer-independent application and observed system environment state.

use std::fmt;

/// The resolved light or dark appearance consumed by renderers.
///
/// `System` is deliberately absent: it is a user request, not a color table.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum ThemeMode {
    #[default]
    Light,
    Dark,
}

impl ThemeMode {
    #[must_use]
    pub const fn toggled(self) -> Self {
        match self {
            Self::Light => Self::Dark,
            Self::Dark => Self::Light,
        }
    }

    #[must_use]
    pub const fn label(self) -> &'static str {
        match self {
            Self::Light => "Light",
            Self::Dark => "Dark",
        }
    }
}

/// The appearance preference selected by the application user.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum RequestedTheme {
    Light,
    Dark,
    #[default]
    System,
}

impl RequestedTheme {
    /// Resolves the request without consulting the operating system.
    ///
    /// A missing system observation deterministically falls back to light.
    #[must_use]
    pub const fn resolve(self, observed: Option<ThemeMode>) -> ThemeMode {
        match self {
            Self::Light => ThemeMode::Light,
            Self::Dark => ThemeMode::Dark,
            Self::System => match observed {
                Some(appearance) => appearance,
                None => ThemeMode::Light,
            },
        }
    }
}

/// The three application UI scale choices in the native product contract.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum UiScale {
    #[default]
    Scale100,
    Scale125,
    Scale150,
}

impl UiScale {
    #[must_use]
    pub const fn factor(self) -> f32 {
        match self {
            Self::Scale100 => 1.0,
            Self::Scale125 => 1.25,
            Self::Scale150 => 1.5,
        }
    }

    /// Accepts only a finite, positive scale that is explicitly supported.
    pub fn try_from_factor(factor: f64) -> Result<Self, ScaleError> {
        validate_scale(factor)?;
        match factor {
            1.0 => Ok(Self::Scale100),
            1.25 => Ok(Self::Scale125),
            1.5 => Ok(Self::Scale150),
            _ => Err(ScaleError::UnsupportedUiScale),
        }
    }
}

/// A normalized display scale used by the environment state.
///
/// Positive finite observations outside the four sentinel values are mapped
/// to the nearest supported value. Midpoints round upward, matching Tessera's
/// physical-pixel rounding rule.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum SystemScale {
    #[default]
    Scale100,
    Scale125,
    Scale150,
    Scale200,
}

impl SystemScale {
    #[must_use]
    pub const fn factor(self) -> f32 {
        match self {
            Self::Scale100 => 1.0,
            Self::Scale125 => 1.25,
            Self::Scale150 => 1.5,
            Self::Scale200 => 2.0,
        }
    }

    /// Normalizes a system observation into the frozen sentinel set.
    pub fn normalize(factor: f64) -> Result<Self, ScaleError> {
        validate_scale(factor)?;
        Ok(if factor < 1.125 {
            Self::Scale100
        } else if factor < 1.375 {
            Self::Scale125
        } else if factor < 1.75 {
            Self::Scale150
        } else {
            Self::Scale200
        })
    }
}

/// Why the current environment revision exists.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum EnvironmentSource {
    #[default]
    Defaults,
    ApplicationPreference,
    SystemObservation,
    TestOverride,
}

/// An input accepted by [`EnvironmentState`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EnvironmentEvent {
    RequestTheme(RequestedTheme),
    SetUiScale(UiScale),
    ObserveAppearance(Option<ThemeMode>),
    ObserveSystemScale(SystemScale),
}

impl EnvironmentEvent {
    const fn source(self) -> EnvironmentSource {
        match self {
            Self::RequestTheme(_) | Self::SetUiScale(_) => EnvironmentSource::ApplicationPreference,
            Self::ObserveAppearance(_) | Self::ObserveSystemScale(_) => {
                EnvironmentSource::SystemObservation
            }
        }
    }
}

/// Result of applying an environment event.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EnvironmentChange {
    Unchanged,
    Updated {
        revision: u64,
        source: EnvironmentSource,
    },
    TestOverrideActive,
}

/// A complete deterministic environment fixture.
///
/// The value has no setters and performs no process-global or OS reads. A
/// state created from it rejects subsequent live events so a test cannot drift
/// with the machine that executes it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct EnvironmentTestOverride {
    requested_theme: RequestedTheme,
    observed_appearance: Option<ThemeMode>,
    ui_scale: UiScale,
    system_scale: SystemScale,
}

impl EnvironmentTestOverride {
    #[must_use]
    pub const fn new(
        requested_theme: RequestedTheme,
        observed_appearance: Option<ThemeMode>,
        ui_scale: UiScale,
        system_scale: SystemScale,
    ) -> Self {
        Self {
            requested_theme,
            observed_appearance,
            ui_scale,
            system_scale,
        }
    }
}

/// The single renderer-independent source for theme and scale environment.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct EnvironmentState {
    requested_theme: RequestedTheme,
    observed_appearance: Option<ThemeMode>,
    ui_scale: UiScale,
    system_scale: SystemScale,
    revision: u64,
    source: EnvironmentSource,
    test_override_active: bool,
}

impl EnvironmentState {
    pub const DEFAULT: Self = Self {
        requested_theme: RequestedTheme::System,
        observed_appearance: None,
        ui_scale: UiScale::Scale100,
        system_scale: SystemScale::Scale100,
        revision: 0,
        source: EnvironmentSource::Defaults,
        test_override_active: false,
    };

    /// Creates live state without reading an operating-system API.
    #[must_use]
    pub const fn new(
        requested_theme: RequestedTheme,
        ui_scale: UiScale,
        system_scale: SystemScale,
    ) -> Self {
        Self {
            requested_theme,
            observed_appearance: None,
            ui_scale,
            system_scale,
            revision: 0,
            source: EnvironmentSource::Defaults,
            test_override_active: false,
        }
    }

    /// Creates state permanently pinned to a deterministic test fixture.
    #[must_use]
    pub const fn from_test_override(test_override: EnvironmentTestOverride) -> Self {
        Self {
            requested_theme: test_override.requested_theme,
            observed_appearance: test_override.observed_appearance,
            ui_scale: test_override.ui_scale,
            system_scale: test_override.system_scale,
            revision: 0,
            source: EnvironmentSource::TestOverride,
            test_override_active: true,
        }
    }

    #[must_use]
    pub const fn requested_theme(self) -> RequestedTheme {
        self.requested_theme
    }

    #[must_use]
    pub const fn observed_appearance(self) -> Option<ThemeMode> {
        self.observed_appearance
    }

    #[must_use]
    pub const fn resolved_appearance(self) -> ThemeMode {
        self.requested_theme.resolve(self.observed_appearance)
    }

    #[must_use]
    pub const fn ui_scale(self) -> UiScale {
        self.ui_scale
    }

    #[must_use]
    pub const fn system_scale(self) -> SystemScale {
        self.system_scale
    }

    #[must_use]
    pub const fn revision(self) -> u64 {
        self.revision
    }

    #[must_use]
    pub const fn source(self) -> EnvironmentSource {
        self.source
    }

    #[must_use]
    pub const fn is_test_override(self) -> bool {
        self.test_override_active
    }

    /// Applies one typed input and increments the revision only on change.
    pub fn reduce(&mut self, event: EnvironmentEvent) -> EnvironmentChange {
        if self.test_override_active {
            return EnvironmentChange::TestOverrideActive;
        }

        let changed = match event {
            EnvironmentEvent::RequestTheme(requested_theme) => {
                replace_if_changed(&mut self.requested_theme, requested_theme)
            }
            EnvironmentEvent::SetUiScale(ui_scale) => {
                replace_if_changed(&mut self.ui_scale, ui_scale)
            }
            EnvironmentEvent::ObserveAppearance(appearance) => {
                replace_if_changed(&mut self.observed_appearance, appearance)
            }
            EnvironmentEvent::ObserveSystemScale(system_scale) => {
                replace_if_changed(&mut self.system_scale, system_scale)
            }
        };
        if !changed {
            return EnvironmentChange::Unchanged;
        }

        self.revision = self.revision.saturating_add(1);
        self.source = event.source();
        EnvironmentChange::Updated {
            revision: self.revision,
            source: self.source,
        }
    }

    /// Validates and applies an application UI scale factor.
    pub fn try_set_ui_scale(&mut self, factor: f64) -> Result<EnvironmentChange, ScaleError> {
        UiScale::try_from_factor(factor)
            .map(|scale| self.reduce(EnvironmentEvent::SetUiScale(scale)))
    }

    /// Validates, normalizes, and applies an observed system scale factor.
    pub fn observe_system_scale(&mut self, factor: f64) -> Result<EnvironmentChange, ScaleError> {
        SystemScale::normalize(factor)
            .map(|scale| self.reduce(EnvironmentEvent::ObserveSystemScale(scale)))
    }
}

impl Default for EnvironmentState {
    fn default() -> Self {
        Self::DEFAULT
    }
}

/// A rejected raw scale observation or preference.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScaleError {
    NotFinite,
    NonPositive,
    UnsupportedUiScale,
}

impl fmt::Display for ScaleError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::NotFinite => "scale must be finite",
            Self::NonPositive => "scale must be positive",
            Self::UnsupportedUiScale => "UI scale is not in the supported sentinel set",
        })
    }
}

impl std::error::Error for ScaleError {}

fn validate_scale(factor: f64) -> Result<(), ScaleError> {
    if !factor.is_finite() {
        Err(ScaleError::NotFinite)
    } else if factor <= 0.0 {
        Err(ScaleError::NonPositive)
    } else {
        Ok(())
    }
}

fn replace_if_changed<T: PartialEq>(current: &mut T, next: T) -> bool {
    if *current == next {
        false
    } else {
        *current = next;
        true
    }
}

#[cfg(test)]
mod tests {
    use super::{
        EnvironmentChange, EnvironmentEvent, EnvironmentSource, EnvironmentState,
        EnvironmentTestOverride, RequestedTheme, ScaleError, SystemScale, ThemeMode, UiScale,
    };

    #[test]
    fn system_without_an_observation_falls_back_to_light() {
        let state = EnvironmentState::default();

        assert_eq!(state.requested_theme(), RequestedTheme::System);
        assert_eq!(state.observed_appearance(), None);
        assert_eq!(state.resolved_appearance(), ThemeMode::Light);
        assert_eq!(state.source(), EnvironmentSource::Defaults);
    }

    #[test]
    fn explicit_theme_ignores_but_retains_the_system_observation() {
        let mut state = EnvironmentState::new(
            RequestedTheme::Light,
            UiScale::Scale100,
            SystemScale::Scale100,
        );

        assert_eq!(
            state.reduce(EnvironmentEvent::ObserveAppearance(Some(ThemeMode::Dark))),
            EnvironmentChange::Updated {
                revision: 1,
                source: EnvironmentSource::SystemObservation,
            }
        );
        assert_eq!(state.resolved_appearance(), ThemeMode::Light);

        state.reduce(EnvironmentEvent::RequestTheme(RequestedTheme::System));
        assert_eq!(state.resolved_appearance(), ThemeMode::Dark);
    }

    #[test]
    fn identical_inputs_do_not_change_revision_or_source() {
        let mut state = EnvironmentState::default();
        let changed = state.reduce(EnvironmentEvent::RequestTheme(RequestedTheme::Dark));
        assert_eq!(
            changed,
            EnvironmentChange::Updated {
                revision: 1,
                source: EnvironmentSource::ApplicationPreference,
            }
        );

        assert_eq!(
            state.reduce(EnvironmentEvent::RequestTheme(RequestedTheme::Dark)),
            EnvironmentChange::Unchanged
        );
        assert_eq!(state.revision(), 1);
        assert_eq!(state.source(), EnvironmentSource::ApplicationPreference);
    }

    #[test]
    fn legal_and_unknown_system_scales_normalize_deterministically() {
        assert_eq!(SystemScale::normalize(1.0), Ok(SystemScale::Scale100));
        assert_eq!(SystemScale::normalize(1.25), Ok(SystemScale::Scale125));
        assert_eq!(SystemScale::normalize(1.5), Ok(SystemScale::Scale150));
        assert_eq!(SystemScale::normalize(2.0), Ok(SystemScale::Scale200));
        assert_eq!(SystemScale::normalize(0.8), Ok(SystemScale::Scale100));
        assert_eq!(SystemScale::normalize(1.2), Ok(SystemScale::Scale125));
        assert_eq!(SystemScale::normalize(1.75), Ok(SystemScale::Scale200));
        assert_eq!(SystemScale::normalize(3.0), Ok(SystemScale::Scale200));
    }

    #[test]
    fn invalid_raw_scales_are_rejected_without_mutating_state() {
        let mut state = EnvironmentState::default();
        for value in [f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
            assert_eq!(
                state.observe_system_scale(value),
                Err(ScaleError::NotFinite)
            );
            assert_eq!(state.try_set_ui_scale(value), Err(ScaleError::NotFinite));
        }
        for value in [0.0, -0.0, -1.0] {
            assert_eq!(
                state.observe_system_scale(value),
                Err(ScaleError::NonPositive)
            );
            assert_eq!(state.try_set_ui_scale(value), Err(ScaleError::NonPositive));
        }
        assert_eq!(state.revision(), 0);
    }

    #[test]
    fn ui_scale_rejects_positive_values_outside_its_choice_set() {
        assert_eq!(UiScale::try_from_factor(1.0), Ok(UiScale::Scale100));
        assert_eq!(UiScale::try_from_factor(1.25), Ok(UiScale::Scale125));
        assert_eq!(UiScale::try_from_factor(1.5), Ok(UiScale::Scale150));
        assert_eq!(
            UiScale::try_from_factor(2.0),
            Err(ScaleError::UnsupportedUiScale)
        );
    }

    #[test]
    fn normalized_same_value_is_deduplicated() {
        let mut state = EnvironmentState::default();
        assert_eq!(
            state.observe_system_scale(1.2),
            Ok(EnvironmentChange::Updated {
                revision: 1,
                source: EnvironmentSource::SystemObservation,
            })
        );
        assert_eq!(
            state.observe_system_scale(1.3),
            Ok(EnvironmentChange::Unchanged)
        );
        assert_eq!(state.system_scale(), SystemScale::Scale125);
        assert_eq!(state.revision(), 1);
    }

    #[test]
    fn test_override_is_immutable_and_machine_independent() {
        let fixture = EnvironmentTestOverride::new(
            RequestedTheme::System,
            Some(ThemeMode::Dark),
            UiScale::Scale150,
            SystemScale::Scale200,
        );
        let mut state = EnvironmentState::from_test_override(fixture);

        assert!(state.is_test_override());
        assert_eq!(state.resolved_appearance(), ThemeMode::Dark);
        assert_eq!(state.source(), EnvironmentSource::TestOverride);
        assert_eq!(
            state.reduce(EnvironmentEvent::ObserveAppearance(Some(ThemeMode::Light))),
            EnvironmentChange::TestOverrideActive
        );
        assert_eq!(
            state.reduce(EnvironmentEvent::SetUiScale(UiScale::Scale100)),
            EnvironmentChange::TestOverrideActive
        );
        assert_eq!(state, EnvironmentState::from_test_override(fixture));
    }

    #[test]
    fn theme_toggle_is_reversible() {
        assert_eq!(ThemeMode::Light.toggled().toggled(), ThemeMode::Light);
    }
}
