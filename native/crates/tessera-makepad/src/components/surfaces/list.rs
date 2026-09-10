use crate::foundation::input::{ButtonActivationExt, focused_navigation_key};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

const ROW_COUNT: usize = 8;
const VISIBLE_ROWS: usize = 5;

fn row_widget_ids() -> [&'static [LiveId]; ROW_COUNT] {
    [
        ids!(list_row_one),
        ids!(list_row_two),
        ids!(list_row_three),
        ids!(list_row_four),
        ids!(list_row_five),
        ids!(list_row_six),
        ids!(list_row_seven),
        ids!(list_row_eight),
    ]
}

pub struct ListSurfaceCatalog;
impl ListSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::List => Some("TesseraList"),
            _ => None,
        }
    }
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ListFixture {
    pub title: &'static str,
    pub row_ids: [u32; 8],
    pub rows: [&'static str; 8],
}
impl ListFixture {
    pub const DEFAULT: Self = Self {
        title: "Recent checks",
        row_ids: [101, 102, 103, 104, 105, 106, 107, 108],
        rows: [
            "Build passed",
            "Unit tests passed",
            "Review requested",
            "Release blocked",
            "Artifacts hashed",
            "AX probe blocked",
            "IME probe blocked",
            "Manifest remains blocked",
        ],
    };
}
impl Default for ListFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum ListStatus {
    #[default]
    Ready,
    Loading,
    Empty,
    Error,
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct ListState {
    pub status: ListStatus,
    pub selected: usize,
    pub window_start: usize,
    pub reloads: u32,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ListEvent {
    Select(usize),
    Move(isize),
    Reload,
    ShowLoading,
    ShowEmpty,
    ShowError,
    Retry,
    Reset,
}
impl ListState {
    pub fn reduce(&mut self, event: ListEvent) {
        match event {
            ListEvent::Select(index) if self.status == ListStatus::Ready => {
                self.selected = index.min(ROW_COUNT - 1);
                self.ensure_visible();
            }
            ListEvent::Select(_) => {}
            ListEvent::Move(delta) if self.status == ListStatus::Ready => {
                self.move_selection(delta)
            }
            ListEvent::Move(_) => {}
            ListEvent::Reload | ListEvent::ShowLoading => {
                self.reloads = self.reloads.saturating_add(1);
                self.status = ListStatus::Loading;
            }
            ListEvent::ShowEmpty => self.status = ListStatus::Empty,
            ListEvent::ShowError => self.status = ListStatus::Error,
            ListEvent::Retry => self.status = ListStatus::Ready,
            ListEvent::Reset => *self = Self::default(),
        }
    }

    fn ensure_visible(&mut self) {
        if self.selected < self.window_start {
            self.window_start = self.selected;
        } else if self.selected >= self.window_start + VISIBLE_ROWS {
            self.window_start = self
                .selected
                .saturating_sub(VISIBLE_ROWS - 1)
                .min(ROW_COUNT - VISIBLE_ROWS);
        }
    }

    fn move_selection(&mut self, delta: isize) {
        let next = (self.selected as isize + delta).clamp(0, (ROW_COUNT - 1) as isize) as usize;
        self.selected = next;
        self.ensure_visible();
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum ListAction {
    Selected {
        index: usize,
    },
    Reloaded {
        count: u32,
    },
    StatusChanged {
        status: ListStatus,
    },
    Retried,
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraListBase = #(TesseraList::register_widget(vm))
    mod.widgets.TesseraList = set_type_default() do mod.widgets.TesseraListBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        list_title := Label{width: Fill height: Fit text: "Recent checks" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        list_rows := View{width: Fill height: Fit flow: Down spacing: 3
            list_row_one := Button{width: Fill height: 30 text: "Build passed"}
            list_row_two := Button{width: Fill height: 30 text: "Unit tests passed"}
            list_row_three := Button{width: Fill height: 30 text: "Review requested"}
            list_row_four := Button{width: Fill height: 30 text: "Release blocked"}
            list_row_five := Button{width: Fill height: 30 text: "Artifacts hashed"}
            list_row_six := Button{width: Fill height: 30 text: "AX probe blocked"}
            list_row_seven := Button{width: Fill height: 30 text: "IME probe blocked"}
            list_row_eight := Button{width: Fill height: 30 text: "Manifest remains blocked"}
        }
        list_reload := Button{width: Fit height: 30 text: "Reload list"}
        list_retry := Button{width: Fit height: 30 visible: false text: "Retry loading"}
        list_empty := Button{width: Fit height: 30 text: "Show empty"}
        list_error := Button{width: Fit height: 30 text: "Show error"}
        list_status := Label{width: Fill height: Fit text: "Selected row 1"}
    }
}
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraList {
    #[deref]
    view: View,
    #[rust]
    fixture: ListFixture,
    #[rust]
    state: ListState,
    #[rust]
    pending_row_focus: bool,
}
impl TesseraList {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = ListFixture::DEFAULT;
        self.state = ListState::default();
        self.pending_row_focus = false;
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: ListEvent) {
        self.state.reduce(event);
        self.pending_row_focus = self.state.status == ListStatus::Ready
            && matches!(event, ListEvent::Select(_) | ListEvent::Move(_));
        self.sync(cx);
        let action = match event {
            ListEvent::Select(_) | ListEvent::Move(_) => ListAction::Selected {
                index: self.state.selected,
            },
            ListEvent::Reload => ListAction::Reloaded {
                count: self.state.reloads,
            },
            ListEvent::ShowLoading => ListAction::StatusChanged {
                status: self.state.status,
            },
            ListEvent::ShowEmpty => ListAction::StatusChanged {
                status: self.state.status,
            },
            ListEvent::ShowError => ListAction::StatusChanged {
                status: self.state.status,
            },
            ListEvent::Retry => ListAction::Retried,
            ListEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(list_title))
            .set_text(cx, self.fixture.title);
        let status = match self.state.status {
            ListStatus::Ready => format!(
                "Selected item {} / visible rows {}..{} / reloads {}",
                self.fixture.row_ids[self.state.selected],
                self.state.window_start + 1,
                (self.state.window_start + VISIBLE_ROWS).min(self.fixture.rows.len()),
                self.state.reloads
            ),
            ListStatus::Loading => format!("Loading bounded rows / reloads {}", self.state.reloads),
            ListStatus::Empty => String::from("No rows available"),
            ListStatus::Error => String::from("List failed to load; retry is available"),
        };
        self.view.label(cx, ids!(list_status)).set_text(cx, &status);
        for (index, id) in row_widget_ids().into_iter().enumerate() {
            let visible = self.state.status == ListStatus::Ready
                && index >= self.state.window_start
                && index < (self.state.window_start + VISIBLE_ROWS).min(self.fixture.rows.len());
            let label = if index == self.state.selected {
                format!(
                    "> {}  [{}]",
                    self.fixture.rows[index], self.fixture.row_ids[index]
                )
            } else {
                format!(
                    "  {}  [{}]",
                    self.fixture.rows[index], self.fixture.row_ids[index]
                )
            };
            self.view.button(cx, id).set_text(cx, &label);
            self.view.widget(cx, id).set_visible(cx, visible);
        }
        let reload_label = format!("Reload list ({})", self.state.reloads);
        self.view
            .button(cx, ids!(list_reload))
            .set_text(cx, &reload_label);
        self.view.button(cx, ids!(list_retry)).set_visible(
            cx,
            matches!(self.state.status, ListStatus::Loading | ListStatus::Error),
        );
        self.view.redraw(cx);
    }
}
impl Widget for TesseraList {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        let step = self.view.draw_walk(cx, scope, walk);
        // Newly visible rows need a current area before focus can move to them.
        if step.is_done() && self.pending_row_focus {
            self.pending_row_focus = false;
            let area = self
                .view
                .button(cx, row_widget_ids()[self.state.selected])
                .area();
            cx.set_key_focus(area);
        }
        step
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        let mut focused_row = None;
        if self.state.status == ListStatus::Ready {
            for index in
                self.state.window_start..(self.state.window_start + VISIBLE_ROWS).min(ROW_COUNT)
            {
                let button = self.view.button(cx, row_widget_ids()[index]);
                if button.key_focus(cx) {
                    focused_row = Some(index);
                }
                if button.activated(cx, event, &actions) {
                    self.apply_event(cx, ListEvent::Select(index));
                    return;
                }
            }
        }
        for (id, command) in [
            (ids!(list_reload), ListEvent::Reload),
            (ids!(list_retry), ListEvent::Retry),
            (ids!(list_empty), ListEvent::ShowEmpty),
            (ids!(list_error), ListEvent::ShowError),
        ] {
            let button = self.view.button(cx, id);
            if button.activated(cx, event, &actions) {
                self.apply_event(cx, command);
                return;
            }
        }
        if let Some(key) = focused_navigation_key(event, focused_row.is_some()) {
            self.state.selected = focused_row.unwrap();
            let navigation = match key {
                KeyCode::ArrowUp => ListEvent::Move(-1),
                KeyCode::ArrowDown => ListEvent::Move(1),
                KeyCode::PageUp => ListEvent::Move(-(VISIBLE_ROWS as isize)),
                KeyCode::PageDown => ListEvent::Move(VISIBLE_ROWS as isize),
                KeyCode::Home => ListEvent::Select(0),
                KeyCode::End => ListEvent::Select(ROW_COUNT - 1),
                _ => return,
            };
            self.apply_event(cx, navigation);
        }
    }
}
#[cfg(test)]
mod tests {
    use super::{ListEvent, ListState, ListSurfaceCatalog};
    use tessera_core::catalog::ComponentId;
    #[test]
    fn list_selects_bounded_rows_and_reloads() {
        assert_eq!(
            ListSurfaceCatalog::widget_name(ComponentId::List),
            Some("TesseraList")
        );
        let mut state = ListState::default();
        state.reduce(ListEvent::Select(99));
        state.reduce(ListEvent::Move(-1));
        state.reduce(ListEvent::Reload);
        assert_eq!(state.selected, 6);
        assert_eq!(state.window_start, 3);
        assert_eq!(state.reloads, 1);
    }
}
