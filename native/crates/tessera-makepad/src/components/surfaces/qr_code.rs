use crate::foundation::input::ButtonActivationExt;
use crate::foundation::vector::AlignedVector as DrawVector;
use crate::makepad_widgets::*;
use qrcodegen::{QrCode, QrCodeEcc};
use tessera_core::catalog::ComponentId;

pub const MAX_PAYLOAD_BYTES: usize = 256;
pub const MIN_QUIET_ZONE_MODULES: u8 = 4;

pub struct QrCodeSurfaceCatalog;

impl QrCodeSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::QrCode => Some("TesseraQrCode"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct QrCodeFixture {
    pub title: &'static str,
    pub payload: &'static str,
    pub quiet_zone_modules: u8,
    pub contrast_ratio_milli: u16,
}

impl QrCodeFixture {
    pub const DEFAULT: Self = Self {
        title: "Release handoff",
        payload: "tessera://release/809c027",
        quiet_zone_modules: MIN_QUIET_ZONE_MODULES,
        contrast_ratio_milli: 5_000,
    };
}

impl Default for QrCodeFixture {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct QrCodeState {
    pub regenerations: u32,
    pub fallback: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum QrCodeEvent {
    Regenerate,
    ToggleFallback,
    Reset,
}

impl QrCodeState {
    pub fn reduce(&mut self, event: QrCodeEvent) {
        match event {
            QrCodeEvent::Regenerate => self.regenerations = self.regenerations.saturating_add(1),
            QrCodeEvent::ToggleFallback => self.fallback = !self.fallback,
            QrCodeEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum QrCodeAction {
    Regenerated {
        regenerations: u32,
    },
    FallbackChanged {
        enabled: bool,
    },
    #[default]
    None,
}

fn payload_is_valid(fixture: QrCodeFixture) -> bool {
    payload_budget_is_valid(
        fixture.payload.len(),
        fixture.quiet_zone_modules,
        fixture.contrast_ratio_milli,
    )
}

fn payload_budget_is_valid(
    payload_bytes: usize,
    quiet_zone_modules: u8,
    contrast_ratio_milli: u16,
) -> bool {
    payload_bytes > 0
        && payload_bytes <= MAX_PAYLOAD_BYTES
        && quiet_zone_modules >= MIN_QUIET_ZONE_MODULES
        && contrast_ratio_milli >= 4_500
}

fn encode(fixture: QrCodeFixture) -> Result<QrCode, &'static str> {
    if !payload_is_valid(fixture) {
        return Err("INVALID PAYLOAD");
    }
    QrCode::encode_binary(fixture.payload.as_bytes(), QrCodeEcc::Low)
        .map_err(|_| "PAYLOAD DOES NOT FIT")
}

fn fixture_for_state(fixture: QrCodeFixture, state: QrCodeState) -> QrCodeFixture {
    if state.fallback {
        QrCodeFixture {
            payload: "",
            ..fixture
        }
    } else if state.regenerations % 2 == 1 {
        QrCodeFixture {
            payload: "tessera://release/809c028",
            ..fixture
        }
    } else {
        fixture
    }
}

fn module_size(side: f64, count: i32, quiet: u8, dpi: f64) -> f64 {
    let total = f64::from(count + i32::from(quiet) * 2);
    (side * dpi / total).floor().max(0.0) / dpi
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraQrCodeBase = #(TesseraQrCode::register_widget(vm))
    mod.widgets.TesseraQrCode = set_type_default() do mod.widgets.TesseraQrCodeBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        qr_title := Label{width: Fill height: Fit text: "Release handoff" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        qr_matrix := View{width: 224 height: 224 show_bg: true draw_bg.color: #ffffff}
        qr_payload := Label{width: Fill height: Fit text: "tessera://release/809c027"}
        qr_regenerate := Button{width: Fit height: 30 text: "Regenerate code"}
        qr_fallback := Button{width: Fit height: 30 text: "Show fallback"}
        qr_status := Label{width: Fill height: Fit text: "Native QR / ECC low / quiet zone 4"}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraQrCode {
    #[deref]
    view: View,
    #[live]
    draw_matrix: DrawVector,
    #[rust]
    matrix: Option<QrCode>,
    #[rust]
    fixture: QrCodeFixture,
    #[rust]
    state: QrCodeState,
}

impl TesseraQrCode {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.fixture = QrCodeFixture::DEFAULT;
        self.state = QrCodeState::default();
        self.sync(cx);
    }

    fn apply_event(&mut self, cx: &mut Cx, event: QrCodeEvent) {
        self.state.reduce(event);
        self.sync(cx);
        let action = match event {
            QrCodeEvent::Regenerate => QrCodeAction::Regenerated {
                regenerations: self.state.regenerations,
            },
            QrCodeEvent::ToggleFallback => QrCodeAction::FallbackChanged {
                enabled: self.state.fallback,
            },
            QrCodeEvent::Reset => return,
        };
        cx.widget_action(self.widget_uid(), action);
    }

    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(qr_title))
            .set_text(cx, self.fixture.title);
        self.view
            .label(cx, ids!(qr_payload))
            .set_text(cx, fixture_for_state(self.fixture, self.state).payload);
        let encoded = encode(fixture_for_state(self.fixture, self.state));
        let status = match &encoded {
            Ok(qr) => format!(
                "Native QR / {} modules / ECC low / quiet zone {} / generation {}",
                qr.size(),
                self.fixture.quiet_zone_modules,
                self.state.regenerations
            ),
            Err(error) => format!("QR unavailable: {error} / fallback text shown"),
        };
        self.matrix = encoded.ok();
        self.view
            .view(cx, ids!(qr_matrix))
            .set_visible(cx, self.matrix.is_some());
        self.view.label(cx, ids!(qr_status)).set_text(cx, &status);
        self.view.button(cx, ids!(qr_fallback)).set_text(
            cx,
            if self.state.fallback {
                "Restore QR"
            } else {
                "Show fallback"
            },
        );
        self.view.redraw(cx);
    }
}

impl Widget for TesseraQrCode {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)?;
        if let Some(qr) = &self.matrix {
            let rect = self.view.widget(cx, ids!(qr_matrix)).area().rect(cx);
            let dpi = cx.current_dpi_factor();
            let cell = module_size(
                rect.size.x.min(rect.size.y),
                qr.size(),
                self.fixture.quiet_zone_modules,
                dpi,
            );
            if cell > 0.0 {
                let total =
                    f64::from(qr.size() + i32::from(self.fixture.quiet_zone_modules) * 2) * cell;
                let origin = dvec2(
                    ((rect.pos.x + (rect.size.x - total) * 0.5) * dpi).round() / dpi,
                    ((rect.pos.y + (rect.size.y - total) * 0.5) * dpi).round() / dpi,
                ) + dvec2(cell, cell) * f64::from(self.fixture.quiet_zone_modules);
                self.draw_matrix.begin();
                self.draw_matrix.set_color(1.0, 1.0, 1.0, 1.0);
                self.draw_matrix.rect(
                    rect.pos.x as f32,
                    rect.pos.y as f32,
                    rect.size.x as f32,
                    rect.size.y as f32,
                );
                self.draw_matrix.fill();
                self.draw_matrix.set_color(0.0, 0.0, 0.0, 1.0);
                for y in 0..qr.size() {
                    for x in 0..qr.size() {
                        if qr.get_module(x, y) {
                            self.draw_matrix.rect(
                                (origin.x + f64::from(x) * cell) as f32,
                                (origin.y + f64::from(y) * cell) as f32,
                                cell as f32,
                                cell as f32,
                            );
                        }
                    }
                }
                self.draw_matrix.fill();
                self.draw_matrix.end(cx);
            }
        }
        DrawStep::done()
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(qr_regenerate))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, QrCodeEvent::Regenerate);
        } else if self
            .view
            .button(cx, ids!(qr_fallback))
            .activated(cx, event, &actions)
        {
            self.apply_event(cx, QrCodeEvent::ToggleFallback);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        MAX_PAYLOAD_BYTES, MIN_QUIET_ZONE_MODULES, QrCodeEvent, QrCodeFixture, QrCodeState,
        QrCodeSurfaceCatalog, encode, fixture_for_state, module_size, payload_budget_is_valid,
        payload_is_valid,
    };
    use tessera_core::catalog::ComponentId;

    #[test]
    fn qr_code_encodes_a_standard_bounded_matrix() {
        assert_eq!(
            QrCodeSurfaceCatalog::widget_name(ComponentId::QrCode),
            Some("TesseraQrCode")
        );
        assert!(payload_is_valid(QrCodeFixture::DEFAULT));
        let qr = encode(QrCodeFixture::DEFAULT).expect("default QR payload");
        assert!((21..=177).contains(&qr.size()));
        for dpi in [1.0, 1.25, 1.5, 2.0] {
            let cell = module_size(224.0, qr.size(), 4, dpi);
            assert_eq!(cell * dpi, (cell * dpi).round());
            assert!(cell * f64::from(qr.size() + 8) <= 224.0);
        }
    }

    #[test]
    fn qr_code_rejects_payloads_outside_the_component_budget() {
        assert!(!payload_budget_is_valid(
            MAX_PAYLOAD_BYTES + 1,
            MIN_QUIET_ZONE_MODULES,
            5_000,
        ));
        let empty = QrCodeFixture {
            payload: "",
            ..QrCodeFixture::DEFAULT
        };
        assert!(!payload_is_valid(empty));
        assert!(encode(empty).is_err());
    }

    #[test]
    fn qr_code_regeneration_has_a_typed_state_transition() {
        let mut state = QrCodeState::default();
        state.reduce(QrCodeEvent::Regenerate);
        assert_eq!(state.regenerations, 1);
        assert_ne!(
            fixture_for_state(QrCodeFixture::DEFAULT, QrCodeState::default()).payload,
            fixture_for_state(QrCodeFixture::DEFAULT, state).payload
        );
        state.reduce(QrCodeEvent::ToggleFallback);
        assert!(state.fallback);
        assert!(encode(fixture_for_state(QrCodeFixture::DEFAULT, state)).is_err());
        state.reduce(QrCodeEvent::Reset);
        assert_eq!(state, QrCodeState::default());
    }
}
