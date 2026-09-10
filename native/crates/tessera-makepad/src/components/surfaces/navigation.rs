//! Native navigation surfaces with one state machine per catalog component.

use crate::foundation::input::{ButtonActivationExt, set_button_enabled};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct NavigationSurfaceCatalog;

impl NavigationSurfaceCatalog {
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Segmented => Some("TesseraSegmented"),
            ComponentId::Tabs => Some("TesseraTabs"),
            ComponentId::Tree => Some("TesseraTree"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SegmentedFixture {
    pub labels: [&'static str; 3],
    pub disabled: usize,
}

impl SegmentedFixture {
    pub const DEFAULT: Self = Self {
        labels: ["Daily", "Weekly", "Archived"],
        disabled: 2,
    };
}

impl Default for SegmentedFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct SegmentedState {
    pub selected: usize,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SegmentedEvent {
    Select(usize),
    Previous,
    Next,
    First,
    LastEnabled,
    Reset,
}

impl SegmentedState {
    pub fn reduce(&mut self, event: SegmentedEvent, fixture: SegmentedFixture) {
        let selectable = |index: usize| index < fixture.labels.len() && index != fixture.disabled;
        match event {
            SegmentedEvent::Select(index) if selectable(index) => self.selected = index,
            SegmentedEvent::Previous => {
                self.selected = if self.selected == 0 { 1 } else { 0 };
            }
            SegmentedEvent::Next => {
                self.selected = if self.selected == 0 { 1 } else { 0 };
            }
            SegmentedEvent::First => self.selected = 0,
            SegmentedEvent::LastEnabled => self.selected = 1,
            SegmentedEvent::Reset => *self = Self::default(),
            SegmentedEvent::Select(_) => {}
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum SegmentedAction {
    Selected {
        index: usize,
    },
    #[default]
    None,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TabsFixture {
    pub labels: [&'static str; 3],
    pub panels: [&'static str; 3],
    pub disabled: usize,
}

impl TabsFixture {
    pub const DEFAULT: Self = Self {
        labels: ["Overview", "Activity", "Archived"],
        panels: [
            "Current release scope and assigned owners.",
            "Recent review and publish activity.",
            "Archived activity is unavailable in this fixture.",
        ],
        disabled: 2,
    };
}

impl Default for TabsFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct TabsState {
    pub active: usize,
    pub roving: usize,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TabsEvent {
    Select(usize),
    Previous,
    Next,
    First,
    LastEnabled,
    ActivateRoving,
    Reset,
}

impl TabsState {
    pub fn reduce(&mut self, event: TabsEvent, fixture: TabsFixture) {
        let selected = match event {
            TabsEvent::Select(index)
                if index < fixture.labels.len() && index != fixture.disabled =>
            {
                Some(index)
            }
            TabsEvent::Previous => Some(if self.roving == 0 { 1 } else { 0 }),
            TabsEvent::Next => Some(if self.roving == 0 { 1 } else { 0 }),
            TabsEvent::First => Some(0),
            TabsEvent::LastEnabled => Some(1),
            TabsEvent::ActivateRoving => Some(self.roving),
            TabsEvent::Reset => {
                *self = Self::default();
                None
            }
            TabsEvent::Select(_) => None,
        };
        if let Some(index) = selected {
            self.roving = index;
            self.active = index;
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum TabsAction {
    PanelSelected {
        index: usize,
    },
    #[default]
    None,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TreeFixture {
    pub root_id: &'static str,
    pub release_id: &'static str,
    pub review_id: &'static str,
    pub root_label: &'static str,
    pub release_label: &'static str,
    pub review_label: &'static str,
}

impl TreeFixture {
    pub const DEFAULT: Self = Self {
        root_id: "workspace",
        release_id: "workspace/release",
        review_id: "workspace/review",
        root_label: "Workspace",
        release_label: "Release",
        review_label: "Review queue",
    };
}

impl Default for TreeFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TreeState {
    pub expanded: bool,
    pub selected: usize,
}

impl Default for TreeState {
    fn default() -> Self {
        Self {
            expanded: true,
            selected: 0,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TreeEvent {
    ToggleRoot,
    Select(usize),
    Previous,
    Next,
    First,
    Last,
    Expand,
    Collapse,
    Reset,
}

impl TreeState {
    pub const MAX_VISIBLE_ROWS: usize = 3;

    pub fn visible_rows(self) -> usize {
        if self.expanded { 3 } else { 1 }
    }

    pub fn reduce(&mut self, event: TreeEvent) {
        match event {
            TreeEvent::ToggleRoot => self.expanded = !self.expanded,
            TreeEvent::Select(index) => self.selected = index.min(self.visible_rows() - 1),
            TreeEvent::Previous => self.selected = self.selected.saturating_sub(1),
            TreeEvent::Next => self.selected = (self.selected + 1).min(self.visible_rows() - 1),
            TreeEvent::First => self.selected = 0,
            TreeEvent::Last => self.selected = self.visible_rows() - 1,
            TreeEvent::Expand => self.expanded = true,
            TreeEvent::Collapse => {
                self.expanded = false;
                self.selected = 0;
            }
            TreeEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum TreeAction {
    NodeSelected {
        visible_index: usize,
    },
    Expanded {
        expanded: bool,
    },
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*

    mod.widgets.TesseraSegmentedBase = #(TesseraSegmented::register_widget(vm))
    mod.widgets.TesseraSegmented = set_type_default() do mod.widgets.TesseraSegmentedBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 8
        segmented_title := Label{width: Fill height: Fit text: "Schedule" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        segmented_controls := View{width: Fill height: 32 flow: Right spacing: 4
            segmented_daily := Button{width: Fit height: 30 text: "Daily"}
            segmented_weekly := Button{width: Fit height: 30 text: "Weekly"}
            segmented_archived := Button{width: Fit height: 30 text: "Archived"}
        }
        segmented_status := Label{width: Fill height: Fit text: "Selected Daily" draw_text +: {color: theme.color_text_meta}}
    }

    mod.widgets.TesseraTabsBase = #(TesseraTabs::register_widget(vm))
    mod.widgets.TesseraTabs = set_type_default() do mod.widgets.TesseraTabsBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 8
        tabs_title := Label{width: Fill height: Fit text: "Release detail" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        tabs_tablist := View{width: Fill height: 32 flow: Right spacing: 4
            tabs_overview := Button{width: Fit height: 30 text: "Overview"}
            tabs_activity := Button{width: Fit height: 30 text: "Activity"}
            tabs_archived := Button{width: Fit height: 30 text: "Archived"}
        }
        tabs_panel := View{width: Fill height: Fit flow: Down spacing: 4 padding: Inset{left: 8, right: 8, top: 8, bottom: 8} show_bg: true draw_bg +: {color: theme.color_bg_app border_radius: 3.0 border_size: 1.0 border_color: theme.color_bevel}
            tabs_panel_title := Label{width: Fill height: Fit text: "Overview" draw_text +: {color: theme.color_text}}
            tabs_panel_body := Label{width: Fill height: Fit text: "Current release scope and assigned owners." draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
        }
    }

    mod.widgets.TesseraTreeBase = #(TesseraTree::register_widget(vm))
    mod.widgets.TesseraTree = set_type_default() do mod.widgets.TesseraTreeBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        tree_title := Label{width: Fill height: Fit text: "Project tree" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        tree_root := Button{width: Fill height: 30 text: "v Workspace"}
        tree_children := View{width: Fill height: Fit flow: Down spacing: 3 padding: Inset{left: 18, right: 0, top: 0, bottom: 0}
            tree_release := Button{width: Fill height: 30 text: "Release"}
            tree_review := Button{width: Fill height: 30 text: "Review queue"}
        }
        tree_status := Label{width: Fill height: Fit text: "workspace / expanded" draw_text +: {color: theme.color_text_meta}}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraSegmented {
    #[deref]
    view: View,
    #[rust]
    fixture: SegmentedFixture,
    #[rust]
    state: SegmentedState,
}

impl TesseraSegmented {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = SegmentedFixture::DEFAULT;
        self.state = SegmentedState::default();
        self.sync(cx);
    }

    fn apply_event(&mut self, cx: &mut Cx, event: SegmentedEvent) {
        self.state.reduce(event, self.fixture);
        self.sync(cx);
        if !matches!(event, SegmentedEvent::Reset) {
            cx.widget_action(
                self.widget_uid(),
                SegmentedAction::Selected {
                    index: self.state.selected,
                },
            );
        }
    }

    fn has_keyboard_focus(&self, cx: &Cx) -> bool {
        [
            self.view.widget(cx, ids!(segmented_daily)),
            self.view.widget(cx, ids!(segmented_weekly)),
            self.view.widget(cx, ids!(segmented_archived)),
        ]
        .iter()
        .any(|widget| widget.key_focus(cx))
    }

    fn sync(&mut self, cx: &mut Cx) {
        let controls = [
            ids!(segmented_daily),
            ids!(segmented_weekly),
            ids!(segmented_archived),
        ];
        for (index, id) in controls.into_iter().enumerate() {
            self.view.button(cx, id).set_text(
                cx,
                &format!(
                    "{}{}",
                    if index == self.state.selected {
                        "* "
                    } else {
                        ""
                    },
                    self.fixture.labels[index]
                ),
            );
            set_button_enabled(
                &self.view.button(cx, id),
                cx,
                index != self.fixture.disabled,
            );
        }
        self.view.label(cx, ids!(segmented_status)).set_text(
            cx,
            &format!("Selected {}", self.fixture.labels[self.state.selected]),
        );
        self.view.redraw(cx);
    }
}

impl Widget for TesseraSegmented {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        let keyboard = self.has_keyboard_focus(cx);
        if self
            .view
            .button(cx, ids!(segmented_daily))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, SegmentedEvent::Select(0));
        } else if self
            .view
            .button(cx, ids!(segmented_weekly))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, SegmentedEvent::Select(1));
        } else if keyboard && let Event::KeyDown(key) = event {
            match key.key_code {
                KeyCode::ArrowLeft => self.apply_event(cx, SegmentedEvent::Previous),
                KeyCode::ArrowRight => self.apply_event(cx, SegmentedEvent::Next),
                KeyCode::Home => self.apply_event(cx, SegmentedEvent::First),
                KeyCode::End => self.apply_event(cx, SegmentedEvent::LastEnabled),
                KeyCode::ReturnKey | KeyCode::NumpadEnter | KeyCode::Space => {
                    self.apply_event(cx, SegmentedEvent::Select(self.state.selected))
                }
                _ => {}
            }
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraTabs {
    #[deref]
    view: View,
    #[rust]
    fixture: TabsFixture,
    #[rust]
    state: TabsState,
}

impl TesseraTabs {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = TabsFixture::DEFAULT;
        self.state = TabsState::default();
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: TabsEvent) {
        self.state.reduce(event, self.fixture);
        self.sync(cx);
        if !matches!(event, TabsEvent::Reset) {
            cx.widget_action(
                self.widget_uid(),
                TabsAction::PanelSelected {
                    index: self.state.active,
                },
            );
        }
    }
    fn has_keyboard_focus(&self, cx: &Cx) -> bool {
        [
            self.view.widget(cx, ids!(tabs_overview)),
            self.view.widget(cx, ids!(tabs_activity)),
            self.view.widget(cx, ids!(tabs_archived)),
        ]
        .iter()
        .any(|widget| widget.key_focus(cx))
    }
    fn sync(&mut self, cx: &mut Cx) {
        let controls = [
            ids!(tabs_overview),
            ids!(tabs_activity),
            ids!(tabs_archived),
        ];
        for (index, id) in controls.into_iter().enumerate() {
            self.view.button(cx, id).set_text(
                cx,
                &format!(
                    "{}{}",
                    if index == self.state.active { "* " } else { "" },
                    self.fixture.labels[index]
                ),
            );
            set_button_enabled(
                &self.view.button(cx, id),
                cx,
                index != self.fixture.disabled,
            );
        }
        self.view
            .label(cx, ids!(tabs_panel_title))
            .set_text(cx, self.fixture.labels[self.state.active]);
        self.view
            .label(cx, ids!(tabs_panel_body))
            .set_text(cx, self.fixture.panels[self.state.active]);
        self.view.redraw(cx);
    }
}

impl Widget for TesseraTabs {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        let keyboard = self.has_keyboard_focus(cx);
        if self
            .view
            .button(cx, ids!(tabs_overview))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, TabsEvent::Select(0));
        } else if self
            .view
            .button(cx, ids!(tabs_activity))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, TabsEvent::Select(1));
        } else if keyboard && let Event::KeyDown(key) = event {
            match key.key_code {
                KeyCode::ArrowLeft => self.apply_event(cx, TabsEvent::Previous),
                KeyCode::ArrowRight => self.apply_event(cx, TabsEvent::Next),
                KeyCode::Home => self.apply_event(cx, TabsEvent::First),
                KeyCode::End => self.apply_event(cx, TabsEvent::LastEnabled),
                KeyCode::ReturnKey | KeyCode::NumpadEnter | KeyCode::Space => {
                    self.apply_event(cx, TabsEvent::ActivateRoving)
                }
                _ => {}
            }
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraTree {
    #[deref]
    view: View,
    #[rust]
    fixture: TreeFixture,
    #[rust]
    state: TreeState,
}

impl TesseraTree {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = TreeFixture::DEFAULT;
        self.state = TreeState::default();
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: TreeEvent) {
        self.state.reduce(event);
        self.sync(cx);
        let action = match event {
            TreeEvent::ToggleRoot | TreeEvent::Expand | TreeEvent::Collapse => {
                TreeAction::Expanded {
                    expanded: self.state.expanded,
                }
            }
            TreeEvent::Select(_)
            | TreeEvent::Previous
            | TreeEvent::Next
            | TreeEvent::First
            | TreeEvent::Last => TreeAction::NodeSelected {
                visible_index: self.state.selected,
            },
            TreeEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }
    fn has_keyboard_focus(&self, cx: &Cx) -> bool {
        [
            self.view.widget(cx, ids!(tree_root)),
            self.view.widget(cx, ids!(tree_release)),
            self.view.widget(cx, ids!(tree_review)),
        ]
        .iter()
        .any(|widget| widget.key_focus(cx))
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.view.button(cx, ids!(tree_root)).set_text(
            cx,
            &format!(
                "{} {}",
                if self.state.expanded { "v" } else { ">" },
                self.fixture.root_label
            ),
        );
        self.view.button(cx, ids!(tree_release)).set_text(
            cx,
            &format!(
                "{} {}",
                if self.state.selected == 1 { ">" } else { " " },
                self.fixture.release_label
            ),
        );
        self.view.button(cx, ids!(tree_review)).set_text(
            cx,
            &format!(
                "{} {}",
                if self.state.selected == 2 { ">" } else { " " },
                self.fixture.review_label
            ),
        );
        self.view
            .widget(cx, ids!(tree_children))
            .set_visible(cx, self.state.expanded);
        let selected_id = [
            self.fixture.root_id,
            self.fixture.release_id,
            self.fixture.review_id,
        ][self.state.selected];
        self.view.label(cx, ids!(tree_status)).set_text(
            cx,
            &format!(
                "{} / {} visible rows",
                selected_id,
                self.state.visible_rows().min(TreeState::MAX_VISIBLE_ROWS)
            ),
        );
        self.view.redraw(cx);
    }
}

impl Widget for TesseraTree {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        let keyboard = self.has_keyboard_focus(cx);
        if self
            .view
            .button(cx, ids!(tree_root))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, TreeEvent::ToggleRoot);
        } else if self
            .view
            .button(cx, ids!(tree_release))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, TreeEvent::Select(1));
        } else if self
            .view
            .button(cx, ids!(tree_review))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, TreeEvent::Select(2));
        } else if keyboard && let Event::KeyDown(key) = event {
            match key.key_code {
                KeyCode::ArrowUp => self.apply_event(cx, TreeEvent::Previous),
                KeyCode::ArrowDown => self.apply_event(cx, TreeEvent::Next),
                KeyCode::ArrowRight => self.apply_event(cx, TreeEvent::Expand),
                KeyCode::ArrowLeft => self.apply_event(cx, TreeEvent::Collapse),
                KeyCode::Home => self.apply_event(cx, TreeEvent::First),
                KeyCode::End => self.apply_event(cx, TreeEvent::Last),
                KeyCode::ReturnKey | KeyCode::NumpadEnter | KeyCode::Space
                    if self.state.selected == 0 =>
                {
                    self.apply_event(cx, TreeEvent::ToggleRoot)
                }
                _ => {}
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        NavigationSurfaceCatalog, SegmentedEvent, SegmentedFixture, SegmentedState, TabsEvent,
        TabsFixture, TabsState, TreeEvent, TreeState,
    };
    use tessera_core::catalog::ComponentId;

    #[test]
    fn catalog_uses_one_exact_widget_per_navigation_route() {
        assert_eq!(
            NavigationSurfaceCatalog::widget_name(ComponentId::Segmented),
            Some("TesseraSegmented")
        );
        assert_eq!(
            NavigationSurfaceCatalog::widget_name(ComponentId::Tabs),
            Some("TesseraTabs")
        );
        assert_eq!(
            NavigationSurfaceCatalog::widget_name(ComponentId::Tree),
            Some("TesseraTree")
        );
    }

    #[test]
    fn segmented_and_tabs_skip_disabled_items() {
        let mut segmented = SegmentedState::default();
        segmented.reduce(SegmentedEvent::Select(2), SegmentedFixture::DEFAULT);
        assert_eq!(segmented.selected, 0);
        segmented.reduce(SegmentedEvent::LastEnabled, SegmentedFixture::DEFAULT);
        assert_eq!(segmented.selected, 1);
        let mut tabs = TabsState::default();
        tabs.reduce(TabsEvent::Select(2), TabsFixture::DEFAULT);
        assert_eq!(tabs.active, 0);
        tabs.reduce(TabsEvent::Next, TabsFixture::DEFAULT);
        assert_eq!(tabs.active, 1);
    }

    #[test]
    fn tree_bounds_visible_rows_and_selection() {
        let mut tree = TreeState::default();
        tree.reduce(TreeEvent::Last);
        assert_eq!(tree.selected, 2);
        tree.reduce(TreeEvent::Collapse);
        assert_eq!(tree.visible_rows(), 1);
        assert_eq!(tree.selected, 0);
    }
}
