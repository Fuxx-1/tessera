use crate::foundation::input::{ButtonActivationExt, focused_navigation_key, set_button_enabled};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

fn day_widget_ids() -> [&'static [LiveId]; 42] {
    [
        ids!(calendar_day_01),
        ids!(calendar_day_02),
        ids!(calendar_day_03),
        ids!(calendar_day_04),
        ids!(calendar_day_05),
        ids!(calendar_day_06),
        ids!(calendar_day_07),
        ids!(calendar_day_08),
        ids!(calendar_day_09),
        ids!(calendar_day_10),
        ids!(calendar_day_11),
        ids!(calendar_day_12),
        ids!(calendar_day_13),
        ids!(calendar_day_14),
        ids!(calendar_day_15),
        ids!(calendar_day_16),
        ids!(calendar_day_17),
        ids!(calendar_day_18),
        ids!(calendar_day_19),
        ids!(calendar_day_20),
        ids!(calendar_day_21),
        ids!(calendar_day_22),
        ids!(calendar_day_23),
        ids!(calendar_day_24),
        ids!(calendar_day_25),
        ids!(calendar_day_26),
        ids!(calendar_day_27),
        ids!(calendar_day_28),
        ids!(calendar_day_29),
        ids!(calendar_day_30),
        ids!(calendar_day_31),
        ids!(calendar_day_32),
        ids!(calendar_day_33),
        ids!(calendar_day_34),
        ids!(calendar_day_35),
        ids!(calendar_day_36),
        ids!(calendar_day_37),
        ids!(calendar_day_38),
        ids!(calendar_day_39),
        ids!(calendar_day_40),
        ids!(calendar_day_41),
        ids!(calendar_day_42),
    ]
}

pub struct CalendarSurfaceCatalog;
impl CalendarSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Calendar => Some("TesseraCalendar"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CalendarFixture {
    pub month: &'static str,
    pub weekdays: [&'static str; 7],
}
impl CalendarFixture {
    pub const DEFAULT: Self = Self {
        month: "September 2026",
        weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    };
}
impl Default for CalendarFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct CalendarCell {
    day: u8,
    in_month: bool,
}

fn month_year(offset: i8) -> (i32, u8) {
    let absolute = 2026_i32 * 12 + 8 + i32::from(offset);
    let year = absolute.div_euclid(12);
    let month = (absolute.rem_euclid(12) + 1) as u8;
    (year, month)
}

fn days_in_month(year: i32, month: u8) -> u8 {
    match month {
        2 if year % 4 == 0 && (year % 100 != 0 || year % 400 == 0) => 29,
        2 => 28,
        4 | 6 | 9 | 11 => 30,
        _ => 31,
    }
}

fn first_weekday(offset: i8) -> u8 {
    let mut weekday = 1_i32;
    let mut cursor = 0_i8;
    while cursor < offset {
        let (year, month) = month_year(cursor);
        weekday = (weekday + i32::from(days_in_month(year, month))).rem_euclid(7);
        cursor += 1;
    }
    while cursor > offset {
        cursor -= 1;
        let (year, month) = month_year(cursor);
        weekday = (weekday - i32::from(days_in_month(year, month))).rem_euclid(7);
    }
    weekday as u8
}

fn month_label(offset: i8) -> String {
    const MONTHS: [&str; 12] = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];
    let (year, month) = month_year(offset);
    format!("{} {}", MONTHS[usize::from(month - 1)], year)
}

fn is_today(offset: i8, day: u8) -> bool {
    month_year(offset) == (2026, 8) && day == 29
}

fn month_cell(offset: i8, index: usize) -> CalendarCell {
    let (year, month) = month_year(offset);
    let days = days_in_month(year, month);
    let start = usize::from(first_weekday(offset));
    let position = index as isize - start as isize + 1;
    if position < 1 {
        let (previous_year, previous_month) = month_year(offset.saturating_sub(1));
        let previous_days = days_in_month(previous_year, previous_month);
        CalendarCell {
            day: (i32::from(previous_days) + position as i32) as u8,
            in_month: false,
        }
    } else if position > isize::from(days) {
        CalendarCell {
            day: (position - isize::from(days)) as u8,
            in_month: false,
        }
    } else {
        CalendarCell {
            day: position as u8,
            in_month: true,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CalendarState {
    pub month_offset: i8,
    pub selected_day: u8,
}

impl Default for CalendarState {
    fn default() -> Self {
        Self {
            month_offset: 0,
            selected_day: 1,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CalendarEvent {
    PreviousMonth,
    NextMonth,
    SelectDay(u8),
    SelectDisabled(u8),
    MoveByDays(i8),
    Reset,
}

impl CalendarState {
    fn change_month(&mut self, delta: i8) {
        self.month_offset = self.month_offset.saturating_add(delta);
        let (year, month) = month_year(self.month_offset);
        self.selected_day = self.selected_day.max(1).min(days_in_month(year, month));
    }

    fn move_by_days(&mut self, delta: i8) {
        for _ in 0..delta.unsigned_abs() {
            let (year, month) = month_year(self.month_offset);
            let days = days_in_month(year, month);
            if delta.is_negative() {
                if self.selected_day > 1 {
                    self.selected_day -= 1;
                } else if self.month_offset != i8::MIN {
                    self.month_offset -= 1;
                    let (previous_year, previous_month) = month_year(self.month_offset);
                    self.selected_day = days_in_month(previous_year, previous_month);
                }
            } else if self.selected_day < days {
                self.selected_day += 1;
            } else if self.month_offset != i8::MAX {
                self.month_offset += 1;
                self.selected_day = 1;
            }
        }
    }

    pub fn reduce(&mut self, event: CalendarEvent) {
        match event {
            CalendarEvent::PreviousMonth => self.change_month(-1),
            CalendarEvent::NextMonth => self.change_month(1),
            CalendarEvent::SelectDay(day) => {
                let (year, month) = month_year(self.month_offset);
                self.selected_day = day.clamp(1, days_in_month(year, month));
            }
            CalendarEvent::SelectDisabled(_) => {}
            CalendarEvent::MoveByDays(delta) => self.move_by_days(delta),
            CalendarEvent::Reset => *self = Self::default(),
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum CalendarAction {
    MonthChanged {
        offset: i8,
    },
    DaySelected {
        day: u8,
    },
    DisabledSelection {
        day: u8,
    },
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraCalendarBase = #(TesseraCalendar::register_widget(vm))
    mod.widgets.TesseraCalendar = set_type_default() do mod.widgets.TesseraCalendarBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        calendar_header := View{width: Fill height: 32 flow: Right spacing: 6 align: Align{y: 0.5}
            calendar_prev := Button{width: 30 height: 28 text: "<"}
            calendar_month := Label{width: Fill height: Fit text: "September 2026" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
            calendar_next := Button{width: 30 height: 28 text: ">"}
        }
        calendar_weekdays := View{width: Fill height: 24 flow: Right spacing: 6
            weekday_one := Label{width: Fill height: Fit text: "Mon"}
            weekday_two := Label{width: Fill height: Fit text: "Tue"}
            weekday_three := Label{width: Fill height: Fit text: "Wed"}
            weekday_four := Label{width: Fill height: Fit text: "Thu"}
            weekday_five := Label{width: Fill height: Fit text: "Fri"}
            weekday_six := Label{width: Fill height: Fit text: "Sat"}
            weekday_seven := Label{width: Fill height: Fit text: "Sun"}
        }
        calendar_days := View{width: Fill height: 189 flow: Down spacing: 6
            calendar_week_one := View{width: Fill height: Fill flow: Right spacing: 6 calendar_day_01 := Button{width: Fill height: Fill text: "1"} calendar_day_02 := Button{width: Fill height: Fill text: "2"} calendar_day_03 := Button{width: Fill height: Fill text: "3"} calendar_day_04 := Button{width: Fill height: Fill text: "4"} calendar_day_05 := Button{width: Fill height: Fill text: "5"} calendar_day_06 := Button{width: Fill height: Fill text: "6"} calendar_day_07 := Button{width: Fill height: Fill text: "7"}}
            calendar_week_two := View{width: Fill height: Fill flow: Right spacing: 6 calendar_day_08 := Button{width: Fill height: Fill text: "8"} calendar_day_09 := Button{width: Fill height: Fill text: "9"} calendar_day_10 := Button{width: Fill height: Fill text: "10"} calendar_day_11 := Button{width: Fill height: Fill text: "11"} calendar_day_12 := Button{width: Fill height: Fill text: "12"} calendar_day_13 := Button{width: Fill height: Fill text: "13"} calendar_day_14 := Button{width: Fill height: Fill text: "14"}}
            calendar_week_three := View{width: Fill height: Fill flow: Right spacing: 6 calendar_day_15 := Button{width: Fill height: Fill text: "15"} calendar_day_16 := Button{width: Fill height: Fill text: "16"} calendar_day_17 := Button{width: Fill height: Fill text: "17"} calendar_day_18 := Button{width: Fill height: Fill text: "18"} calendar_day_19 := Button{width: Fill height: Fill text: "19"} calendar_day_20 := Button{width: Fill height: Fill text: "20"} calendar_day_21 := Button{width: Fill height: Fill text: "21"}}
            calendar_week_four := View{width: Fill height: Fill flow: Right spacing: 6 calendar_day_22 := Button{width: Fill height: Fill text: "22"} calendar_day_23 := Button{width: Fill height: Fill text: "23"} calendar_day_24 := Button{width: Fill height: Fill text: "24"} calendar_day_25 := Button{width: Fill height: Fill text: "25"} calendar_day_26 := Button{width: Fill height: Fill text: "26"} calendar_day_27 := Button{width: Fill height: Fill text: "27"} calendar_day_28 := Button{width: Fill height: Fill text: "28"}}
            calendar_week_five := View{width: Fill height: Fill flow: Right spacing: 6 calendar_day_29 := Button{width: Fill height: Fill text: "29"} calendar_day_30 := Button{width: Fill height: Fill text: "30"} calendar_day_31 := Button{width: Fill height: Fill text: "31"} calendar_day_32 := Button{width: Fill height: Fill enabled: false text: "32"} calendar_day_33 := Button{width: Fill height: Fill enabled: false text: "33"} calendar_day_34 := Button{width: Fill height: Fill enabled: false text: "34"} calendar_day_35 := Button{width: Fill height: Fill enabled: false text: "35"}}
            calendar_week_six := View{width: Fill height: Fill flow: Right spacing: 6 calendar_day_36 := Button{width: Fill height: Fill enabled: false text: "36"} calendar_day_37 := Button{width: Fill height: Fill enabled: false text: "37"} calendar_day_38 := Button{width: Fill height: Fill enabled: false text: "38"} calendar_day_39 := Button{width: Fill height: Fill enabled: false text: "39"} calendar_day_40 := Button{width: Fill height: Fill enabled: false text: "40"} calendar_day_41 := Button{width: Fill height: Fill enabled: false text: "41"} calendar_day_42 := Button{width: Fill height: Fill enabled: false text: "42"}}
        }
        calendar_status := Label{width: Fill height: Fit text: "Selected day 1" draw_text.flow: Flow.Right{wrap: true}}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraCalendar {
    #[deref]
    view: View,
    #[rust]
    fixture: CalendarFixture,
    #[rust]
    state: CalendarState,
    #[rust]
    pending_day_focus: bool,
}
impl TesseraCalendar {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = CalendarFixture::DEFAULT;
        self.state = CalendarState::default();
        self.pending_day_focus = false;
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: CalendarEvent) {
        self.state.reduce(event);
        self.pending_day_focus = matches!(
            event,
            CalendarEvent::SelectDay(_) | CalendarEvent::MoveByDays(_)
        );
        self.sync(cx);
        let action = match event {
            CalendarEvent::PreviousMonth | CalendarEvent::NextMonth => {
                CalendarAction::MonthChanged {
                    offset: self.state.month_offset,
                }
            }
            CalendarEvent::SelectDay(_) | CalendarEvent::MoveByDays(_) => {
                CalendarAction::DaySelected {
                    day: self.state.selected_day,
                }
            }
            CalendarEvent::SelectDisabled(day) => CalendarAction::DisabledSelection { day },
            CalendarEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }
    fn sync(&mut self, cx: &mut Cx) {
        let current_month = month_label(self.state.month_offset);
        self.view
            .label(cx, ids!(calendar_month))
            .set_text(cx, &current_month);
        self.view.label(cx, ids!(calendar_status)).set_text(
            cx,
            &format!(
                "Selected day {} / month offset {} / 42-cell grid",
                self.state.selected_day.max(1),
                self.state.month_offset
            ),
        );
        for (index, id) in day_widget_ids().into_iter().enumerate() {
            let cell = month_cell(self.state.month_offset, index);
            let label = if cell.in_month && self.state.selected_day == cell.day {
                format!("*{}", cell.day)
            } else if cell.in_month && is_today(self.state.month_offset, cell.day) {
                format!("today {}", cell.day)
            } else {
                cell.day.to_string()
            };
            self.view.button(cx, id).set_text(cx, &label);
            set_button_enabled(&self.view.button(cx, id), cx, cell.in_month);
        }
        self.view.redraw(cx);
    }
}
impl Widget for TesseraCalendar {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        let step = self.view.draw_walk(cx, scope, walk);
        if step.is_done() && self.pending_day_focus {
            self.pending_day_focus = false;
            let index =
                usize::from(first_weekday(self.state.month_offset) + self.state.selected_day - 1);
            let area = self.view.button(cx, day_widget_ids()[index]).area();
            cx.set_key_focus(area);
        }
        step
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        let previous = self.view.button(cx, ids!(calendar_prev));
        let next = self.view.button(cx, ids!(calendar_next));
        if previous.activated(cx, event, &actions) {
            self.apply_event(cx, CalendarEvent::PreviousMonth);
        } else if next.activated(cx, event, &actions) {
            self.apply_event(cx, CalendarEvent::NextMonth);
        } else {
            let mut focused_day = None;
            for (index, id) in day_widget_ids().into_iter().enumerate() {
                let cell = month_cell(self.state.month_offset, index);
                let button = self.view.button(cx, id);
                if cell.in_month && button.key_focus(cx) {
                    focused_day = Some(cell.day);
                }
                if button.activated(cx, event, &actions) {
                    self.apply_event(
                        cx,
                        if cell.in_month {
                            CalendarEvent::SelectDay(cell.day)
                        } else {
                            CalendarEvent::SelectDisabled(cell.day)
                        },
                    );
                    return;
                }
            }
            if let Some(key) = focused_navigation_key(event, focused_day.is_some()) {
                self.state.selected_day = focused_day.unwrap();
                let navigation = match key {
                    KeyCode::ArrowLeft => CalendarEvent::MoveByDays(-1),
                    KeyCode::ArrowRight => CalendarEvent::MoveByDays(1),
                    KeyCode::ArrowUp => CalendarEvent::MoveByDays(-7),
                    KeyCode::ArrowDown => CalendarEvent::MoveByDays(7),
                    KeyCode::Home => CalendarEvent::SelectDay(1),
                    KeyCode::End => {
                        let (year, month) = month_year(self.state.month_offset);
                        CalendarEvent::SelectDay(days_in_month(year, month))
                    }
                    KeyCode::PageUp => CalendarEvent::PreviousMonth,
                    KeyCode::PageDown => CalendarEvent::NextMonth,
                    _ => return,
                };
                self.apply_event(cx, navigation);
                self.pending_day_focus = true;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{CalendarEvent, CalendarState, CalendarSurfaceCatalog, days_in_month, month_cell};
    use tessera_core::catalog::ComponentId;
    #[test]
    fn calendar_selects_days_and_bounds_month_navigation() {
        assert_eq!(
            CalendarSurfaceCatalog::widget_name(ComponentId::Calendar),
            Some("TesseraCalendar")
        );
        let mut state = CalendarState::default();
        assert_eq!(state.selected_day, 1);
        state.reduce(CalendarEvent::SelectDay(99));
        state.reduce(CalendarEvent::PreviousMonth);
        assert_eq!(state.selected_day, 30);
        assert_eq!(state.month_offset, -1);
        state.reduce(CalendarEvent::Reset);
        assert_eq!(state, CalendarState::default());
    }

    #[test]
    fn calendar_moves_across_month_edges_and_keeps_a_complete_grid() {
        let mut state = CalendarState::default();
        state.reduce(CalendarEvent::MoveByDays(-1));
        assert_eq!((state.month_offset, state.selected_day), (-1, 31));
        state.reduce(CalendarEvent::MoveByDays(30));
        assert_eq!((state.month_offset, state.selected_day), (0, 30));
        state.reduce(CalendarEvent::MoveByDays(1));
        assert_eq!((state.month_offset, state.selected_day), (1, 1));
        assert_eq!(days_in_month(2028, 2), 29);
        assert_eq!(
            (0..42)
                .filter(|index| month_cell(0, *index).in_month)
                .count(),
            30
        );
    }
}
