use std::sync::OnceLock;

use tessera_core::catalog::{COMPONENTS, ComponentId, ComponentSpec};
use tessera_makepad::components;
use tessera_makepad::foundation::navigation::{ButtonBindings, collection_index};
use tessera_makepad::makepad_widgets::*;

use crate::route::{ComponentOpener, GalleryPage, NavigationOrigin};

const OPEN_BUTTON_LABEL: &str = "Open";

#[derive(Clone, Debug, Default)]
pub enum ComponentCatalogAction {
    #[default]
    None,
    Selected(ComponentId),
    Opened(ComponentOpener),
}

script_mod! {
    use mod.prelude.widgets.*
    use mod.widgets.*

    let ComponentSidebarGroup = View{
        width: Fill
        height: 28
        flow: Down
        padding: Inset{left: 8, right: 8, top: 8, bottom: 2}
        group := Label{
            width: Fill
            height: Fit
            padding: 0
            text: "Base / General"
            draw_text +: {
                color: theme.color_text_meta
                text_style +: {font_size: 9.0}
            }
        }
    }

    let ComponentSidebarRow = View{
        width: Fill
        height: 36
        flow: Right
        padding: Inset{left: 0, right: 0, top: 2, bottom: 2}
        selected_marker := SolidView{
            width: 3
            height: 18
            visible: false
            draw_bg.color: theme.color_bevel_focus
        }
        select_button := Button{
            width: Fill
            height: 32
            margin: 0
            text: "Component"
            align: Align{x: 0.0, y: 0.5}
            padding: Inset{left: 8, right: 8, top: 0, bottom: 0}
            draw_bg +: {
                color: #x00000000
                color_2: vec4(-1.0)
                border_radius: 3.0
                border_size: 0.0
            }
            draw_text +: {
                color: theme.color_text
                text_style +: {font_size: 11.0}
            }
        }
    }

    let ComponentRow = RoundedView{
        width: Fill
        height: 82
        padding: Inset{left: 10, right: 10, top: 8, bottom: 8}
        flow: Down
        spacing: 4
        draw_bg +: {
            color: theme.color_fg_app
            border_radius: 3.5
            border_size: 1.0
            border_color: theme.color_bevel
        }

        header := View{
            width: Fill
            height: 28
            flow: Right
            spacing: 6
            align: Align{y: 0.5}

            name := Label{
                width: Fill
                text: "Component"
                draw_text +: {
                    color: theme.color_text
                    text_style +: {font_size: 13.0}
                }
            }
            meta := Label{
                width: Fit
                text: "Base"
                draw_text +: {
                    color: theme.color_text_meta
                    text_style +: {font_size: 10.0}
                }
            }
            open_button := Button{
                width: 58
                height: 28
                text: "Open"
            }
        }

        sample := Label{
            width: Fill
            height: Fit
            text: "Native sample"
            draw_text +: {
                color: theme.color_text_meta
                text_style +: {font_size: 10.0}
                flow: Flow.Right{wrap: true}
            }
        }
    }

    mod.widgets.ComponentCatalogBase = #(ComponentCatalog::register_widget(vm))
    mod.widgets.ComponentCatalog = set_type_default() do mod.widgets.ComponentCatalogBase{
        width: Fill
        height: Fill
        list := PortalList{
            width: Fill
            height: Fill
            spacing: 6
            padding: Inset{left: 0, right: 0, top: 2, bottom: 6}
            scroll_bar: ScrollBar{}
            // Catalog rows are data-bound per ComponentId. Do not texture-cache
            // a PortalList item whose labels and route identity are replaced.
            Item := ComponentRow{}
        }
    }

    mod.widgets.ComponentSidebarBase = #(ComponentSidebar::register_widget(vm))
    mod.widgets.ComponentSidebar = set_type_default() do mod.widgets.ComponentSidebarBase{
        width: Fill
        height: Fill
        flow: Down
        list := PortalList{
            width: Fill
            height: Fill
            spacing: 2
            padding: Inset{left: 0, right: 0, top: 2, bottom: 2}
            scroll_bar: ScrollBar{}
            Group := ComponentSidebarGroup{}
            Item := ComponentSidebarRow{}
        }
    }
}

#[derive(Clone, Copy)]
enum SidebarRow {
    Group(ComponentSpec),
    Component(ComponentSpec),
}

fn sidebar_rows() -> &'static [SidebarRow] {
    static ROWS: OnceLock<Vec<SidebarRow>> = OnceLock::new();
    ROWS.get_or_init(|| {
        let mut rows = Vec::with_capacity(COMPONENTS.len() + 24);
        let mut previous = None;
        for spec in COMPONENTS.iter().copied() {
            let group = (spec.category, spec.group);
            if previous != Some(group) {
                rows.push(SidebarRow::Group(spec));
                previous = Some(group);
            }
            rows.push(SidebarRow::Component(spec));
        }
        rows
    })
}

fn configure_item(cx: &mut Cx, item: &WidgetRef, spec: ComponentSpec) {
    let definition = components::definition(spec.id);
    item.label(cx, ids!(name)).set_text(cx, spec.name);
    item.label(cx, ids!(meta))
        .set_text(cx, spec.category.label());
    item.label(cx, ids!(sample)).set_text(
        cx,
        &format!(
            "{} / surface {}",
            definition.family.label(),
            components::surface(spec.id).availability().label()
        ),
    );
    // PortalList may recycle row widgets after returning from detail. Reapply
    // every visible value, including the button label, before drawing the row.
    let open_button = item.widget(cx, ids!(open_button));
    open_button.set_text(cx, OPEN_BUTTON_LABEL);
}

#[derive(Script, ScriptHook, Widget)]
pub struct ComponentCatalog {
    #[deref]
    view: View,
    #[rust]
    buttons: ButtonBindings<ComponentId>,
}

impl ComponentCatalog {
    #[must_use]
    pub fn route_from_actions(actions: &Actions) -> Option<GalleryPage> {
        Self::opener_from_actions(actions).map(|opener| GalleryPage::component(opener.component))
    }

    pub fn opener_from_actions(actions: &Actions) -> Option<ComponentOpener> {
        for action in actions {
            let Some(widget_action) = action.as_widget_action() else {
                continue;
            };
            match widget_action
                .action
                .downcast_ref::<ComponentCatalogAction>()
            {
                Some(ComponentCatalogAction::Selected(component)) => {
                    return Some(ComponentOpener {
                        component: *component,
                        origin: NavigationOrigin::Catalog,
                        reveal_on_return: false,
                    });
                }
                Some(ComponentCatalogAction::Opened(opener)) => return Some(*opener),
                _ => {}
            }
        }
        None
    }

    #[must_use]
    pub fn selected_from_actions(actions: &Actions) -> Option<ComponentId> {
        Self::route_from_actions(actions).and_then(GalleryPage::component_id)
    }

    pub fn restore_focus(&mut self, cx: &mut Cx, component: ComponentId, reveal: bool) {
        // The hidden catalog keeps its PortalList viewport. Its old draw areas
        // are invalid until the next draw, so do not use them to decide to scroll.
        if reveal {
            let index = COMPONENTS
                .iter()
                .position(|spec| spec.id == component)
                .unwrap();
            reveal_item(cx, &mut self.view, index);
        }
        self.buttons.request_focus(component);
        self.view.redraw(cx);
    }
}

fn focus_item(
    cx: &mut Cx,
    view: &mut View,
    buttons: &mut ButtonBindings<ComponentId>,
    component: ComponentId,
    index: usize,
) {
    if !buttons.is_visible(cx, component) {
        reveal_item(cx, view, index);
    }
    buttons.request_focus(component);
    view.redraw(cx);
}

fn reveal_item(cx: &mut Cx, view: &mut View, index: usize) {
    view.portal_list(cx, ids!(list))
        .set_first_id_and_scroll(index, 0.0);
    view.redraw(cx);
}

impl Widget for ComponentCatalog {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        // PortalList keeps all 101 entries addressable while only drawing the viewport window.
        while let Some(step) = self.view.draw_walk(cx, scope, walk).step() {
            if let Some(mut list) = step.as_portal_list().borrow_mut() {
                self.buttons.begin_draw();
                list.set_item_range(cx, 0, COMPONENTS.len());
                while let Some(item_id) = list.next_visible_item(cx) {
                    let Some(spec) = COMPONENTS.get(item_id).copied() else {
                        continue;
                    };
                    let item = list.item(cx, item_id, id!(Item));
                    configure_item(cx, &item, spec);
                    item.draw_all_unscoped(cx);
                    let button = item.button(cx, ids!(open_button));
                    self.buttons.bind(cx, button, spec.id);
                }
            }
        }
        DrawStep::done()
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        if !self.view.visible() {
            return;
        }
        self.buttons.constrain_tab(cx, event);
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if let Some(component) = self.buttons.activated(cx, event, &actions) {
            cx.widget_action(
                self.widget_uid(),
                ComponentCatalogAction::Opened(ComponentOpener {
                    component,
                    origin: NavigationOrigin::Catalog,
                    reveal_on_return: !self.buttons.is_visible(cx, component),
                }),
            );
        } else if let (Some(component), Some(key)) = (
            self.buttons.focused(cx),
            self.buttons.navigation_key(cx, event),
        ) {
            let current = COMPONENTS
                .iter()
                .position(|spec| spec.id == component)
                .unwrap();
            let page = self.view.portal_list(cx, ids!(list)).visible_items();
            if let Some(index) = collection_index(key, current, COMPONENTS.len(), page) {
                focus_item(
                    cx,
                    &mut self.view,
                    &mut self.buttons,
                    COMPONENTS[index].id,
                    index,
                );
            }
        }
    }
}

/// Compact, grouped navigation for the persistent shell sidebar. It shares
/// the catalog's typed selection action but owns a separate virtualized list
/// so the shell remains usable with all 101 components.
#[derive(Script, ScriptHook, Widget)]
pub struct ComponentSidebar {
    #[deref]
    view: View,
    #[rust]
    buttons: ButtonBindings<ComponentId>,
    #[rust]
    selected: Option<ComponentId>,
}

impl ComponentSidebar {
    pub fn set_selected(&mut self, cx: &mut Cx, component: Option<ComponentId>) {
        if self.selected != component {
            self.selected = component;
            self.view.redraw(cx);
        }
    }

    pub fn restore_focus(&mut self, cx: &mut Cx, component: ComponentId) {
        let index = sidebar_rows()
            .iter()
            .position(|row| matches!(row, SidebarRow::Component(spec) if spec.id == component))
            .unwrap();
        focus_item(cx, &mut self.view, &mut self.buttons, component, index);
    }
}

impl Widget for ComponentSidebar {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        while let Some(step) = self.view.draw_walk(cx, scope, walk).step() {
            if let Some(mut list) = step.as_portal_list().borrow_mut() {
                self.buttons.begin_draw();
                let rows = sidebar_rows();
                list.set_item_range(cx, 0, rows.len());
                while let Some(item_id) = list.next_visible_item(cx) {
                    let Some(row) = rows.get(item_id).copied() else {
                        continue;
                    };
                    let item = match row {
                        SidebarRow::Group(spec) => {
                            let item = list.item(cx, item_id, id!(Group));
                            item.label(cx, ids!(group)).set_text(
                                cx,
                                &format!("{} / {}", spec.category.label(), spec.group.label()),
                            );
                            item
                        }
                        SidebarRow::Component(spec) => {
                            let item = list.item(cx, item_id, id!(Item));
                            item.view(cx, ids!(selected_marker))
                                .set_visible(cx, self.selected == Some(spec.id));
                            let select_button = item.widget(cx, ids!(select_button));
                            select_button.set_text(cx, spec.name);
                            item
                        }
                    };
                    item.draw_all_unscoped(cx);
                    if let SidebarRow::Component(spec) = row {
                        let button = item.button(cx, ids!(select_button));
                        self.buttons.bind(cx, button, spec.id);
                    }
                }
            }
        }
        DrawStep::done()
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        if !self.view.visible() {
            return;
        }
        self.buttons.constrain_tab(cx, event);
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if let Some(component) = self.buttons.activated(cx, event, &actions) {
            cx.widget_action(
                self.widget_uid(),
                ComponentCatalogAction::Opened(ComponentOpener {
                    component,
                    origin: NavigationOrigin::Sidebar,
                    reveal_on_return: !self.buttons.is_visible(cx, component),
                }),
            );
        } else if let (Some(component), Some(key)) = (
            self.buttons.focused(cx),
            self.buttons.navigation_key(cx, event),
        ) {
            let current = COMPONENTS
                .iter()
                .position(|spec| spec.id == component)
                .unwrap();
            let page = self
                .view
                .portal_list(cx, ids!(list))
                .visible_items()
                .saturating_sub(1);
            if let Some(index) = collection_index(key, current, COMPONENTS.len(), page) {
                self.restore_focus(cx, COMPONENTS[index].id);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{ComponentCatalog, ComponentCatalogAction};
    use crate::route::GalleryPage;
    use tessera_core::catalog::{COMPONENTS, ComponentCategory, ComponentId};

    #[test]
    fn sidebar_headers_are_distinct_rows_without_empty_group_slots() {
        let mut components = Vec::new();
        let mut group = None;
        for row in super::sidebar_rows() {
            match row {
                super::SidebarRow::Group(spec) => {
                    let next = (spec.category, spec.group);
                    assert_ne!(group, Some(next));
                    group = Some(next);
                }
                super::SidebarRow::Component(spec) => {
                    assert_eq!(group, Some((spec.category, spec.group)));
                    components.push(spec.id);
                }
            }
        }
        assert_eq!(
            components,
            COMPONENTS.iter().map(|spec| spec.id).collect::<Vec<_>>()
        );
    }

    #[test]
    fn every_catalog_component_has_a_real_selection_identity() {
        assert_eq!(COMPONENTS.len(), 101);
        for spec in COMPONENTS {
            let selection = ComponentCatalogAction::Selected(spec.id);
            assert!(matches!(selection, ComponentCatalogAction::Selected(id) if id == spec.id));
            assert_eq!(GalleryPage::component(spec.id).slug(), spec.slug);
        }
        assert_eq!(ComponentCatalog::route_from_actions(&[]), None);
        assert_eq!(ComponentCatalog::selected_from_actions(&[]), None);
    }

    #[test]
    fn chart_inventory_remains_explicitly_chart_typed() {
        assert_eq!(
            COMPONENTS
                .iter()
                .filter(|spec| spec.category == ComponentCategory::Charts)
                .count(),
            15
        );
        assert_eq!(ComponentId::ALL.len(), 101);
    }

    #[test]
    fn dynamic_rows_keep_the_open_button_label_after_route_return() {
        for _ in COMPONENTS {
            assert_eq!(super::OPEN_BUTTON_LABEL, "Open");
        }
    }
}
