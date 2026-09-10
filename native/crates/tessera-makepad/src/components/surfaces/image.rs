use crate::foundation::input::ButtonActivationExt;
use crate::foundation::input::set_button_enabled;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct ImageSurfaceCatalog;
impl ImageSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Image => Some("TesseraImage"),
            _ => None,
        }
    }
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ImageFixture {
    pub title: &'static str,
    pub caption: &'static str,
}
impl ImageFixture {
    pub const DEFAULT: Self = Self {
        title: "Release preview",
        caption: "Embedded bitmap preview with an explicit alt fallback.",
    };
}
impl Default for ImageFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct ImageState {
    pub loaded: bool,
    pub zoomed: bool,
    pub failed: bool,
    pub cache_entries: u8,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ImageEvent {
    ToggleZoom,
    Reload,
    SimulateDecodeFailure,
    Reset,
}
impl ImageState {
    pub fn reduce(&mut self, event: ImageEvent) {
        match event {
            ImageEvent::ToggleZoom if self.loaded => self.zoomed = !self.zoomed,
            ImageEvent::Reload => self.zoomed = false,
            ImageEvent::SimulateDecodeFailure => {
                self.loaded = false;
                self.failed = true;
                self.zoomed = false;
                self.cache_entries = 0;
            }
            ImageEvent::Reset => *self = Self::default(),
            ImageEvent::ToggleZoom => {}
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum ImageAction {
    ZoomChanged {
        zoomed: bool,
    },
    Reloaded,
    DecodeFailed,
    #[default]
    None,
}

const EMBEDDED_PREVIEW_PNG: &[u8] = &[
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x08, 0x08, 0x06, 0x00, 0x00, 0x00, 0xc4, 0x0f, 0xbe,
    0x8b, 0x00, 0x00, 0x00, 0x22, 0x49, 0x44, 0x41, 0x54, 0x78, 0xda, 0x63, 0x50, 0x6c, 0x39, 0xfe,
    0x1f, 0x84, 0xdf, 0x7c, 0xfd, 0x05, 0xc6, 0xe8, 0x7c, 0x06, 0x82, 0x0a, 0x70, 0x49, 0xc0, 0xf8,
    0x84, 0x15, 0x0c, 0x02, 0x37, 0x00, 0x00, 0x47, 0xe1, 0xc8, 0xa1, 0x44, 0xac, 0x89, 0x53, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
];

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraImageBase = #(TesseraImage::register_widget(vm))
    mod.widgets.TesseraImage = set_type_default() do mod.widgets.TesseraImageBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        image_title := Label{width: Fill height: Fit text: "Release preview" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        image_frame := RoundedView{width: Fill height: 112 align: Align{x: 0.5, y: 0.5} draw_bg +: {color: #x3c5568 border_radius: 3.0 border_size: 1.0 border_color: theme.color_bevel}
            image_surface := Image{width: 180 height: 72 fit: ImageFit.CropToFill}
            image_fallback := Label{width: Fit height: Fit visible: false text: "Image unavailable - Release preview" draw_text +: {color: #xffffff text_style +: {font_size: 12.0}}}
        }
        image_caption := Label{width: Fill height: Fit text: "Bounded preview frame with an explicit loaded state." draw_text.flow: Flow.Right{wrap: true}}
        image_zoom := Button{width: Fit height: 30 text: "Zoom preview"}
        image_reload := Button{width: Fit height: 30 text: "Reload preview"}
        image_fail := Button{width: Fit height: 30 text: "Show decode failure"}
        image_status := Label{width: Fill height: Fit text: "Loaded / 1x"}
    }
}
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraImage {
    #[deref]
    view: View,
    #[rust]
    fixture: ImageFixture,
    #[rust]
    state: ImageState,
}
impl TesseraImage {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = ImageFixture::DEFAULT;
        self.state = ImageState::default();
        self.load_bitmap(cx);
        self.sync(cx);
    }
    fn apply_event(&mut self, cx: &mut Cx, event: ImageEvent) {
        self.state.reduce(event);
        if matches!(event, ImageEvent::Reload) {
            self.load_bitmap(cx);
        }
        self.sync(cx);
        let action = match event {
            ImageEvent::ToggleZoom => ImageAction::ZoomChanged {
                zoomed: self.state.zoomed,
            },
            ImageEvent::Reload => ImageAction::Reloaded,
            ImageEvent::SimulateDecodeFailure => ImageAction::DecodeFailed,
            ImageEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }
    fn load_bitmap(&mut self, cx: &mut Cx) {
        self.state.loaded = self
            .view
            .image(cx, ids!(image_surface))
            .load_png_from_data(cx, EMBEDDED_PREVIEW_PNG)
            .is_ok();
        self.state.failed = !self.state.loaded;
        self.state.cache_entries = u8::from(self.state.loaded);
    }

    fn sync_transform(&self, cx: &mut Cx) {
        let image = self.view.image(cx, ids!(image_surface));
        if let Some(mut image) = image.borrow_mut() {
            if self.state.zoomed {
                image.draw_bg.image_scale = vec2(0.5, 0.5);
                image.draw_bg.image_pan = vec2(0.25, 0.25);
            } else {
                image.draw_bg.image_scale = vec2(1.0, 1.0);
                image.draw_bg.image_pan = vec2(0.0, 0.0);
            }
            image
                .draw_bg
                .update_instance_area_value(cx, ids!(image_scale));
            image
                .draw_bg
                .update_instance_area_value(cx, ids!(image_pan));
        }
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(image_title))
            .set_text(cx, self.fixture.title);
        self.view
            .label(cx, ids!(image_caption))
            .set_text(cx, self.fixture.caption);
        self.view.label(cx, ids!(image_status)).set_text(
            cx,
            if self.state.failed {
                "Fallback / decode failed"
            } else if self.state.zoomed {
                "Loaded / 2x crop / cache 1"
            } else {
                "Loaded / 1x / cache 1"
            },
        );
        self.view
            .widget(cx, ids!(image_surface))
            .set_visible(cx, self.state.loaded);
        self.view
            .label(cx, ids!(image_fallback))
            .set_visible(cx, self.state.failed);
        self.view.button(cx, ids!(image_zoom)).set_text(
            cx,
            if self.state.zoomed {
                "Reset zoom"
            } else {
                "Zoom preview"
            },
        );
        set_button_enabled(
            &self.view.button(cx, ids!(image_zoom)),
            cx,
            self.state.loaded,
        );
        self.view.button(cx, ids!(image_fail)).set_text(
            cx,
            if self.state.failed {
                "Decode failure shown"
            } else {
                "Show decode failure"
            },
        );
        self.sync_transform(cx);
        self.view.redraw(cx);
    }
}
impl Widget for TesseraImage {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(image_zoom))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, ImageEvent::ToggleZoom);
        } else if self
            .view
            .button(cx, ids!(image_reload))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, ImageEvent::Reload);
        } else if self
            .view
            .button(cx, ids!(image_fail))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, ImageEvent::SimulateDecodeFailure);
        }
    }
}
#[cfg(test)]
mod tests {
    use super::{ImageEvent, ImageState, ImageSurfaceCatalog};
    use tessera_core::catalog::ComponentId;
    #[test]
    fn image_has_loaded_and_zoom_states() {
        assert_eq!(
            ImageSurfaceCatalog::widget_name(ComponentId::Image),
            Some("TesseraImage")
        );
        let mut state = ImageState {
            loaded: true,
            cache_entries: 1,
            ..ImageState::default()
        };
        state.reduce(ImageEvent::ToggleZoom);
        assert!(state.loaded && state.zoomed);
        state.reduce(ImageEvent::Reload);
        assert!(state.loaded && !state.zoomed);
        state.reduce(ImageEvent::SimulateDecodeFailure);
        assert!(state.failed && !state.loaded && state.cache_entries == 0);
        state.reduce(ImageEvent::Reset);
        assert_eq!(state, ImageState::default());
    }
}
