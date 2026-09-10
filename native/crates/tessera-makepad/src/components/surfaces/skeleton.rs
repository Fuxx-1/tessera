use crate::foundation::activity::{MotionClock, project_phase};
use crate::foundation::input::{ButtonActivationExt, checkbox_change, set_button_enabled};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct SkeletonSurfaceCatalog;
impl SkeletonSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Skeleton => Some("TesseraSkeleton"),
            _ => None,
        }
    }
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SkeletonFixture {
    pub label: &'static str,
}
impl SkeletonFixture {
    pub const DEFAULT: Self = Self {
        label: "Loading content placeholder",
    };
}
impl Default for SkeletonFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct SkeletonState {
    pub loading: bool,
    pub reduced_motion: bool,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SkeletonEvent {
    ToggleLoading,
    SetReducedMotion(bool),
    Restart,
    Reset,
}
impl SkeletonState {
    pub fn reduce(&mut self, event: SkeletonEvent) {
        match event {
            SkeletonEvent::ToggleLoading => self.loading = !self.loading,
            SkeletonEvent::SetReducedMotion(value) => self.reduced_motion = value,
            SkeletonEvent::Restart => self.loading = true,
            SkeletonEvent::Reset => *self = Self::default(),
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum SkeletonAction {
    LoadingChanged {
        loading: bool,
    },
    MotionChanged {
        reduced: bool,
    },
    Restarted,
    Reset,
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraSkeletonBase = #(TesseraSkeleton::register_widget(vm))
    mod.widgets.TesseraSkeleton = set_type_default() do mod.widgets.TesseraSkeletonBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        skeleton_title := Label{width: Fill height: Fit text: "Skeleton"}
        skeleton_placeholder := View{width: Fill height: 70 flow: Down spacing: 8
            skeleton_frame_one := mod.widgets.TesseraSkeletonVisual{}
            skeleton_frame_two := mod.widgets.TesseraSkeletonVisual{}
            skeleton_frame_three := mod.widgets.TesseraSkeletonVisual{}
        }
        skeleton_ready := View{width: Fill height: 70 flow: Down spacing: 8
            Label{width: Fill height: 18 text: "Workspace summary"}
            Label{width: Fill height: 18 text: "The latest release is available."}
            Label{width: Fill height: 18 text: "Updated just now"}
        }
        skeleton_status := Label{width: Fill height: Fit text: "active"}
        skeleton_body := Label{width: Fill height: Fit text: "Loading content placeholder" draw_text.flow: Flow.Right{wrap: true}}
        skeleton_loading := Button{width: Fit height: 30 text: "Load"}
        skeleton_motion := CheckBox{width: Fit height: 28 text: "Reduced motion"}
        skeleton_frame := Button{width: Fit height: 30 text: "Restart"}
        skeleton_reset := Button{width: Fit height: 30 text: "Reset skeleton"}
    }
}
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraSkeleton {
    #[deref]
    view: View,
    #[rust]
    fixture: SkeletonFixture,
    #[rust]
    state: SkeletonState,
    #[rust]
    motion: MotionClock,
}
impl TesseraSkeleton {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = SkeletonFixture::DEFAULT;
        self.state = SkeletonState::default();
        self.motion.set_active(cx, false, false);
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: SkeletonEvent) {
        self.state.reduce(event);
        self.sync(cx);
        if event == SkeletonEvent::Restart {
            self.motion.restart(cx);
        }
        let action = match event {
            SkeletonEvent::ToggleLoading => SkeletonAction::LoadingChanged {
                loading: self.state.loading,
            },
            SkeletonEvent::SetReducedMotion(_) => SkeletonAction::MotionChanged {
                reduced: self.state.reduced_motion,
            },
            SkeletonEvent::Restart => SkeletonAction::Restarted,
            SkeletonEvent::Reset => SkeletonAction::Reset,
        };
        cx.widget_action(self.widget_uid(), action);
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.motion
            .set_active(cx, self.state.loading, self.state.reduced_motion);
        self.view
            .widget(cx, ids!(skeleton_placeholder))
            .set_visible(cx, self.state.loading);
        self.view
            .widget(cx, ids!(skeleton_ready))
            .set_visible(cx, !self.state.loading);
        self.view.label(cx, ids!(skeleton_body)).set_text(
            cx,
            if self.state.loading {
                self.fixture.label
            } else {
                "Content ready"
            },
        );
        self.view.button(cx, ids!(skeleton_loading)).set_text(
            cx,
            if self.state.loading {
                "Show content"
            } else {
                "Load"
            },
        );
        self.view.check_box(cx, ids!(skeleton_motion)).set_active(
            cx,
            self.state.reduced_motion,
            Animate::No,
        );
        set_button_enabled(
            &self.view.button(cx, ids!(skeleton_frame)),
            cx,
            self.state.loading && !self.state.reduced_motion,
        );
        self.view.label(cx, ids!(skeleton_status)).set_text(
            cx,
            if self.state.loading {
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
            &[
                ids!(skeleton_frame_one),
                ids!(skeleton_frame_two),
                ids!(skeleton_frame_three),
            ],
            self.motion.phase(),
            self.state.loading && !self.state.reduced_motion,
        );
    }
}
impl Widget for TesseraSkeleton {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.paint(cx);
        let width = (cx.peek_walk_turtle(walk).size.x - self.view.layout.padding.width()).max(0.0);
        for (id, fraction) in [
            (ids!(skeleton_frame_one), 1.0),
            (ids!(skeleton_frame_two), 0.84),
            (ids!(skeleton_frame_three), 0.62),
        ] {
            if let Some(mut bar) = self.view.widget(cx, id).borrow_mut::<View>() {
                bar.walk.width = Size::Fixed(width * fraction);
            }
        }
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        if self
            .motion
            .handle_event(cx, event, self.view.visible(), "skeleton")
        {
            self.view.redraw(cx);
        }
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(skeleton_loading))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, SkeletonEvent::ToggleLoading);
        } else if let Some(value) = checkbox_change(
            &self.view.check_box(cx, ids!(skeleton_motion)),
            cx,
            event,
            &actions,
        ) {
            self.apply_event(cx, SkeletonEvent::SetReducedMotion(value));
        } else if self
            .view
            .button(cx, ids!(skeleton_frame))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, SkeletonEvent::Restart);
        } else if self
            .view
            .button(cx, ids!(skeleton_reset))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, SkeletonEvent::Reset);
        }
    }
}
#[cfg(test)]
mod tests {
    use super::{SkeletonEvent, SkeletonState, SkeletonSurfaceCatalog};
    use tessera_core::catalog::ComponentId;
    #[test]
    fn skeleton_has_idle_and_reduced_motion_states() {
        assert_eq!(
            SkeletonSurfaceCatalog::widget_name(ComponentId::Skeleton),
            Some("TesseraSkeleton")
        );
        let mut state = SkeletonState::default();
        state.reduce(SkeletonEvent::ToggleLoading);
        state.reduce(SkeletonEvent::Restart);
        assert!(state.loading);
        state.reduce(SkeletonEvent::SetReducedMotion(true));
        assert!(state.loading && state.reduced_motion);
        state.reduce(SkeletonEvent::Reset);
        assert!(!state.loading);
    }
}
