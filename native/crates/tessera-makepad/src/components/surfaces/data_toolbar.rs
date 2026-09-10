//! Data toolbar actions either update local domain state or report Unsupported.
use crate::foundation::input::ButtonActivationExt;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;
pub struct DataToolbarSurfaceCatalog;
impl DataToolbarSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::DataToolbar => Some("TesseraDataToolbar"),
            _ => None,
        }
    }
}
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct DataToolbarState {
    pub query: String,
    pub compact: bool,
}
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataToolbarEvent {
    QueryChanged(String),
    DensityChanged(bool),
    RefreshRequested,
    Reset,
}
impl DataToolbarState {
    pub fn reduce(&mut self, event: DataToolbarEvent) {
        match event {
            DataToolbarEvent::QueryChanged(query) => self.query = query,
            DataToolbarEvent::DensityChanged(compact) => self.compact = compact,
            DataToolbarEvent::RefreshRequested => {}
            DataToolbarEvent::Reset => *self = Self::default(),
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum DataToolbarAction {
    QueryChanged {
        bytes: usize,
    },
    DensityChanged {
        compact: bool,
    },
    Unsupported {
        reason: &'static str,
    },
    Reset,
    #[default]
    None,
}
script_mod! { use mod.prelude.widgets_internal.* use mod.widgets.* mod.widgets.TesseraDataToolbarBase = #(TesseraDataToolbar::register_widget(vm)) mod.widgets.TesseraDataToolbar = set_type_default() do mod.widgets.TesseraDataToolbarBase{ ..mod.widgets.TesseraSurfaceFrame spacing: 6 data_toolbar_title := Label{width: Fill height: Fit text: "Data toolbar" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}} data_toolbar_query := TextInputFlat{width: Fill height: 34 empty_text: "Filter local results"} data_toolbar_density := DropDown2{width: Fill height: 34 labels: ["Comfortable" "Compact"]} data_toolbar_refresh := Button{width: Fit height: 30 text: "Refresh source"} data_toolbar_status := Label{width: Fill height: Fit text: "No data source connected" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}} } }
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraDataToolbar {
    #[deref]
    view: View,
    #[rust]
    state: DataToolbarState,
}
impl TesseraDataToolbar {
    const NO_SOURCE: &'static str = "No connected data source";
    pub fn reset(&mut self, cx: &mut Cx) {
        self.state.reduce(DataToolbarEvent::Reset);
        self.view
            .text_input(cx, ids!(data_toolbar_query))
            .set_text(cx, "");
        self.view
            .drop_down(cx, ids!(data_toolbar_density))
            .set_selected_item(cx, 0);
        self.view
            .label(cx, ids!(data_toolbar_status))
            .set_text(cx, Self::NO_SOURCE);
        self.view.redraw(cx);
    }
}
impl Widget for TesseraDataToolbar {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if let Some(query) = self
            .view
            .text_input(cx, ids!(data_toolbar_query))
            .changed(&actions)
        {
            let bytes = query.len();
            self.state.reduce(DataToolbarEvent::QueryChanged(query));
            cx.widget_action(self.widget_uid(), DataToolbarAction::QueryChanged { bytes });
        }
        if let Some(index) = self
            .view
            .drop_down(cx, ids!(data_toolbar_density))
            .changed(&actions)
        {
            self.state
                .reduce(DataToolbarEvent::DensityChanged(index == 1));
            self.view.label(cx, ids!(data_toolbar_status)).set_text(
                cx,
                if self.state.compact {
                    "Local density: compact"
                } else {
                    "Local density: comfortable"
                },
            );
            cx.widget_action(
                self.widget_uid(),
                DataToolbarAction::DensityChanged {
                    compact: self.state.compact,
                },
            );
        }
        if self
            .view
            .button(cx, ids!(data_toolbar_refresh))
            .activated(cx, event, &actions)
        {
            self.state.reduce(DataToolbarEvent::RefreshRequested);
            self.view
                .label(cx, ids!(data_toolbar_status))
                .set_text(cx, "Unsupported: no connected data source");
            cx.widget_action(
                self.widget_uid(),
                DataToolbarAction::Unsupported {
                    reason: Self::NO_SOURCE,
                },
            );
        }
    }
}
#[cfg(test)]
mod tests {
    use super::{DataToolbarEvent, DataToolbarState};
    #[test]
    fn toolbar_has_no_refresh_counter() {
        let mut state = DataToolbarState::default();
        state.reduce(DataToolbarEvent::QueryChanged(String::from("owned")));
        state.reduce(DataToolbarEvent::DensityChanged(true));
        assert_eq!(state.query, "owned");
        assert!(state.compact);
    }
}
