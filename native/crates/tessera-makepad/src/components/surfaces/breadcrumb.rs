use crate::foundation::input::ButtonActivationExt;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct BreadcrumbSurfaceCatalog;
impl BreadcrumbSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Breadcrumb => Some("TesseraBreadcrumb"),
            _ => None,
        }
    }
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct BreadcrumbFixture {
    pub items: [&'static str; 3],
}
impl BreadcrumbFixture {
    pub const DEFAULT: Self = Self {
        items: ["Workspace", "Releases", "Current"],
    };
}
impl Default for BreadcrumbFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct BreadcrumbState {
    pub current: usize,
    pub overflow: bool,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BreadcrumbEvent {
    Select(usize),
    ToggleOverflow,
    Reset,
}
impl BreadcrumbState {
    pub fn reduce(&mut self, event: BreadcrumbEvent) {
        match event {
            BreadcrumbEvent::Select(index) => self.current = index.min(2),
            BreadcrumbEvent::ToggleOverflow => self.overflow = !self.overflow,
            BreadcrumbEvent::Reset => *self = Self::default(),
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum BreadcrumbAction {
    Selected {
        index: usize,
    },
    OverflowToggled {
        open: bool,
    },
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraBreadcrumbBase = #(TesseraBreadcrumb::register_widget(vm))
    mod.widgets.TesseraBreadcrumb = set_type_default() do mod.widgets.TesseraBreadcrumbBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        breadcrumb_title := Label{width: Fill height: Fit text: "Breadcrumb"}
        breadcrumb_current := Label{width: Fill height: Fit text: "Workspace / Releases / Current" draw_text.flow: Flow.Right{wrap: true}}
        breadcrumb_trail := View{width: Fill height: 32 flow: Right spacing: 4
            breadcrumb_crumb_one := Button{width: Fit height: 30 text: "Workspace"}
            breadcrumb_separator_one := Label{width: 16 height: Fit text: "/"}
            breadcrumb_crumb_two := Button{width: Fit height: 30 text: "Releases"}
            breadcrumb_separator_two := Label{width: 16 height: Fit text: "/"}
            breadcrumb_crumb_three := Button{width: Fit height: 30 text: "Current"}
        }
        breadcrumb_status := Label{width: Fill height: Fit text: "Current"}
        breadcrumb_overflow := Button{width: Fit height: 30 text: "Toggle overflow"}
        breadcrumb_overflow_menu := View{width: Fill height: 30 visible: false flow: Right spacing: 6 show_bg: true draw_bg +: {color: theme.color_bg_app border_radius: 3.0 border_size: 1.0 border_color: theme.color_bevel}
            breadcrumb_overflow_hint := Label{width: Fill height: Fit text: "Overflow: Workspace / Releases"}
        }
    }
}
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraBreadcrumb {
    #[deref]
    view: View,
    #[rust]
    fixture: BreadcrumbFixture,
    #[rust]
    state: BreadcrumbState,
}
impl TesseraBreadcrumb {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = BreadcrumbFixture::DEFAULT;
        self.state = BreadcrumbState::default();
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: BreadcrumbEvent) {
        self.state.reduce(event);
        self.sync(cx);
        let action = match event {
            BreadcrumbEvent::Select(_index) => BreadcrumbAction::Selected {
                index: self.state.current,
            },
            BreadcrumbEvent::ToggleOverflow => BreadcrumbAction::OverflowToggled {
                open: self.state.overflow,
            },
            BreadcrumbEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(breadcrumb_current))
            .set_text(cx, &self.fixture.items.join(" / "));
        self.view.label(cx, ids!(breadcrumb_status)).set_text(
            cx,
            if self.state.overflow {
                "overflow menu open"
            } else {
                self.fixture.items[self.state.current]
            },
        );
        self.view
            .widget(cx, ids!(breadcrumb_overflow_menu))
            .set_visible(cx, self.state.overflow);
    }
}
impl Widget for TesseraBreadcrumb {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(breadcrumb_prev))
            .activated(cx, event, &actions)
        {
            self.apply_event(
                cx,
                BreadcrumbEvent::Select(self.state.current.saturating_sub(1)),
            );
        } else if self
            .view
            .button(cx, ids!(breadcrumb_next))
            .activated(cx, event, &actions)
        {
            self.apply_event(
                cx,
                BreadcrumbEvent::Select(self.state.current.saturating_add(1)),
            );
        } else if self
            .view
            .button(cx, ids!(breadcrumb_overflow))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, BreadcrumbEvent::ToggleOverflow);
        } else if self
            .view
            .button(cx, ids!(breadcrumb_crumb_one))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, BreadcrumbEvent::Select(0));
        } else if self
            .view
            .button(cx, ids!(breadcrumb_crumb_two))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, BreadcrumbEvent::Select(1));
        } else if self
            .view
            .button(cx, ids!(breadcrumb_crumb_three))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, BreadcrumbEvent::Select(2));
        }
    }
}
#[cfg(test)]
mod tests {
    use super::{BreadcrumbEvent, BreadcrumbState, BreadcrumbSurfaceCatalog};
    use tessera_core::catalog::ComponentId;
    #[test]
    fn breadcrumb_bounds_selection_and_overflow() {
        assert_eq!(
            BreadcrumbSurfaceCatalog::widget_name(ComponentId::Breadcrumb),
            Some("TesseraBreadcrumb")
        );
        let mut state = BreadcrumbState::default();
        state.reduce(BreadcrumbEvent::Select(99));
        assert_eq!(state.current, 2);
        state.reduce(BreadcrumbEvent::ToggleOverflow);
        assert!(state.overflow);
    }
}
