//! Typed, one-shot authorization for the concrete clipboard write capability.
//!
//! This module deliberately does not model future external actions. Platform
//! adapters receive an [`AuthorizedClipboardWrite`] only after the policy has
//! consumed the user gesture and its one-shot identifiers.

use std::fmt;
use std::num::NonZeroU64;
use std::time::{Duration, Instant};

/// The maximum UTF-8 byte length accepted for a clipboard write or read-back.
pub const MAX_CLIPBOARD_TEXT_BYTES: usize = 1 << 20;

/// A user gesture authorizes exactly one clipboard write for this duration.
pub const USER_GESTURE_TTL: Duration = Duration::from_secs(5);

/// A non-zero identity for a one-shot clipboard action.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct ActionId(NonZeroU64);

impl ActionId {
    #[must_use]
    pub const fn get(self) -> u64 {
        self.0.get()
    }
}

/// A non-zero identity proving the user gesture that authorized an action.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct GestureId(NonZeroU64);

impl GestureId {
    #[must_use]
    pub const fn get(self) -> u64 {
        self.0.get()
    }
}

/// A non-zero identity for the UI surface allowed to use a broker.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct AudienceId(NonZeroU64);

impl AudienceId {
    /// Creates an audience identity from a non-zero value.
    #[must_use]
    pub const fn new(value: NonZeroU64) -> Self {
        Self(value)
    }

    #[must_use]
    pub const fn get(self) -> u64 {
        self.0.get()
    }
}

/// The reason a clipboard write was not authorized or could not be issued.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ClipboardDenied {
    /// An earlier clipboard write is still pending completion.
    Busy,
    /// There are no remaining non-zero identifiers to issue.
    IdentifierExhausted,
    /// The monotonic clock could not represent the gesture deadline.
    DeadlineOverflow,
    /// The text exceeds the fixed UTF-8 byte budget.
    TextTooLarge { bytes: usize, limit: usize },
    /// The intent originated from a different UI surface.
    WrongAudience,
    /// The user gesture is no longer fresh.
    Expired,
    /// An action identifier was already consumed.
    ActionReplayed,
    /// A gesture identifier was already consumed.
    GestureReplayed,
}

/// The reason a dispatched clipboard write could not be verified by read-back.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ClipboardReadback {
    /// The platform did not return clipboard text.
    Unavailable,
    /// The platform returned a different value.
    Mismatch,
    /// The platform returned text beyond the fixed byte budget.
    OverLimit,
}

/// The result produced after a clipboard write attempt.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ClipboardResult {
    Verified {
        action_id: ActionId,
    },
    Unverified {
        action_id: ActionId,
        reason: ClipboardReadback,
    },
    Denied {
        action_id: ActionId,
        reason: ClipboardDenied,
    },
}

impl ClipboardResult {
    #[must_use]
    pub const fn action_id(&self) -> ActionId {
        match *self {
            Self::Verified { action_id }
            | Self::Unverified { action_id, .. }
            | Self::Denied { action_id, .. } => action_id,
        }
    }
}

/// The visible state of one clipboard action control.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum ClipboardStatus {
    #[default]
    Idle,
    Pending {
        action_id: ActionId,
    },
    Verified {
        action_id: ActionId,
    },
    Unverified {
        action_id: ActionId,
        reason: ClipboardReadback,
    },
    Denied {
        action_id: Option<ActionId>,
        reason: ClipboardDenied,
    },
}

/// Issues fresh clipboard intents and rejects stale completion messages.
///
/// This owns UI state only. The broker owns the authorization watermarks, so
/// [`Self::reset`] cannot make an already consumed action replayable.
#[derive(Debug)]
pub struct ClipboardAction {
    next_nonce: Option<NonZeroU64>,
    status: ClipboardStatus,
}

impl Default for ClipboardAction {
    fn default() -> Self {
        Self::new()
    }
}

impl ClipboardAction {
    #[must_use]
    pub const fn new() -> Self {
        Self {
            next_nonce: NonZeroU64::new(1),
            status: ClipboardStatus::Idle,
        }
    }

    #[must_use]
    pub const fn status(&self) -> &ClipboardStatus {
        &self.status
    }

    /// Starts a pending action from an explicit user gesture.
    ///
    /// The returned intent is short lived and still must be consumed by a
    /// [`ClipboardPolicy`] before a platform adapter can access the clipboard.
    pub fn begin_user_gesture(
        &mut self,
        audience: AudienceId,
        text: String,
        now: Instant,
    ) -> Result<ClipboardWriteText, ClipboardDenied> {
        if matches!(self.status, ClipboardStatus::Pending { .. }) {
            return Err(ClipboardDenied::Busy);
        }

        let bytes = text.len();
        if bytes > MAX_CLIPBOARD_TEXT_BYTES {
            let reason = ClipboardDenied::TextTooLarge {
                bytes,
                limit: MAX_CLIPBOARD_TEXT_BYTES,
            };
            self.status = ClipboardStatus::Denied {
                action_id: None,
                reason,
            };
            return Err(reason);
        }

        let expires_at = match now.checked_add(USER_GESTURE_TTL) {
            Some(expires_at) => expires_at,
            None => {
                self.status = ClipboardStatus::Denied {
                    action_id: None,
                    reason: ClipboardDenied::DeadlineOverflow,
                };
                return Err(ClipboardDenied::DeadlineOverflow);
            }
        };
        let (gesture_id, action_id) = match self.issue_identifiers() {
            Some(identifiers) => identifiers,
            None => {
                self.status = ClipboardStatus::Denied {
                    action_id: None,
                    reason: ClipboardDenied::IdentifierExhausted,
                };
                return Err(ClipboardDenied::IdentifierExhausted);
            }
        };

        self.status = ClipboardStatus::Pending { action_id };
        Ok(ClipboardWriteText {
            action_id,
            gesture_id,
            audience,
            expires_at,
            text,
        })
    }

    /// Applies a completion only if it belongs to the current pending action.
    pub fn complete(&mut self, result: ClipboardResult) -> bool {
        let action_id = result.action_id();
        if !matches!(self.status, ClipboardStatus::Pending { action_id: current } if current == action_id)
        {
            return false;
        }

        self.status = match result {
            ClipboardResult::Verified { action_id } => ClipboardStatus::Verified { action_id },
            ClipboardResult::Unverified { action_id, reason } => {
                ClipboardStatus::Unverified { action_id, reason }
            }
            ClipboardResult::Denied { action_id, reason } => ClipboardStatus::Denied {
                action_id: Some(action_id),
                reason,
            },
        };
        true
    }

    /// Clears the visible state without rewinding issued identifiers.
    pub fn reset(&mut self) {
        self.status = ClipboardStatus::Idle;
    }

    fn issue_identifiers(&mut self) -> Option<(GestureId, ActionId)> {
        let gesture = self.next_nonce?;
        let action = NonZeroU64::new(gesture.get().checked_add(1)?)?;
        self.next_nonce = action.get().checked_add(1).and_then(NonZeroU64::new);
        Some((GestureId(gesture), ActionId(action)))
    }
}

/// An opaque, unconsumed request to write text to the clipboard.
pub struct ClipboardWriteText {
    action_id: ActionId,
    gesture_id: GestureId,
    audience: AudienceId,
    expires_at: Instant,
    text: String,
}

impl ClipboardWriteText {
    #[must_use]
    pub const fn action_id(&self) -> ActionId {
        self.action_id
    }
}

impl fmt::Debug for ClipboardWriteText {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("ClipboardWriteText")
            .field("action_id", &self.action_id)
            .field("gesture_id", &self.gesture_id)
            .field("audience", &self.audience)
            .field("expires_at", &self.expires_at)
            .field("text_bytes", &self.text.len())
            .finish()
    }
}

/// A consumed clipboard authorization ready for the platform adapter.
pub struct AuthorizedClipboardWrite {
    action_id: ActionId,
    text: String,
}

impl AuthorizedClipboardWrite {
    #[must_use]
    pub const fn action_id(&self) -> ActionId {
        self.action_id
    }

    #[must_use]
    pub fn into_text(self) -> String {
        self.text
    }
}

impl fmt::Debug for AuthorizedClipboardWrite {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("AuthorizedClipboardWrite")
            .field("action_id", &self.action_id)
            .field("text_bytes", &self.text.len())
            .finish()
    }
}

/// The concrete clipboard capability authority for one UI audience.
///
/// There is intentionally no `Default`: callers must choose an audience and
/// therefore never receive ambient clipboard authority.
#[derive(Debug)]
pub struct ClipboardPolicy {
    audience: AudienceId,
    action_high_water: Option<ActionId>,
    gesture_high_water: Option<GestureId>,
}

impl ClipboardPolicy {
    #[must_use]
    pub const fn new(audience: AudienceId) -> Self {
        Self {
            audience,
            action_high_water: None,
            gesture_high_water: None,
        }
    }

    /// Validates and irreversibly consumes an intent before any OS task exists.
    pub fn consume(
        &mut self,
        intent: ClipboardWriteText,
        now: Instant,
    ) -> Result<AuthorizedClipboardWrite, ClipboardDenied> {
        if intent.audience != self.audience {
            return Err(ClipboardDenied::WrongAudience);
        }
        if now >= intent.expires_at {
            return Err(ClipboardDenied::Expired);
        }

        let bytes = intent.text.len();
        if bytes > MAX_CLIPBOARD_TEXT_BYTES {
            return Err(ClipboardDenied::TextTooLarge {
                bytes,
                limit: MAX_CLIPBOARD_TEXT_BYTES,
            });
        }
        if self
            .action_high_water
            .is_some_and(|high_water| intent.action_id <= high_water)
        {
            return Err(ClipboardDenied::ActionReplayed);
        }
        if self
            .gesture_high_water
            .is_some_and(|high_water| intent.gesture_id <= high_water)
        {
            return Err(ClipboardDenied::GestureReplayed);
        }

        self.action_high_water = Some(intent.action_id);
        self.gesture_high_water = Some(intent.gesture_id);
        Ok(AuthorizedClipboardWrite {
            action_id: intent.action_id,
            text: intent.text,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::{
        ActionId, AudienceId, ClipboardAction, ClipboardDenied, ClipboardPolicy, ClipboardReadback,
        ClipboardResult, ClipboardStatus, ClipboardWriteText, GestureId, MAX_CLIPBOARD_TEXT_BYTES,
        USER_GESTURE_TTL,
    };
    use std::num::NonZeroU64;
    use std::time::{Duration, Instant};

    const AUDIENCE: AudienceId = AudienceId::new(NonZeroU64::MIN);

    #[test]
    fn accepts_text_at_the_utf8_byte_limit() {
        let now = Instant::now();
        let mut action = ClipboardAction::new();
        let mut policy = ClipboardPolicy::new(AUDIENCE);
        let text = "é".repeat(MAX_CLIPBOARD_TEXT_BYTES / "é".len());
        assert_eq!(text.len(), MAX_CLIPBOARD_TEXT_BYTES);
        let intent = action
            .begin_user_gesture(AUDIENCE, text, now)
            .expect("limit-sized intent");

        assert!(policy.consume(intent, now).is_ok());
    }

    #[test]
    fn rejects_text_over_the_utf8_byte_limit() {
        let now = Instant::now();
        let mut action = ClipboardAction::new();
        let text = format!("{}é", "é".repeat(MAX_CLIPBOARD_TEXT_BYTES / "é".len()));
        let error = action
            .begin_user_gesture(AUDIENCE, text, now)
            .expect_err("oversized text must be rejected");

        assert_eq!(
            error,
            ClipboardDenied::TextTooLarge {
                bytes: MAX_CLIPBOARD_TEXT_BYTES + "é".len(),
                limit: MAX_CLIPBOARD_TEXT_BYTES,
            }
        );
        assert_eq!(
            action.status(),
            &ClipboardStatus::Denied {
                action_id: None,
                reason: error,
            }
        );
    }

    #[test]
    fn pending_action_rejects_a_second_gesture_as_busy() {
        let now = Instant::now();
        let mut action = ClipboardAction::new();
        let first = action
            .begin_user_gesture(AUDIENCE, String::from("first"), now)
            .expect("first intent");

        assert!(matches!(
            action.begin_user_gesture(AUDIENCE, String::from("second"), now),
            Err(ClipboardDenied::Busy)
        ));
        assert_eq!(
            action.status(),
            &ClipboardStatus::Pending {
                action_id: first.action_id(),
            }
        );
    }

    #[test]
    fn policy_rejects_expired_and_wrong_audience_intents() {
        let now = Instant::now();
        let other_audience = AudienceId::new(NonZeroU64::new(2).expect("non-zero"));

        let mut wrong_action = ClipboardAction::new();
        let wrong = wrong_action
            .begin_user_gesture(other_audience, String::from("text"), now)
            .expect("intent");
        assert!(matches!(
            ClipboardPolicy::new(AUDIENCE).consume(wrong, now),
            Err(ClipboardDenied::WrongAudience)
        ));

        let mut expired_action = ClipboardAction::new();
        let expired = expired_action
            .begin_user_gesture(AUDIENCE, String::from("text"), now)
            .expect("intent");
        assert!(matches!(
            ClipboardPolicy::new(AUDIENCE).consume(expired, now + USER_GESTURE_TTL),
            Err(ClipboardDenied::Expired)
        ));
    }

    #[test]
    fn policy_rejects_replayed_action_and_gesture_ids_with_constant_space() {
        let now = Instant::now();
        let mut policy = ClipboardPolicy::new(AUDIENCE);
        let mut issuer = ClipboardAction::new();
        let first = issuer
            .begin_user_gesture(AUDIENCE, String::from("first"), now)
            .expect("first intent");
        let first_action = first.action_id;
        let first_gesture = first.gesture_id;
        assert!(policy.consume(first, now).is_ok());

        let replayed_action = ClipboardWriteText {
            action_id: first_action,
            gesture_id: GestureId(NonZeroU64::new(3).expect("non-zero")),
            audience: AUDIENCE,
            expires_at: now + Duration::from_secs(1),
            text: String::from("replay"),
        };
        assert!(matches!(
            policy.consume(replayed_action, now),
            Err(ClipboardDenied::ActionReplayed)
        ));

        let replayed_gesture = ClipboardWriteText {
            action_id: ActionId(NonZeroU64::new(4).expect("non-zero")),
            gesture_id: first_gesture,
            audience: AUDIENCE,
            expires_at: now + Duration::from_secs(1),
            text: String::from("replay"),
        };
        assert!(matches!(
            policy.consume(replayed_gesture, now),
            Err(ClipboardDenied::GestureReplayed)
        ));
    }

    #[test]
    fn completion_only_accepts_the_current_action_and_reset_does_not_rewind_ids() {
        let now = Instant::now();
        let mut action = ClipboardAction::new();
        let first = action
            .begin_user_gesture(AUDIENCE, String::from("first"), now)
            .expect("first intent");
        let first_id = first.action_id();

        assert!(action.complete(ClipboardResult::Verified {
            action_id: first_id,
        }));
        action.reset();
        let second = action
            .begin_user_gesture(AUDIENCE, String::from("second"), now)
            .expect("second intent");
        let second_id = second.action_id();

        assert_ne!(first_id, second_id);
        assert!(!action.complete(ClipboardResult::Unverified {
            action_id: first_id,
            reason: ClipboardReadback::Mismatch,
        }));
        assert_eq!(
            action.status(),
            &ClipboardStatus::Pending {
                action_id: second_id,
            }
        );
    }

    #[test]
    fn reset_cannot_rewind_the_policy_replay_watermark() {
        let now = Instant::now();
        let mut action = ClipboardAction::new();
        let mut policy = ClipboardPolicy::new(AUDIENCE);
        let first = action
            .begin_user_gesture(AUDIENCE, String::from("first"), now)
            .expect("first intent");
        let replay = ClipboardWriteText {
            action_id: first.action_id,
            gesture_id: first.gesture_id,
            audience: AUDIENCE,
            expires_at: now + Duration::from_secs(1),
            text: String::from("replay"),
        };
        assert!(policy.consume(first, now).is_ok());

        action.reset();
        assert!(matches!(
            policy.consume(replay, now),
            Err(ClipboardDenied::ActionReplayed)
        ));
    }

    #[test]
    fn identifier_exhaustion_is_a_visible_rejection() {
        let now = Instant::now();
        let mut action = ClipboardAction {
            next_nonce: Some(NonZeroU64::MAX),
            status: ClipboardStatus::Idle,
        };

        assert!(matches!(
            action.begin_user_gesture(AUDIENCE, String::from("text"), now),
            Err(ClipboardDenied::IdentifierExhausted)
        ));
        assert_eq!(
            action.status(),
            &ClipboardStatus::Denied {
                action_id: None,
                reason: ClipboardDenied::IdentifierExhausted,
            }
        );
    }

    #[test]
    fn intent_debug_never_contains_the_clipboard_text() {
        let secret = "copy-secret-must-not-appear";
        let intent = ClipboardAction::new()
            .begin_user_gesture(AUDIENCE, String::from(secret), Instant::now())
            .expect("intent");
        let debug = format!("{intent:?}");

        assert!(!debug.contains(secret));
        assert!(debug.contains("text_bytes"));
    }
}
