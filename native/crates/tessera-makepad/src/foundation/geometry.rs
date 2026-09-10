use tessera_core::{SystemScale, UiScale};

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LogicalPoint {
    pub x: f32,
    pub y: f32,
}

impl LogicalPoint {
    pub const fn new(x: f32, y: f32) -> Self {
        Self { x, y }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LogicalSize {
    pub width: f32,
    pub height: f32,
}

impl LogicalSize {
    pub const fn new(width: f32, height: f32) -> Self {
        Self { width, height }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LogicalRect {
    pub origin: LogicalPoint,
    pub size: LogicalSize,
}

impl LogicalRect {
    pub const fn new(x: f32, y: f32, width: f32, height: f32) -> Self {
        Self {
            origin: LogicalPoint::new(x, y),
            size: LogicalSize::new(width, height),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PhysicalSize {
    pub width: u32,
    pub height: u32,
}

impl PhysicalSize {
    pub const fn new(width: u32, height: u32) -> Self {
        Self { width, height }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct GeometryScale {
    pub ui: UiScale,
    pub system: SystemScale,
}

impl GeometryScale {
    pub const fn new(ui: UiScale, system: SystemScale) -> Self {
        Self { ui, system }
    }

    pub const fn ui_factor(self) -> f32 {
        self.ui.factor()
    }

    pub const fn system_factor(self) -> f32 {
        self.system.factor()
    }

    pub const fn effective_factor(self) -> f32 {
        self.ui_factor() * self.system_factor()
    }

    pub fn physical_px(self, dip: f32) -> u32 {
        round_half_up(dip * self.effective_factor())
    }

    pub fn hairline_dip(self) -> f32 {
        1.0 / self.effective_factor()
    }

    pub fn effective_width(self, window_client_dip: f32) -> f32 {
        window_client_dip / self.ui_factor()
    }

    pub fn to_physical_size(self, size: LogicalSize) -> PhysicalSize {
        PhysicalSize::new(self.physical_px(size.width), self.physical_px(size.height))
    }

    pub fn summary(self) -> String {
        format!(
            "ui {:.2}x / system {:.2}x / effective {:.2}x / hairline {:.4} dip",
            self.ui_factor(),
            self.system_factor(),
            self.effective_factor(),
            self.hairline_dip()
        )
    }
}

pub fn round_half_up(value: f32) -> u32 {
    if !value.is_finite() || value <= 0.0 {
        0
    } else {
        (value + 0.5).floor() as u32
    }
}

#[cfg(test)]
mod tests {
    use super::{GeometryScale, LogicalSize, round_half_up};
    use tessera_core::{SystemScale, UiScale};

    #[test]
    fn round_half_up_matches_the_frozen_pixel_rule() {
        assert_eq!(round_half_up(1.49), 1);
        assert_eq!(round_half_up(1.5), 2);
        assert_eq!(round_half_up(0.0), 0);
    }

    #[test]
    fn physical_pixels_use_the_product_of_ui_and_system_scale() {
        let scale = GeometryScale::new(UiScale::Scale125, SystemScale::Scale150);

        assert_eq!(scale.physical_px(1.0), 2);
        assert_eq!(scale.physical_px(10.0), 19);
        assert!(scale.hairline_dip() < 1.0);
    }

    #[test]
    fn effective_width_tracks_ui_scale_not_system_scale() {
        let scale = GeometryScale::new(UiScale::Scale150, SystemScale::Scale200);

        assert_eq!(scale.effective_width(840.0), 560.0);
        assert_eq!(
            scale.to_physical_size(LogicalSize::new(10.0, 20.0)),
            super::PhysicalSize::new(30, 60)
        );
    }
}
