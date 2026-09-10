use crate::foundation::input::ButtonActivationExt;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct DescriptionsSurfaceCatalog;
impl DescriptionsSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Descriptions => Some("TesseraDescriptions"),
            _ => None,
        }
    }
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct DescriptionsFixture {
    pub title: &'static str,
    pub rows: [(&'static str, &'static str); 3],
}
impl DescriptionsFixture {
    pub const DEFAULT: Self = Self {
        title: "Release metadata",
        rows: [
            ("Owner", "Platform"),
            (
                "Revision",
                "809c027-20260831-native-makepad-release-candidate",
            ),
            ("Status", "Blocked"),
        ],
    };
}
impl Default for DescriptionsFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct DescriptionsState {
    pub compact: bool,
    pub disclosed: bool,
    pub copy_denied: bool,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DescriptionsEvent {
    ToggleDensity,
    ToggleDisclosure,
    CopyValue,
    Reset,
}
impl DescriptionsState {
    pub fn reduce(&mut self, event: DescriptionsEvent) {
        match event {
            DescriptionsEvent::ToggleDensity => self.compact = !self.compact,
            DescriptionsEvent::ToggleDisclosure => self.disclosed = !self.disclosed,
            DescriptionsEvent::CopyValue => self.copy_denied = true,
            DescriptionsEvent::Reset => *self = Self::default(),
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum DescriptionsAction {
    DensityChanged {
        compact: bool,
    },
    DisclosureChanged {
        disclosed: bool,
    },
    CopyDenied,
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraDescriptionsBase = #(TesseraDescriptions::register_widget(vm))
    mod.widgets.TesseraDescriptions = set_type_default() do mod.widgets.TesseraDescriptionsBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        descriptions_title := Label{width: Fill height: Fit text: "Release metadata" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        descriptions_comfortable_rows := View{width: Fill height: Fit flow: Down spacing: 2
            descriptions_comfortable_row_one := View{width: Fill height: Fit flow: Right spacing: 8 padding: Inset{left: 8, right: 8, top: 7, bottom: 7} show_bg: true draw_bg +: {color: theme.color_bg_app} descriptions_comfortable_key_one := Label{width: 108 height: Fit text: "Owner"} descriptions_comfortable_value_one := Label{width: Fill height: Fit text: "Platform" draw_text.flow: Flow.Right{wrap: true}}}
            descriptions_comfortable_row_two := View{width: Fill height: Fit flow: Right spacing: 8 padding: Inset{left: 8, right: 8, top: 7, bottom: 7} show_bg: true draw_bg +: {color: theme.color_bg_app} descriptions_comfortable_key_two := Label{width: 108 height: Fit text: "Revision"} descriptions_comfortable_value_two := Label{width: Fill height: Fit text: "809c027" draw_text.flow: Flow.Right{wrap: true}}}
            descriptions_comfortable_row_three := View{width: Fill height: Fit flow: Right spacing: 8 padding: Inset{left: 8, right: 8, top: 7, bottom: 7} show_bg: true draw_bg +: {color: theme.color_bg_app} descriptions_comfortable_key_three := Label{width: 108 height: Fit text: "Status"} descriptions_comfortable_value_three := Label{width: Fill height: Fit text: "Blocked" draw_text.flow: Flow.Right{wrap: true}}}
        }
        descriptions_compact_rows := View{width: Fill height: Fit flow: Down spacing: 0 visible: false
            descriptions_compact_row_one := View{width: Fill height: Fit flow: Right spacing: 5 padding: Inset{left: 6, right: 6, top: 2, bottom: 2} show_bg: true draw_bg +: {color: theme.color_bg_app} descriptions_compact_key_one := Label{width: 76 height: Fit text: "Owner"} descriptions_compact_value_one := Label{width: Fill height: Fit text: "Platform" draw_text.flow: Flow.Right{wrap: true}}}
            descriptions_compact_row_two := View{width: Fill height: Fit flow: Right spacing: 5 padding: Inset{left: 6, right: 6, top: 2, bottom: 2} show_bg: true draw_bg +: {color: theme.color_bg_app} descriptions_compact_key_two := Label{width: 76 height: Fit text: "Revision"} descriptions_compact_value_two := Label{width: Fill height: Fit text: "809c027" draw_text.flow: Flow.Right{wrap: true}}}
            descriptions_compact_row_three := View{width: Fill height: Fit flow: Right spacing: 5 padding: Inset{left: 6, right: 6, top: 2, bottom: 2} show_bg: true draw_bg +: {color: theme.color_bg_app} descriptions_compact_key_three := Label{width: 76 height: Fit text: "Status"} descriptions_compact_value_three := Label{width: Fill height: Fit text: "Blocked" draw_text.flow: Flow.Right{wrap: true}}}
        }
        descriptions_toggle := Button{width: Fit height: 30 text: "Compact rows"}
        descriptions_disclosure := Button{width: Fit height: 30 text: "Show full values"}
        descriptions_copy := Button{width: Fit height: 30 text: "Copy revision"}
        descriptions_full_value := Label{width: Fill height: Fit visible: false text: "Revision full value: 809c027" draw_text.flow: Flow.Right{wrap: true}}
        descriptions_status := Label{width: Fill height: Fit text: "Comfortable rows"}
    }
}
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraDescriptions {
    #[deref]
    view: View,
    #[rust]
    fixture: DescriptionsFixture,
    #[rust]
    state: DescriptionsState,
}
impl TesseraDescriptions {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = DescriptionsFixture::DEFAULT;
        self.state = DescriptionsState::default();
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: DescriptionsEvent) {
        self.state.reduce(event);
        self.sync(cx);
        if matches!(event, DescriptionsEvent::ToggleDensity) {
            cx.widget_action(
                self.widget_uid(),
                DescriptionsAction::DensityChanged {
                    compact: self.state.compact,
                },
            );
        } else if matches!(event, DescriptionsEvent::ToggleDisclosure) {
            cx.widget_action(
                self.widget_uid(),
                DescriptionsAction::DisclosureChanged {
                    disclosed: self.state.disclosed,
                },
            );
        } else if matches!(event, DescriptionsEvent::CopyValue) {
            cx.widget_action(self.widget_uid(), DescriptionsAction::CopyDenied);
        }
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(descriptions_title))
            .set_text(cx, self.fixture.title);
        let comfortable_labels = [
            ids!(descriptions_comfortable_key_one),
            ids!(descriptions_comfortable_key_two),
            ids!(descriptions_comfortable_key_three),
        ];
        let comfortable_values = [
            ids!(descriptions_comfortable_value_one),
            ids!(descriptions_comfortable_value_two),
            ids!(descriptions_comfortable_value_three),
        ];
        let compact_labels = [
            ids!(descriptions_compact_key_one),
            ids!(descriptions_compact_key_two),
            ids!(descriptions_compact_key_three),
        ];
        let compact_values = [
            ids!(descriptions_compact_value_one),
            ids!(descriptions_compact_value_two),
            ids!(descriptions_compact_value_three),
        ];
        for (index, (((comfortable_key, comfortable_value), compact_key), compact_value)) in
            comfortable_labels
                .into_iter()
                .zip(comfortable_values)
                .zip(compact_labels)
                .zip(compact_values)
                .enumerate()
        {
            let (key, value) = self.fixture.rows[index];
            self.view.label(cx, comfortable_key).set_text(cx, key);
            self.view.label(cx, comfortable_value).set_text(cx, value);
            self.view.label(cx, compact_key).set_text(cx, key);
            self.view.label(cx, compact_value).set_text(cx, value);
        }
        self.view.label(cx, ids!(descriptions_status)).set_text(
            cx,
            if self.state.compact {
                "Compact rows"
            } else {
                "Comfortable rows"
            },
        );
        self.view.button(cx, ids!(descriptions_toggle)).set_text(
            cx,
            if self.state.compact {
                "Use comfortable rows"
            } else {
                "Compact rows"
            },
        );
        self.view
            .button(cx, ids!(descriptions_disclosure))
            .set_text(
                cx,
                if self.state.disclosed {
                    "Hide full values"
                } else {
                    "Show full values"
                },
            );
        self.view.button(cx, ids!(descriptions_copy)).set_text(
            cx,
            if self.state.copy_denied {
                "Copy denied"
            } else {
                "Copy revision"
            },
        );
        self.view.label(cx, ids!(descriptions_full_value)).set_text(
            cx,
            &format!("Revision full value: {}", self.fixture.rows[1].1),
        );
        self.view
            .label(cx, ids!(descriptions_full_value))
            .set_visible(cx, self.state.disclosed);
        self.view.label(cx, ids!(descriptions_status)).set_text(
            cx,
            &format!(
                "{} / {} / {}",
                if self.state.compact {
                    "Compact rows"
                } else {
                    "Comfortable rows"
                },
                if self.state.disclosed {
                    "Full values disclosed"
                } else {
                    "Values summarized"
                },
                if self.state.copy_denied {
                    "Clipboard denied"
                } else {
                    "Clipboard unavailable"
                },
            ),
        );
        self.view
            .view(cx, ids!(descriptions_comfortable_rows))
            .set_visible(cx, !self.state.compact);
        self.view
            .view(cx, ids!(descriptions_compact_rows))
            .set_visible(cx, self.state.compact);
        self.view.redraw(cx);
    }
}
impl Widget for TesseraDescriptions {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(descriptions_toggle))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, DescriptionsEvent::ToggleDensity);
        } else if self
            .view
            .button(cx, ids!(descriptions_disclosure))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, DescriptionsEvent::ToggleDisclosure);
        } else if self
            .view
            .button(cx, ids!(descriptions_copy))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, DescriptionsEvent::CopyValue);
        }
    }
}
#[cfg(test)]
mod tests {
    use super::{DescriptionsEvent, DescriptionsState, DescriptionsSurfaceCatalog};
    use tessera_core::catalog::ComponentId;
    #[test]
    fn descriptions_owns_rows_and_density_state() {
        assert_eq!(
            DescriptionsSurfaceCatalog::widget_name(ComponentId::Descriptions),
            Some("TesseraDescriptions")
        );
        let mut state = DescriptionsState::default();
        state.reduce(DescriptionsEvent::ToggleDensity);
        assert!(state.compact);
        state.reduce(DescriptionsEvent::ToggleDisclosure);
        assert!(state.disclosed);
        state.reduce(DescriptionsEvent::CopyValue);
        assert!(state.copy_denied);
        state.reduce(DescriptionsEvent::Reset);
        assert_eq!(state, DescriptionsState::default());
    }
}
