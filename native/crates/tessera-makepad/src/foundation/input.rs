use crate::makepad_widgets::{
    Actions, Animate, AnimatorImpl, ButtonRef, CheckBoxRef, Cx, Event, Hit, KeyCode, LiveId,
    WidgetNode, WidgetRef, ids,
};

// Upstream set_enabled only changes hit policy; keep its visual state in sync.
pub(crate) fn set_button_enabled(button: &ButtonRef, cx: &mut Cx, enabled: bool) {
    if button
        .borrow()
        .is_some_and(|button| button.enabled() != enabled)
    {
        button.set_enabled(cx, enabled);
    }
    if let Some(mut button) = button.borrow_mut() {
        button.animator_cut(
            cx,
            if enabled {
                ids!(disabled.off)
            } else {
                ids!(disabled.on)
            },
        );
        button.redraw(cx);
    }
}

// The pinned native Button handles pointer input but has no keyboard activation.
pub fn button_keyboard_activation(button: &ButtonRef, cx: &Cx, event: &Event) -> bool {
    let area = button.area();
    if !matches!(event, Event::KeyDown(_)) || !area.is_valid(cx) {
        return false;
    }
    let clipped = area.clipped_rect(cx);
    button_activation_requested(
        event,
        button.key_focus(cx),
        button.visible()
            && !button.disabled(cx)
            && clipped.size.x > 0.0
            && clipped.size.y > 0.0
            && button.borrow().is_some_and(|button| button.enabled()),
    )
}

/// Read native pointer and keyboard activation once, before mutating owner state.
/// The owner remains responsible for closed overlays and hidden ancestor policy.
pub trait ButtonActivationExt {
    fn activated(&self, cx: &Cx, event: &Event, actions: &Actions) -> bool;
}

impl ButtonActivationExt for ButtonRef {
    fn activated(&self, cx: &Cx, event: &Event, actions: &Actions) -> bool {
        self.clicked(actions) || button_keyboard_activation(self, cx, event)
    }
}

fn button_activation_requested(event: &Event, focused: bool, enabled: bool) -> bool {
    matches!(event, Event::KeyDown(key)
        if !key.is_repeat
            && !key.modifiers.control && !key.modifiers.logo && !key.modifiers.alt
            && matches!(key.key_code, KeyCode::ReturnKey | KeyCode::NumpadEnter | KeyCode::Space))
        && focused
        && enabled
}

pub(crate) fn control_keyboard_activation(control: &WidgetRef, cx: &Cx, event: &Event) -> bool {
    button_activation_requested(
        event,
        control.area().is_valid(cx) && control.key_focus(cx),
        control.visible() && !control.disabled(cx),
    )
}

// Pinned stock choice widgets do not reject disabled pointer hits themselves.
pub(crate) fn disabled_control_pointer(control: &WidgetRef, cx: &mut Cx, event: &Event) -> bool {
    control.visible()
        && control.disabled(cx)
        && matches!(
            event.hits(cx, control.area()),
            Hit::FingerDown(_)
                | Hit::FingerUp(_)
                | Hit::FingerMove(_)
                | Hit::FingerHoverIn(_)
                | Hit::FingerHoverOver(_)
                | Hit::FingerHoverOut(_)
        )
}

pub(crate) fn checkbox_change(
    control: &CheckBoxRef,
    cx: &mut Cx,
    event: &Event,
    actions: &Actions,
) -> Option<bool> {
    if !control.visible() || control.disabled(cx) {
        return None;
    }
    if let Some(value) = control.changed(actions) {
        return Some(value);
    }
    if control_keyboard_activation(control, cx, event) {
        let value = !control.active(cx);
        control.set_active(cx, value, Animate::No);
        control.redraw(cx);
        return Some(value);
    }
    None
}

pub(crate) fn enabled_choice_index(
    key: KeyCode,
    current: usize,
    enabled: &[bool],
) -> Option<usize> {
    if current >= enabled.len() {
        return None;
    }
    match key {
        KeyCode::Home => enabled.iter().position(|value| *value),
        KeyCode::End => enabled.iter().rposition(|value| *value),
        KeyCode::ArrowRight | KeyCode::ArrowDown => (1..=enabled.len())
            .map(|offset| (current + offset) % enabled.len())
            .find(|index| enabled[*index]),
        KeyCode::ArrowLeft | KeyCode::ArrowUp => (1..=enabled.len())
            .map(|offset| (current + enabled.len() - offset) % enabled.len())
            .find(|index| enabled[*index]),
        _ => None,
    }
}

pub(crate) fn focused_navigation_key(event: &Event, focused: bool) -> Option<KeyCode> {
    match event {
        Event::KeyDown(key)
            if focused
                && !key.modifiers.control
                && !key.modifiers.logo
                && !key.modifiers.alt
                && matches!(
                    key.key_code,
                    KeyCode::ArrowLeft
                        | KeyCode::ArrowRight
                        | KeyCode::ArrowUp
                        | KeyCode::ArrowDown
                        | KeyCode::Home
                        | KeyCode::End
                        | KeyCode::PageUp
                        | KeyCode::PageDown
                ) =>
        {
            Some(key.key_code)
        }
        _ => None,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum InputModality {
    #[default]
    Keyboard,
    Pointer,
    Touch,
}

impl InputModality {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Keyboard => "Keyboard",
            Self::Pointer => "Pointer",
            Self::Touch => "Touch",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum FocusVisibility {
    #[default]
    Visible,
    Hidden,
}

impl FocusVisibility {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Visible => "Visible",
            Self::Hidden => "Hidden",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum ImeState {
    Disabled,
    #[default]
    Enabled,
    Composing,
}

impl ImeState {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Disabled => "Disabled",
            Self::Enabled => "Enabled",
            Self::Composing => "Composing",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct InputState {
    pub modality: InputModality,
    pub focus_visibility: FocusVisibility,
    pub ime: ImeState,
}

impl InputState {
    pub const fn keyboard() -> Self {
        Self {
            modality: InputModality::Keyboard,
            focus_visibility: FocusVisibility::Visible,
            ime: ImeState::Enabled,
        }
    }

    pub const fn pointer() -> Self {
        Self {
            modality: InputModality::Pointer,
            focus_visibility: FocusVisibility::Hidden,
            ime: ImeState::Enabled,
        }
    }

    pub const fn touch() -> Self {
        Self {
            modality: InputModality::Touch,
            focus_visibility: FocusVisibility::Hidden,
            ime: ImeState::Enabled,
        }
    }

    pub const fn with_focus_visibility(self, focus_visibility: FocusVisibility) -> Self {
        Self {
            focus_visibility,
            ..self
        }
    }

    pub const fn with_ime(self, ime: ImeState) -> Self {
        Self { ime, ..self }
    }

    pub const fn is_focus_visible(self) -> bool {
        matches!(self.focus_visibility, FocusVisibility::Visible)
    }

    pub fn summary(self) -> String {
        format!(
            "modality={} focus={} ime={}",
            self.modality.label(),
            self.focus_visibility.label(),
            self.ime.label()
        )
    }
}

#[cfg(test)]
mod tests {
    use super::{
        FocusVisibility, ImeState, InputState, button_activation_requested, focused_navigation_key,
    };
    use crate::makepad_widgets::{Event, KeyCode, KeyEvent, KeyModifiers};

    #[test]
    fn undrawn_native_button_cannot_match_empty_startup_focus() {
        use crate::makepad_widgets::*;
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let button = cx.with_vm(|vm| {
            crate::makepad_widgets::script_mod(vm);
            let value = script_eval!(vm, {
                use mod.prelude.widgets.*
                use mod.widgets.*
                Button{text: "Not drawn"}
            });
            WidgetRef::script_from_value(vm, value).as_button()
        });
        assert!(button.key_focus(&cx));
        assert!(button.visible());
        assert!(button.borrow().unwrap().enabled());
        for key_code in [KeyCode::ReturnKey, KeyCode::NumpadEnter, KeyCode::Space] {
            let event = Event::KeyDown(KeyEvent {
                key_code,
                ..Default::default()
            });
            assert!(!super::button_keyboard_activation(&button, &cx, &event));
            assert!(!super::ButtonActivationExt::activated(
                &button,
                &cx,
                &event,
                &[]
            ));
        }
    }

    #[test]
    fn shared_activation_preserves_native_clicked_action_identity() {
        use super::ButtonActivationExt;
        use crate::makepad_widgets::*;
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let ui = cx.with_vm(|vm| {
            crate::makepad_widgets::script_mod(vm);
            let value = script_eval!(vm, {
                use mod.prelude.widgets.*
                use mod.widgets.*
                View{first := Button{} second := Button{}}
            });
            WidgetRef::script_from_value(vm, value)
        });
        let first = ui.button(&cx, ids!(first));
        let second = ui.button(&cx, ids!(second));
        let actions = cx.capture_actions(|cx| {
            cx.widget_action(
                first.widget_uid(),
                ButtonAction::Clicked(KeyModifiers::default()),
            );
        });
        let event = Event::KeyUp(KeyEvent::default());
        assert!(first.activated(&cx, &event, &actions));
        assert!(!second.activated(&cx, &event, &actions));
        assert_eq!(actions.len(), 1);
        let pressed = cx.capture_actions(|cx| {
            cx.widget_action(
                first.widget_uid(),
                ButtonAction::Pressed(KeyModifiers::default()),
            );
        });
        assert!(!first.activated(&cx, &event, &pressed));
    }

    #[test]
    fn choice_navigation_wraps_and_skips_disabled_options() {
        use super::enabled_choice_index;
        let enabled = [true, false, true, false];
        assert_eq!(
            enabled_choice_index(KeyCode::ArrowRight, 0, &enabled),
            Some(2)
        );
        assert_eq!(
            enabled_choice_index(KeyCode::ArrowRight, 2, &enabled),
            Some(0)
        );
        assert_eq!(
            enabled_choice_index(KeyCode::ArrowLeft, 0, &enabled),
            Some(2)
        );
        assert_eq!(enabled_choice_index(KeyCode::Home, 2, &enabled), Some(0));
        assert_eq!(enabled_choice_index(KeyCode::End, 0, &enabled), Some(2));
        assert_eq!(
            enabled_choice_index(KeyCode::ArrowRight, 0, &[false; 3]),
            None
        );
        assert_eq!(enabled_choice_index(KeyCode::ArrowRight, 0, &[]), None);
        assert_eq!(enabled_choice_index(KeyCode::Tab, 0, &enabled), None);
    }

    #[test]
    fn button_activation_requires_enabled_focus_and_a_single_key_down() {
        for key_code in [KeyCode::ReturnKey, KeyCode::NumpadEnter, KeyCode::Space] {
            let key = KeyEvent {
                key_code,
                ..Default::default()
            };
            assert!(button_activation_requested(
                &Event::KeyDown(key),
                true,
                true
            ));
            assert!(!button_activation_requested(
                &Event::KeyDown(key),
                false,
                true
            ));
            assert!(!button_activation_requested(
                &Event::KeyDown(key),
                true,
                false
            ));
            assert!(!button_activation_requested(&Event::KeyUp(key), true, true));
            assert!(!button_activation_requested(
                &Event::KeyDown(KeyEvent {
                    is_repeat: true,
                    ..key
                }),
                true,
                true,
            ));
        }
        assert!(!button_activation_requested(
            &Event::KeyDown(KeyEvent {
                key_code: KeyCode::Tab,
                ..Default::default()
            }),
            true,
            true,
        ));
    }

    #[test]
    fn shortcuts_are_not_component_activation_or_navigation() {
        for modifiers in [
            KeyModifiers {
                control: true,
                ..Default::default()
            },
            KeyModifiers {
                logo: true,
                ..Default::default()
            },
            KeyModifiers {
                alt: true,
                ..Default::default()
            },
        ] {
            assert!(!button_activation_requested(
                &Event::KeyDown(KeyEvent {
                    key_code: KeyCode::ReturnKey,
                    modifiers,
                    ..Default::default()
                }),
                true,
                true,
            ));
            assert_eq!(
                focused_navigation_key(
                    &Event::KeyDown(KeyEvent {
                        key_code: KeyCode::ArrowDown,
                        modifiers,
                        ..Default::default()
                    }),
                    true,
                ),
                None
            );
        }
    }

    #[test]
    fn navigation_requires_own_focus_but_allows_held_arrow_keys() {
        let key = KeyEvent {
            key_code: KeyCode::ArrowDown,
            is_repeat: true,
            ..Default::default()
        };
        assert_eq!(
            focused_navigation_key(&Event::KeyDown(key), true),
            Some(KeyCode::ArrowDown)
        );
        assert_eq!(focused_navigation_key(&Event::KeyDown(key), false), None);
        assert_eq!(focused_navigation_key(&Event::KeyUp(key), true), None);
        assert_eq!(
            focused_navigation_key(
                &Event::KeyDown(KeyEvent {
                    key_code: KeyCode::Tab,
                    ..key
                }),
                true
            ),
            None
        );
    }

    #[test]
    fn keyboard_focus_is_visible_by_default() {
        let state = InputState::keyboard();

        assert!(state.is_focus_visible());
        assert_eq!(state.modality.label(), "Keyboard");
        assert_eq!(state.ime.label(), "Enabled");
    }

    #[test]
    fn pointer_focus_hides_the_keyboard_focus_ring_without_touching_ime() {
        let state = InputState::pointer().with_ime(ImeState::Composing);

        assert!(!state.is_focus_visible());
        assert_eq!(state.focus_visibility, FocusVisibility::Hidden);
        assert_eq!(state.ime, ImeState::Composing);
    }
}
