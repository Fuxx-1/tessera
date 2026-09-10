use super::geometry::{LogicalRect, LogicalSize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum OverlayKind {
    #[default]
    Modal,
    Popover,
    Dropdown,
    Tooltip,
}

/// Visual families are independent of overlay lifecycle and placement.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OverlaySurface {
    Modal,
    Drawer,
    Popover,
    Dropdown,
    Tooltip,
}

/// Geometry in DIP, before conversion to the pinned Makepad shader units.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct OverlayVisual {
    pub radius: f64,
    pub shadow_radius: f64,
    pub shadow_offset_x: f64,
    pub shadow_offset_y: f64,
    pub shadow_strong: bool,
}

pub const fn visual(kind: OverlaySurface) -> OverlayVisual {
    match kind {
        OverlaySurface::Modal => OverlayVisual {
            radius: 16.0,
            shadow_radius: 18.0,
            shadow_offset_x: 0.0,
            shadow_offset_y: 6.0,
            shadow_strong: true,
        },
        OverlaySurface::Drawer => OverlayVisual {
            radius: 0.0,
            shadow_radius: 18.0,
            shadow_offset_x: -4.0,
            shadow_offset_y: 0.0,
            shadow_strong: true,
        },
        OverlaySurface::Popover => OverlayVisual {
            radius: 8.0,
            shadow_radius: 18.0,
            shadow_offset_x: 0.0,
            shadow_offset_y: 5.0,
            shadow_strong: false,
        },
        OverlaySurface::Dropdown => OverlayVisual {
            radius: 8.0,
            shadow_radius: 14.0,
            shadow_offset_x: 0.0,
            shadow_offset_y: 4.0,
            shadow_strong: false,
        },
        OverlaySurface::Tooltip => OverlayVisual {
            radius: 6.0,
            shadow_radius: 10.0,
            shadow_offset_x: 0.0,
            shadow_offset_y: 3.0,
            shadow_strong: false,
        },
    }
}

impl OverlayVisual {
    pub const fn shader_radius(self) -> f64 {
        // Sdf2d.box doubles its radius argument in the pinned renderer.
        self.radius * 0.5
    }
}

impl OverlayKind {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Modal => "Modal",
            Self::Popover => "Popover",
            Self::Dropdown => "Dropdown",
            Self::Tooltip => "Tooltip",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OverlayPlacement {
    Center,
    Top,
    Bottom,
    Auto,
}

impl OverlayPlacement {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Center => "Center",
            Self::Top => "Top",
            Self::Bottom => "Bottom",
            Self::Auto => "Auto",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OverlayCloseReason {
    Escape,
    OutsideClick,
    Explicit,
    AnchorLost,
}

impl OverlayCloseReason {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Escape => "Escape",
            Self::OutsideClick => "OutsideClick",
            Self::Explicit => "Explicit",
            Self::AnchorLost => "AnchorLost",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OverlayError {
    Busy,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct OverlayDescriptor {
    pub kind: OverlayKind,
    pub placement: OverlayPlacement,
    pub anchor: Option<LogicalRect>,
    pub max_size: Option<LogicalSize>,
    pub close_on_escape: bool,
    pub close_on_outside_click: bool,
    pub focus_return: Option<u64>,
}

impl OverlayDescriptor {
    pub const fn modal(focus_return: Option<u64>) -> Self {
        Self {
            kind: OverlayKind::Modal,
            placement: OverlayPlacement::Center,
            anchor: None,
            max_size: Some(LogicalSize::new(420.0, 320.0)),
            close_on_escape: true,
            close_on_outside_click: false,
            focus_return,
        }
    }

    pub const fn popover(focus_return: Option<u64>) -> Self {
        Self {
            kind: OverlayKind::Popover,
            placement: OverlayPlacement::Bottom,
            anchor: None,
            max_size: Some(LogicalSize::new(360.0, 280.0)),
            close_on_escape: true,
            close_on_outside_click: true,
            focus_return,
        }
    }

    pub const fn dropdown(focus_return: Option<u64>) -> Self {
        Self {
            kind: OverlayKind::Dropdown,
            placement: OverlayPlacement::Bottom,
            anchor: None,
            max_size: Some(LogicalSize::new(280.0, 240.0)),
            close_on_escape: true,
            close_on_outside_click: true,
            focus_return,
        }
    }

    pub const fn tooltip(focus_return: Option<u64>) -> Self {
        Self {
            kind: OverlayKind::Tooltip,
            placement: OverlayPlacement::Top,
            anchor: None,
            max_size: Some(LogicalSize::new(240.0, 120.0)),
            close_on_escape: false,
            close_on_outside_click: true,
            focus_return,
        }
    }

    pub const fn for_kind(kind: OverlayKind, focus_return: Option<u64>) -> Self {
        match kind {
            OverlayKind::Modal => Self::modal(focus_return),
            OverlayKind::Popover => Self::popover(focus_return),
            OverlayKind::Dropdown => Self::dropdown(focus_return),
            OverlayKind::Tooltip => Self::tooltip(focus_return),
        }
    }

    pub fn summary(self) -> String {
        let size = self
            .max_size
            .map(|size| format!("{:.0}x{:.0}", size.width, size.height))
            .unwrap_or_else(|| String::from("unbounded"));
        let anchor = if self.anchor.is_some() {
            "anchored"
        } else {
            "floating"
        };
        format!(
            "{} / {} / {} / escape={} / outside={} / focus_return={:?}",
            self.kind.label(),
            self.placement.label(),
            size,
            self.close_on_escape,
            self.close_on_outside_click,
            self.focus_return
        ) + &format!(" / {anchor}")
    }
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct OverlayHost {
    active: Option<OverlayDescriptor>,
    last_close_reason: Option<OverlayCloseReason>,
}

impl OverlayHost {
    pub const fn new() -> Self {
        Self {
            active: None,
            last_close_reason: None,
        }
    }

    pub const fn is_open(&self) -> bool {
        self.active.is_some()
    }

    pub const fn active(&self) -> Option<&OverlayDescriptor> {
        self.active.as_ref()
    }

    pub const fn last_close_reason(&self) -> Option<OverlayCloseReason> {
        self.last_close_reason
    }

    pub fn open(&mut self, descriptor: OverlayDescriptor) -> Result<(), OverlayError> {
        if self.active.is_some() {
            return Err(OverlayError::Busy);
        }

        self.active = Some(descriptor);
        self.last_close_reason = None;
        Ok(())
    }

    pub fn retarget(&mut self, descriptor: OverlayDescriptor) -> bool {
        if self.active.is_some() {
            self.active = Some(descriptor);
            true
        } else {
            false
        }
    }

    pub fn close(&mut self, reason: OverlayCloseReason) -> Option<OverlayDescriptor> {
        let active = self.active.take();
        if active.is_some() {
            self.last_close_reason = Some(reason);
        }
        active
    }

    pub fn summary(&self) -> String {
        match self.active {
            Some(descriptor) => format!("open {}", descriptor.summary()),
            None => String::from("idle"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        OverlayCloseReason, OverlayDescriptor, OverlayError, OverlayHost, OverlayKind,
        OverlaySurface, visual,
    };

    #[test]
    fn overlay_visuals_keep_family_elevation_distinct() {
        assert!(visual(OverlaySurface::Modal).shadow_strong);
        assert!(visual(OverlaySurface::Modal).radius > visual(OverlaySurface::Dropdown).radius);
        assert!(
            visual(OverlaySurface::Dropdown).shadow_radius
                > visual(OverlaySurface::Tooltip).shadow_radius
        );
        for kind in [
            OverlaySurface::Modal,
            OverlaySurface::Drawer,
            OverlaySurface::Popover,
            OverlaySurface::Dropdown,
            OverlaySurface::Tooltip,
        ] {
            let spec = visual(kind);
            assert_eq!(spec.radius, spec.shader_radius() * 2.0);
        }
    }

    #[test]
    fn the_host_rejects_a_second_overlay_until_the_first_is_closed() {
        let mut host = OverlayHost::new();
        let modal = OverlayDescriptor::modal(Some(7));

        assert!(host.open(modal).is_ok());
        assert_eq!(host.open(modal), Err(OverlayError::Busy));
        assert!(host.is_open());
    }

    #[test]
    fn closing_an_overlay_records_the_close_reason() {
        let mut host = OverlayHost::new();
        let tooltip = OverlayDescriptor::for_kind(OverlayKind::Tooltip, Some(9));

        host.open(tooltip).expect("first overlay");
        assert_eq!(host.close(OverlayCloseReason::Explicit), Some(tooltip));
        assert_eq!(host.last_close_reason(), Some(OverlayCloseReason::Explicit));
        assert!(!host.is_open());
    }

    #[test]
    fn retargeting_only_works_for_an_active_overlay() {
        let mut host = OverlayHost::new();
        let popover = OverlayDescriptor::popover(Some(1));

        assert!(!host.retarget(popover));
        host.open(popover).expect("open");
        assert!(host.retarget(OverlayDescriptor::dropdown(Some(2))));
        assert_eq!(
            host.active().map(|descriptor| descriptor.kind),
            Some(OverlayKind::Dropdown)
        );
    }
}
