use crate::foundation::focus::constrain_tab_group;
use crate::foundation::input::{ButtonActivationExt, focused_navigation_key};
use crate::foundation::navigation::collection_index;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct PropertyListSurfaceCatalog;

impl PropertyListSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::PropertyList => Some("TesseraPropertyList"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct PropertyListFixture {
    pub title: &'static str,
    pub keys: [&'static str; 4],
    pub values: [&'static str; 4],
}

impl PropertyListFixture {
    pub const DEFAULT: Self = Self {
        title: "Release metadata",
        keys: ["Owner", "Revision", "Status", "Evidence"],
        values: ["Tessera", "a097101", "blocked", "runtime only"],
    };
}

impl Default for PropertyListFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct PropertyListState {
    pub selected: usize,
    pub dense: bool,
    pub copy_denied: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PropertyListEvent {
    Select(usize),
    Copy(usize),
    ToggleDensity,
    Reset,
}

impl PropertyListState {
    fn row_height(self) -> f64 {
        if self.dense { 28.0 } else { 36.0 }
    }

    pub fn reduce(&mut self, event: PropertyListEvent, fixture: PropertyListFixture) {
        match event {
            PropertyListEvent::Select(index) => {
                self.selected = index.min(fixture.keys.len() - 1);
            }
            PropertyListEvent::Copy(index) => {
                self.selected = index.min(fixture.keys.len() - 1);
                self.copy_denied = true;
            }
            PropertyListEvent::ToggleDensity => self.dense = !self.dense,
            PropertyListEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum PropertyListAction {
    Selected {
        index: usize,
    },
    CopyDenied {
        index: usize,
    },
    DensityChanged {
        dense: bool,
    },
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraPropertyListBase = #(TesseraPropertyList::register_widget(vm))
    mod.widgets.TesseraPropertyList = set_type_default() do mod.widgets.TesseraPropertyListBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        property_list_title := Label{width: Fill height: Fit text: "Release metadata" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        property_list_rows := View{
            width: Fill
            height: Fit
            flow: Down
            spacing: 4
            property_one_container := View{width: Fill height: 36
                property_row_one := Button{width: Fill height: Fill align: Align{x: 0.0, y: 0.5} text: "Owner: Tessera"}
            }
            property_two_container := View{width: Fill height: 36
                property_row_two := Button{width: Fill height: Fill align: Align{x: 0.0, y: 0.5} text: "Revision: a097101"}
            }
            property_three_container := View{width: Fill height: 36
                property_row_three := Button{width: Fill height: Fill align: Align{x: 0.0, y: 0.5} text: "Status: blocked"}
            }
            property_four_container := View{width: Fill height: 36
                property_row_four := Button{width: Fill height: Fill align: Align{x: 0.0, y: 0.5} text: "Evidence: runtime only"}
            }
        }
        property_list_actions := View{
            width: Fill
            height: 30
            flow: Right
            spacing: 6
            property_copy_one := Button{width: Fit height: 30 text: "Copy owner"}
            property_copy_two := Button{width: Fit height: 30 text: "Copy revision"}
            property_copy_three := Button{width: Fit height: 30 text: "Copy status"}
            property_copy_four := Button{width: Fit height: 30 text: "Copy evidence"}
            property_list_density := Button{width: 96 height: 30 text: "Dense"}
        }
        property_list_status := Label{width: Fill height: Fit text: "Property list idle" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraPropertyList {
    #[deref]
    view: View,
    #[rust]
    fixture: PropertyListFixture,
    #[rust]
    state: PropertyListState,
}

impl TesseraPropertyList {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = PropertyListFixture::DEFAULT;
        self.state = PropertyListState::default();
        self.sync(cx);
    }

    fn apply_event(&mut self, cx: &mut Cx, event: PropertyListEvent) {
        self.state.reduce(event, self.fixture);
        self.sync(cx);
        let action = match event {
            PropertyListEvent::Select(index) => PropertyListAction::Selected {
                index: index.min(self.fixture.keys.len() - 1),
            },
            PropertyListEvent::Copy(index) => PropertyListAction::CopyDenied {
                index: index.min(self.fixture.keys.len() - 1),
            },
            PropertyListEvent::ToggleDensity => PropertyListAction::DensityChanged {
                dense: self.state.dense,
            },
            PropertyListEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(property_list_title))
            .set_text(cx, self.fixture.title);
        let row_ids = [
            ids!(property_row_one),
            ids!(property_row_two),
            ids!(property_row_three),
            ids!(property_row_four),
        ];
        let copy_ids = [
            ids!(property_copy_one),
            ids!(property_copy_two),
            ids!(property_copy_three),
            ids!(property_copy_four),
        ];
        for (index, id) in row_ids.into_iter().enumerate() {
            let prefix = if index == self.state.selected {
                "> "
            } else {
                "  "
            };
            self.view.button(cx, id).set_text(
                cx,
                &format!(
                    "{prefix}{}: {}",
                    self.fixture.keys[index], self.fixture.values[index]
                ),
            );
        }
        for (index, id) in copy_ids.into_iter().enumerate() {
            self.view.button(cx, id).set_text(
                cx,
                &format!("Copy {}", self.fixture.keys[index].to_lowercase()),
            );
        }
        self.view.button(cx, ids!(property_list_density)).set_text(
            cx,
            if self.state.dense {
                "Comfortable"
            } else {
                "Dense"
            },
        );
        self.view.label(cx, ids!(property_list_status)).set_text(
            cx,
            &format!(
                "selected {} / dense {} / clipboard {}",
                self.state.selected,
                self.state.dense,
                if self.state.copy_denied {
                    "denied"
                } else {
                    "unavailable"
                }
            ),
        );
        self.view.redraw(cx);
    }

    fn layout_rows(&mut self, cx: &mut Cx) {
        for id in [
            ids!(property_one_container),
            ids!(property_two_container),
            ids!(property_three_container),
            ids!(property_four_container),
        ] {
            if let Some(mut row) = self.view.widget(cx, id).borrow_mut::<View>() {
                row.walk.height = Size::Fixed(self.state.row_height());
            }
        }
    }
}

impl Widget for TesseraPropertyList {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        // Rust-owned density remains authoritative after a theme template reapply.
        self.layout_rows(cx);
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        if !self.view.visible() {
            return;
        }
        let row_buttons = [
            ids!(property_row_one),
            ids!(property_row_two),
            ids!(property_row_three),
            ids!(property_row_four),
        ]
        .map(|id| self.view.button(cx, id));
        constrain_tab_group(
            cx,
            event,
            &[
                &row_buttons[0],
                &row_buttons[1],
                &row_buttons[2],
                &row_buttons[3],
            ],
            Some(self.state.selected),
        );
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        let copy_buttons = [
            (ids!(property_copy_one), 0),
            (ids!(property_copy_two), 1),
            (ids!(property_copy_three), 2),
            (ids!(property_copy_four), 3),
        ];
        for (index, button) in row_buttons.iter().enumerate() {
            if button.activated(cx, event, &actions) {
                self.apply_event(cx, PropertyListEvent::Select(index));
                return;
            }
        }
        for (id, index) in copy_buttons {
            if self.view.button(cx, id).activated(cx, event, &actions) {
                self.apply_event(cx, PropertyListEvent::Copy(index));
                return;
            }
        }
        if self
            .view
            .button(cx, ids!(property_list_density))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, PropertyListEvent::ToggleDensity);
            return;
        }
        if let Some(current) = row_buttons.iter().position(|button| button.key_focus(cx)) {
            if let Some(key) = focused_navigation_key(event, true) {
                if !matches!(
                    key,
                    KeyCode::ArrowUp | KeyCode::ArrowDown | KeyCode::Home | KeyCode::End
                ) {
                    return;
                }
                if let Some(index) =
                    collection_index(key, current, row_buttons.len(), row_buttons.len())
                {
                    self.apply_event(cx, PropertyListEvent::Select(index));
                    row_buttons[index].set_key_focus(cx);
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{PropertyListEvent, PropertyListState, PropertyListSurfaceCatalog};
    use tessera_core::catalog::ComponentId;

    #[test]
    fn property_list_routes_to_the_native_widget() {
        assert_eq!(
            PropertyListSurfaceCatalog::widget_name(ComponentId::PropertyList),
            Some("TesseraPropertyList")
        );
    }

    #[test]
    fn property_list_tracks_selection_density_and_copy_denial() {
        let fixture = super::PropertyListFixture::DEFAULT;
        let mut state = PropertyListState::default();
        state.reduce(PropertyListEvent::Select(3), fixture);
        state.reduce(PropertyListEvent::Copy(2), fixture);
        state.reduce(PropertyListEvent::ToggleDensity, fixture);
        assert_eq!(state.selected, 2);
        assert!(state.copy_denied);
        assert!(state.dense);
    }

    #[test]
    fn property_list_density_and_reset_have_concrete_geometry() {
        let fixture = super::PropertyListFixture::DEFAULT;
        let mut state = PropertyListState::default();
        assert_eq!(state.row_height(), 36.0);
        state.reduce(PropertyListEvent::ToggleDensity, fixture);
        assert_eq!(state.row_height(), 28.0);
        state.reduce(PropertyListEvent::Copy(usize::MAX), fixture);
        assert_eq!(state.selected, 3);
        state.reduce(PropertyListEvent::Reset, fixture);
        assert_eq!(state, PropertyListState::default());
        assert_eq!(state.row_height(), 36.0);
    }
}
