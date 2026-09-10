//! Bounded input bindings for virtualized native button collections.
use super::focus::{constrain_tab_group, exclude_tab_area};
use super::input::{button_keyboard_activation, focused_navigation_key};
use crate::makepad_widgets::*;

struct ButtonBinding<T> {
    button: ButtonRef,
    value: T,
}

pub struct ButtonBindings<T> {
    visible: Vec<ButtonBinding<T>>,
    preferred: Option<T>,
    pending_focus: Option<T>,
}

impl<T> Default for ButtonBindings<T> {
    fn default() -> Self {
        Self {
            visible: Vec::new(),
            preferred: None,
            pending_focus: None,
        }
    }
}

fn fully_visible(button: &ButtonRef, cx: &Cx) -> bool {
    let area = button.area();
    if !area.is_valid(cx) || !button.visible() || button.disabled(cx) {
        return false;
    }
    let full = area.rect(cx);
    let clipped = area.clipped_rect(cx);
    clipped.size.x > 0.0
        && clipped.size.y > 0.0
        && (full.size.x - clipped.size.x).abs() < 0.01
        && (full.size.y - clipped.size.y).abs() < 0.01
}

fn pointer_visible(button: &ButtonRef, cx: &Cx) -> bool {
    let area = button.area();
    if !area.is_valid(cx) || !button.visible() || button.disabled(cx) {
        return false;
    }
    let clipped = area.clipped_rect(cx);
    clipped.size.x > 0.0 && clipped.size.y > 0.0
}

impl<T: Copy + Eq> ButtonBindings<T> {
    /// Call when the virtual list starts drawing its next visible window.
    pub fn begin_draw(&mut self) {
        self.visible.clear();
    }

    /// Bind after drawing so a requested focus uses the item's current area.
    pub fn bind(&mut self, cx: &mut Cx, button: ButtonRef, value: T) {
        if self.pending_focus == Some(value) && button.area().is_valid(cx) {
            cx.set_key_focus(button.area());
            self.pending_focus = None;
        }
        if button.key_focus(cx) {
            self.preferred = Some(value);
        }
        if let Some(binding) = self
            .visible
            .iter_mut()
            .find(|binding| binding.button.widget_uid() == button.widget_uid())
        {
            binding.value = value;
        } else {
            self.visible.push(ButtonBinding { button, value });
        }
    }

    pub fn request_focus(&mut self, value: T) {
        self.preferred = Some(value);
        self.pending_focus = Some(value);
    }

    pub fn is_visible(&self, cx: &Cx, value: T) -> bool {
        self.visible
            .iter()
            .any(|binding| binding.value == value && fully_visible(&binding.button, cx))
    }

    pub fn focused(&self, cx: &Cx) -> Option<T> {
        self.visible
            .iter()
            .find(|binding| binding.button.area().is_valid(cx) && binding.button.key_focus(cx))
            .map(|binding| binding.value)
    }

    /// Native pointer actions and keyboard fallback produce one typed activation.
    pub fn activated(&mut self, cx: &Cx, event: &Event, actions: &Actions) -> Option<T> {
        let pointer = actions.iter().find_map(|action| {
            let action = action.as_widget_action()?;
            if !matches!(
                action.action.downcast_ref::<ButtonAction>(),
                Some(ButtonAction::Clicked(_))
            ) {
                return None;
            }
            self.visible.iter().find(|binding| {
                binding.button.widget_uid() == action.widget_uid
                    && pointer_visible(&binding.button, cx)
                    && binding
                        .button
                        .borrow()
                        .is_some_and(|button| button.enabled())
            })
        });
        let binding = pointer.or_else(|| {
            self.visible.iter().find(|binding| {
                fully_visible(&binding.button, cx)
                    && button_keyboard_activation(&binding.button, cx, event)
            })
        })?;
        self.preferred = Some(binding.value);
        Some(binding.value)
    }

    /// One Tab entry per collection. Arrows move by stable data identity.
    pub fn constrain_tab(&mut self, cx: &mut Cx, event: &Event) {
        if !matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Tab) {
            return;
        }
        if let Some(focused) = self.focused(cx) {
            self.preferred = Some(focused);
        }
        let preferred = self
            .visible
            .iter()
            .position(|binding| {
                Some(binding.value) == self.preferred && fully_visible(&binding.button, cx)
            })
            .or_else(|| {
                self.visible
                    .iter()
                    .position(|binding| fully_visible(&binding.button, cx))
            });
        let members: Vec<&WidgetRef> = self
            .visible
            .iter()
            .map(|binding| &*binding.button)
            .collect();
        constrain_tab_group(cx, event, &members, preferred);
        for binding in &self.visible {
            if !fully_visible(&binding.button, cx) {
                exclude_tab_area(cx, binding.button.area());
            }
        }
    }

    pub fn navigation_key(&self, cx: &Cx, event: &Event) -> Option<KeyCode> {
        focused_navigation_key(event, self.focused(cx).is_some())
    }
}

pub fn collection_index(key: KeyCode, current: usize, count: usize, page: usize) -> Option<usize> {
    if count == 0 || current >= count {
        return None;
    }
    let last = count - 1;
    match key {
        KeyCode::Home => Some(0),
        KeyCode::End => Some(last),
        KeyCode::ArrowUp | KeyCode::ArrowLeft => Some(current.saturating_sub(1)),
        KeyCode::ArrowDown | KeyCode::ArrowRight => Some(current.saturating_add(1).min(last)),
        KeyCode::PageUp => Some(current.saturating_sub(page.max(1))),
        KeyCode::PageDown => Some(current.saturating_add(page.max(1)).min(last)),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn collection_navigation_is_bounded_for_every_entry_and_large_pages() {
        for current in 0..101 {
            for key in [
                KeyCode::Home,
                KeyCode::End,
                KeyCode::ArrowUp,
                KeyCode::ArrowDown,
                KeyCode::PageUp,
                KeyCode::PageDown,
            ] {
                assert!(collection_index(key, current, 101, usize::MAX).unwrap() < 101);
            }
        }
        assert_eq!(collection_index(KeyCode::Home, 0, 0, 1), None);
        assert_eq!(collection_index(KeyCode::End, 101, 101, 1), None);
        assert_eq!(collection_index(KeyCode::PageDown, 0, 101, 0), Some(1));
    }

    #[test]
    fn recycled_bindings_release_previous_window_and_rebind_identity() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let widget = cx.with_vm(|vm| {
            crate::makepad_widgets::script_mod(vm);
            let value = script_eval!(vm, {
                use mod.prelude.widgets.*
                use mod.widgets.*
                Button{text: "Row"}
            });
            WidgetRef::script_from_value(vm, value)
        });
        let mut bindings = ButtonBindings::default();
        bindings.bind(&mut cx, widget.as_button(), 1);
        bindings.bind(&mut cx, widget.as_button(), 2);
        assert_eq!(bindings.visible.len(), 1);
        assert_eq!(bindings.visible[0].value, 2);
        bindings.request_focus(3);
        bindings.begin_draw();
        assert!(bindings.visible.is_empty());
        assert_eq!(bindings.pending_focus, Some(3));
        bindings.request_focus(4);
        assert_eq!(bindings.pending_focus, Some(4));
    }
}
