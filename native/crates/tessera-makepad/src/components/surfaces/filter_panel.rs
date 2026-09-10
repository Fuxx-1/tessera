//! Filter panel separates editable draft filters from their committed value.
use crate::foundation::input::ButtonActivationExt;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;
pub struct FilterPanelSurfaceCatalog;
impl FilterPanelSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::FilterPanel => Some("TesseraFilterPanel"),
            _ => None,
        }
    }
}
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct FilterSpec {
    pub query: String,
    pub active: bool,
    pub archived: bool,
}
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct FilterPanelState {
    pub draft: FilterSpec,
    pub committed: FilterSpec,
}
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum FilterPanelEvent {
    QueryChanged(String),
    ToggleActive,
    ToggleArchived,
    Commit,
    Reset,
}
impl FilterPanelState {
    pub fn reduce(&mut self, event: FilterPanelEvent) {
        match event {
            FilterPanelEvent::QueryChanged(query) => self.draft.query = query,
            FilterPanelEvent::ToggleActive => self.draft.active = !self.draft.active,
            FilterPanelEvent::ToggleArchived => self.draft.archived = !self.draft.archived,
            FilterPanelEvent::Commit => self.committed = self.draft.clone(),
            FilterPanelEvent::Reset => *self = Self::default(),
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum FilterPanelAction {
    DraftChanged {
        active: bool,
        archived: bool,
    },
    Committed {
        active: bool,
        archived: bool,
        query_bytes: usize,
    },
    Reset,
    #[default]
    None,
}
script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraFilterPanelBase = #(TesseraFilterPanel::register_widget(vm))
    mod.widgets.TesseraFilterPanel = set_type_default() do mod.widgets.TesseraFilterPanelBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        filter_panel_title := Label{width: Fill height: Fit text: "Filter panel" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        filter_panel_query := TextInputFlat{width: Fill height: 34 empty_text: "Search local artifacts"}
        filter_panel_flags := View{width: Fill height: 30 flow: Right spacing: 6
            filter_panel_active := Button{width: Fit height: 30 text: "Active"}
            filter_panel_archived := Button{width: Fit height: 30 text: "Archived"}
            filter_panel_apply := Button{width: Fit height: 30 text: "Apply"}
        }
        filter_panel_reset := Button{width: Fit height: 28 text: "Reset"}
        filter_panel_status := Label{width: Fill height: Fit text: "Edit filters then apply" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
}
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraFilterPanel {
    #[deref]
    view: View,
    #[rust]
    state: FilterPanelState,
}
impl TesseraFilterPanel {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.state.reduce(FilterPanelEvent::Reset);
        self.sync(cx);
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .text_input(cx, ids!(filter_panel_query))
            .set_text(cx, &self.state.draft.query);
        self.view.button(cx, ids!(filter_panel_active)).set_text(
            cx,
            if self.state.draft.active {
                "Active: on"
            } else {
                "Active: off"
            },
        );
        self.view.button(cx, ids!(filter_panel_archived)).set_text(
            cx,
            if self.state.draft.archived {
                "Archived: on"
            } else {
                "Archived: off"
            },
        );
        self.view.label(cx, ids!(filter_panel_status)).set_text(
            cx,
            if self.state.draft == self.state.committed {
                "Committed filter state"
            } else {
                "Draft filters have unapplied changes"
            },
        );
        self.view.redraw(cx);
    }
    fn draft_action(&self, cx: &mut Cx) {
        cx.widget_action(
            self.widget_uid(),
            FilterPanelAction::DraftChanged {
                active: self.state.draft.active,
                archived: self.state.draft.archived,
            },
        );
    }
}
impl Widget for TesseraFilterPanel {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if let Some(query) = self
            .view
            .text_input(cx, ids!(filter_panel_query))
            .changed(&actions)
        {
            self.state.reduce(FilterPanelEvent::QueryChanged(query));
            self.sync(cx);
            self.draft_action(cx);
        }
        if self
            .view
            .button(cx, ids!(filter_panel_active))
            .activated(cx, event, &actions)
        {
            self.state.reduce(FilterPanelEvent::ToggleActive);
            self.sync(cx);
            self.draft_action(cx);
        }
        if self
            .view
            .button(cx, ids!(filter_panel_archived))
            .activated(cx, event, &actions)
        {
            self.state.reduce(FilterPanelEvent::ToggleArchived);
            self.sync(cx);
            self.draft_action(cx);
        }
        if self
            .view
            .button(cx, ids!(filter_panel_apply))
            .activated(cx, event, &actions)
        {
            self.state.reduce(FilterPanelEvent::Commit);
            self.sync(cx);
            cx.widget_action(
                self.widget_uid(),
                FilterPanelAction::Committed {
                    active: self.state.committed.active,
                    archived: self.state.committed.archived,
                    query_bytes: self.state.committed.query.len(),
                },
            );
        }
        if self
            .view
            .button(cx, ids!(filter_panel_reset))
            .activated(cx, event, &actions)
        {
            self.reset(cx);
            cx.widget_action(self.widget_uid(), FilterPanelAction::Reset);
        }
    }
}
#[cfg(test)]
mod tests {
    use super::{FilterPanelEvent, FilterPanelState};
    #[test]
    fn apply_commits_the_current_draft_without_counting() {
        let mut state = FilterPanelState::default();
        state.reduce(FilterPanelEvent::QueryChanged(String::from("runtime")));
        state.reduce(FilterPanelEvent::ToggleActive);
        state.reduce(FilterPanelEvent::Commit);
        assert_eq!(state.draft, state.committed);
        assert!(state.committed.active);
    }
}
