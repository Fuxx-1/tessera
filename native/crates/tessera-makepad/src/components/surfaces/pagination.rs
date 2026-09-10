use crate::foundation::input::{ButtonActivationExt, focused_navigation_key, set_button_enabled};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

const PAGE_BUTTONS: [&[LiveId]; 3] = [
    ids!(pagination_page_one),
    ids!(pagination_page_two),
    ids!(pagination_page_three),
];

pub struct PaginationSurfaceCatalog;
impl PaginationSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Pagination => Some("TesseraPagination"),
            _ => None,
        }
    }
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct PaginationFixture {
    pub total: u32,
}
impl PaginationFixture {
    pub const DEFAULT: Self = Self { total: 8 };
}
impl Default for PaginationFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct PaginationState {
    pub page: u32,
}

impl Default for PaginationState {
    fn default() -> Self {
        Self { page: 1 }
    }
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PaginationEvent {
    GoTo(u32),
    First,
    Previous,
    Next,
    Last,
    Reset,
}
impl PaginationState {
    pub fn reduce(&mut self, event: PaginationEvent, total: u32) {
        let last = total.max(1);
        self.page = self.page.clamp(1, last);
        self.page = match event {
            PaginationEvent::First | PaginationEvent::Reset => 1,
            PaginationEvent::Previous => self.page.saturating_sub(1).max(1),
            PaginationEvent::Next => self.page.saturating_add(1).min(last),
            PaginationEvent::Last => last,
            PaginationEvent::GoTo(page) => page.clamp(1, last),
        };
    }

    fn visible_pages(self, total: u32) -> [Option<u32>; 3] {
        let start = self
            .page
            .saturating_sub(1)
            .clamp(1, total.saturating_sub(2).max(1));
        std::array::from_fn(|index| {
            start
                .checked_add(index as u32)
                .filter(|page| *page <= total)
        })
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum PaginationAction {
    PageChanged {
        page: u32,
    },
    Reset,
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraPaginationBase = #(TesseraPagination::register_widget(vm))
    mod.widgets.TesseraPagination = set_type_default() do mod.widgets.TesseraPaginationBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        pagination_title := Label{width: Fill height: Fit text: "Pagination"}
        pagination_status := Label{width: Fill height: Fit text: "Page 1 of 8"}
        pagination_navigation := View{width: Fill height: Fit flow: Flow.Right{wrap: true} spacing: 6
            pagination_first := Button{width: Fit height: 30 text: "First"}
            pagination_previous := Button{width: Fit height: 30 text: "Previous"}
            pagination_pages := View{width: Fit height: 30 flow: Right spacing: 4
                pagination_page_one := Button{width: 32 height: 30 text: "1"}
                pagination_page_two := Button{width: 32 height: 30 text: "2"}
                pagination_page_three := Button{width: 32 height: 30 text: "3"}
                pagination_ellipsis := Label{width: 20 height: Fit text: "..."}
                pagination_page_last := Button{width: 32 height: 30 text: "8"}
            }
            pagination_next := Button{width: Fit height: 30 text: "Next"}
            pagination_last := Button{width: Fit height: 30 text: "Last"}
        }
        pagination_edges := Label{width: Fill height: Fit text: "At first page: previous boundary"}
        pagination_reset := Button{width: Fit height: 30 text: "Reset pages"}
    }
}
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraPagination {
    #[deref]
    view: View,
    #[rust]
    fixture: PaginationFixture,
    #[rust]
    state: PaginationState,
}
impl TesseraPagination {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = PaginationFixture::DEFAULT;
        self.state = PaginationState::default();
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: PaginationEvent) {
        let previous = self.state.page;
        self.state.reduce(event, self.fixture.total);
        if previous == self.state.page && event != PaginationEvent::Reset {
            return;
        }
        self.sync(cx);
        let action = match event {
            PaginationEvent::Reset => PaginationAction::Reset,
            _ => PaginationAction::PageChanged {
                page: self.state.page,
            },
        };
        cx.widget_action(self.widget_uid(), action);
    }
    fn sync(&mut self, cx: &mut Cx) {
        let total = self.fixture.total;
        let page = self.state.page;
        self.view.label(cx, ids!(pagination_status)).set_text(
            cx,
            &format!("Page {} of {}", if total == 0 { 0 } else { page }, total),
        );
        let pages = self.state.visible_pages(total);
        for (id, number) in PAGE_BUTTONS.into_iter().zip(pages) {
            let button = self.view.button(cx, id);
            button.set_visible(cx, number.is_some());
            if let Some(number) = number {
                button.set_text(cx, &number.to_string());
                set_button_enabled(&button, cx, number != page);
            }
        }
        let show_last = pages[2].is_some_and(|number| number < total);
        let last = self.view.button(cx, ids!(pagination_page_last));
        last.set_visible(cx, show_last);
        last.set_text(cx, &total.to_string());
        set_button_enabled(&last, cx, show_last && page < total);
        self.view.label(cx, ids!(pagination_ellipsis)).set_visible(
            cx,
            pages[2].is_some_and(|number| total.saturating_sub(number) > 1),
        );
        for id in [ids!(pagination_first), ids!(pagination_previous)] {
            set_button_enabled(&self.view.button(cx, id), cx, total > 0 && page > 1);
        }
        for id in [ids!(pagination_next), ids!(pagination_last)] {
            set_button_enabled(&self.view.button(cx, id), cx, page < total);
        }
        self.view.label(cx, ids!(pagination_edges)).set_text(
            cx,
            if total == 0 {
                "No pages"
            } else if total == 1 {
                "Only one page"
            } else if page == 1 {
                "At first page: previous boundary"
            } else if page == total {
                "At last page: next boundary"
            } else {
                "Previous and next pages available"
            },
        );
        self.view.redraw(cx);
    }
}
impl Widget for TesseraPagination {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        let buttons: [(&[LiveId], PaginationEvent); 6] = [
            (ids!(pagination_first), PaginationEvent::First),
            (ids!(pagination_previous), PaginationEvent::Previous),
            (ids!(pagination_next), PaginationEvent::Next),
            (ids!(pagination_last), PaginationEvent::Last),
            (ids!(pagination_page_last), PaginationEvent::Last),
            (ids!(pagination_reset), PaginationEvent::Reset),
        ];
        let requested = buttons
            .into_iter()
            .chain(
                PAGE_BUTTONS
                    .into_iter()
                    .zip(self.state.visible_pages(self.fixture.total))
                    .filter_map(|(id, page)| page.map(|page| (id, PaginationEvent::GoTo(page)))),
            )
            .find_map(|(id, intent)| {
                let button = self.view.button(cx, id);
                button.activated(cx, event, &actions).then_some(intent)
            });
        let focused = [
            ids!(pagination_first),
            ids!(pagination_previous),
            ids!(pagination_next),
            ids!(pagination_last),
            ids!(pagination_page_last),
            ids!(pagination_reset),
            PAGE_BUTTONS[0],
            PAGE_BUTTONS[1],
            PAGE_BUTTONS[2],
        ]
        .into_iter()
        .any(|id| self.view.button(cx, id).key_focus(cx));
        let navigation = focused_navigation_key(event, focused).and_then(|key| match key {
            KeyCode::ArrowLeft => Some(PaginationEvent::Previous),
            KeyCode::ArrowRight => Some(PaginationEvent::Next),
            KeyCode::Home => Some(PaginationEvent::First),
            KeyCode::End => Some(PaginationEvent::Last),
            _ => None,
        });
        if let Some(intent) = requested.or(navigation) {
            self.apply_event(cx, intent);
        }
    }
}
#[cfg(test)]
mod tests {
    use super::{PaginationEvent, PaginationState, PaginationSurfaceCatalog};
    use tessera_core::catalog::ComponentId;
    #[test]
    fn pagination_stays_within_bounds() {
        assert_eq!(
            PaginationSurfaceCatalog::widget_name(ComponentId::Pagination),
            Some("TesseraPagination")
        );
        let mut state = PaginationState::default();
        state.reduce(PaginationEvent::Last, 3);
        state.reduce(PaginationEvent::Next, 3);
        assert_eq!(state.page, 3);
        state.reduce(PaginationEvent::First, 3);
        assert_eq!(state.page, 1);
    }

    #[test]
    fn numbered_pages_select_the_requested_page_not_the_next_page() {
        let mut state = PaginationState::default();
        for page in [3, 2, 2, 8, 1] {
            state.reduce(PaginationEvent::GoTo(page), 8);
            assert_eq!(state.page, page);
        }
    }

    #[test]
    fn page_window_contains_the_current_page_without_overflow() {
        for (page, total, expected) in [
            (1, 0, [None, None, None]),
            (1, 1, [Some(1), None, None]),
            (1, 8, [Some(1), Some(2), Some(3)]),
            (4, 8, [Some(3), Some(4), Some(5)]),
            (8, 8, [Some(6), Some(7), Some(8)]),
            (
                u32::MAX,
                u32::MAX,
                [Some(u32::MAX - 2), Some(u32::MAX - 1), Some(u32::MAX)],
            ),
        ] {
            assert_eq!(PaginationState { page }.visible_pages(total), expected);
        }
        let mut state = PaginationState { page: u32::MAX };
        state.reduce(PaginationEvent::Next, u32::MAX);
        assert_eq!(state.page, u32::MAX);
        state.reduce(PaginationEvent::GoTo(0), 0);
        assert_eq!(state.page, 1);
        state.reduce(PaginationEvent::GoTo(100), 4);
        assert_eq!(state.page, 4);
    }

    #[test]
    fn native_page_controls_follow_current_page_and_boundaries() {
        use super::*;
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let mut widget = cx.with_vm(|vm| {
            crate::script_mod(vm, tessera_core::ThemeMode::Light);
            let value = script_eval!(vm, { mod.widgets.TesseraPagination });
            TesseraPagination::script_from_value(vm, value)
        });
        widget.reset(&mut cx);
        assert!(
            !widget
                .view
                .button(&cx, ids!(pagination_first))
                .borrow()
                .unwrap()
                .enabled()
        );
        assert!(
            !widget
                .view
                .button(&cx, ids!(pagination_page_one))
                .borrow()
                .unwrap()
                .enabled()
        );
        widget.apply_event(&mut cx, PaginationEvent::GoTo(3));
        assert_eq!(widget.state.page, 3);
        assert_eq!(
            widget.view.button(&cx, ids!(pagination_page_one)).text(),
            "2"
        );
        assert_eq!(
            widget.view.button(&cx, ids!(pagination_page_two)).text(),
            "3"
        );
        assert!(
            !widget
                .view
                .button(&cx, ids!(pagination_page_two))
                .borrow()
                .unwrap()
                .enabled()
        );
        widget.apply_event(&mut cx, PaginationEvent::Last);
        assert!(
            !widget
                .view
                .button(&cx, ids!(pagination_next))
                .borrow()
                .unwrap()
                .enabled()
        );
        assert!(
            !widget
                .view
                .button(&cx, ids!(pagination_last))
                .borrow()
                .unwrap()
                .enabled()
        );
    }
}
