//! Shared native focus navigation and paint without replacing stock widget types.
use crate::makepad_widgets::nav::CxNavTreeRc;
use crate::makepad_widgets::*;
use std::cell::Cell;
use std::collections::HashSet;
use std::rc::{Rc, Weak};

#[derive(Clone, Copy)]
struct FocusTarget {
    owner: WidgetUid,
    area: Area,
    radius: f64,
}

type FocusTargetRef = Weak<Cell<Option<FocusTarget>>>;

#[derive(Default)]
struct FocusRegions(Vec<FocusTargetRef>);

impl FocusRegions {
    fn insert(&mut self, target: &Rc<Cell<Option<FocusTarget>>>) {
        self.0.retain(|entry| entry.strong_count() != 0);
        self.0.push(Rc::downgrade(target));
    }

    fn find(&self, area: Area) -> Option<FocusTargetRef> {
        self.0.iter().find_map(|entry| {
            let target = entry.upgrade()?.get()?;
            (target.area == area).then(|| entry.clone())
        })
    }
}

/// Opt a custom native input area into the host's shared focus frame.
/// Register after drawing; stop order and scrolling remain Makepad-owned.
/// Keep one region per independently focusable area, not per data item.
#[derive(Default)]
pub struct FocusRegion {
    target: Rc<Cell<Option<FocusTarget>>>,
    registered: bool,
}

impl FocusRegion {
    /// Stop painting this region when its owner disables or removes the area.
    pub fn clear(&mut self) {
        self.target.set(None);
    }

    pub fn register(
        &mut self,
        cx: &mut Cx2d,
        owner: WidgetUid,
        area: Area,
        role: NavRole,
        radius: f64,
    ) {
        if !area.is_valid(cx) {
            self.clear();
            return;
        }
        self.target.set(Some(FocusTarget {
            owner,
            area,
            radius: if radius.is_finite() {
                radius.max(0.0)
            } else {
                0.0
            },
        }));
        if !self.registered {
            cx.global::<FocusRegions>().insert(&self.target);
            self.registered = true;
        }
        cx.add_nav_stop(area, role, Inset::default());
    }
}

fn tab_index(current: Option<usize>, enabled: &[bool], reverse: bool) -> Option<usize> {
    let key = match (current, reverse) {
        (None, false) => KeyCode::Home,
        (None, true) => KeyCode::End,
        (Some(_), false) => KeyCode::ArrowRight,
        (Some(_), true) => KeyCode::ArrowLeft,
    };
    super::input::enabled_choice_index(key, current.unwrap_or(0), enabled)
}

fn widget_allows_tab(widget: &WidgetRef, cx: &Cx) -> bool {
    visible_branch(widget)
        && !widget.disabled(cx)
        && widget
            .borrow::<Button>()
            .is_none_or(|button| button.enabled())
}

fn blocked_tab_areas(
    widget: &WidgetRef,
    cx: &Cx,
    ancestor_blocked: bool,
    blocked: &mut HashSet<Area>,
) {
    let disabled = ancestor_blocked || !widget_allows_tab(widget, cx);
    if disabled && widget.area().is_valid(cx) {
        blocked.insert(widget.area());
    }
    widget.children(&mut |_, child| blocked_tab_areas(&child, cx, disabled, blocked));
}

#[derive(Default)]
struct TabNavigationState {
    active: bool,
    owned: bool,
    origin: Option<Area>,
    group_exclusions: HashSet<Area>,
}

/// A closing popup continues Tab navigation from its opener, not its stale menu stop.
pub(crate) fn set_tab_navigation_origin(cx: &mut Cx, origin: Area) {
    let state = cx.global::<TabNavigationState>();
    if state.active {
        state.origin = Some(origin);
    }
}

/// A component that supplies its own Tab focus destination claims the event.
pub fn claim_tab_navigation(cx: &mut Cx) {
    let state = cx.global::<TabNavigationState>();
    if state.active {
        state.owned = true;
    }
}

/// Exclude a virtualized or clipped stop during the current navigation dispatch.
pub fn exclude_tab_area(cx: &mut Cx, area: Area) {
    let state = cx.global::<TabNavigationState>();
    if state.active {
        state.group_exclusions.insert(area);
    }
}

fn group_entry(preferred: Option<usize>, enabled: &[bool], reverse: bool) -> Option<usize> {
    preferred
        .filter(|index| enabled.get(*index).copied().unwrap_or(false))
        .or_else(|| tab_index(None, enabled, reverse))
}

/// Keep one native Tab stop in a roving group; arrow selection stays with its owner.
/// Call from the group's handler within `dispatch_tab_navigation`.
pub fn constrain_tab_group(
    cx: &mut Cx,
    event: &Event,
    members: &[&WidgetRef],
    preferred: Option<usize>,
) {
    let Event::KeyDown(key) = event else {
        return;
    };
    if key.key_code != KeyCode::Tab
        || key.modifiers.control
        || key.modifiers.logo
        || key.modifiers.alt
        || !cx.global::<TabNavigationState>().active
    {
        return;
    }
    let enabled: Vec<_> = members
        .iter()
        .map(|member| member.area().is_valid(cx) && widget_allows_tab(member, cx))
        .collect();
    let entry = group_entry(preferred, &enabled, key.modifiers.shift);
    let excluded: Vec<_> = members
        .iter()
        .enumerate()
        .filter(|(index, member)| Some(*index) != entry && member.area().is_valid(cx))
        .map(|(_, member)| member.area())
        .collect();
    cx.global::<TabNavigationState>()
        .group_exclusions
        .extend(excluded);
}

/// Apply shared native stop order unless a component explicitly owns the Tab event.
/// Call around the window event dispatcher; no tree walk runs on non-Tab events.
pub fn dispatch_tab_navigation(
    cx: &mut Cx,
    event: &Event,
    window: &WindowRef,
    dispatch: impl FnOnce(&mut Cx),
) {
    let Event::KeyDown(key) = event else {
        dispatch(cx);
        return;
    };
    if key.key_code != KeyCode::Tab {
        dispatch(cx);
        return;
    }
    // The pinned Window would navigate even on an OS/application shortcut.
    if key.modifiers.control || key.modifiers.logo || key.modifiers.alt {
        return;
    }
    let before = cx.key_focus();
    *cx.global::<TabNavigationState>() = TabNavigationState {
        active: true,
        ..Default::default()
    };
    dispatch(cx);
    let navigation = std::mem::take(cx.global::<TabNavigationState>());
    if navigation.owned {
        return;
    }
    let Some(window_id) = window.window_id() else {
        return;
    };
    let Some(pass) = cx.windows[window_id].main_pass_id else {
        return;
    };
    let Some(root) = cx.passes[pass].main_draw_list_id else {
        return;
    };
    if !cx.has_global::<CxNavTreeRc>() {
        return;
    }
    let mut blocked = navigation.group_exclusions;
    blocked_tab_areas(window, cx, false, &mut blocked);
    let mut stops = Vec::new();
    let mut seen = HashSet::new();
    CxDraw::iterate_nav_stops(cx, root, |_, stop| {
        if seen.insert(stop.area) {
            stops.push(stop.area);
        }
        None
    });
    let enabled: Vec<_> = stops
        .iter()
        .map(|area| area.is_valid(cx) && !blocked.contains(area))
        .collect();
    let Some(index) = tab_index(
        stops
            .iter()
            .position(|area| *area == navigation.origin.unwrap_or(before)),
        &enabled,
        key.modifiers.shift,
    ) else {
        cx.set_key_focus(Area::Empty);
        return;
    };
    let target = stops[index];
    // Resolve the target's scroll ancestry, including backwards and wrap navigation.
    if let Some((target, stack)) =
        CxDraw::iterate_nav_stops(cx, root, |_, stop| (stop.area == target).then_some(target))
    {
        crate::makepad_widgets::nav_control::NavControl::send_trigger_to_scroll_stack(cx, stack);
        cx.set_key_focus(target);
    }
}

#[derive(Default)]
struct FocusModality {
    keyboard: bool,
    suspended: bool,
}

impl FocusModality {
    fn visible(&self) -> bool {
        self.keyboard && !self.suspended
    }

    fn update(&mut self, event: &Event) -> bool {
        let before = self.visible();
        match event {
            Event::KeyDown(key)
                if !key.modifiers.logo && !key.modifiers.control && !key.modifiers.alt =>
            {
                self.keyboard = true;
            }
            Event::MouseDown(_) | Event::TouchUpdate(_) => self.keyboard = false,
            Event::WindowLostFocus(_) | Event::Pause => self.suspended = true,
            Event::WindowGotFocus(_) | Event::Resume => self.suspended = false,
            _ => {}
        }
        self.visible() != before
    }
}

fn expand(rect: Rect, amount: f64) -> Rect {
    Rect {
        pos: rect.pos - dvec2(amount, amount),
        size: rect.size + dvec2(amount * 2.0, amount * 2.0),
    }
}

fn focus_rect(full: Rect, clipped: Rect) -> Option<Rect> {
    let values = [
        full.size.x,
        full.size.y,
        clipped.pos.x,
        clipped.pos.y,
        clipped.size.x,
        clipped.size.y,
    ];
    if !values.iter().all(|value| value.is_finite())
        || clipped.size.x < 4.0
        || clipped.size.y < 4.0
        || (full.size.x - clipped.size.x).abs() > 0.01
        || (full.size.y - clipped.size.y).abs() > 0.01
    {
        return None;
    }
    // The clipped position includes a cached scroll view's current shift.
    Some(clipped)
}

fn visible_branch(widget: &WidgetRef) -> bool {
    if !widget.visible() {
        return false;
    }
    if widget.borrow::<PopupNotification>().is_some() {
        return widget.as_popup_notification().is_open();
    }
    if widget.borrow::<Modal>().is_some() {
        return widget.as_modal().is_open();
    }
    true
}

fn supported_control(widget: &WidgetRef, cx: &Cx) -> bool {
    if widget.disabled(cx) {
        return false;
    }
    if let Some(button) = widget.borrow::<Button>() {
        return button.enabled();
    }
    widget.borrow::<TextInput>().is_some()
        || widget.borrow::<CheckBox>().is_some()
        || widget.borrow::<RadioButton>().is_some()
        || widget.borrow::<DropDown2>().is_some()
        || widget.borrow::<Slider>().is_some()
}

fn find_focus_path(
    root: &WidgetRef,
    focus: Area,
    owner: Option<WidgetUid>,
    path: &mut Vec<WidgetRef>,
) -> bool {
    if !visible_branch(root) {
        return false;
    }
    path.push(root.clone());
    if owner.map_or_else(|| root.area() == focus, |owner| root.widget_uid() == owner) {
        return true;
    }
    let mut found = false;
    root.children(&mut |_, child| {
        if !found {
            found = find_focus_path(&child, focus, owner, path);
        }
    });
    if !found {
        path.pop();
    }
    found
}

fn is_overlay_area(cx: &Cx, area: Area) -> bool {
    let mut current = area.draw_list_id();
    while let Some(id) = current {
        let Some(list) = cx.draw_lists.checked_index(id) else {
            return false;
        };
        if list.overlay_order != 0 {
            return true;
        }
        current = list.codeflow_parent_id;
    }
    false
}

#[derive(Script, ScriptHook)]
pub struct FocusFrame {
    #[live]
    draw: DrawVector,
    #[live]
    base_layer: DrawList2d,
    #[live]
    overlay_layer: DrawList2d,
    #[live]
    gap: Vec4f,
    #[live]
    ring: Vec4f,
    #[rust]
    modality: FocusModality,
    #[rust]
    path: Vec<WidgetRef>,
    #[rust]
    custom_target: Option<FocusTargetRef>,
}

impl FocusFrame {
    pub fn handle_event(&mut self, cx: &mut Cx, event: &Event) {
        if self.modality.update(event)
            || matches!(event, Event::KeyFocus(_) | Event::KeyFocusLost(_))
        {
            self.base_layer.redraw(cx);
            self.overlay_layer.redraw(cx);
        }
    }

    fn custom_target(&mut self, cx: &mut Cx, focus: Area) -> Option<FocusTarget> {
        if let Some(target) = self.custom_target.as_ref().and_then(Weak::upgrade) {
            if let Some(target) = target.get().filter(|target| target.area == focus) {
                return Some(target);
            }
        }
        self.custom_target = if cx.has_global::<FocusRegions>() {
            cx.get_global::<FocusRegions>().find(focus)
        } else {
            None
        };
        self.custom_target.as_ref()?.upgrade()?.get()
    }

    fn target(&mut self, cx: &mut Cx, root: &dyn WidgetNode) -> Option<(Rect, bool, f64)> {
        let focus = cx.key_focus();
        if !self.modality.visible() || !root.visible() || !focus.is_valid(cx) {
            self.path.clear();
            self.custom_target = None;
            return None;
        }
        let custom = self.custom_target(cx, focus);
        let owner = custom.map(|target| target.owner);
        let cached = self.path.last().is_some_and(|widget| {
            owner.map_or_else(
                || widget.area() == focus,
                |owner| widget.widget_uid() == owner,
            )
        }) && self.path.iter().all(visible_branch);
        if !cached {
            self.path.clear();
            root.children(&mut |_, child| {
                if self.path.is_empty() {
                    find_focus_path(&child, focus, owner, &mut self.path);
                }
            });
        }
        let widget = self.path.last()?;
        if !self.path.iter().all(|widget| widget_allows_tab(widget, cx))
            || (custom.is_none() && !supported_control(widget, cx))
        {
            return None;
        }
        focus_rect(focus.rect(cx), focus.clipped_rect(cx)).map(|rect| {
            (
                rect,
                is_overlay_area(cx, focus),
                custom.map_or(4.0, |target| target.radius),
            )
        })
    }

    fn paint(&mut self, cx: &mut Cx2d, rect: Rect, radius: f64) {
        use super::vector::DpiStroke;

        self.draw.begin();
        // Two opaque 2-DIP strokes: gap outside the control, then the focus ring.
        for (outset, color) in [(1.0, self.gap), (3.0, self.ring)] {
            let stroke = expand(rect, outset);
            self.draw.set_color(color.x, color.y, color.z, 1.0);
            self.draw.rounded_rect(
                stroke.pos.x as f32,
                stroke.pos.y as f32,
                stroke.size.x as f32,
                stroke.size.y as f32,
                (radius.min(rect.size.x.min(rect.size.y) * 0.5) + outset) as f32,
            );
            self.draw.stroke_dip(cx, 2.0);
        }
        self.draw.end(cx);
    }

    /// Call after the host's children finish drawing, while its window is open.
    pub fn draw(&mut self, cx: &mut Cx2d, root: &dyn WidgetNode) {
        let target = self.target(cx, root);
        let area = cx.key_focus();
        super::focus_trace::record(cx, "paint", Some(area), || {
            format!(
                "keyboard={} suspended={} target={target:?}",
                self.modality.keyboard, self.modality.suspended
            )
        });
        self.base_layer.begin_always(cx);
        if let Some((rect, false, radius)) = target {
            self.paint(cx, rect, radius);
        }
        self.base_layer.end(cx);
        // Always clear both lists so closing a popup cannot leave its ring behind.
        self.overlay_layer.begin_overlay_last(cx);
        if let Some((rect, true, radius)) = target {
            self.paint(cx, rect, radius);
        }
        self.overlay_layer.end(cx);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::foundation::vector::stroke_antialias_dip;
    use crate::makepad_widgets::makepad_draw::vector::{LineCap, LineJoin};

    #[test]
    fn focus_antialias_fringe_is_one_physical_pixel() {
        for dpi in [1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0] {
            assert!((f64::from(stroke_antialias_dip(dpi)) * dpi - 1.0).abs() < 1e-6);
        }
        for dpi in [0.0, -1.0, f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
            assert_eq!(stroke_antialias_dip(dpi), 1.0);
        }
    }

    #[test]
    fn focus_stroke_geometry_keeps_its_two_dip_width_across_backing_scales() {
        use crate::makepad_widgets::makepad_draw::vector::{
            Tessellator, VectorPath, tessellate_path_stroke,
        };
        for dpi in [1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0] {
            let mut path = VectorPath::new();
            path.move_to(10.0, 10.0);
            path.line_to(110.0, 10.0);
            let mut vertices = Vec::new();
            let mut indices = Vec::new();
            tessellate_path_stroke(
                &mut path,
                &mut Tessellator::default(),
                &mut vertices,
                &mut indices,
                2.0,
                LineCap::Butt,
                LineJoin::Miter,
                4.0,
                stroke_antialias_dip(dpi),
                0.25,
            );
            let top = vertices.iter().map(|v| v.y).fold(f32::INFINITY, f32::min);
            let bottom = vertices
                .iter()
                .map(|v| v.y)
                .fold(f32::NEG_INFINITY, f32::max);
            // Each edge loses half a device pixel to the shader's linear AA ramp.
            let coverage_pixels = f64::from(bottom - top) * dpi - 1.0;
            assert!((coverage_pixels - 2.0 * dpi).abs() < 1e-5);
            assert!(!indices.is_empty());
        }
    }

    #[test]
    fn custom_regions_do_not_retain_unmounted_widgets_or_grow_across_replacements() {
        let mut regions = FocusRegions::default();
        let live = Rc::new(Cell::new(Some(FocusTarget {
            owner: WidgetUid(1),
            area: Area::Empty,
            radius: 4.0,
        })));
        regions.insert(&live);
        let cached = regions.find(Area::Empty).unwrap();
        assert_eq!(Rc::strong_count(&live), 1);
        for _ in 0..100 {
            let replaced = Rc::new(Cell::new(None));
            regions.insert(&replaced);
            assert_eq!(regions.0.len(), 2);
        }
        drop(live);
        assert!(cached.upgrade().is_none());
        let next = Rc::new(Cell::new(None));
        regions.insert(&next);
        assert_eq!(regions.0.len(), 1);
        assert!(regions.find(Area::Empty).is_none());
    }

    #[test]
    fn custom_region_cache_observes_redrawn_area_without_re_registration() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let list = DrawList::new(&mut cx);
        let area = |redraw_id| {
            Area::Rect(RectArea {
                draw_list_id: list.id(),
                rect_id: 0,
                redraw_id,
            })
        };
        let target = Rc::new(Cell::new(Some(FocusTarget {
            owner: WidgetUid(1),
            area: area(1),
            radius: 4.0,
        })));
        let mut regions = FocusRegions::default();
        regions.insert(&target);
        let cached = regions.find(area(1)).unwrap();
        target.set(Some(FocusTarget {
            owner: WidgetUid(2),
            area: area(2),
            radius: 8.0,
        }));
        let current = cached.upgrade().unwrap().get().unwrap();
        assert_eq!(current.area, area(2));
        assert_eq!(current.owner, WidgetUid(2));
        assert_eq!(current.radius, 8.0);
        assert!(regions.find(area(1)).is_none());
        assert!(regions.find(area(2)).is_some());
        assert_eq!(regions.0.len(), 1);
    }

    #[test]
    fn clearing_a_custom_region_invalidates_cached_focus_without_allocating() {
        let mut region = FocusRegion::default();
        region.target.set(Some(FocusTarget {
            owner: WidgetUid(1),
            area: Area::Empty,
            radius: 4.0,
        }));
        let mut regions = FocusRegions::default();
        regions.insert(&region.target);
        let cached = regions.find(Area::Empty).unwrap();
        region.clear();
        assert!(cached.upgrade().unwrap().get().is_none());
        assert!(regions.find(Area::Empty).is_none());
        assert_eq!(Rc::strong_count(&region.target), 1);
        assert_eq!(regions.0.len(), 1);
    }

    #[test]
    fn custom_focus_owner_is_exact_even_for_an_internal_sub_area() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let ui = cx.with_vm(|vm| {
            crate::makepad_widgets::script_mod(vm);
            let value = script_eval!(vm, {
                use mod.prelude.widgets.*
                use mod.widgets.*
                View{owner := View{child := Label{text: "Plain child"}}}
            });
            WidgetRef::script_from_value(vm, value)
        });
        let owner = ui.child_by_path(ids!(owner));
        let mut path = Vec::new();
        assert!(find_focus_path(
            &ui,
            Area::Empty,
            Some(owner.widget_uid()),
            &mut path
        ));
        assert_eq!(path.last().unwrap().widget_uid(), owner.widget_uid());
        owner.set_visible(&mut cx, false);
        path.clear();
        assert!(!find_focus_path(
            &ui,
            Area::Empty,
            Some(owner.widget_uid()),
            &mut path
        ));
        assert!(path.is_empty());
    }

    #[test]
    fn tab_order_starts_wraps_and_skips_disabled_stops() {
        let enabled = [false, true, false, true, false];
        assert_eq!(tab_index(None, &enabled, false), Some(1));
        assert_eq!(tab_index(None, &enabled, true), Some(3));
        assert_eq!(tab_index(Some(1), &enabled, false), Some(3));
        assert_eq!(tab_index(Some(3), &enabled, false), Some(1));
        assert_eq!(tab_index(Some(3), &enabled, true), Some(1));
        assert_eq!(tab_index(Some(1), &enabled, true), Some(3));
        assert_eq!(tab_index(None, &[], false), None);
        assert_eq!(tab_index(None, &[false; 3], true), None);
    }

    #[test]
    fn tab_shortcuts_do_not_reach_native_window_navigation() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let window = WindowRef::default();
        for modifiers in [
            KeyModifiers {
                control: true,
                ..Default::default()
            },
            KeyModifiers {
                logo: true,
                ..Default::default()
            },
            KeyModifiers {
                alt: true,
                ..Default::default()
            },
        ] {
            let event = Event::KeyDown(KeyEvent {
                key_code: KeyCode::Tab,
                modifiers,
                ..Default::default()
            });
            dispatch_tab_navigation(&mut cx, &event, &window, |_| {
                panic!("shortcut reached Window")
            });
        }
        let mut dispatched = 0;
        dispatch_tab_navigation(&mut cx, &Event::KeyUp(KeyEvent::default()), &window, |_| {
            dispatched += 1
        });
        dispatch_tab_navigation(
            &mut cx,
            &Event::KeyDown(KeyEvent::default()),
            &window,
            |_| dispatched += 1,
        );
        assert_eq!(dispatched, 2);
    }

    #[test]
    fn component_tab_claim_is_scoped_to_one_key_event() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let window = WindowRef::default();
        let event = Event::KeyDown(KeyEvent {
            key_code: KeyCode::Tab,
            ..Default::default()
        });
        dispatch_tab_navigation(&mut cx, &event, &window, |cx| {
            claim_tab_navigation(cx);
            assert!(cx.global::<TabNavigationState>().owned);
            cx.global::<TabNavigationState>()
                .group_exclusions
                .insert(Area::Empty);
        });
        let state = cx.global::<TabNavigationState>();
        assert!(!state.owned && !state.active && state.group_exclusions.is_empty());
        claim_tab_navigation(&mut cx);
        assert!(!cx.global::<TabNavigationState>().owned);
        dispatch_tab_navigation(&mut cx, &event, &window, |cx| {
            let state = cx.global::<TabNavigationState>();
            assert!(state.active && !state.owned && state.group_exclusions.is_empty());
        });
    }

    #[test]
    fn popup_tab_origin_is_scoped_to_the_current_dispatch() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let window = WindowRef::default();
        set_tab_navigation_origin(&mut cx, Area::Empty);
        assert!(cx.global::<TabNavigationState>().origin.is_none());
        let event = Event::KeyDown(KeyEvent {
            key_code: KeyCode::Tab,
            ..Default::default()
        });
        dispatch_tab_navigation(&mut cx, &event, &window, |cx| {
            set_tab_navigation_origin(cx, Area::Empty);
            assert_eq!(cx.global::<TabNavigationState>().origin, Some(Area::Empty));
        });
        assert!(cx.global::<TabNavigationState>().origin.is_none());
        dispatch_tab_navigation(&mut cx, &event, &window, |cx| {
            assert!(cx.global::<TabNavigationState>().origin.is_none());
        });
    }

    #[test]
    fn roving_group_enters_selected_or_directional_enabled_fallback() {
        let enabled = [false, true, false, true];
        for reverse in [false, true] {
            assert_eq!(group_entry(Some(1), &enabled, reverse), Some(1));
            assert_eq!(group_entry(Some(3), &enabled, reverse), Some(3));
            assert_eq!(group_entry(None, &[false; 4], reverse), None);
            assert_eq!(group_entry(Some(0), &[], reverse), None);
        }
        assert_eq!(group_entry(None, &enabled, false), Some(1));
        assert_eq!(group_entry(None, &enabled, true), Some(3));
        assert_eq!(group_entry(Some(2), &enabled, false), Some(1));
        assert_eq!(group_entry(Some(10), &enabled, true), Some(3));
    }

    #[test]
    fn roving_group_leaves_other_members_out_of_forward_and_reverse_tab_order() {
        for selected in [1, 2] {
            let mut enabled = [true, false, false, false, true];
            enabled[selected] = true;
            assert_eq!(tab_index(Some(0), &enabled, false), Some(selected));
            assert_eq!(tab_index(Some(4), &enabled, true), Some(selected));
            assert_eq!(tab_index(Some(selected), &enabled, false), Some(4));
            assert_eq!(tab_index(Some(selected), &enabled, true), Some(0));
        }
    }

    #[test]
    fn shared_focus_supports_enabled_stock_choices_dropdown_and_slider() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let ui = cx.with_vm(|vm| {
            crate::makepad_widgets::script_mod(vm);
            let value = script_eval!(vm, {
                use mod.prelude.widgets.*
                use mod.widgets.*
                View{
                    check := CheckBox{}
                    radio := RadioButton{}
                    dropdown := DropDown2{labels: ["First" "Second"]}
                    slider := Slider{}
                    plain := Label{text: "Not interactive"}
                }
            });
            WidgetRef::script_from_value(vm, value)
        });
        for id in [ids!(check), ids!(radio), ids!(dropdown), ids!(slider)] {
            let control = ui.child_by_path(id);
            assert!(supported_control(&control, &cx));
            assert!(widget_allows_tab(&control, &cx));
            control.set_disabled(&mut cx, true);
            assert!(!supported_control(&control, &cx));
            assert!(!widget_allows_tab(&control, &cx));
        }
        assert!(!supported_control(&ui.child_by_path(ids!(plain)), &cx));
    }

    #[test]
    fn focus_geometry_uses_scrolled_position_without_resizing_the_control() {
        let full = Rect {
            pos: dvec2(40.0, 200.0),
            size: dvec2(100.0, 30.0),
        };
        let clipped = Rect {
            pos: dvec2(40.0, 120.0),
            ..full
        };
        let rect = focus_rect(full, clipped).unwrap();
        assert_eq!(rect, clipped);
        assert_eq!(expand(rect, 1.0).size, dvec2(102.0, 32.0));
        assert_eq!(expand(rect, 3.0).size, dvec2(106.0, 36.0));
        assert_eq!(full.size, dvec2(100.0, 30.0));
    }

    #[test]
    fn focus_geometry_rejects_partial_empty_and_nonfinite_areas() {
        let full = Rect {
            pos: dvec2(40.0, 200.0),
            size: dvec2(100.0, 30.0),
        };
        for size in [
            dvec2(99.0, 30.0),
            dvec2(100.0, 15.0),
            dvec2(0.0, 0.0),
            dvec2(f64::NAN, 30.0),
        ] {
            assert!(focus_rect(full, Rect { size, ..full }).is_none());
        }
    }

    #[test]
    fn keyboard_modality_excludes_shortcuts_pointer_and_suspension() {
        let mut state = FocusModality::default();
        let key = KeyEvent {
            key_code: KeyCode::Tab,
            ..Default::default()
        };
        assert!(!state.visible());
        assert!(!state.update(&Event::KeyDown(KeyEvent {
            modifiers: KeyModifiers {
                control: true,
                ..Default::default()
            },
            ..key
        })));
        assert!(state.update(&Event::KeyDown(key)));
        assert!(!state.update(&Event::KeyDown(key)));
        assert!(state.update(&Event::Pause));
        assert!(state.update(&Event::Resume));
        assert!(state.update(&Event::MouseDown(MouseDownEvent {
            abs: dvec2(0.0, 0.0),
            button: MouseButton::PRIMARY,
            window_id: WindowId(0, 0),
            modifiers: KeyModifiers::default(),
            handled: Default::default(),
            time: 0.0,
        })));
        assert!(!state.visible());
    }

    #[test]
    fn closed_popup_and_disabled_button_are_not_focus_targets() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let root = cx.with_vm(|vm| {
            crate::makepad_widgets::script_mod(vm);
            let value = script_eval!(vm, {
                use mod.prelude.widgets.*
                use mod.widgets.*
                View{
                    action := Button{text: "Action"}
                    popup := PopupNotification{content := View{Button{text: "Confirm"}}}
                    input := TextInput{}
                }
            });
            WidgetRef::script_from_value(vm, value)
        });
        let action = root.child_by_path(ids!(action));
        assert!(supported_control(&action, &cx));
        super::super::input::set_button_enabled(&action.as_button(), &mut cx, false);
        assert!(!supported_control(&action, &cx));
        assert!(supported_control(&root.child_by_path(ids!(input)), &cx));
        let popup = root.child_by_path(ids!(popup));
        assert!(!visible_branch(&popup));
        popup.as_popup_notification().open(&mut cx);
        assert!(visible_branch(&popup));
        popup.as_popup_notification().close(&mut cx);
        assert!(!visible_branch(&popup));
    }
}
