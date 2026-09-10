use crate::foundation::input::ButtonActivationExt;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct MenuSurfaceCatalog;
impl MenuSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Menu => Some("TesseraMenu"),
            _ => None,
        }
    }
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct MenuFixture {
    pub title: &'static str,
    pub items: [&'static str; 4],
}
impl MenuFixture {
    pub const DEFAULT: Self = Self {
        title: "Workspace menu",
        items: ["Overview", "Members", "Settings", "Archive"],
    };
}
impl Default for MenuFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct MenuState {
    pub selected: usize,
    pub expanded: bool,
    pub focus_index: usize,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MenuEvent {
    Select(usize),
    Toggle,
    Move(isize),
    Close,
    Reset,
}
impl MenuState {
    pub fn reduce(&mut self, event: MenuEvent) {
        match event {
            MenuEvent::Select(index) => {
                self.selected = index.min(3);
                self.focus_index = self.selected;
                self.expanded = false;
            }
            MenuEvent::Toggle => {
                self.expanded = !self.expanded;
                if self.expanded {
                    self.focus_index = self.selected;
                }
            }
            MenuEvent::Move(delta) if self.expanded => {
                self.focus_index = (self.focus_index as isize + delta).clamp(0, 3) as usize;
            }
            MenuEvent::Close => self.expanded = false,
            MenuEvent::Reset => *self = Self::default(),
            MenuEvent::Move(_) => {}
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum MenuAction {
    Selected {
        index: usize,
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
    mod.widgets.TesseraMenuBase = #(TesseraMenu::register_widget(vm))
    mod.widgets.TesseraMenu = set_type_default() do mod.widgets.TesseraMenuBase{
        width: Fill height: Fit flow: Down spacing: 6 padding: Inset{left: 12, right: 12, top: 10, bottom: 10}
        show_bg: true draw_bg +: {color: theme.color_fg_app border_radius: 4.0 border_size: 1.0 border_color: theme.color_bevel}
        menu_title := Label{width: Fill height: Fit text: "Workspace menu" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        menu_toggle := Button{width: Fit height: 30 text: "Collapse menu"}
        menu_items := View{width: Fill height: Fit flow: Down spacing: 3
            menu_item_one := Button{width: Fill height: 30 text: "Overview"}
            menu_item_two := Button{width: Fill height: 30 text: "Members"}
            menu_item_three := Button{width: Fill height: 30 text: "Settings"}
            menu_item_four := Button{width: Fill height: 30 text: "Archive"}
        }
        menu_status := Label{width: Fill height: Fit text: "Overview selected"}
    }
}
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraMenu {
    #[deref]
    view: View,
    #[rust]
    fixture: MenuFixture,
    #[rust]
    state: MenuState,
}
impl TesseraMenu {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = MenuFixture::DEFAULT;
        self.state = MenuState::default();
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: MenuEvent) {
        self.state.reduce(event);
        self.sync(cx);
        match event {
            MenuEvent::Toggle if self.state.expanded => {
                self.focus_current_item(cx);
            }
            MenuEvent::Toggle | MenuEvent::Select(_) | MenuEvent::Close => {
                self.view.widget(cx, ids!(menu_toggle)).set_key_focus(cx);
            }
            MenuEvent::Move(_) | MenuEvent::Reset => {}
        }
        let action = match event {
            MenuEvent::Select(_) => Some(MenuAction::Selected {
                index: self.state.selected,
            }),
            MenuEvent::Toggle | MenuEvent::Close => Some(MenuAction::Expanded {
                expanded: self.state.expanded,
            }),
            MenuEvent::Move(_) | MenuEvent::Reset => None,
        };
        if let Some(action) = action {
            cx.widget_action(self.widget_uid(), action);
        }
    }

    fn focus_current_item(&self, cx: &mut Cx) {
        let item_ids = [
            ids!(menu_item_one),
            ids!(menu_item_two),
            ids!(menu_item_three),
            ids!(menu_item_four),
        ];
        self.view
            .widget(cx, item_ids[self.state.focus_index])
            .set_key_focus(cx);
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(menu_title))
            .set_text(cx, self.fixture.title);
        self.view.button(cx, ids!(menu_toggle)).set_text(
            cx,
            if self.state.expanded {
                "Collapse menu"
            } else {
                "Expand menu"
            },
        );
        self.view
            .view(cx, ids!(menu_items))
            .set_visible(cx, self.state.expanded);
        let item_ids = [
            ids!(menu_item_one),
            ids!(menu_item_two),
            ids!(menu_item_three),
            ids!(menu_item_four),
        ];
        for (index, id) in item_ids.into_iter().enumerate() {
            let prefix = if index == self.state.focus_index {
                "> "
            } else {
                "  "
            };
            let selected = if index == self.state.selected {
                " *"
            } else {
                ""
            };
            self.view.button(cx, id).set_text(
                cx,
                &format!("{prefix}{}{}", self.fixture.items[index], selected),
            );
        }
        self.view.label(cx, ids!(menu_status)).set_text(
            cx,
            &format!(
                "{} selected / focus {} / menu {}",
                self.fixture.items[self.state.selected],
                self.state.focus_index + 1,
                if self.state.expanded {
                    "open"
                } else {
                    "closed"
                }
            ),
        );
        self.view.redraw(cx);
    }
}
impl Widget for TesseraMenu {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(menu_toggle))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, MenuEvent::Toggle);
        } else if self
            .view
            .button(cx, ids!(menu_item_one))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, MenuEvent::Select(0));
        } else if self
            .view
            .button(cx, ids!(menu_item_two))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, MenuEvent::Select(1));
        } else if self
            .view
            .button(cx, ids!(menu_item_three))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, MenuEvent::Select(2));
        } else if self
            .view
            .button(cx, ids!(menu_item_four))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, MenuEvent::Select(3));
        } else if let Event::KeyDown(key) = event {
            match key.key_code {
                KeyCode::ArrowUp if self.state.expanded => {
                    self.apply_event(cx, MenuEvent::Move(-1));
                }
                KeyCode::ArrowDown if self.state.expanded => {
                    self.apply_event(cx, MenuEvent::Move(1));
                }
                KeyCode::Home if self.state.expanded => {
                    self.apply_event(cx, MenuEvent::Move(-3));
                }
                KeyCode::End if self.state.expanded => {
                    self.apply_event(cx, MenuEvent::Move(3));
                }
                KeyCode::ReturnKey | KeyCode::NumpadEnter | KeyCode::Space
                    if self.state.expanded =>
                {
                    self.apply_event(cx, MenuEvent::Select(self.state.focus_index));
                }
                KeyCode::Escape if self.state.expanded => {
                    self.apply_event(cx, MenuEvent::Close);
                }
                _ => {}
            }
        }
    }
}
#[cfg(test)]
mod tests {
    use super::{MenuEvent, MenuState, MenuSurfaceCatalog};
    use tessera_core::catalog::ComponentId;
    #[test]
    fn menu_selects_items_and_closes_expansion() {
        assert_eq!(
            MenuSurfaceCatalog::widget_name(ComponentId::Menu),
            Some("TesseraMenu")
        );
        let mut state = MenuState::default();
        state.reduce(MenuEvent::Toggle);
        state.reduce(MenuEvent::Move(3));
        state.reduce(MenuEvent::Select(99));
        assert_eq!(state.selected, 3);
        assert_eq!(state.focus_index, 3);
        assert!(!state.expanded);
    }
}
