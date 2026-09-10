//! Native Makepad layout surfaces with one exact widget per catalog route.
//!
//! These widgets intentionally keep their fixtures and state machines local:
//! Gallery detail routes mount one concrete layout primitive rather than a
//! generic preview that switches behavior from a component enum.

use crate::foundation::focus::constrain_tab_group;
use crate::foundation::focus_trace;
use crate::foundation::input::{ButtonActivationExt, focused_navigation_key};
use crate::foundation::navigation::collection_index;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

/// Exact route-to-widget discovery for the first native layout batch.
pub struct LayoutSurfaceCatalog;

impl LayoutSurfaceCatalog {
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Affix => Some("TesseraAffix"),
            ComponentId::Anchor => Some("TesseraAnchor"),
            ComponentId::Card => Some("TesseraCard"),
            ComponentId::Flex => Some("TesseraFlex"),
            ComponentId::Grid => Some("TesseraGrid"),
            ComponentId::Layout => Some("TesseraLayout"),
            _ => None,
        }
    }

    #[must_use]
    pub const fn contains(id: ComponentId) -> bool {
        Self::widget_name(id).is_some()
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct AffixFixture {
    pub title: &'static str,
    pub pinned_label: &'static str,
    pub unpinned_label: &'static str,
}

impl AffixFixture {
    pub const DEFAULT: Self = Self {
        title: "Publish controls",
        pinned_label: "Affixed to viewport edge",
        unpinned_label: "In document flow",
    };
}

impl Default for AffixFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct AffixState {
    pub pinned: bool,
    pub changes: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AffixEvent {
    Toggle,
    Reset,
}

impl AffixState {
    pub fn reduce(&mut self, event: AffixEvent) {
        match event {
            AffixEvent::Toggle => {
                self.pinned = !self.pinned;
                self.changes = self.changes.saturating_add(1);
            }
            AffixEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum AffixAction {
    Changed {
        pinned: bool,
        changes: u32,
    },
    #[default]
    None,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct AnchorFixture {
    pub title: &'static str,
    pub sections: [&'static str; 3],
}

impl AnchorFixture {
    pub const DEFAULT: Self = Self {
        title: "On this page",
        sections: ["Overview", "Configuration", "Review"],
    };
}

impl Default for AnchorFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct AnchorState {
    pub selected: u8,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AnchorEvent {
    Next,
    Select(usize),
    Reset,
}

impl AnchorState {
    pub fn reduce(&mut self, event: AnchorEvent) {
        match event {
            AnchorEvent::Next => self.selected = (self.selected + 1) % 3,
            AnchorEvent::Select(index) => self.selected = index.min(2) as u8,
            AnchorEvent::Reset => *self = Self::default(),
        }
    }
}

const ANCHOR_SECTION_HEIGHT: f64 = 180.0;

fn anchor_ids() -> [&'static [LiveId]; 3] {
    [ids!(anchor_first), ids!(anchor_second), ids!(anchor_third)]
}

fn anchor_target_ids() -> [&'static [LiveId]; 3] {
    [
        ids!(anchor_target_one),
        ids!(anchor_target_two),
        ids!(anchor_target_three),
    ]
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum AnchorAction {
    Selected {
        index: u8,
    },
    #[default]
    None,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CardFixture {
    pub title: &'static str,
    pub summary: &'static str,
    pub detail: &'static str,
    pub footer: &'static str,
}

impl CardFixture {
    pub const DEFAULT: Self = Self {
        title: "Release checklist",
        summary: "One pending approval is blocking the release.",
        detail: "The owner, target revision, and verification record remain visible together.",
        footer: "Last updated by release control",
    };
}

impl Default for CardFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct CardState {
    pub expanded: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CardEvent {
    ToggleDetails,
    Reset,
}

impl CardState {
    pub fn reduce(&mut self, event: CardEvent) {
        match event {
            CardEvent::ToggleDetails => self.expanded = !self.expanded,
            CardEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum CardAction {
    DetailsToggled {
        expanded: bool,
    },
    #[default]
    None,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct FlexFixture {
    pub title: &'static str,
    pub primary: &'static str,
    pub secondary: &'static str,
}

impl FlexFixture {
    pub const DEFAULT: Self = Self {
        title: "Flexible action row",
        primary: "Primary action",
        secondary: "Secondary action",
    };
}

impl Default for FlexFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct FlexState {
    pub reversed: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum FlexEvent {
    Reverse,
    Reset,
}

impl FlexState {
    pub fn reduce(&mut self, event: FlexEvent) {
        match event {
            FlexEvent::Reverse => self.reversed = !self.reversed,
            FlexEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum FlexAction {
    DirectionChanged {
        reversed: bool,
    },
    #[default]
    None,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct GridFixture {
    pub title: &'static str,
    pub cells: [&'static str; 4],
}

impl GridFixture {
    pub const DEFAULT: Self = Self {
        title: "Two-column grid",
        cells: ["Build", "Test", "Review", "Release"],
    };
}

impl Default for GridFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct GridState {
    pub compact: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum GridEvent {
    ToggleDensity,
    Reset,
}

impl GridState {
    pub fn reduce(&mut self, event: GridEvent) {
        match event {
            GridEvent::ToggleDensity => self.compact = !self.compact,
            GridEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum GridAction {
    DensityChanged {
        compact: bool,
    },
    #[default]
    None,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct LayoutFixture {
    pub title: &'static str,
    pub header: &'static str,
    pub sidebar: &'static str,
    pub content: &'static str,
}

impl LayoutFixture {
    pub const DEFAULT: Self = Self {
        title: "Application layout",
        header: "Workspace header",
        sidebar: "Navigation",
        content: "Main content region",
    };
}

impl Default for LayoutFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct LayoutState {
    pub sidebar_visible: bool,
}

impl Default for LayoutState {
    fn default() -> Self {
        Self {
            sidebar_visible: true,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LayoutEvent {
    ToggleSidebar,
    Reset,
}

impl LayoutState {
    pub fn reduce(&mut self, event: LayoutEvent) {
        match event {
            LayoutEvent::ToggleSidebar => self.sidebar_visible = !self.sidebar_visible,
            LayoutEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum LayoutAction {
    SidebarChanged {
        visible: bool,
    },
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*

    mod.widgets.AffixRegionBase = #(AffixRegion::register_widget(vm))
    mod.widgets.AffixRegion = set_type_default() do mod.widgets.AffixRegionBase{
        width: Fill height: 40 flow: Right padding: 10
        show_bg: true
        draw_bg +: {
            color: theme.color_fg_app
            border_color: theme.color_bevel_focus
            draw_depth: 5.0
            pixel: fn() {
                if self.pos.y * self.rect_size.y >= self.rect_size.y - 1.0 {
                    return self.border_color
                }
                return self.color
            }
        }
        Label{width: Fill height: Fit text: "3 checks pending" draw_text +: {color: theme.color_text draw_depth: 6.0}}
    }
    mod.widgets.TesseraAffixBase = #(TesseraAffix::register_widget(vm))
    mod.widgets.TesseraAffix = set_type_default() do mod.widgets.TesseraAffixBase{
        width: Fill
        height: Fit
        flow: Down
        spacing: 6
        padding: Inset{left: 12, right: 12, top: 10, bottom: 10}
        show_bg: true
        draw_bg +: {
            color: theme.color_fg_app
            border_radius: 4.0
            border_size: 1.0
            border_color: theme.color_bevel
        }
        affix_title := Label{
            width: Fill
            height: Fit
            text: "Publish controls"
            draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}
        }
        affix_status := Label{
            width: Fill
            height: Fit
            text: "Affixed to viewport edge"
            draw_text +: {color: theme.color_text_meta}
        }
        affix_toggle := Button{width: 140 height: 30 text: "Toggle affix"}
        affix_document := ScrollYView{
            width: Fill height: 180 flow: Down spacing: 0 padding: 0
            show_bg: true draw_bg +: {color: theme.color_bg_app}
            affix_intro := View{width: Fill height: 40 padding: 8
                Label{width: Fill height: Fit text: "Release queue"}
            }
            affix_placeholder := View{width: Fill height: 40}
            affix_first_section := View{width: Fill height: 160 padding: 8 flow: Down spacing: 8
                Label{width: Fill height: Fit text: "Build validation"}
                Label{width: Fill height: Fit text: "Compile: Complete\nUnit tests: Complete\nNative review: Pending"}
            }
            affix_second_section := View{width: Fill height: 160 padding: 8 flow: Down spacing: 8
                Label{width: Fill height: Fit text: "Release approval"}
                Label{width: Fill height: Fit text: "Owner: Tessera\nReview: Pending\nPublish: Blocked"}
            }
            affix_region := mod.widgets.AffixRegion{}
        }
    }

    mod.widgets.TesseraAnchorBase = #(TesseraAnchor::register_widget(vm))
    mod.widgets.TesseraAnchor = set_type_default() do mod.widgets.TesseraAnchorBase{
        width: Fill
        height: Fit
        flow: Down
        spacing: 5
        padding: Inset{left: 12, right: 12, top: 10, bottom: 10}
        show_bg: true
        draw_bg +: {
            color: theme.color_fg_app
            border_radius: 4.0
            border_size: 1.0
            border_color: theme.color_bevel
        }
        anchor_title := Label{
            width: Fill
            height: Fit
            text: "On this page"
            draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}
        }
        anchor_navigation := View{
            width: Fill height: 30 flow: Right spacing: 6
            anchor_first := Button{width: Fill height: 30 text: "Overview"}
            anchor_second := Button{width: Fill height: 30 text: "Configuration"}
            anchor_third := Button{width: Fill height: 30 text: "Review"}
        }
        anchor_document := ScrollYView{
            width: Fill height: 180 flow: Down spacing: 0 padding: 0
            show_bg: true draw_bg +: {color: theme.color_bg_app}
            anchor_section_one := View{
                width: Fill height: 180 flow: Down spacing: 10 padding: 8
                anchor_target_one := Button{width: Fill height: 30 text: "Overview" align: Align{x: 0.0, y: 0.5}}
                Label{width: Fill height: Fit text: "Workspace: Tessera\nTarget: Native desktop\nRevision: a097101"}
            }
            anchor_section_two := View{
                width: Fill height: 180 flow: Down spacing: 10 padding: 8
                anchor_target_two := Button{width: Fill height: 30 text: "Configuration" align: Align{x: 0.0, y: 0.5}}
                Label{width: Fill height: Fit text: "Theme: System\nDensity: Comfortable\nLocale: English"}
            }
            anchor_section_three := View{
                width: Fill height: 180 flow: Down spacing: 10 padding: 8
                anchor_target_three := Button{width: Fill height: 30 text: "Review" align: Align{x: 0.0, y: 0.5}}
                Label{width: Fill height: Fit text: "Owner: Release control\nApproval: Pending\nEvidence: Not sealed"}
            }
        }
        anchor_next := Button{width: 140 height: 30 text: "Next section"}
    }

    mod.widgets.TesseraCardBase = #(TesseraCard::register_widget(vm))
    mod.widgets.TesseraCard = set_type_default() do mod.widgets.TesseraCardBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        card_header := View{
            width: Fill
            height: Fit
            flow: Right
            spacing: 8
            card_title := Label{
                width: Fill
                height: Fit
                text: "Release checklist"
                draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}
            }
            card_header_status := Label{
                width: Fit
                height: Fit
                text: "Pending"
                draw_text +: {color: theme.color_text_meta}
            }
        }
        card_body := View{
            width: Fill
            height: Fit
            flow: Down
            spacing: 4
            card_summary := Label{
                width: Fill
                height: Fit
                text: "One pending approval is blocking the release."
                draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}
            }
            card_detail := Label{
                width: Fill
                height: Fit
                visible: false
                text: "The owner, target revision, and verification record remain visible together."
                draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}
            }
        }
        card_footer := View{
            width: Fill
            height: 30
            flow: Right
            spacing: 8
            card_footer_note := Label{
                width: Fill
                height: Fit
                text: "Last updated by release control"
                draw_text +: {color: theme.color_text_meta}
            }
            card_toggle := Button{width: Fit height: 30 text: "Show details"}
        }
    }

    mod.widgets.TesseraFlexBase = #(TesseraFlex::register_widget(vm))
    mod.widgets.TesseraFlex = set_type_default() do mod.widgets.TesseraFlexBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        flex_title := Label{
            width: Fill
            height: Fit
            text: "Flexible action row"
            draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}
        }
        flex_items := View{
            width: Fill
            height: 30
            flow: Right
            spacing: 8
            flex_first := Label{
                width: Fit
                height: Fit
                text: "Primary action"
                draw_text +: {color: theme.color_text}
            }
            flex_second := Label{
                width: Fit
                height: Fit
                text: "Secondary action"
                draw_text +: {color: theme.color_text_meta}
            }
        }
        flex_reverse := Button{width: 176 height: 30 text: "Reverse direction"}
    }

    mod.widgets.TesseraGridBase = #(TesseraGrid::register_widget(vm))
    mod.widgets.TesseraGrid = set_type_default() do mod.widgets.TesseraGridBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        grid_title := Label{
            width: Fill
            height: Fit
            text: "Two-column grid"
            draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}
        }
        grid_rows := View{
            width: Fill
            height: Fit
            flow: Down
            spacing: 8
            grid_first_row := View{
                width: Fill height: 36 flow: Right spacing: 8
                grid_tile_one := View{width: Fill height: Fill padding: 6 show_bg: true draw_bg +: {color: theme.color_bg_app}
                    grid_cell_one := Label{width: Fill height: Fit text: "Build"}
                }
                grid_tile_two := View{width: Fill height: Fill padding: 6 show_bg: true draw_bg +: {color: theme.color_bg_app}
                    grid_cell_two := Label{width: Fill height: Fit text: "Test"}
                }
            }
            grid_second_row := View{
                width: Fill height: 36 flow: Right spacing: 8
                grid_tile_three := View{width: Fill height: Fill padding: 6 show_bg: true draw_bg +: {color: theme.color_bg_app}
                    grid_cell_three := Label{width: Fill height: Fit text: "Review"}
                }
                grid_tile_four := View{width: Fill height: Fill padding: 6 show_bg: true draw_bg +: {color: theme.color_bg_app}
                    grid_cell_four := Label{width: Fill height: Fit text: "Release"}
                }
            }
        }
        grid_density := Button{width: 176 height: 30 text: "Use compact grid"}
    }

    mod.widgets.TesseraLayoutBase = #(TesseraLayout::register_widget(vm))
    mod.widgets.TesseraLayout = set_type_default() do mod.widgets.TesseraLayoutBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        layout_title := Label{
            width: Fill
            height: Fit
            text: "Application layout"
            draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}
        }
        layout_header := Label{
            width: Fill
            height: Fit
            text: "Workspace header"
            draw_text +: {color: theme.color_text}
        }
        layout_regions := View{
            width: Fill
            height: 34
            flow: Right
            spacing: 8
            layout_sidebar := Label{
                width: 110
                height: Fit
                text: "Navigation"
                draw_text +: {color: theme.color_text_meta}
            }
            layout_content := Label{
                width: Fill
                height: Fit
                text: "Main content region"
                draw_text +: {color: theme.color_text}
            }
        }
        layout_sidebar_toggle := Button{width: Fit height: 30 text: "Hide navigation"}
    }
}

fn affix_y(document_y: f64, viewport_y: f64, enabled: bool) -> f64 {
    if enabled {
        document_y.max(viewport_y)
    } else {
        document_y
    }
}

#[derive(Script, ScriptHook, Widget)]
struct AffixRegion {
    #[deref]
    view: View,
    #[rust]
    pinned: bool,
}

impl Widget for AffixRegion {
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        self.view.handle_event(cx, event, scope);
        // Parent draw-list clipping is complete between frames, not inside draw_walk.
        focus_trace::record(cx, "affix-region-event", Some(self.view.area()), || {
            format!("pinned={}", self.pinned)
        });
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, mut walk: Walk) -> DrawStep {
        let document = cx.turtle().rect();
        let viewport = cx.turtle().rect_unscrolled();
        // Absolute drawing leaves the normal-flow placeholder and scroll extent intact.
        walk.abs_pos = Some(dvec2(
            document.pos.x,
            affix_y(document.pos.y + 40.0, viewport.pos.y, self.pinned),
        ));
        walk.width = Size::Fixed((viewport.size.x - 12.0).max(0.0));
        self.view.draw_walk(cx, scope, walk)
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraAffix {
    #[deref]
    view: View,
    #[rust]
    fixture: AffixFixture,
    #[rust]
    state: AffixState,
}

impl TesseraAffix {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = AffixFixture::DEFAULT;
        self.state = AffixState::default();
        self.view
            .view(cx, ids!(affix_document))
            .set_scroll_pos(cx, dvec2(0.0, 0.0));
        self.sync(cx);
    }

    fn apply_event(&mut self, cx: &mut Cx, event: AffixEvent) {
        self.state.reduce(event);
        self.sync(cx);
        if matches!(event, AffixEvent::Toggle) {
            cx.widget_action(
                self.widget_uid(),
                AffixAction::Changed {
                    pinned: self.state.pinned,
                    changes: self.state.changes,
                },
            );
        }
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(affix_title))
            .set_text(cx, self.fixture.title);
        self.view.label(cx, ids!(affix_status)).set_text(
            cx,
            if self.state.pinned {
                self.fixture.pinned_label
            } else {
                self.fixture.unpinned_label
            },
        );
        self.view.button(cx, ids!(affix_toggle)).set_text(
            cx,
            if self.state.pinned {
                "Release affix"
            } else {
                "Pin controls"
            },
        );
        self.view.redraw(cx);
    }
}

impl Widget for TesseraAffix {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        if let Some(mut region) = self
            .view
            .widget(cx, ids!(affix_region))
            .borrow_mut::<AffixRegion>()
        {
            region.pinned = self.state.pinned;
        }
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(affix_toggle))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, AffixEvent::Toggle);
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraAnchor {
    #[deref]
    view: View,
    #[rust]
    fixture: AnchorFixture,
    #[rust]
    state: AnchorState,
    #[rust]
    pending_target_focus: bool,
}

impl TesseraAnchor {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = AnchorFixture::DEFAULT;
        self.state = AnchorState::default();
        self.pending_target_focus = false;
        self.view
            .view(cx, ids!(anchor_document))
            .set_scroll_pos(cx, dvec2(0.0, 0.0));
        self.sync(cx);
    }

    fn apply_event(&mut self, cx: &mut Cx, event: AnchorEvent) {
        self.state.reduce(event);
        self.view.view(cx, ids!(anchor_document)).set_scroll_pos(
            cx,
            dvec2(0.0, f64::from(self.state.selected) * ANCHOR_SECTION_HEIGHT),
        );
        self.sync(cx);
        if !matches!(event, AnchorEvent::Reset) {
            cx.widget_action(
                self.widget_uid(),
                AnchorAction::Selected {
                    index: self.state.selected,
                },
            );
        }
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(anchor_title))
            .set_text(cx, self.fixture.title);
        let selected = usize::from(self.state.selected);
        self.view.button(cx, ids!(anchor_first)).set_text(
            cx,
            &format!(
                "{} {}",
                if selected == 0 { ">" } else { " " },
                self.fixture.sections[0]
            ),
        );
        self.view.button(cx, ids!(anchor_second)).set_text(
            cx,
            &format!(
                "{} {}",
                if selected == 1 { ">" } else { " " },
                self.fixture.sections[1]
            ),
        );
        self.view.button(cx, ids!(anchor_third)).set_text(
            cx,
            &format!(
                "{} {}",
                if selected == 2 { ">" } else { " " },
                self.fixture.sections[2]
            ),
        );
        self.view.redraw(cx);
    }
}

impl Widget for TesseraAnchor {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        let step = self.view.draw_walk(cx, scope, walk);
        if step.is_done() {
            let viewport = self.view.view(cx, ids!(anchor_document)).area().rect(cx);
            let first = self.view.view(cx, ids!(anchor_section_one)).area().rect(cx);
            let index = ((viewport.pos.y - first.pos.y + 0.5).max(0.0) / ANCHOR_SECTION_HEIGHT)
                .floor() as usize;
            if index.min(2) != usize::from(self.state.selected) {
                self.state.reduce(AnchorEvent::Select(index));
                self.sync(cx);
            }
            if self.pending_target_focus {
                self.pending_target_focus = false;
                self.view
                    .button(cx, anchor_target_ids()[usize::from(self.state.selected)])
                    .set_key_focus(cx);
            }
        }
        step
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let sections = anchor_ids().map(|id| self.view.button(cx, id));
        constrain_tab_group(
            cx,
            event,
            &[&sections[0], &sections[1], &sections[2]],
            Some(usize::from(self.state.selected)),
        );
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        for (index, button) in sections.iter().enumerate() {
            if button.activated(cx, event, &actions) {
                self.apply_event(cx, AnchorEvent::Select(index));
                self.pending_target_focus = true;
                return;
            }
        }
        if self
            .view
            .button(cx, ids!(anchor_next))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, AnchorEvent::Next);
            self.pending_target_focus = true;
            return;
        }
        if let Some(current) = sections.iter().position(|button| button.key_focus(cx)) {
            if let Some(key) = focused_navigation_key(event, true) {
                if let Some(index) = collection_index(key, current, sections.len(), sections.len())
                {
                    self.apply_event(cx, AnchorEvent::Select(index));
                    sections[index].set_key_focus(cx);
                }
            }
        } else {
            let targets = anchor_target_ids().map(|id| self.view.button(cx, id));
            let focused = targets.iter().any(|button| button.key_focus(cx))
                || self.view.view(cx, ids!(anchor_document)).key_focus(cx);
            if let Some(key) = focused_navigation_key(event, focused) {
                if let Some(index) = collection_index(key, usize::from(self.state.selected), 3, 1) {
                    self.apply_event(cx, AnchorEvent::Select(index));
                    self.pending_target_focus = true;
                }
            }
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraCard {
    #[deref]
    view: View,
    #[rust]
    fixture: CardFixture,
    #[rust]
    state: CardState,
}

impl TesseraCard {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = CardFixture::DEFAULT;
        self.state = CardState::default();
        self.sync(cx);
    }

    fn apply_event(&mut self, cx: &mut Cx, event: CardEvent) {
        self.state.reduce(event);
        self.sync(cx);
        if matches!(event, CardEvent::ToggleDetails) {
            cx.widget_action(
                self.widget_uid(),
                CardAction::DetailsToggled {
                    expanded: self.state.expanded,
                },
            );
        }
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(card_title))
            .set_text(cx, self.fixture.title);
        self.view
            .label(cx, ids!(card_summary))
            .set_text(cx, self.fixture.summary);
        self.view
            .label(cx, ids!(card_detail))
            .set_text(cx, self.fixture.detail);
        self.view
            .label(cx, ids!(card_footer_note))
            .set_text(cx, self.fixture.footer);
        self.view.label(cx, ids!(card_header_status)).set_text(
            cx,
            if self.state.expanded {
                "Reviewed"
            } else {
                "Pending"
            },
        );
        self.view
            .label(cx, ids!(card_detail))
            .set_visible(cx, self.state.expanded);
        self.view.button(cx, ids!(card_toggle)).set_text(
            cx,
            if self.state.expanded {
                "Hide details"
            } else {
                "Show details"
            },
        );
        self.view.redraw(cx);
    }
}

impl Widget for TesseraCard {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(card_toggle))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, CardEvent::ToggleDetails);
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraFlex {
    #[deref]
    view: View,
    #[rust]
    fixture: FlexFixture,
    #[rust]
    state: FlexState,
}

impl TesseraFlex {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = FlexFixture::DEFAULT;
        self.state = FlexState::default();
        self.sync(cx);
    }

    fn apply_event(&mut self, cx: &mut Cx, event: FlexEvent) {
        self.state.reduce(event);
        self.sync(cx);
        if matches!(event, FlexEvent::Reverse) {
            cx.widget_action(
                self.widget_uid(),
                FlexAction::DirectionChanged {
                    reversed: self.state.reversed,
                },
            );
        }
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(flex_title))
            .set_text(cx, self.fixture.title);
        self.view
            .label(cx, ids!(flex_first))
            .set_text(cx, self.fixture.primary);
        self.view
            .label(cx, ids!(flex_second))
            .set_text(cx, self.fixture.secondary);
        self.view.button(cx, ids!(flex_reverse)).set_text(
            cx,
            if self.state.reversed {
                "Use normal direction"
            } else {
                "Reverse direction"
            },
        );
        self.view.redraw(cx);
    }
}

impl Widget for TesseraFlex {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        if let Some(mut row) = self.view.widget(cx, ids!(flex_items)).borrow_mut::<View>() {
            let first = if self.state.reversed {
                id!(flex_second)
            } else {
                id!(flex_first)
            };
            if row.children.first().is_some_and(|(id, _)| *id != first) {
                row.children.reverse();
                cx.widget_tree()
                    .refresh_from_borrowed(row.widget_uid(), |visit| row.children(visit));
            }
        }
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(flex_reverse))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, FlexEvent::Reverse);
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraGrid {
    #[deref]
    view: View,
    #[rust]
    fixture: GridFixture,
    #[rust]
    state: GridState,
}

impl TesseraGrid {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = GridFixture::DEFAULT;
        self.state = GridState::default();
        self.sync(cx);
    }

    fn apply_event(&mut self, cx: &mut Cx, event: GridEvent) {
        self.state.reduce(event);
        self.sync(cx);
        if matches!(event, GridEvent::ToggleDensity) {
            cx.widget_action(
                self.widget_uid(),
                GridAction::DensityChanged {
                    compact: self.state.compact,
                },
            );
        }
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(grid_title))
            .set_text(cx, self.fixture.title);
        self.view
            .label(cx, ids!(grid_cell_one))
            .set_text(cx, self.fixture.cells[0]);
        self.view
            .label(cx, ids!(grid_cell_two))
            .set_text(cx, self.fixture.cells[1]);
        self.view
            .label(cx, ids!(grid_cell_three))
            .set_text(cx, self.fixture.cells[2]);
        self.view
            .label(cx, ids!(grid_cell_four))
            .set_text(cx, self.fixture.cells[3]);
        self.view.button(cx, ids!(grid_density)).set_text(
            cx,
            if self.state.compact {
                "Use comfortable grid"
            } else {
                "Use compact grid"
            },
        );
        self.view.redraw(cx);
    }

    fn layout_grid(&mut self, cx: &mut Cx) {
        let spacing = if self.state.compact { 4.0 } else { 8.0 };
        if let Some(mut rows) = self.view.widget(cx, ids!(grid_rows)).borrow_mut::<View>() {
            rows.layout.spacing = spacing;
        }
        for id in [ids!(grid_first_row), ids!(grid_second_row)] {
            if let Some(mut row) = self.view.widget(cx, id).borrow_mut::<View>() {
                row.visible = true;
                row.walk.height = Size::Fixed(if self.state.compact { 28.0 } else { 36.0 });
                row.layout.spacing = spacing;
            }
        }
    }
}

impl Widget for TesseraGrid {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.layout_grid(cx);
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(grid_density))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, GridEvent::ToggleDensity);
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraLayout {
    #[deref]
    view: View,
    #[rust]
    fixture: LayoutFixture,
    #[rust]
    state: LayoutState,
}

impl TesseraLayout {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = LayoutFixture::DEFAULT;
        self.state = LayoutState::default();
        self.sync(cx);
    }

    fn apply_event(&mut self, cx: &mut Cx, event: LayoutEvent) {
        self.state.reduce(event);
        self.sync(cx);
        if matches!(event, LayoutEvent::ToggleSidebar) {
            cx.widget_action(
                self.widget_uid(),
                LayoutAction::SidebarChanged {
                    visible: self.state.sidebar_visible,
                },
            );
        }
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(layout_title))
            .set_text(cx, self.fixture.title);
        self.view
            .label(cx, ids!(layout_header))
            .set_text(cx, self.fixture.header);
        self.view
            .label(cx, ids!(layout_sidebar))
            .set_text(cx, self.fixture.sidebar);
        self.view
            .label(cx, ids!(layout_sidebar))
            .set_visible(cx, self.state.sidebar_visible);
        self.view
            .label(cx, ids!(layout_content))
            .set_text(cx, self.fixture.content);
        self.view.button(cx, ids!(layout_sidebar_toggle)).set_text(
            cx,
            if self.state.sidebar_visible {
                "Hide navigation"
            } else {
                "Show navigation"
            },
        );
        self.view.redraw(cx);
    }
}

impl Widget for TesseraLayout {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(layout_sidebar_toggle))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, LayoutEvent::ToggleSidebar);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        AffixEvent, AffixState, AnchorEvent, AnchorState, CardEvent, CardState, FlexEvent,
        FlexState, GridEvent, GridState, LayoutEvent, LayoutState, LayoutSurfaceCatalog,
    };
    use tessera_core::catalog::ComponentId;

    #[test]
    fn affix_tracks_document_until_its_viewport_edge() {
        assert_eq!(super::affix_y(140.0, 100.0, true), 140.0);
        assert_eq!(super::affix_y(90.0, 100.0, true), 100.0);
        assert_eq!(super::affix_y(-300.0, 100.0, true), 100.0);
        assert_eq!(super::affix_y(90.0, 100.0, false), 90.0);
    }

    #[test]
    fn anchor_explicit_selection_is_bounded_and_resettable() {
        let mut anchor = AnchorState::default();
        anchor.reduce(AnchorEvent::Select(usize::MAX));
        assert_eq!(anchor.selected, 2);
        anchor.reduce(AnchorEvent::Next);
        assert_eq!(anchor.selected, 0);
        anchor.reduce(AnchorEvent::Select(1));
        anchor.reduce(AnchorEvent::Reset);
        assert_eq!(anchor, AnchorState::default());
    }

    #[test]
    fn layout_catalog_exposes_six_exact_widget_routes() {
        assert_eq!(
            LayoutSurfaceCatalog::widget_name(ComponentId::Affix),
            Some("TesseraAffix")
        );
        assert_eq!(
            LayoutSurfaceCatalog::widget_name(ComponentId::Anchor),
            Some("TesseraAnchor")
        );
        assert_eq!(
            LayoutSurfaceCatalog::widget_name(ComponentId::Card),
            Some("TesseraCard")
        );
        assert_eq!(
            LayoutSurfaceCatalog::widget_name(ComponentId::Flex),
            Some("TesseraFlex")
        );
        assert_eq!(
            LayoutSurfaceCatalog::widget_name(ComponentId::Grid),
            Some("TesseraGrid")
        );
        assert_eq!(
            LayoutSurfaceCatalog::widget_name(ComponentId::Layout),
            Some("TesseraLayout")
        );
    }

    #[test]
    fn layout_states_reduce_their_own_typed_events() {
        let mut affix = AffixState::default();
        affix.reduce(AffixEvent::Toggle);
        assert!(affix.pinned);
        assert_eq!(affix.changes, 1);

        let mut anchor = AnchorState::default();
        anchor.reduce(AnchorEvent::Next);
        assert_eq!(anchor.selected, 1);

        let mut card = CardState::default();
        card.reduce(CardEvent::ToggleDetails);
        assert!(card.expanded);

        let mut flex = FlexState::default();
        flex.reduce(FlexEvent::Reverse);
        assert!(flex.reversed);

        let mut grid = GridState::default();
        grid.reduce(GridEvent::ToggleDensity);
        assert!(grid.compact);

        let mut layout = LayoutState::default();
        layout.reduce(LayoutEvent::ToggleSidebar);
        assert!(!layout.sidebar_visible);
    }
}
