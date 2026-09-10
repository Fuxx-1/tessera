use crate::foundation::input::ButtonActivationExt;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct MasonrySurfaceCatalog;
impl MasonrySurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Masonry => Some("TesseraMasonry"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct MasonryFixture {
    pub items: [&'static str; 4],
}
impl MasonryFixture {
    pub const DEFAULT: Self = Self {
        items: ["Alpha", "Beta", "Gamma", "Delta"],
    };
}
impl Default for MasonryFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct MasonryState {
    pub dense: bool,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MasonryEvent {
    ToggleDensity,
    Reset,
}
impl MasonryState {
    pub fn reduce(&mut self, event: MasonryEvent) {
        match event {
            MasonryEvent::ToggleDensity => self.dense = !self.dense,
            MasonryEvent::Reset => *self = Self::default(),
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum MasonryAction {
    DensityChanged {
        dense: bool,
    },
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraMasonryBase = #(TesseraMasonry::register_widget(vm))
    mod.widgets.TesseraMasonry = set_type_default() do mod.widgets.TesseraMasonryBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        masonry_title := Label{width: Fill height: Fit text: "Masonry" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        masonry_comfortable := View{width: Fill height: 92 flow: Right spacing: 6
            masonry_column_one := View{width: Fill height: Fill flow: Down spacing: 6 show_bg: true draw_bg +: {color: theme.color_bg_app border_radius: 3.0 border_size: 1.0 border_color: theme.color_bevel}
                masonry_alpha := Label{width: Fill height: 40 text: "Alpha"}
                masonry_beta := Label{width: Fill height: 40 text: "Beta"}
            }
            masonry_column_two := View{width: Fill height: Fill flow: Down spacing: 6 show_bg: true draw_bg +: {color: theme.color_bg_app border_radius: 3.0 border_size: 1.0 border_color: theme.color_bevel}
                masonry_gamma := Label{width: Fill height: 58 text: "Gamma"}
                masonry_delta := Label{width: Fill height: 22 text: "Delta"}
            }
        }
        masonry_dense := View{width: Fill height: 64 visible: false flow: Right spacing: 6
            masonry_dense_alpha := View{width: Fill height: 30 show_bg: true draw_bg +: {color: theme.color_bg_app border_radius: 3.0 border_size: 1.0 border_color: theme.color_bevel} alpha := Label{width: Fill height: Fit text: "Alpha"}}
            masonry_dense_beta := View{width: Fill height: 46 show_bg: true draw_bg +: {color: theme.color_bg_app border_radius: 3.0 border_size: 1.0 border_color: theme.color_bevel} beta := Label{width: Fill height: Fit text: "Beta"}}
            masonry_dense_gamma := View{width: Fill height: 38 show_bg: true draw_bg +: {color: theme.color_bg_app border_radius: 3.0 border_size: 1.0 border_color: theme.color_bevel} gamma := Label{width: Fill height: Fit text: "Gamma"}}
            masonry_dense_delta := View{width: Fill height: 52 show_bg: true draw_bg +: {color: theme.color_bg_app border_radius: 3.0 border_size: 1.0 border_color: theme.color_bevel} delta := Label{width: Fill height: Fit text: "Delta"}}
        }
        masonry_status := Label{width: Fill height: Fit text: "comfortable bounded layout" draw_text.flow: Flow.Right{wrap: true}}
        masonry_toggle := Button{width: Fit height: 30 text: "Toggle density"}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraMasonry {
    #[deref]
    view: View,
    #[rust]
    fixture: MasonryFixture,
    #[rust]
    state: MasonryState,
}
impl TesseraMasonry {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = MasonryFixture::DEFAULT;
        self.state = MasonryState::default();
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: MasonryEvent) {
        self.state.reduce(event);
        self.sync(cx);
        if matches!(event, MasonryEvent::ToggleDensity) {
            cx.widget_action(
                self.widget_uid(),
                MasonryAction::DensityChanged {
                    dense: self.state.dense,
                },
            );
        }
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .widget(cx, ids!(masonry_comfortable))
            .set_visible(cx, !self.state.dense);
        self.view
            .widget(cx, ids!(masonry_dense))
            .set_visible(cx, self.state.dense);
        self.view.label(cx, ids!(masonry_status)).set_text(
            cx,
            if self.state.dense {
                "dense bounded layout"
            } else {
                "comfortable bounded layout"
            },
        );
        self.view.redraw(cx);
    }
}
impl Widget for TesseraMasonry {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(masonry_toggle))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, MasonryEvent::ToggleDensity);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{MasonryEvent, MasonryState, MasonrySurfaceCatalog};
    use tessera_core::catalog::ComponentId;
    #[test]
    fn masonry_is_bounded_and_toggleable() {
        assert_eq!(
            MasonrySurfaceCatalog::widget_name(ComponentId::Masonry),
            Some("TesseraMasonry")
        );
        let mut state = MasonryState::default();
        state.reduce(MasonryEvent::ToggleDensity);
        assert!(state.dense);
        state.reduce(MasonryEvent::Reset);
        assert!(!state.dense);
    }
}
