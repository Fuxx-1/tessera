//! Transient messages render through PopupNotification with an ID-safe FIFO.
use std::collections::VecDeque;

use crate::foundation::input::ButtonActivationExt;
use crate::foundation::popup::{PopupPlacement, popup_rect, position_popup, safe_popup_rect};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

const MESSAGE_TIMEOUT_SECS: f64 = 4.0;
const MAX_MESSAGES: usize = 20;

pub struct MessageSurfaceCatalog;
impl MessageSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Message => Some("TesseraMessage"),
            _ => None,
        }
    }
}
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MessageItem {
    pub id: u64,
    pub text: String,
}
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct MessageState {
    pub queue: VecDeque<MessageItem>,
    pub retries: u32,
    next_id: u64,
}
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MessageEvent {
    Enqueue(String),
    Timeout(u64),
    Dismiss(u64),
    Retry(u64),
    Reset,
}
impl MessageState {
    pub fn reduce(&mut self, event: MessageEvent) -> Option<u64> {
        match event {
            MessageEvent::Enqueue(text) => {
                self.next_id = self.next_id.saturating_add(1);
                let id = self.next_id;
                if self.queue.len() == MAX_MESSAGES {
                    self.queue.pop_back();
                }
                self.queue.push_back(MessageItem { id, text });
                Some(id)
            }
            MessageEvent::Timeout(id) | MessageEvent::Dismiss(id) => {
                if self.queue.front().is_some_and(|item| item.id == id) {
                    self.queue.pop_front();
                    Some(id)
                } else {
                    None
                }
            }
            MessageEvent::Retry(id) => {
                if self.queue.front().is_some_and(|item| item.id == id) {
                    self.retries = self.retries.saturating_add(1);
                    Some(id)
                } else {
                    None
                }
            }
            MessageEvent::Reset => {
                *self = Self::default();
                None
            }
        }
    }
    fn head(&self) -> Option<&MessageItem> {
        self.queue.front()
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum MessageAction {
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
script_mod! { use mod.prelude.widgets_internal.* use mod.widgets.* mod.widgets.TesseraMessageBase = #(TesseraMessage::register_widget(vm)) mod.widgets.TesseraMessage = set_type_default() do mod.widgets.TesseraMessageBase{width: Fill height: Fit flow: Down spacing: 6 padding: Inset{left: 12, right: 12, top: 10, bottom: 10} show_bg: true draw_bg +: {color: theme.color_fg_app border_radius: 4.0 border_size: 1.0 border_color: theme.color_bevel} message_status := Label{width: Fill height: Fit text: "No queued message" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}} message_send := Button{width: Fit height: 30 text: "Send message"} message_popup := PopupNotification{content := TesseraMessageSurface{width: 300 height: Fit flow: Down spacing: 6 padding: Inset{left: 12, right: 12, top: 10, bottom: 10} show_bg: true message_popup_text := Label{width: Fill height: Fit text: "Message sent to the workspace" draw_text.flow: Flow.Right{wrap: true}} message_popup_actions := View{width: Fill height: 28 flow: Right spacing: 8 message_popup_retry := Button{width: Fit height: 28 text: "Retry"} message_popup_close := Button{width: Fit height: 28 text: "Dismiss"}}}}} }
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraMessage {
    #[deref]
    view: View,
    #[rust]
    state: MessageState,
    #[rust]
    timer: Timer,
    #[rust]
    armed_id: Option<u64>,
}
impl TesseraMessage {
    pub fn reset(&mut self, cx: &mut Cx) {
        cx.stop_timer(self.timer);
        self.armed_id = None;
        self.state.reduce(MessageEvent::Reset);
        self.sync_popup(cx);
        cx.widget_action(self.widget_uid(), MessageAction::Reset);
    }
    fn sync_popup(&mut self, cx: &mut Cx) {
        if let Some(item) = self.state.head() {
            self.view
                .label(cx, ids!(message_popup_text))
                .set_text(cx, &item.text);
            if !self
                .view
                .popup_notification(cx, ids!(message_popup))
                .is_open()
            {
                self.view
                    .popup_notification(cx, ids!(message_popup))
                    .open(cx);
            }
            if self.armed_id != Some(item.id) {
                cx.stop_timer(self.timer);
                self.timer = cx.start_timeout(MESSAGE_TIMEOUT_SECS);
                self.armed_id = Some(item.id);
            }
            self.view.label(cx, ids!(message_status)).set_text(
                cx,
                &format!("Message {} of {} queued", item.id, self.state.queue.len()),
            );
        } else {
            cx.stop_timer(self.timer);
            self.armed_id = None;
            self.view
                .popup_notification(cx, ids!(message_popup))
                .close(cx);
            self.view
                .label(cx, ids!(message_status))
                .set_text(cx, "No queued message");
        }
        self.view.redraw(cx);
    }
    fn expire(&mut self, cx: &mut Cx, id: u64) {
        if self.state.reduce(MessageEvent::Timeout(id)).is_some() {
            cx.widget_action(self.widget_uid(), MessageAction::TimedOut { id });
        }
        self.sync_popup(cx);
    }

    fn dismiss_head(&mut self, cx: &mut Cx) {
        if let Some(id) = self.state.head().map(|item| item.id) {
            if self.state.reduce(MessageEvent::Dismiss(id)).is_some() {
                cx.widget_action(self.widget_uid(), MessageAction::Dismissed { id });
            }
            self.sync_popup(cx);
            cx.set_key_focus(self.view.button(cx, ids!(message_send)).area());
        }
    }

    fn retry_head(&mut self, cx: &mut Cx) {
        if let Some(id) = self.state.head().map(|item| item.id) {
            if self.state.reduce(MessageEvent::Retry(id)).is_some() {
                cx.widget_action(
                    self.widget_uid(),
                    MessageAction::Retried {
                        id,
                        retries: self.state.retries,
                    },
                );
            }
            self.sync_popup(cx);
        }
    }
}
impl Widget for TesseraMessage {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        if self.state.head().is_some() {
            let rect = popup_rect(
                safe_popup_rect(cx.current_pass_size(), 48.0),
                dvec2(300.0, 92.0),
                PopupPlacement::TopRight,
            );
            position_popup(
                &self.view.popup_notification(cx, ids!(message_popup)),
                cx,
                rect,
            );
        }
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
            .button(cx, ids!(message_send))
            .activated(cx, event, &actions)
        {
            if let Some(id) = self.state.reduce(MessageEvent::Enqueue(String::from(
                "Message sent to the workspace",
            ))) {
                cx.widget_action(self.widget_uid(), MessageAction::Queued { id });
                self.sync_popup(cx);
            }
        } else if self
            .view
            .button(cx, ids!(message_popup_close))
            .activated(cx, event, &actions)
        {
            self.dismiss_head(cx);
        } else if self
            .view
            .button(cx, ids!(message_popup_retry))
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
    use super::{MAX_MESSAGES, MessageEvent, MessageState};
    #[test]
    fn old_timeout_cannot_remove_new_fifo_head() {
        let mut state = MessageState::default();
        let first = state
            .reduce(MessageEvent::Enqueue(String::from("first")))
            .unwrap();
        let second = state
            .reduce(MessageEvent::Enqueue(String::from("second")))
            .unwrap();
        state.reduce(MessageEvent::Timeout(first));
        assert_eq!(state.head().unwrap().id, second);
        assert_eq!(state.reduce(MessageEvent::Timeout(first)), None);
        assert_eq!(state.reduce(MessageEvent::Timeout(second)), Some(second));
    }

    #[test]
    fn message_queue_is_bounded_and_retries_only_the_visible_head() {
        let mut state = MessageState::default();
        for index in 0..=MAX_MESSAGES {
            state.reduce(MessageEvent::Enqueue(format!("message {index}")));
        }
        assert_eq!(state.queue.len(), MAX_MESSAGES);
        let head = state.head().expect("bounded queue head").id;
        assert_eq!(state.reduce(MessageEvent::Retry(head)), Some(head));
        assert_eq!(state.retries, 1);
        assert_eq!(state.reduce(MessageEvent::Retry(head + 1)), None);
    }
}
