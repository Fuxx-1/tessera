//! Native interactive display surfaces with bounded state transitions.

use crate::foundation::activity::{MotionClock, project_phase};
use crate::foundation::input::set_button_enabled;
use crate::foundation::input::{ButtonActivationExt, checkbox_change};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct InteractiveSurfaceCatalog;

impl InteractiveSurfaceCatalog {
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Carousel => Some("TesseraCarousel"),
            ComponentId::Splitter => Some("TesseraSplitter"),
            ComponentId::BorderBeam => Some("TesseraBorderBeam"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CarouselFixture {
    pub slides: [&'static str; 3],
}

impl CarouselFixture {
    pub const DEFAULT: Self = Self {
        slides: ["Release readiness", "Review queue", "Verification record"],
    };
}

impl Default for CarouselFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CarouselState {
    pub active: usize,
    pub paused: bool,
    pub reduced_motion: bool,
    pub visible: bool,
}

impl Default for CarouselState {
    fn default() -> Self {
        Self {
            active: 0,
            paused: false,
            reduced_motion: false,
            visible: true,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CarouselEvent {
    Previous,
    Next,
    TogglePause,
    ToggleReducedMotion,
    ToggleVisible,
    Reset,
}

impl CarouselState {
    pub fn is_idle(self) -> bool {
        self.paused || self.reduced_motion || !self.visible
    }
    pub fn reduce(&mut self, event: CarouselEvent) {
        match event {
            CarouselEvent::Previous => {
                self.active = if self.active == 0 { 2 } else { self.active - 1 }
            }
            CarouselEvent::Next => self.active = (self.active + 1) % 3,
            CarouselEvent::TogglePause => self.paused = !self.paused,
            CarouselEvent::ToggleReducedMotion => self.reduced_motion = !self.reduced_motion,
            CarouselEvent::ToggleVisible => self.visible = !self.visible,
            CarouselEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum CarouselAction {
    SlideChanged {
        index: usize,
    },
    PlaybackChanged {
        idle: bool,
    },
    #[default]
    None,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SplitterFixture {
    pub minimum: u16,
    pub maximum: u16,
    pub default: u16,
}

impl SplitterFixture {
    pub const DEFAULT: Self = Self {
        minimum: 180,
        maximum: 560,
        default: 320,
    };
}

impl Default for SplitterFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SplitterState {
    pub leading: u16,
}

impl Default for SplitterState {
    fn default() -> Self {
        Self {
            leading: SplitterFixture::DEFAULT.default,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SplitterEvent {
    Resize(u16),
    Decrease,
    Increase,
    Reset,
}

impl SplitterState {
    pub fn reduce(&mut self, event: SplitterEvent, fixture: SplitterFixture) {
        match event {
            SplitterEvent::Resize(value) => {
                self.leading = value.clamp(fixture.minimum, fixture.maximum)
            }
            SplitterEvent::Decrease => {
                self.leading = self.leading.saturating_sub(20).max(fixture.minimum)
            }
            SplitterEvent::Increase => {
                self.leading = self.leading.saturating_add(20).min(fixture.maximum)
            }
            SplitterEvent::Reset => {
                *self = Self {
                    leading: fixture.default,
                }
            }
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum SplitterAction {
    Resized {
        leading: u16,
    },
    #[default]
    None,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct BorderBeamState {
    pub running: bool,
    pub reduced_motion: bool,
}

impl Default for BorderBeamState {
    fn default() -> Self {
        Self {
            running: true,
            reduced_motion: false,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BorderBeamEvent {
    Restart,
    ToggleRunning,
    SetReducedMotion(bool),
    Reset,
}

impl BorderBeamState {
    pub fn is_static(self) -> bool {
        !self.running || self.reduced_motion
    }
    pub fn reduce(&mut self, event: BorderBeamEvent) {
        match event {
            BorderBeamEvent::Restart => self.running = true,
            BorderBeamEvent::ToggleRunning => self.running = !self.running,
            BorderBeamEvent::SetReducedMotion(value) => self.reduced_motion = value,
            BorderBeamEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum BorderBeamAction {
    Restarted,
    MotionChanged {
        static_frame: bool,
    },
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*

    mod.widgets.TesseraCarouselBase = #(TesseraCarousel::register_widget(vm))
    mod.widgets.TesseraCarousel = set_type_default() do mod.widgets.TesseraCarouselBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 8
        carousel_title := Label{width: Fill height: Fit text: "Release carousel" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        carousel_stage := View{width: Fill height: 86 flow: Down padding: Inset{left: 12, right: 12, top: 12, bottom: 12} show_bg: true draw_bg +: {color: theme.color_bg_app border_radius: 3.0 border_size: 1.0 border_color: theme.color_bevel}
            carousel_slide_index := Label{width: Fill height: Fit text: "Slide 1 of 3" draw_text +: {color: theme.color_text_meta}}
            carousel_slide := Label{width: Fill height: Fit text: "Release readiness" draw_text +: {color: theme.color_text text_style +: {font_size: 18.0}}}
        }
        carousel_controls := View{width: Fill height: 32 flow: Right spacing: 5
            carousel_previous := Button{width: Fit height: 30 text: "Previous"}
            carousel_next := Button{width: Fit height: 30 text: "Next"}
            carousel_pause := Button{width: Fit height: 30 text: "Pause"}
            carousel_motion := Button{width: Fit height: 30 text: "Reduce motion"}
            carousel_visibility := Button{width: Fit height: 30 text: "Hide stage"}
        }
        carousel_status := Label{width: Fill height: Fit text: "Active; no persistent timer" draw_text +: {color: theme.color_text_meta}}
    }

    mod.widgets.TesseraSplitterBase = #(TesseraSplitter::register_widget(vm))
    mod.widgets.TesseraSplitter = set_type_default() do mod.widgets.TesseraSplitterBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 8
        splitter_title := Label{width: Fill height: Fit text: "Resizable workspace" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        splitter_regions := View{width: Fill height: 42 flow: Right spacing: 6
            splitter_leading := Label{width: Fill height: Fit text: "Navigation: 320 px" draw_text +: {color: theme.color_text}}
            splitter_rule := Label{width: Fit height: Fit text: "|" draw_text +: {color: theme.color_text_meta}}
            splitter_trailing := Label{width: Fill height: Fit text: "Content region" draw_text +: {color: theme.color_text}}
        }
        splitter_control := Slider{width: Fill height: 38 min: 180.0 max: 560.0 step: 1.0 default: 320.0}
        splitter_controls := View{width: Fill height: 32 flow: Right spacing: 5
            splitter_decrease := Button{width: Fit height: 30 text: "Narrow"}
            splitter_increase := Button{width: Fit height: 30 text: "Widen"}
        }
        splitter_status := Label{width: Fill height: Fit text: "320 px (min 180, max 560)" draw_text +: {color: theme.color_text_meta}}
    }

    mod.widgets.TesseraBorderBeamBase = #(TesseraBorderBeam::register_widget(vm))
    mod.widgets.TesseraBorderBeam = set_type_default() do mod.widgets.TesseraBorderBeamBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 8
        border_beam_title := Label{width: Fill height: Fit text: "Verification boundary" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        border_beam_frame := mod.widgets.TesseraBeamVisual{
            border_beam_indicator := Label{width: Fill height: Fit text: "Release workspace" draw_text +: {color: theme.color_text}}
            border_beam_hint := Label{width: Fill height: Fit text: "Local changes" draw_text +: {color: theme.color_text_meta}}
        }
        border_beam_controls := View{width: Fill height: 32 flow: Right spacing: 5
            border_beam_advance := Button{width: Fit height: 30 text: "Restart"}
            border_beam_pause := Button{width: Fit height: 30 text: "Pause"}
            border_beam_motion := CheckBox{width: Fit height: 28 text: "Reduced motion"}
        }
        border_beam_status := Label{width: Fill height: Fit text: "Active" draw_text +: {color: theme.color_text_meta}}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraCarousel {
    #[deref]
    view: View,
    #[rust]
    fixture: CarouselFixture,
    #[rust]
    state: CarouselState,
}

impl TesseraCarousel {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = CarouselFixture::DEFAULT;
        self.state = CarouselState::default();
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: CarouselEvent) {
        self.state.reduce(event);
        self.sync(cx);
        let action = match event {
            CarouselEvent::Previous | CarouselEvent::Next => CarouselAction::SlideChanged {
                index: self.state.active,
            },
            CarouselEvent::TogglePause
            | CarouselEvent::ToggleReducedMotion
            | CarouselEvent::ToggleVisible => CarouselAction::PlaybackChanged {
                idle: self.state.is_idle(),
            },
            CarouselEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.view.label(cx, ids!(carousel_slide_index)).set_text(
            cx,
            &format!(
                "Slide {} of {}",
                self.state.active + 1,
                self.fixture.slides.len()
            ),
        );
        self.view
            .label(cx, ids!(carousel_slide))
            .set_text(cx, self.fixture.slides[self.state.active]);
        self.view
            .widget(cx, ids!(carousel_stage))
            .set_visible(cx, self.state.visible);
        self.view
            .button(cx, ids!(carousel_pause))
            .set_text(cx, if self.state.paused { "Resume" } else { "Pause" });
        self.view.button(cx, ids!(carousel_motion)).set_text(
            cx,
            if self.state.reduced_motion {
                "Enable motion"
            } else {
                "Reduce motion"
            },
        );
        self.view.button(cx, ids!(carousel_visibility)).set_text(
            cx,
            if self.state.visible {
                "Hide stage"
            } else {
                "Show stage"
            },
        );
        self.view.label(cx, ids!(carousel_status)).set_text(
            cx,
            if self.state.is_idle() {
                "Idle: paused, reduced-motion, or hidden; no frame scheduled."
            } else {
                "Active; advances only through explicit navigation."
            },
        );
        self.view.redraw(cx);
    }
}

impl Widget for TesseraCarousel {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(carousel_previous))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, CarouselEvent::Previous);
        } else if self
            .view
            .button(cx, ids!(carousel_next))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, CarouselEvent::Next);
        } else if self
            .view
            .button(cx, ids!(carousel_pause))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, CarouselEvent::TogglePause);
        } else if self
            .view
            .button(cx, ids!(carousel_motion))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, CarouselEvent::ToggleReducedMotion);
        } else if self
            .view
            .button(cx, ids!(carousel_visibility))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, CarouselEvent::ToggleVisible);
        } else if let Event::KeyDown(key) = event
            && self.view.widget(cx, ids!(carousel_controls)).key_focus(cx)
            && key.key_code == KeyCode::Escape
        {
            self.apply_event(cx, CarouselEvent::TogglePause);
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraSplitter {
    #[deref]
    view: View,
    #[rust]
    fixture: SplitterFixture,
    #[rust]
    state: SplitterState,
    #[rust]
    slider_key_active: bool,
}

impl TesseraSplitter {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = SplitterFixture::DEFAULT;
        self.state = SplitterState::default();
        self.slider_key_active = false;
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: SplitterEvent) {
        self.state.reduce(event, self.fixture);
        self.sync(cx);
        if !matches!(event, SplitterEvent::Reset) {
            cx.widget_action(
                self.widget_uid(),
                SplitterAction::Resized {
                    leading: self.state.leading,
                },
            );
        }
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(splitter_leading))
            .set_text(cx, &format!("Navigation: {} px", self.state.leading));
        self.view.label(cx, ids!(splitter_trailing)).set_text(
            cx,
            &format!(
                "Content: {} px remaining",
                self.fixture
                    .maximum
                    .saturating_sub(self.state.leading)
                    .saturating_add(self.fixture.minimum)
            ),
        );
        self.view
            .slider(cx, ids!(splitter_control))
            .set_value(cx, f64::from(self.state.leading));
        self.view.label(cx, ids!(splitter_status)).set_text(
            cx,
            &format!(
                "{} px (min {}, max {})",
                self.state.leading, self.fixture.minimum, self.fixture.maximum
            ),
        );
        set_button_enabled(
            &self.view.button(cx, ids!(splitter_decrease)),
            cx,
            self.state.leading > self.fixture.minimum,
        );
        set_button_enabled(
            &self.view.button(cx, ids!(splitter_increase)),
            cx,
            self.state.leading < self.fixture.maximum,
        );
        self.view.redraw(cx);
    }
}

impl Widget for TesseraSplitter {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        let slider_uid = self.view.slider(cx, ids!(splitter_control)).widget_uid();
        if matches!(
            actions.find_widget_action_cast::<SliderAction>(slider_uid),
            SliderAction::StartSlide
        ) {
            // Slider delegates keyboard focus to its internal TextInput on pointer down.
            self.slider_key_active = true;
        }
        if let Some(value) = self
            .view
            .slider(cx, ids!(splitter_control))
            .slided(&actions)
        {
            self.apply_event(cx, SplitterEvent::Resize(value.round() as u16));
        } else if self
            .view
            .button(cx, ids!(splitter_decrease))
            .activated(cx, event, &actions)
        {
            self.slider_key_active = false;
            self.apply_event(cx, SplitterEvent::Decrease);
        } else if self
            .view
            .button(cx, ids!(splitter_increase))
            .activated(cx, event, &actions)
        {
            self.slider_key_active = false;
            self.apply_event(cx, SplitterEvent::Increase);
        } else if (self.slider_key_active
            || self.view.widget(cx, ids!(splitter_control)).key_focus(cx))
            && let Event::KeyDown(key) = event
        {
            match key.key_code {
                KeyCode::ArrowLeft => self.apply_event(cx, SplitterEvent::Decrease),
                KeyCode::ArrowRight => self.apply_event(cx, SplitterEvent::Increase),
                KeyCode::Home => self.apply_event(cx, SplitterEvent::Resize(self.fixture.minimum)),
                KeyCode::End => self.apply_event(cx, SplitterEvent::Resize(self.fixture.maximum)),
                KeyCode::Tab => self.slider_key_active = false,
                _ => {}
            }
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraBorderBeam {
    #[deref]
    view: View,
    #[rust]
    state: BorderBeamState,
    #[rust]
    motion: MotionClock,
}

impl TesseraBorderBeam {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.state = BorderBeamState::default();
        self.motion.set_active(cx, false, false);
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: BorderBeamEvent) {
        self.state.reduce(event);
        self.sync(cx);
        if event == BorderBeamEvent::Restart {
            self.motion.restart(cx);
        }
        let action = match event {
            BorderBeamEvent::Restart => BorderBeamAction::Restarted,
            BorderBeamEvent::ToggleRunning | BorderBeamEvent::SetReducedMotion(_) => {
                BorderBeamAction::MotionChanged {
                    static_frame: self.state.is_static(),
                }
            }
            BorderBeamEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.motion
            .set_active(cx, self.state.running, self.state.reduced_motion);
        self.view.button(cx, ids!(border_beam_pause)).set_text(
            cx,
            if self.state.running {
                "Pause"
            } else {
                "Resume"
            },
        );
        self.view
            .check_box(cx, ids!(border_beam_motion))
            .set_active(cx, self.state.reduced_motion, Animate::No);
        set_button_enabled(
            &self.view.button(cx, ids!(border_beam_advance)),
            cx,
            !self.state.reduced_motion,
        );
        self.view.label(cx, ids!(border_beam_status)).set_text(
            cx,
            if self.state.is_static() {
                "Paused"
            } else {
                "Active"
            },
        );
        self.view.redraw(cx);
    }
    fn paint(&mut self, cx: &mut Cx) {
        project_phase(
            &self.view,
            cx,
            &[ids!(border_beam_frame)],
            self.motion.phase(),
            self.state.running,
        );
    }
}

impl Widget for TesseraBorderBeam {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.paint(cx);
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        if self
            .motion
            .handle_event(cx, event, self.view.visible(), "border-beam")
        {
            if self.motion.exhausted() {
                self.apply_event(cx, BorderBeamEvent::ToggleRunning);
            } else {
                self.view.redraw(cx);
            }
        }
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(border_beam_advance))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, BorderBeamEvent::Restart);
        } else if self
            .view
            .button(cx, ids!(border_beam_pause))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, BorderBeamEvent::ToggleRunning);
        } else if let Some(value) = checkbox_change(
            &self.view.check_box(cx, ids!(border_beam_motion)),
            cx,
            event,
            &actions,
        ) {
            self.apply_event(cx, BorderBeamEvent::SetReducedMotion(value));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        BorderBeamEvent, BorderBeamState, CarouselEvent, CarouselState, InteractiveSurfaceCatalog,
        SplitterEvent, SplitterFixture, SplitterState,
    };
    use tessera_core::catalog::ComponentId;

    #[test]
    fn catalog_has_distinct_interactive_widgets() {
        assert_eq!(
            InteractiveSurfaceCatalog::widget_name(ComponentId::Carousel),
            Some("TesseraCarousel")
        );
        assert_eq!(
            InteractiveSurfaceCatalog::widget_name(ComponentId::Splitter),
            Some("TesseraSplitter")
        );
        assert_eq!(
            InteractiveSurfaceCatalog::widget_name(ComponentId::BorderBeam),
            Some("TesseraBorderBeam")
        );
    }

    #[test]
    fn carousel_and_beam_have_explicit_idle_paths() {
        let mut carousel = CarouselState::default();
        carousel.reduce(CarouselEvent::ToggleReducedMotion);
        assert!(carousel.is_idle());
        let mut beam = BorderBeamState::default();
        beam.reduce(BorderBeamEvent::ToggleRunning);
        assert!(beam.is_static());
    }

    #[test]
    fn splitter_respects_bounds_for_pointer_and_keyboard_changes() {
        let mut splitter = SplitterState::default();
        splitter.reduce(SplitterEvent::Resize(1), SplitterFixture::DEFAULT);
        assert_eq!(splitter.leading, 180);
        splitter.reduce(SplitterEvent::Resize(900), SplitterFixture::DEFAULT);
        assert_eq!(splitter.leading, 560);
    }
}
