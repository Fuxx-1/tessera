use crate::foundation::activity::{MotionClock, project_phase};
use crate::foundation::input::{ButtonActivationExt, checkbox_change, set_button_enabled};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct SpinSurfaceCatalog;
impl SpinSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Spin => Some("TesseraSpin"),
            _ => None,
        }
    }
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SpinFixture {
    pub label: &'static str,
}
impl SpinFixture {
    pub const DEFAULT: Self = Self {
        label: "Preparing workspace",
    };
}
impl Default for SpinFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct SpinState {
    pub active: bool,
    pub reduced_motion: bool,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SpinEvent {
    ToggleActive,
    SetReducedMotion(bool),
    Restart,
    Reset,
}
impl SpinState {
    pub fn reduce(&mut self, event: SpinEvent) {
        match event {
            SpinEvent::ToggleActive => self.active = !self.active,
            SpinEvent::SetReducedMotion(value) => self.reduced_motion = value,
            SpinEvent::Restart => self.active = true,
            SpinEvent::Reset => *self = Self::default(),
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum SpinAction {
    ActiveChanged {
        active: bool,
    },
    MotionChanged {
        reduced: bool,
    },
    Restarted,
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraSpinBase = #(TesseraSpin::register_widget(vm))
    mod.widgets.TesseraSpin = set_type_default() do mod.widgets.TesseraSpinBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        spin_title := Label{width: Fill height: Fit text: "Spin"}
        spin_visual := mod.widgets.TesseraSpinnerVisual{}
        spin_indicator := Label{width: Fill height: Fit text: "Preparing workspace"}
        spin_status := Label{width: Fill height: Fit text: "idle"}
        spin_active := Button{width: Fit height: 30 text: "Start"}
        spin_motion := CheckBox{width: Fit height: 28 text: "Reduced motion"}
        spin_frame := Button{width: Fit height: 30 text: "Restart"}
    }
}
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraSpin {
    #[deref]
    view: View,
    #[rust]
    fixture: SpinFixture,
    #[rust]
    state: SpinState,
    #[rust]
    motion: MotionClock,
}
impl TesseraSpin {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = SpinFixture::DEFAULT;
        self.state = SpinState::default();
        self.motion.set_active(cx, false, false);
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: SpinEvent) {
        self.state.reduce(event);
        self.sync(cx);
        if event == SpinEvent::Restart {
            self.motion.restart(cx);
        }
        let action = match event {
            SpinEvent::ToggleActive => SpinAction::ActiveChanged {
                active: self.state.active,
            },
            SpinEvent::SetReducedMotion(_) => SpinAction::MotionChanged {
                reduced: self.state.reduced_motion,
            },
            SpinEvent::Restart => SpinAction::Restarted,
            SpinEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.motion
            .set_active(cx, self.state.active, self.state.reduced_motion);
        self.view.label(cx, ids!(spin_indicator)).set_text(
            cx,
            if self.state.active {
                self.fixture.label
            } else {
                "Ready"
            },
        );
        self.view
            .button(cx, ids!(spin_active))
            .set_text(cx, if self.state.active { "Stop" } else { "Start" });
        self.view.check_box(cx, ids!(spin_motion)).set_active(
            cx,
            self.state.reduced_motion,
            Animate::No,
        );
        set_button_enabled(
            &self.view.button(cx, ids!(spin_frame)),
            cx,
            self.state.active && !self.state.reduced_motion,
        );
        self.view.label(cx, ids!(spin_status)).set_text(
            cx,
            if self.state.active {
                "Loading"
            } else {
                "Ready"
            },
        );
        self.view.redraw(cx);
    }

    fn paint(&mut self, cx: &mut Cx) {
        project_phase(
            &self.view,
            cx,
            &[ids!(spin_visual)],
            self.motion.phase(),
            self.state.active,
        );
    }
}
impl Widget for TesseraSpin {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.paint(cx);
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        if self
            .motion
            .handle_event(cx, event, self.view.visible(), "spin")
        {
            self.view.redraw(cx);
        }
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(spin_active))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, SpinEvent::ToggleActive);
        } else if let Some(value) = checkbox_change(
            &self.view.check_box(cx, ids!(spin_motion)),
            cx,
            event,
            &actions,
        ) {
            self.apply_event(cx, SpinEvent::SetReducedMotion(value));
        } else if self
            .view
            .button(cx, ids!(spin_frame))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, SpinEvent::Restart);
        }
    }
}
#[cfg(test)]
mod tests {
    use super::{SpinEvent, SpinState, SpinSurfaceCatalog};
    use tessera_core::catalog::ComponentId;
    #[test]
    fn spin_has_active_idle_and_reduced_motion_states() {
        assert_eq!(
            SpinSurfaceCatalog::widget_name(ComponentId::Spin),
            Some("TesseraSpin")
        );
        let mut state = SpinState::default();
        state.reduce(SpinEvent::ToggleActive);
        state.reduce(SpinEvent::Restart);
        assert!(state.active);
        state.reduce(SpinEvent::SetReducedMotion(true));
        assert!(state.active && state.reduced_motion);
    }
}
