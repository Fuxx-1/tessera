use crate::foundation::input::{ButtonActivationExt, focused_navigation_key, set_button_enabled};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

const ROWS_PER_PAGE: usize = 2;

fn row_widget_ids() -> [&'static [LiveId]; 4] {
    [
        ids!(table_row_one),
        ids!(table_row_two),
        ids!(table_row_three),
        ids!(table_row_four),
    ]
}

pub struct TableSurfaceCatalog;

impl TableSurfaceCatalog {
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Table => Some("TesseraTable"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TableFixture {
    pub title: &'static str,
    pub columns: [&'static str; 3],
    pub rows: [[&'static str; 3]; 4],
}

impl TableFixture {
    pub const DEFAULT: Self = Self {
        title: "Release inventory",
        columns: ["ID", "Component", "Status"],
        rows: [
            ["T-01", "Makepad runtime", "ready"],
            ["T-02", "Gallery route smoke", "blocked"],
            ["T-03", "AX / IME", "blocked"],
            ["T-04", "Release manifest", "blocked"],
        ],
    };
}

impl Default for TableFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct TableState {
    pub selected: usize,
    pub page: usize,
    pub dense: bool,
    pub reloads: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TableEvent {
    Select(usize),
    PreviousPage,
    NextPage,
    ToggleDensity,
    Reload,
    Reset,
}

impl TableState {
    fn page_count() -> usize {
        2
    }

    fn visible_range(self) -> std::ops::Range<usize> {
        let start = self.page * ROWS_PER_PAGE;
        let end = (start + ROWS_PER_PAGE).min(4);
        start..end
    }

    pub fn reduce(&mut self, event: TableEvent) {
        match event {
            TableEvent::Select(index) => {
                self.selected = index.min(3);
                self.page = self.selected / ROWS_PER_PAGE;
            }
            TableEvent::PreviousPage => {
                if self.page > 0 {
                    self.page -= 1;
                    self.selected = self.page * ROWS_PER_PAGE;
                }
            }
            TableEvent::NextPage => {
                if self.page + 1 < Self::page_count() {
                    self.page += 1;
                    self.selected = self.page * ROWS_PER_PAGE;
                }
            }
            TableEvent::ToggleDensity => self.dense = !self.dense,
            TableEvent::Reload => self.reloads = self.reloads.saturating_add(1),
            TableEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum TableAction {
    Selected {
        row: usize,
    },
    PageChanged {
        page: usize,
    },
    DensityChanged {
        dense: bool,
    },
    Reloaded {
        reloads: u32,
    },
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraTableRow = View{
        width: Fill height: 36 flow: Overlay
        row_select := Button{width: Fill height: Fill text: "Select row"
            draw_text +: {get_color: fn() {return vec4(0.0)}}
        }
        row_cells := View{width: Fill height: Fill flow: Right spacing: 6
            padding: Inset{left: 8, right: 8} align: Align{y: 0.5}
            row_id := Label{width: 76 height: Fit padding: 0 text: ""}
            row_component := Label{width: Fill height: Fit padding: 0 text: ""}
            row_status := Label{width: 92 height: Fit padding: 0 text: ""}
        }
    }
    mod.widgets.TesseraTableBase = #(TesseraTable::register_widget(vm))
    mod.widgets.TesseraTable = set_type_default() do mod.widgets.TesseraTableBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        table_title := Label{width: Fill height: Fit text: "Release inventory" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        table_header := View{width: Fill height: 26 flow: Right spacing: 6
            padding: Inset{left: 8, right: 8} align: Align{y: 0.5}
            table_column_one := Label{width: 76 height: Fit padding: 0 text: "ID" draw_text +: {color: theme.color_text_meta}}
            table_column_two := Label{width: Fill height: Fit padding: 0 text: "Component" draw_text +: {color: theme.color_text_meta}}
            table_column_three := Label{width: 92 height: Fit padding: 0 text: "Status" draw_text +: {color: theme.color_text_meta}}
        }
        table_rows := View{width: Fill height: Fit flow: Down spacing: 3
            table_row_one := mod.widgets.TesseraTableRow{}
            table_row_two := mod.widgets.TesseraTableRow{}
            table_row_three := mod.widgets.TesseraTableRow{}
            table_row_four := mod.widgets.TesseraTableRow{}
        }
        table_controls := View{width: Fill height: 30 flow: Right spacing: 6
            table_previous := Button{width: Fit height: 30 text: "Previous page"}
            table_next := Button{width: Fit height: 30 text: "Next page"}
            table_reload := Button{width: Fit height: 30 text: "Reload"}
            table_density := Button{width: Fit height: 30 text: "Dense"}
        }
        table_status := Label{width: Fill height: Fit text: "Table status" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraTable {
    #[deref]
    view: View,
    #[rust]
    fixture: TableFixture,
    #[rust]
    state: TableState,
    #[rust]
    pending_row_focus: bool,
}

impl TesseraTable {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = TableFixture::DEFAULT;
        self.state = TableState::default();
        self.pending_row_focus = false;
        self.sync(cx);
    }

    fn apply_event(&mut self, cx: &mut Cx, event: TableEvent) {
        self.state.reduce(event);
        self.pending_row_focus = matches!(event, TableEvent::Select(_));
        self.sync(cx);
        let action = match event {
            TableEvent::Select(_) => TableAction::Selected {
                row: self.state.selected,
            },
            TableEvent::PreviousPage | TableEvent::NextPage => TableAction::PageChanged {
                page: self.state.page,
            },
            TableEvent::ToggleDensity => TableAction::DensityChanged {
                dense: self.state.dense,
            },
            TableEvent::Reload => TableAction::Reloaded {
                reloads: self.state.reloads,
            },
            TableEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(table_title))
            .set_text(cx, self.fixture.title);
        self.view
            .label(cx, ids!(table_column_one))
            .set_text(cx, self.fixture.columns[0]);
        self.view
            .label(cx, ids!(table_column_two))
            .set_text(cx, self.fixture.columns[1]);
        self.view
            .label(cx, ids!(table_column_three))
            .set_text(cx, self.fixture.columns[2]);
        let visible_range = self.state.visible_range();
        for (index, id) in row_widget_ids().into_iter().enumerate() {
            let row = self.fixture.rows[index];
            let selected = index == self.state.selected;
            let prefix = if selected { "> " } else { "  " };
            let widget = self.view.widget(cx, id);
            widget
                .label(cx, ids!(row_id))
                .set_text(cx, &format!("{prefix}{}", row[0]));
            widget.label(cx, ids!(row_component)).set_text(cx, row[1]);
            widget.label(cx, ids!(row_status)).set_text(cx, row[2]);
            widget
                .button(cx, ids!(row_select))
                .set_text(cx, &format!("{} / {} / {}", row[0], row[1], row[2]));
            widget.set_visible(cx, visible_range.contains(&index));
            if let Some(mut view) = widget.borrow_mut::<View>() {
                view.walk.height = Size::Fixed(if self.state.dense { 28.0 } else { 36.0 });
            }
        }
        set_button_enabled(
            &self.view.button(cx, ids!(table_previous)),
            cx,
            self.state.page > 0,
        );
        set_button_enabled(
            &self.view.button(cx, ids!(table_next)),
            cx,
            self.state.page + 1 < TableState::page_count(),
        );
        self.view.button(cx, ids!(table_density)).set_text(
            cx,
            if self.state.dense {
                "Comfortable"
            } else {
                "Dense"
            },
        );
        self.view.label(cx, ids!(table_status)).set_text(
            cx,
            &format!(
                "Page {} / {} / selected row {} / reloads {} / {}",
                self.state.page + 1,
                TableState::page_count(),
                self.state.selected + 1,
                self.state.reloads,
                if self.state.dense {
                    "dense"
                } else {
                    "comfortable"
                }
            ),
        );
        self.view.redraw(cx);
    }
}

impl Widget for TesseraTable {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        let step = self.view.draw_walk(cx, scope, walk);
        if step.is_done() && self.pending_row_focus {
            self.pending_row_focus = false;
            let area = self
                .view
                .widget(cx, row_widget_ids()[self.state.selected])
                .button(cx, ids!(row_select))
                .area();
            cx.set_key_focus(area);
        }
        step
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        let mut focused_row = None;
        for index in self.state.visible_range() {
            let button = self
                .view
                .widget(cx, row_widget_ids()[index])
                .button(cx, ids!(row_select));
            if button.key_focus(cx) {
                focused_row = Some(index);
            }
            if button.activated(cx, event, &actions) {
                self.apply_event(cx, TableEvent::Select(index));
                return;
            }
        }
        for (id, command) in [
            (ids!(table_previous), TableEvent::PreviousPage),
            (ids!(table_next), TableEvent::NextPage),
            (ids!(table_reload), TableEvent::Reload),
            (ids!(table_density), TableEvent::ToggleDensity),
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
                KeyCode::ArrowUp => TableEvent::Select(self.state.selected.saturating_sub(1)),
                KeyCode::ArrowDown => TableEvent::Select((self.state.selected + 1).min(3)),
                KeyCode::ArrowLeft | KeyCode::PageUp => TableEvent::PreviousPage,
                KeyCode::ArrowRight | KeyCode::PageDown => TableEvent::NextPage,
                KeyCode::Home => TableEvent::Select(0),
                KeyCode::End => TableEvent::Select(3),
                _ => return,
            };
            self.apply_event(cx, navigation);
            self.pending_row_focus = true;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{TableEvent, TableState, TableSurfaceCatalog};
    use tessera_core::catalog::ComponentId;

    #[test]
    fn table_routes_to_the_native_table_widget() {
        assert_eq!(
            TableSurfaceCatalog::widget_name(ComponentId::Table),
            Some("TesseraTable")
        );
    }

    #[test]
    fn table_keeps_selection_and_paging_bounded() {
        let mut state = TableState::default();
        state.reduce(TableEvent::Select(99));
        assert_eq!(state.selected, 3);
        assert_eq!(state.page, 1);
        state.reduce(TableEvent::PreviousPage);
        assert_eq!(state.page, 0);
        state.reduce(TableEvent::ToggleDensity);
        assert!(state.dense);
        state.reduce(TableEvent::Reload);
        assert_eq!(state.reloads, 1);
        state.reduce(TableEvent::Reset);
        assert_eq!(state, TableState::default());
    }
}
