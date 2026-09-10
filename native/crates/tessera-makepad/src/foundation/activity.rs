//! Shared bounded scheduling and native paint primitives for activity feedback.
use crate::makepad_widgets::*;

const FRAME_INTERVAL: f64 = 1.0 / 30.0;

#[derive(Clone, Copy, Debug)]
struct ActivityVisibility(bool);

/// A hidden native View still dispatches NextFrame to its children. Notify the
/// retained subtree explicitly without pretending the entire OS window paused.
pub fn set_activity_visibility(widget: &WidgetRef, cx: &mut Cx, visible: bool) {
    if widget.visible() == visible {
        return;
    }
    widget.set_visible(cx, visible);
    widget.handle_event(
        cx,
        &Event::Actions(vec![Box::new(ActivityVisibility(visible))]),
        &mut Scope::empty(),
    );
}

/// Motion is a bounded visual lease, not the lifetime of an asynchronous task.
#[derive(Clone, Copy, Debug)]
pub struct MotionSpec {
    period: f64,
    duration: f64,
}

impl MotionSpec {
    pub fn new(period: f64, duration: f64) -> Option<Self> {
        (period.is_finite()
            && duration.is_finite()
            && (0.1..=60.0).contains(&period)
            && (0.1..=60.0).contains(&duration))
        .then_some(Self { period, duration })
    }
}

impl Default for MotionSpec {
    fn default() -> Self {
        Self {
            period: 1.2,
            duration: 6.0,
        }
    }
}

pub struct MotionClock {
    spec: MotionSpec,
    requested: bool,
    reduced: bool,
    visible: bool,
    host_visible: bool,
    suspended: bool,
    pending: Option<NextFrame>,
    last_time: Option<f64>,
    elapsed: f64,
    painted_at: f64,
    phase: f32,
    exhausted: bool,
}

impl Default for MotionClock {
    fn default() -> Self {
        Self::new(MotionSpec::default())
    }
}

impl MotionClock {
    pub fn new(spec: MotionSpec) -> Self {
        Self {
            spec,
            requested: false,
            reduced: false,
            visible: true,
            host_visible: true,
            suspended: false,
            pending: None,
            last_time: None,
            elapsed: 0.0,
            painted_at: -FRAME_INTERVAL,
            phase: 0.0,
            exhausted: false,
        }
    }

    pub fn phase(&self) -> f32 {
        self.phase
    }

    pub fn exhausted(&self) -> bool {
        self.exhausted
    }

    fn allowed(&self) -> bool {
        self.requested
            && !self.reduced
            && self.visible
            && self.host_visible
            && !self.suspended
            && !self.exhausted
    }

    fn schedule(&mut self, cx: &mut Cx) {
        if self.allowed() && self.pending.is_none() {
            self.pending = Some(cx.new_next_frame());
        }
    }

    fn pause(&mut self) {
        self.pending = None;
        self.last_time = None;
    }

    /// Idempotent updates do not renew an exhausted lease.
    pub fn set_active(&mut self, cx: &mut Cx, active: bool, reduced: bool) {
        let restart = active && (!self.requested || self.reduced != reduced);
        self.requested = active;
        self.reduced = reduced;
        if !active || reduced || restart {
            self.elapsed = 0.0;
            self.painted_at = -FRAME_INTERVAL;
            self.phase = 0.0;
            self.exhausted = false;
            self.last_time = None;
        }
        if !self.allowed() {
            self.pause();
        } else {
            self.schedule(cx);
        }
    }

    pub fn restart(&mut self, cx: &mut Cx) {
        self.elapsed = 0.0;
        self.painted_at = -FRAME_INTERVAL;
        self.phase = 0.0;
        self.exhausted = false;
        self.last_time = None;
        self.schedule(cx);
    }

    fn advance(&mut self, time: f64) -> bool {
        if !time.is_finite() || !self.allowed() {
            return false;
        }
        if let Some(previous) = self.last_time {
            self.elapsed = (self.elapsed + (time - previous).max(0.0)).min(self.spec.duration);
        }
        self.last_time = Some(time);
        if self.elapsed >= self.spec.duration {
            self.exhausted = true;
            self.pause();
            return true;
        }
        if self.elapsed - self.painted_at + 1e-9 < FRAME_INTERVAL {
            return false;
        }
        self.painted_at = self.elapsed;
        self.phase = (self.elapsed / self.spec.period).fract() as f32;
        true
    }

    /// Hidden owners still receive lifecycle events, but never renew a frame request.
    /// Matching the borrowed native frame set avoids cloning it on every vsync.
    pub fn handle_event(
        &mut self,
        cx: &mut Cx,
        event: &Event,
        visible: bool,
        owner: &'static str,
    ) -> bool {
        let was_allowed = self.allowed();
        self.visible = visible;
        match event {
            Event::Actions(actions) => {
                for action in actions {
                    if let Some(visibility) = action.downcast_ref::<ActivityVisibility>() {
                        self.host_visible = visibility.0;
                    }
                }
            }
            Event::WindowLostFocus(_) | Event::Pause => self.suspended = true,
            Event::WindowGotFocus(_) | Event::Resume => self.suspended = false,
            _ => {}
        }
        if !self.allowed() {
            self.pause();
            if was_allowed {
                super::focus_trace::record(cx, "motion-stop", None, || {
                    format!(
                        "owner={owner} visible={} host_visible={} reduced={} suspended={} exhausted={}",
                        self.visible,
                        self.host_visible,
                        self.reduced,
                        self.suspended,
                        self.exhausted
                    )
                });
            }
            return false;
        }
        if !was_allowed {
            self.schedule(cx);
        }
        let Event::NextFrame(frame) = event else {
            return false;
        };
        if !self
            .pending
            .is_some_and(|pending| frame.set.contains(&pending))
        {
            return false;
        }
        self.pending = None;
        let changed = self.advance(frame.time);
        self.schedule(cx);
        if changed && (self.exhausted || self.elapsed < FRAME_INTERVAL) {
            super::focus_trace::record(cx, "motion-frame", None, || {
                format!(
                    "owner={owner} phase={} elapsed={} pending={} exhausted={}",
                    self.phase,
                    self.elapsed,
                    self.pending.is_some(),
                    self.exhausted
                )
            });
        }
        changed
    }
}

/// Paint parameters are independent of pass time, so unrelated redraws cannot
/// advance a paused/reduced-motion visual. No runtime Live/Script evaluation.
/// Project on every draw, including a theme reapply. This must not invalidate
/// the view or schedule frames: static activity stays idle after being painted.
pub(crate) fn project_phase(view: &View, cx: &mut Cx, ids: &[&[LiveId]], phase: f32, active: bool) {
    for id in ids {
        if let Some(mut visual) = view.widget(cx, id).borrow_mut::<View>() {
            visual.draw_bg.set_uniform(cx, id!(phase), &[phase]);
            visual
                .draw_bg
                .set_uniform(cx, id!(active), &[if active { 1.0 } else { 0.0 }]);
        }
    }
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*

    // The pinned LoadingSpinner's native SDF arc, driven by our finite phase
    // rather than draw_pass.time.
    mod.widgets.TesseraSpinnerVisual = LoadingSpinner{
        width: 40 height: 40
        draw_bg +: {
            color: theme.color_bevel_focus
            track: uniform(theme.color_bevel)
            phase: uniform(0.0)
            active: uniform(0.0)
            stroke_width: 3.0
            pixel: fn() {
                let sdf = Sdf2d.viewport(self.pos * self.rect_size)
                let radius = min(self.rect_size.x, self.rect_size.y) * 0.5 - 3.0
                let center = self.rect_size * 0.5
                sdf.circle(center.x, center.y, radius)
                sdf.stroke(self.track, self.stroke_width)
                if self.active > 0.5 {
                    let angle = self.phase * 2.0 * PI
                    sdf.arc_round_caps(center.x, center.y, radius, angle, angle + 1.5 * PI, self.stroke_width)
                    sdf.fill(self.color)
                }
                return sdf.result
            }
        }
    }

    mod.widgets.TesseraProgressVisual = View{
        width: Fill height: 10 show_bg: true
        draw_bg +: {
            color: theme.color_bevel_focus
            track: uniform(theme.color_bevel)
            error: uniform(theme.color_error)
            value: uniform(0.4)
            phase: uniform(0.0)
            active: uniform(0.0)
            failed: uniform(0.0)
            pixel: fn() {
                let sdf = Sdf2d.viewport(self.pos * self.rect_size)
                let start = self.phase * 0.72
                let filled = if self.active > 0.5 {
                    self.pos.x >= start && self.pos.x <= start + 0.28
                } else {
                    self.pos.x <= self.value
                }
                let foreground = if self.failed > 0.5 self.error else self.color
                let color = if filled foreground else self.track
                sdf.box(0.0, 0.0, self.rect_size.x, self.rect_size.y, 2.0)
                return sdf.fill(color)
            }
        }
    }

    mod.widgets.TesseraSkeletonVisual = View{
        width: Fill height: 18 show_bg: true
        draw_bg +: {
            color: theme.color_bevel
            highlight: uniform(theme.color_text_meta)
            phase: uniform(0.0)
            active: uniform(0.0)
            pixel: fn() {
                let sdf = Sdf2d.viewport(self.pos * self.rect_size)
                let band = max(0.0, 1.0 - abs(self.pos.x * 1.8 - self.phase * 2.8 + 0.8))
                let color = mix(self.color, self.highlight, band * band * 0.28 * self.active)
                sdf.box(0.0, 0.0, self.rect_size.x, self.rect_size.y, 3.0)
                return sdf.fill(color)
            }
        }
    }

    mod.widgets.TesseraBeamVisual = View{
        width: Fill height: 88 show_bg: true
        padding: Inset{left: 14, right: 14, top: 14, bottom: 14}
        flow: Down spacing: 6
        draw_bg +: {
            color: theme.color_fg_app
            track: uniform(theme.color_bevel)
            accent: uniform(theme.color_bevel_focus)
            phase: uniform(0.0)
            active: uniform(0.0)
            pixel: fn() {
                let p = self.pos * self.rect_size
                let s = self.rect_size
                let sdf = Sdf2d.viewport(p)
                let edge = min(min(p.x, s.x - p.x), min(p.y, s.y - p.y))
                let along = if edge == p.y { p.x }
                    else if edge == s.x - p.x { s.x + p.y }
                    else if edge == s.y - p.y { 2.0 * s.x + s.y - p.x }
                    else { 2.0 * (s.x + s.y) - p.y }
                let distance = modf(along / (2.0 * (s.x + s.y)) - self.phase + 1.0, 1.0)
                let strength = max(0.0, 1.0 - distance * 7.0) * self.active
                sdf.box(1.5, 1.5, s.x - 3.0, s.y - 3.0, 4.0)
                sdf.fill_keep(self.color)
                sdf.stroke(mix(self.track, self.accent, strength), 2.0)
                return sdf.result
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn activity_projection_restores_owned_uniforms_after_theme_reapply() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let (mut root, template) = cx.with_vm(|vm| {
            crate::makepad_widgets::script_mod(vm);
            super::script_mod(vm);
            let value = script_eval!(vm, {
                use mod.prelude.widgets.*
                use mod.widgets.*
                View{visual := TesseraSpinnerVisual{}}
            });
            let template = vm.bx.heap.new_object_ref(value.as_object().unwrap());
            (WidgetRef::script_from_value(vm, value), template)
        });
        for _ in 0..3 {
            cx.with_vm(|vm| {
                root.script_apply(
                    vm,
                    &Apply::ScriptReapply,
                    &mut Scope::empty(),
                    template.as_object().into(),
                );
            });
            let view = root.borrow::<View>().unwrap();
            project_phase(&view, &mut cx, &[ids!(visual)], 0.25, true);
            let visual = view.widget(&mut cx, ids!(visual));
            let visual = visual.borrow::<View>().unwrap();
            let mut phase = [f32::NAN];
            let mut active = [f32::NAN];
            visual.draw_bg.get_uniform(&mut cx, id!(phase), &mut phase);
            visual
                .draw_bg
                .get_uniform(&mut cx, id!(active), &mut active);
            assert_eq!(phase, [0.25]);
            assert_eq!(active, [1.0]);
        }
    }

    #[test]
    fn invalid_motion_specs_cannot_create_unbounded_or_nonfinite_leases() {
        for invalid in [0.0, -1.0, f64::NAN, f64::INFINITY, 60.1] {
            assert!(MotionSpec::new(invalid, 6.0).is_none());
            assert!(MotionSpec::new(1.2, invalid).is_none());
        }
    }

    #[test]
    fn finite_clock_rejects_stale_frames_and_stops_at_its_budget() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let mut clock = MotionClock::new(MotionSpec::new(1.0, 2.0).unwrap());
        clock.set_active(&mut cx, true, false);
        let pending = clock.pending.unwrap();
        assert!(!clock.handle_event(
            &mut cx,
            &Event::NextFrame(NextFrameEvent::default()),
            true,
            "test"
        ));
        assert_eq!(clock.pending, Some(pending));
        assert!(clock.advance(10.0));
        assert!(!clock.advance(10.001));
        assert!(clock.advance(10.5));
        assert_eq!(clock.phase(), 0.5);
        assert!(clock.advance(12.1));
        assert!(clock.exhausted());
        assert!(!clock.allowed());
        assert!(clock.pending.is_none());
        clock.set_active(&mut cx, true, false);
        assert!(clock.pending.is_none());
        clock.restart(&mut cx);
        assert!(clock.pending.is_some() && !clock.exhausted());
    }

    #[test]
    fn hidden_blurred_and_reduced_clocks_never_schedule_continuous_frames() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let mut clock = MotionClock::default();
        clock.set_active(&mut cx, true, false);
        clock.handle_event(&mut cx, &Event::Signal, false, "test");
        assert!(clock.pending.is_none());
        clock.handle_event(&mut cx, &Event::Pause, true, "test");
        assert!(clock.pending.is_none());
        clock.handle_event(&mut cx, &Event::Resume, true, "test");
        assert!(clock.pending.is_some());
        clock.set_active(&mut cx, true, true);
        assert_eq!(clock.phase(), 0.0);
        assert!(clock.pending.is_none());
        clock.restart(&mut cx);
        assert!(clock.pending.is_none());
        clock.set_active(&mut cx, false, false);
        assert!(clock.pending.is_none());
    }

    #[test]
    fn hidden_host_stops_a_locally_visible_child_until_explicitly_shown() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let mut clock = MotionClock::default();
        clock.set_active(&mut cx, true, false);
        let stale = clock.pending.unwrap();
        let visibility = |visible| Event::Actions(vec![Box::new(ActivityVisibility(visible))]);
        clock.handle_event(&mut cx, &visibility(false), true, "test");
        assert!(clock.pending.is_none());
        for event in [
            Event::Signal,
            Event::Resume,
            Event::NextFrame(NextFrameEvent {
                set: [stale].into_iter().collect(),
                ..Default::default()
            }),
        ] {
            assert!(!clock.handle_event(&mut cx, &event, true, "test"));
            assert!(clock.pending.is_none());
        }
        clock.restart(&mut cx);
        assert!(clock.pending.is_none());
        clock.handle_event(&mut cx, &visibility(true), true, "test");
        assert!(clock.pending.is_some());
    }
}
