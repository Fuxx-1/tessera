use crate::foundation::input::ButtonActivationExt;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct MobilePreviewFrameSurfaceCatalog;

impl MobilePreviewFrameSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::MobilePreviewFrame => Some("TesseraMobilePreviewFrame"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct MobilePreviewFrameFixture {
    pub title: &'static str,
    pub devices: [&'static str; 3],
    pub viewports: [(u16, u16); 3],
    pub content_hint: &'static str,
}

impl MobilePreviewFrameFixture {
    pub const DEFAULT: Self = Self {
        title: "Mobile preview frame",
        devices: ["Phone", "Fold", "Tablet"],
        viewports: [(390, 844), (412, 915), (840, 1180)],
        content_hint: "Native account fixture",
    };
}

impl Default for MobilePreviewFrameFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

fn fit_viewport(viewport: (u16, u16), landscape: bool, available: DVec2) -> DVec2 {
    let (width, height) = if landscape {
        (viewport.1, viewport.0)
    } else {
        viewport
    };
    let size = dvec2(f64::from(width), f64::from(height));
    let scale = (available.x.max(1.0) / size.x).min(available.y.max(1.0) / size.y);
    size * scale
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct MobilePreviewFrameState {
    pub device: usize,
    pub landscape: bool,
    pub visits: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MobilePreviewFrameEvent {
    PreviousDevice,
    NextDevice,
    ToggleOrientation,
    ActivateFixture,
    Reset,
}

impl MobilePreviewFrameState {
    pub fn reduce(&mut self, event: MobilePreviewFrameEvent, fixture: MobilePreviewFrameFixture) {
        match event {
            MobilePreviewFrameEvent::PreviousDevice => {
                self.device = if self.device == 0 {
                    fixture.devices.len() - 1
                } else {
                    self.device - 1
                };
                self.visits = self.visits.saturating_add(1);
            }
            MobilePreviewFrameEvent::NextDevice => {
                self.device = (self.device + 1) % fixture.devices.len();
                self.visits = self.visits.saturating_add(1);
            }
            MobilePreviewFrameEvent::ToggleOrientation => {
                self.landscape = !self.landscape;
                self.visits = self.visits.saturating_add(1);
            }
            MobilePreviewFrameEvent::ActivateFixture => {
                self.visits = self.visits.saturating_add(1);
            }
            MobilePreviewFrameEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum MobilePreviewFrameAction {
    DeviceChanged {
        device: usize,
    },
    OrientationChanged {
        landscape: bool,
    },
    FixtureActivated {
        visits: u32,
    },
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraMobilePreviewFrameBase = #(TesseraMobilePreviewFrame::register_widget(vm))
    mod.widgets.TesseraMobilePreviewFrame = set_type_default() do mod.widgets.TesseraMobilePreviewFrameBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        mobile_preview_title := Label{width: Fill height: Fit text: "Mobile preview frame" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        mobile_preview_device := Label{width: Fill height: Fit text: "Phone" draw_text +: {color: theme.color_text_meta}}
        mobile_preview_size := Label{width: Fill height: Fit text: "390 x 844" draw_text +: {color: theme.color_text}}
        mobile_preview_shell := View{
            width: Fill
            height: 340
            flow: Overlay
            align: Center
            mobile_preview_device_frame := RoundedView{
                width: 146
                height: 316
                flow: Down
                spacing: 5
                padding: Inset{left: 12, right: 12, top: 10, bottom: 10}
                show_bg: true
                draw_bg +: {color: theme.color_fg_app border_radius: 8.0 border_size: 2.0 border_color: theme.color_bevel}
                mobile_preview_safe_area := SolidView{width: Fill height: 4 draw_bg.color: theme.color_bevel}
                mobile_preview_scroll := ScrollYView{
                    width: Fill height: Fill flow: Down spacing: 8
                    mobile_preview_fixture_heading := Label{width: Fill height: Fit text: "Phone native fixture" draw_text +: {color: theme.color_text flow: Flow.Right{wrap: true} text_style +: {font_size: 12.0}}}
                    mobile_preview_fixture_input := TextInputFlat{width: Fill height: 30 empty_text: "Account name"}
                    mobile_preview_fixture_toggle := CheckBox{text: "Sync enabled"}
                    mobile_preview_fixture_action := Button{width: Fit height: 28 text: "Save locally"}
                    mobile_preview_content := Label{width: Fill height: Fit text: "Native account fixture" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
                }
            }
        }
        mobile_preview_controls := View{
            width: Fill
            height: 30
            flow: Right
            spacing: 6
            mobile_preview_previous := Button{width: Fit height: 30 text: "Previous"}
            mobile_preview_next := Button{width: Fit height: 30 text: "Next"}
            mobile_preview_rotate := Button{width: Fit height: 30 text: "Rotate"}
        }
        mobile_preview_status := Label{width: Fill height: Fit text: "Mobile preview idle" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraMobilePreviewFrame {
    #[deref]
    view: View,
    #[rust]
    fixture: MobilePreviewFrameFixture,
    #[rust]
    state: MobilePreviewFrameState,
}

impl TesseraMobilePreviewFrame {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = MobilePreviewFrameFixture::DEFAULT;
        self.state = MobilePreviewFrameState::default();
        self.sync(cx);
    }

    fn apply_event(&mut self, cx: &mut Cx, event: MobilePreviewFrameEvent) {
        self.state.reduce(event, self.fixture);
        self.sync(cx);
        let action = match event {
            MobilePreviewFrameEvent::PreviousDevice | MobilePreviewFrameEvent::NextDevice => {
                MobilePreviewFrameAction::DeviceChanged {
                    device: self.state.device,
                }
            }
            MobilePreviewFrameEvent::ToggleOrientation => {
                MobilePreviewFrameAction::OrientationChanged {
                    landscape: self.state.landscape,
                }
            }
            MobilePreviewFrameEvent::ActivateFixture => {
                MobilePreviewFrameAction::FixtureActivated {
                    visits: self.state.visits,
                }
            }
            MobilePreviewFrameEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }

    fn sync(&mut self, cx: &mut Cx) {
        let (width, height) = self.fixture.viewports[self.state.device];
        let (display_width, display_height) = if self.state.landscape {
            (height, width)
        } else {
            (width, height)
        };
        self.view
            .label(cx, ids!(mobile_preview_title))
            .set_text(cx, self.fixture.title);
        self.view
            .label(cx, ids!(mobile_preview_device))
            .set_text(cx, self.fixture.devices[self.state.device]);
        self.view
            .label(cx, ids!(mobile_preview_size))
            .set_text(cx, &format!("{display_width} x {display_height}"));
        self.view
            .label(cx, ids!(mobile_preview_fixture_heading))
            .set_text(
                cx,
                &format!("{} native fixture", self.fixture.devices[self.state.device]),
            );
        self.view.label(cx, ids!(mobile_preview_content)).set_text(
            cx,
            &format!(
                "{} / {}",
                self.fixture.content_hint,
                if self.state.landscape {
                    "landscape"
                } else {
                    "portrait"
                }
            ),
        );
        self.view.button(cx, ids!(mobile_preview_rotate)).set_text(
            cx,
            if self.state.landscape {
                "Portrait"
            } else {
                "Landscape"
            },
        );
        self.view.label(cx, ids!(mobile_preview_status)).set_text(
            cx,
            &format!(
                "device {} / landscape {} / visits {}",
                self.state.device, self.state.landscape, self.state.visits
            ),
        );
        self.view.redraw(cx);
    }
}

impl Widget for TesseraMobilePreviewFrame {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        let available_width =
            cx.peek_walk_turtle(walk).size.x - self.view.layout.padding.width() - 24.0;
        let size = fit_viewport(
            self.fixture.viewports[self.state.device],
            self.state.landscape,
            dvec2(available_width, 316.0),
        );
        if let Some(mut frame) = self
            .view
            .widget(cx, ids!(mobile_preview_device_frame))
            .borrow_mut::<View>()
        {
            frame.walk.width = Size::Fixed(size.x);
            frame.walk.height = Size::Fixed(size.y);
        }
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let toggle = self.view.check_box(cx, ids!(mobile_preview_fixture_toggle));
        if crate::foundation::input::disabled_control_pointer(&toggle, cx, event) {
            return;
        }
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        crate::foundation::input::checkbox_change(&toggle, cx, event, &actions);
        if self
            .view
            .button(cx, ids!(mobile_preview_previous))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, MobilePreviewFrameEvent::PreviousDevice);
        } else if self
            .view
            .button(cx, ids!(mobile_preview_next))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, MobilePreviewFrameEvent::NextDevice);
        } else if self
            .view
            .button(cx, ids!(mobile_preview_rotate))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, MobilePreviewFrameEvent::ToggleOrientation);
        } else if self
            .view
            .button(cx, ids!(mobile_preview_fixture_action))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, MobilePreviewFrameEvent::ActivateFixture);
        } else if self.view.key_focus(cx) {
            if let Event::KeyDown(key) = event {
                match key.key_code {
                    KeyCode::ArrowLeft => {
                        self.apply_event(cx, MobilePreviewFrameEvent::PreviousDevice)
                    }
                    KeyCode::ArrowRight => {
                        self.apply_event(cx, MobilePreviewFrameEvent::NextDevice)
                    }
                    KeyCode::Space | KeyCode::ReturnKey | KeyCode::NumpadEnter => {
                        self.apply_event(cx, MobilePreviewFrameEvent::ToggleOrientation)
                    }
                    _ => {}
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        MobilePreviewFrameEvent, MobilePreviewFrameState, MobilePreviewFrameSurfaceCatalog,
    };
    use tessera_core::catalog::ComponentId;

    #[test]
    fn device_frame_preserves_aspect_within_narrow_and_wide_bounds() {
        for viewport in super::MobilePreviewFrameFixture::DEFAULT.viewports {
            for landscape in [false, true] {
                for width in [220.0, 484.0, 900.0] {
                    let size = super::fit_viewport(viewport, landscape, super::dvec2(width, 316.0));
                    let ratio = if landscape {
                        f64::from(viewport.1) / f64::from(viewport.0)
                    } else {
                        f64::from(viewport.0) / f64::from(viewport.1)
                    };
                    assert!((size.x / size.y - ratio).abs() < 0.000_001);
                    assert!(size.x <= width + 0.000_001 && size.y <= 316.000_001);
                }
            }
        }
    }

    #[test]
    fn mobile_preview_frame_routes_to_the_native_widget() {
        assert_eq!(
            MobilePreviewFrameSurfaceCatalog::widget_name(ComponentId::MobilePreviewFrame),
            Some("TesseraMobilePreviewFrame")
        );
    }

    #[test]
    fn mobile_preview_frame_cycles_devices_and_orientation() {
        let fixture = super::MobilePreviewFrameFixture::DEFAULT;
        let mut state = MobilePreviewFrameState::default();
        state.reduce(MobilePreviewFrameEvent::NextDevice, fixture);
        state.reduce(MobilePreviewFrameEvent::ToggleOrientation, fixture);
        assert_eq!(state.device, 1);
        assert!(state.landscape);
        state.reduce(MobilePreviewFrameEvent::ActivateFixture, fixture);
        assert_eq!(state.visits, 3);
    }
}
