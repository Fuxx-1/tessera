use crate::foundation::input::ButtonActivationExt;
use crate::foundation::input::set_button_enabled;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct CollapseSurfaceCatalog;
impl CollapseSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Collapse => Some("TesseraCollapse"),
            _ => None,
        }
    }
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CollapseFixture {
    pub title: &'static str,
    pub content: &'static str,
}
impl CollapseFixture {
    pub const DEFAULT: Self = Self {
        title: "Deployment details",
        content: "Region, owner, and rollback policy are grouped in this panel.",
    };
}
impl Default for CollapseFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct CollapseState {
    pub open: bool,
    pub toggles: u32,
    pub acknowledged: bool,
    pub acknowledgements: u32,
    pub reduced_motion: bool,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CollapseEvent {
    Toggle,
    ToggleReducedMotion,
    Acknowledge,
    Reset,
}
impl CollapseState {
    pub fn reduce(&mut self, event: CollapseEvent) {
        match event {
            CollapseEvent::Toggle => {
                self.open = !self.open;
                self.toggles = self.toggles.saturating_add(1);
            }
            CollapseEvent::ToggleReducedMotion => self.reduced_motion = !self.reduced_motion,
            CollapseEvent::Acknowledge if self.open && !self.acknowledged => {
                self.acknowledged = true;
                self.acknowledgements = self.acknowledgements.saturating_add(1);
            }
            CollapseEvent::Reset => *self = Self::default(),
            CollapseEvent::Acknowledge => {}
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum CollapseAction {
    Toggled {
        open: bool,
        toggles: u32,
    },
    Acknowledged {
        acknowledgements: u32,
    },
    ReducedMotionChanged {
        enabled: bool,
    },
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraCollapseBase = #(TesseraCollapse::register_widget(vm))
    mod.widgets.TesseraCollapse = set_type_default() do mod.widgets.TesseraCollapseBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        collapse_header := Button{width: Fill height: 32 text: "Deployment details"}
        collapse_panel := View{width: Fill height: Fit visible: false flow: Down spacing: 4 padding: Inset{left: 10, right: 10, top: 8, bottom: 8} show_bg: true draw_bg +: {color: theme.color_bg_app border_radius: 3.0 border_size: 1.0 border_color: theme.color_bevel}
            collapse_content := Label{width: Fill height: Fit text: "Region, owner, and rollback policy are grouped in this panel." draw_text.flow: Flow.Right{wrap: true}}
            collapse_action := Button{width: Fit height: 28 text: "Acknowledge"}
        }
        collapse_status := Label{width: Fill height: Fit text: "Panel closed"}
        collapse_motion := Button{width: Fit height: 30 text: "Enable reduced motion"}
    }
}
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraCollapse {
    #[deref]
    view: View,
    #[rust]
    fixture: CollapseFixture,
    #[rust]
    state: CollapseState,
}
impl TesseraCollapse {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = CollapseFixture::DEFAULT;
        self.state = CollapseState::default();
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: CollapseEvent) {
        let previous = self.state;
        self.state.reduce(event);
        self.sync(cx);
        let action = match event {
            CollapseEvent::Toggle => Some(CollapseAction::Toggled {
                open: self.state.open,
                toggles: self.state.toggles,
            }),
            CollapseEvent::Acknowledge if self.state != previous => {
                Some(CollapseAction::Acknowledged {
                    acknowledgements: self.state.acknowledgements,
                })
            }
            CollapseEvent::ToggleReducedMotion => Some(CollapseAction::ReducedMotionChanged {
                enabled: self.state.reduced_motion,
            }),
            CollapseEvent::Acknowledge | CollapseEvent::Reset => None,
        };
        if let Some(action) = action {
            cx.widget_action(self.widget_uid(), action);
        }
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.view.button(cx, ids!(collapse_header)).set_text(
            cx,
            if self.state.open {
                "Hide deployment details"
            } else {
                self.fixture.title
            },
        );
        self.view
            .view(cx, ids!(collapse_panel))
            .set_visible(cx, self.state.open);
        self.view.button(cx, ids!(collapse_action)).set_text(
            cx,
            if self.state.acknowledged {
                "Acknowledged"
            } else {
                "Acknowledge"
            },
        );
        set_button_enabled(
            &self.view.button(cx, ids!(collapse_action)),
            cx,
            self.state.open && !self.state.acknowledged,
        );
        self.view.label(cx, ids!(collapse_status)).set_text(
            cx,
            if self.state.acknowledged {
                "Panel open / acknowledged"
            } else if self.state.open {
                "Panel open / acknowledgement pending"
            } else {
                "Panel closed"
            },
        );
        self.view.button(cx, ids!(collapse_motion)).set_text(
            cx,
            if self.state.reduced_motion {
                "Use standard motion"
            } else {
                "Enable reduced motion"
            },
        );
        self.view.label(cx, ids!(collapse_status)).set_text(
            cx,
            &format!(
                "{} / {}",
                if self.state.acknowledged {
                    "Panel open / acknowledged"
                } else if self.state.open {
                    "Panel open / acknowledgement pending"
                } else {
                    "Panel closed"
                },
                if self.state.reduced_motion {
                    "reduced motion"
                } else {
                    "standard motion"
                }
            ),
        );
        self.view.redraw(cx);
    }
}
impl Widget for TesseraCollapse {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(collapse_header))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, CollapseEvent::Toggle);
        } else if self
            .view
            .button(cx, ids!(collapse_action))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, CollapseEvent::Acknowledge);
        } else if self
            .view
            .button(cx, ids!(collapse_motion))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, CollapseEvent::ToggleReducedMotion);
        } else if self.state.open
            && self.view.key_focus(cx)
            && matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Escape)
        {
            self.apply_event(cx, CollapseEvent::Toggle);
        }
    }
}
#[cfg(test)]
mod tests {
    use super::{CollapseEvent, CollapseState, CollapseSurfaceCatalog};
    use tessera_core::catalog::ComponentId;
    #[test]
    fn collapse_has_a_real_panel_state() {
        assert_eq!(
            CollapseSurfaceCatalog::widget_name(ComponentId::Collapse),
            Some("TesseraCollapse")
        );
        let mut state = CollapseState::default();
        state.reduce(CollapseEvent::Toggle);
        assert!(state.open);
        state.reduce(CollapseEvent::Acknowledge);
        assert!(state.open);
        assert!(state.acknowledged);
        assert_eq!(state.acknowledgements, 1);
        state.reduce(CollapseEvent::Reset);
        assert!(!state.open);
        assert!(!state.acknowledged);
    }
}
