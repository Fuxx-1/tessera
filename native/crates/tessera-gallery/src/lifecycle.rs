use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum LifecyclePhase {
    #[default]
    Constructed,
    Booted,
    Visible,
    Hidden,
    Closed,
}

impl LifecyclePhase {
    #[must_use]
    pub const fn label(self) -> &'static str {
        match self {
            Self::Constructed => "constructed",
            Self::Booted => "booted",
            Self::Visible => "visible",
            Self::Hidden => "hidden",
            Self::Closed => "closed",
        }
    }
}

impl fmt::Display for LifecyclePhase {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.label())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LifecycleEvent {
    Startup,
    Show,
    Hide,
    Focus,
    Blur,
    Tick,
    Shutdown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct LifecycleState {
    phase: LifecyclePhase,
    visible: bool,
    focused: bool,
    frame_generation: u64,
}

impl Default for LifecycleState {
    fn default() -> Self {
        Self {
            phase: LifecyclePhase::Constructed,
            visible: false,
            focused: false,
            frame_generation: 0,
        }
    }
}

impl LifecycleState {
    #[must_use]
    pub const fn phase(self) -> LifecyclePhase {
        self.phase
    }

    #[must_use]
    pub const fn is_visible(self) -> bool {
        self.visible
    }

    #[must_use]
    pub const fn is_focused(self) -> bool {
        self.focused
    }

    #[must_use]
    pub const fn frame_generation(self) -> u64 {
        self.frame_generation
    }

    #[must_use]
    pub fn needs_frame(self) -> bool {
        self.visible && self.phase != LifecyclePhase::Closed
    }

    pub fn apply(&mut self, event: LifecycleEvent) -> LifecycleTransition {
        let previous = *self;

        match event {
            LifecycleEvent::Startup => {
                self.phase = LifecyclePhase::Booted;
            }
            LifecycleEvent::Show => {
                self.phase = LifecyclePhase::Visible;
                self.visible = true;
            }
            LifecycleEvent::Hide => {
                self.phase = LifecyclePhase::Hidden;
                self.visible = false;
                self.focused = false;
            }
            LifecycleEvent::Focus => {
                if self.phase != LifecyclePhase::Closed {
                    self.phase = LifecyclePhase::Visible;
                    self.visible = true;
                    self.focused = true;
                }
            }
            LifecycleEvent::Blur => {
                self.focused = false;
            }
            LifecycleEvent::Tick => {
                if self.needs_frame() {
                    self.frame_generation = self.frame_generation.saturating_add(1);
                }
            }
            LifecycleEvent::Shutdown => {
                self.phase = LifecyclePhase::Closed;
                self.visible = false;
                self.focused = false;
            }
        }

        LifecycleTransition {
            previous,
            current: *self,
            changed: previous != *self,
        }
    }
}

impl fmt::Display for LifecycleState {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "phase={}, visible={}, focused={}, frame_generation={}",
            self.phase, self.visible, self.focused, self.frame_generation
        )
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct LifecycleTransition {
    pub previous: LifecycleState,
    pub current: LifecycleState,
    pub changed: bool,
}

#[cfg(test)]
mod tests {
    use super::{LifecycleEvent, LifecyclePhase, LifecycleState};

    #[test]
    fn lifecycle_tracks_visibility_focus_and_frame_generation() {
        let mut lifecycle = LifecycleState::default();
        assert_eq!(lifecycle.phase(), LifecyclePhase::Constructed);
        assert!(!lifecycle.is_visible());
        assert!(!lifecycle.is_focused());

        let startup = lifecycle.apply(LifecycleEvent::Startup);
        assert_eq!(startup.current.phase(), LifecyclePhase::Booted);

        let show = lifecycle.apply(LifecycleEvent::Show);
        assert_eq!(show.current.phase(), LifecyclePhase::Visible);
        assert!(show.current.is_visible());

        let focus = lifecycle.apply(LifecycleEvent::Focus);
        assert!(focus.current.is_focused());

        let tick = lifecycle.apply(LifecycleEvent::Tick);
        assert_eq!(tick.current.frame_generation(), 1);

        let hide = lifecycle.apply(LifecycleEvent::Hide);
        assert_eq!(hide.current.phase(), LifecyclePhase::Hidden);
        assert!(!hide.current.is_visible());
        assert!(!hide.current.is_focused());
    }
}
