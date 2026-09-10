//! Notifications render through PopupNotification with an ID-safe FIFO.
use std::collections::VecDeque;

use crate::foundation::input::ButtonActivationExt;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

const NOTIFICATION_TIMEOUT_SECS: f64 = 8.0;
const MAX_NOTIFICATIONS: usize = 20;
pub struct NotificationSurfaceCatalog;
impl NotificationSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Notification => Some("TesseraNotification"),
            _ => None,
        }
    }
}
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NotificationItem {
    pub id: u64,
    pub title: String,
    pub message: String,
}
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct NotificationState {
    pub queue: VecDeque<NotificationItem>,
    pub retries: u32,
    next_id: u64,
}
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum NotificationEvent {
    Enqueue { title: String, message: String },
    Timeout(u64),
    Dismiss(u64),
    Retry(u64),
    Reset,
}
impl NotificationState {
    pub fn reduce(&mut self, event: NotificationEvent) -> Option<u64> {
        match event {
            NotificationEvent::Enqueue { title, message } => {
                self.next_id = self.next_id.saturating_add(1);
                let id = self.next_id;
                if self.queue.len() == MAX_NOTIFICATIONS {
                    self.queue.pop_back();
                }
                self.queue
                    .push_back(NotificationItem { id, title, message });
                Some(id)
            }
            NotificationEvent::Timeout(id) | NotificationEvent::Dismiss(id) => {
                if self.queue.front().is_some_and(|item| item.id == id) {
                    self.queue.pop_front();
                    Some(id)
                } else {
                    None
                }
            }
            NotificationEvent::Retry(id) => {
                if self.queue.front().is_some_and(|item| item.id == id) {
                    self.retries = self.retries.saturating_add(1);
                    Some(id)
                } else {
                    None
                }
            }
            NotificationEvent::Reset => {
                *self = Self::default();
                None
            }
        }
    }
    fn head(&self) -> Option<&NotificationItem> {
        self.queue.front()
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum NotificationAction {
    Queued {
        id: u64,
    },
    TimedOut {
        id: u64,
    },
    Dismissed {
        id: u64,
    },
    Retried {
        id: u64,
        retries: u32,
    },
    Reset,
    #[default]
    None,
}
script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*

    mod.widgets.TesseraNotificationBase = #(TesseraNotification::register_widget(vm))
    mod.widgets.TesseraNotification = set_type_default() do mod.widgets.TesseraNotificationBase{
        width: Fill height: Fit flow: Down spacing: 6
        padding: Inset{left: 12, right: 12, top: 10, bottom: 10}
        show_bg: true
        draw_bg +: {color: theme.color_fg_app border_radius: 4.0 border_size: 1.0 border_color: theme.color_bevel}
        notification_title := Label{width: Fill height: Fit text: "Release queued" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        notification_show := Button{width: Fit height: 30 text: "Show notification"}
        notification_hide := Button{width: Fit height: 28 visible: false text: "Dismiss active notification"}
        notification_status := Label{width: Fill height: Fit text: "No queued notification" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
        notification_popup := PopupNotification{
            content := TesseraPopupSurface{
                width: 330 height: Fit
                margin: Inset{top: 48, right: 16}
                padding: Inset{left: 12, right: 12, top: 10, bottom: 10}
                show_bg: true
                    notification_panel := View{
                        width: Fill height: Fit visible: false flow: Down spacing: 5
                        notification_popup_title := Label{width: Fill height: Fit text: "Release queued" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
                        notification_popup_message := Label{width: Fill height: Fit text: "The release will start after checks complete." draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
                        notification_popup_retry := Button{width: Fit height: 28 text: "Retry"}
                    }
            }
        }
    }
}
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraNotification {
    #[deref]
    view: View,
    #[rust]
    state: NotificationState,
    #[rust]
    timer: Timer,
    #[rust]
    armed_id: Option<u64>,
}
impl TesseraNotification {
    pub fn reset(&mut self, cx: &mut Cx) {
        cx.stop_timer(self.timer);
        self.armed_id = None;
        self.state.reduce(NotificationEvent::Reset);
        self.sync_popup(cx);
        cx.widget_action(self.widget_uid(), NotificationAction::Reset);
    }
    fn sync_popup(&mut self, cx: &mut Cx) {
        self.view
            .view(cx, ids!(notification_panel))
            .set_visible(cx, self.state.head().is_some());
        self.view
            .button(cx, ids!(notification_hide))
            .set_visible(cx, self.state.head().is_some());
        if let Some(item) = self.state.head() {
            self.view
                .label(cx, ids!(notification_popup_title))
                .set_text(cx, &item.title);
            self.view
                .label(cx, ids!(notification_popup_message))
                .set_text(cx, &item.message);
            if !self
                .view
                .popup_notification(cx, ids!(notification_popup))
                .is_open()
            {
                self.view
                    .popup_notification(cx, ids!(notification_popup))
                    .open(cx);
            }
            if self.armed_id != Some(item.id) {
                cx.stop_timer(self.timer);
                self.timer = cx.start_timeout(NOTIFICATION_TIMEOUT_SECS);
                self.armed_id = Some(item.id);
            }
            self.view.label(cx, ids!(notification_status)).set_text(
                cx,
                &format!(
                    "Notification {} of {} queued",
                    item.id,
                    self.state.queue.len()
                ),
            );
        } else {
            cx.stop_timer(self.timer);
            self.armed_id = None;
            self.view
                .popup_notification(cx, ids!(notification_popup))
                .close(cx);
            self.view
                .label(cx, ids!(notification_status))
                .set_text(cx, "No queued notification");
        }
        self.view.redraw(cx);
    }
    fn expire(&mut self, cx: &mut Cx, id: u64) {
        if self.state.reduce(NotificationEvent::Timeout(id)).is_some() {
            cx.widget_action(self.widget_uid(), NotificationAction::TimedOut { id });
        }
        self.sync_popup(cx);
    }

    fn dismiss_head(&mut self, cx: &mut Cx) {
        if let Some(id) = self.state.head().map(|item| item.id) {
            if self.state.reduce(NotificationEvent::Dismiss(id)).is_some() {
                cx.widget_action(self.widget_uid(), NotificationAction::Dismissed { id });
            }
            self.sync_popup(cx);
            cx.set_key_focus(self.view.button(cx, ids!(notification_show)).area());
        }
    }

    fn retry_head(&mut self, cx: &mut Cx) {
        if let Some(id) = self.state.head().map(|item| item.id) {
            if self.state.reduce(NotificationEvent::Retry(id)).is_some() {
                cx.widget_action(
                    self.widget_uid(),
                    NotificationAction::Retried {
                        id,
                        retries: self.state.retries,
                    },
                );
            }
            self.sync_popup(cx);
        }
    }
}
impl Widget for TesseraNotification {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        if self.timer.is_event(event).is_some() {
            if let Some(id) = self.armed_id {
                self.expire(cx, id);
            }
        }
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(notification_show))
            .activated(cx, event, &actions)
        {
            if let Some(id) = self.state.reduce(NotificationEvent::Enqueue {
                title: String::from("Release queued"),
                message: String::from("The release will start after checks complete."),
            }) {
                cx.widget_action(self.widget_uid(), NotificationAction::Queued { id });
                self.sync_popup(cx);
            }
        } else if self
            .view
            .button(cx, ids!(notification_hide))
            .activated(cx, event, &actions)
        {
            self.dismiss_head(cx);
        } else if self
            .view
            .button(cx, ids!(notification_popup_retry))
            .activated(cx, event, &actions)
        {
            self.retry_head(cx);
        } else if matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Escape) {
            self.dismiss_head(cx);
        }
    }
}
#[cfg(test)]
mod tests {
    use super::{MAX_NOTIFICATIONS, NotificationEvent, NotificationState};
    #[test]
    fn stale_timeout_preserves_new_head() {
        let mut state = NotificationState::default();
        let first = state
            .reduce(NotificationEvent::Enqueue {
                title: String::from("one"),
                message: String::new(),
            })
            .unwrap();
        let second = state
            .reduce(NotificationEvent::Enqueue {
                title: String::from("two"),
                message: String::new(),
            })
            .unwrap();
        state.reduce(NotificationEvent::Dismiss(first));
        assert_eq!(state.head().unwrap().id, second);
        assert_eq!(state.reduce(NotificationEvent::Timeout(first)), None);
        assert_eq!(
            state.reduce(NotificationEvent::Timeout(second)),
            Some(second)
        );
    }

    #[test]
    fn notification_queue_is_bounded_and_retry_is_head_scoped() {
        let mut state = NotificationState::default();
        for index in 0..=MAX_NOTIFICATIONS {
            state.reduce(NotificationEvent::Enqueue {
                title: format!("title {index}"),
                message: String::new(),
            });
        }
        assert_eq!(state.queue.len(), MAX_NOTIFICATIONS);
        let head = state.head().expect("bounded queue head").id;
        assert_eq!(state.reduce(NotificationEvent::Retry(head)), Some(head));
        assert_eq!(state.retries, 1);
        assert_eq!(state.reduce(NotificationEvent::Retry(head + 1)), None);
    }
}
