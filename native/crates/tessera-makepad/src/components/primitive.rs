use crate::foundation::geometry::LogicalSize;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PrimitiveRole {
    Canvas,
    Surface,
    Control,
    Overlay,
    Focus,
}

impl PrimitiveRole {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Canvas => "Canvas",
            Self::Surface => "Surface",
            Self::Control => "Control",
            Self::Overlay => "Overlay",
            Self::Focus => "Focus",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PrimitiveSpec {
    pub name: &'static str,
    pub role: PrimitiveRole,
    pub min_size: LogicalSize,
    pub bounded_redraw: bool,
    pub focusable: bool,
}

impl PrimitiveSpec {
    pub const fn new(
        name: &'static str,
        role: PrimitiveRole,
        min_size: LogicalSize,
        bounded_redraw: bool,
        focusable: bool,
    ) -> Self {
        Self {
            name,
            role,
            min_size,
            bounded_redraw,
            focusable,
        }
    }

    pub fn summary(self) -> String {
        format!(
            "{} / {} / {:.0}x{:.0} / bounded_redraw={} / focusable={}",
            self.name,
            self.role.label(),
            self.min_size.width,
            self.min_size.height,
            self.bounded_redraw,
            self.focusable
        )
    }
}

pub const STANDARD_PRIMITIVES: [PrimitiveSpec; 5] = [
    PrimitiveSpec::new(
        "shell-canvas",
        PrimitiveRole::Canvas,
        LogicalSize::new(840.0, 600.0),
        true,
        false,
    ),
    PrimitiveSpec::new(
        "content-surface",
        PrimitiveRole::Surface,
        LogicalSize::new(360.0, 240.0),
        true,
        false,
    ),
    PrimitiveSpec::new(
        "control-strip",
        PrimitiveRole::Control,
        LogicalSize::new(24.0, 24.0),
        true,
        true,
    ),
    PrimitiveSpec::new(
        "overlay-surface",
        PrimitiveRole::Overlay,
        LogicalSize::new(420.0, 240.0),
        true,
        true,
    ),
    PrimitiveSpec::new(
        "focus-ring",
        PrimitiveRole::Focus,
        LogicalSize::new(2.0, 2.0),
        true,
        false,
    ),
];

pub fn standard_primitives() -> &'static [PrimitiveSpec; 5] {
    &STANDARD_PRIMITIVES
}

#[cfg(test)]
mod tests {
    use super::{PrimitiveRole, STANDARD_PRIMITIVES, standard_primitives};

    #[test]
    fn primitive_skeleton_is_bounded_and_has_the_expected_roles() {
        assert_eq!(standard_primitives().len(), 5);
        assert_eq!(STANDARD_PRIMITIVES[0].role, PrimitiveRole::Canvas);
        assert!(STANDARD_PRIMITIVES.iter().all(|spec| spec.bounded_redraw));
        assert!(STANDARD_PRIMITIVES.iter().any(|spec| spec.focusable));
    }
}
