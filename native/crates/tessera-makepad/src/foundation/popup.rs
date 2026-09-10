//! Placement for bounded native popup content. Coordinates are logical pixels.
use crate::makepad_widgets::*;

#[derive(Clone, Copy, Debug)]
pub(crate) enum PopupPlacement {
    BelowAnchor(Rect),
    TopRight,
}

pub(crate) fn safe_popup_rect(viewport: Vec2d, top: f64) -> Rect {
    let width = viewport.x.max(0.0);
    let height = viewport.y.max(0.0);
    let left = 12.0_f64.min(width / 2.0);
    let bottom = 12.0_f64.min(height / 2.0);
    let top = top.max(bottom).min(height - bottom);
    Rect {
        pos: dvec2(left, top),
        size: dvec2(
            (width - left * 2.0).max(0.0),
            (height - top - bottom).max(0.0),
        ),
    }
}

pub(crate) fn popup_rect(bounds: Rect, requested: Vec2d, placement: PopupPlacement) -> Rect {
    let size = dvec2(
        requested.x.max(0.0).min(bounds.size.x),
        requested.y.max(0.0).min(bounds.size.y),
    );
    let right = bounds.pos.x + bounds.size.x - size.x;
    let bottom = bounds.pos.y + bounds.size.y - size.y;
    let pos = match placement {
        PopupPlacement::TopRight => dvec2(right, bounds.pos.y),
        PopupPlacement::BelowAnchor(anchor) => {
            let below = anchor.pos.y + anchor.size.y + 8.0;
            let above = anchor.pos.y - size.y - 8.0;
            let y = if below <= bottom {
                below
            } else if above >= bounds.pos.y {
                above
            } else {
                below.clamp(bounds.pos.y, bottom)
            };
            dvec2(
                anchor.pos.x.clamp(bounds.pos.x, right),
                y.clamp(bounds.pos.y, bottom),
            )
        }
    };
    Rect { pos, size }
}

pub(crate) fn position_popup(popup: &PopupNotificationRef, cx: &mut Cx, rect: Rect) {
    if let Some(mut popup) = popup.borrow_mut() {
        popup.layout.align = Align::default();
    }
    let content = popup.view(cx, ids!(content));
    if let Some(mut content) = content.borrow_mut() {
        content.walk.abs_pos = Some(rect.pos);
        content.walk.margin = Inset::default();
        content.walk.width = Size::Fixed(rect.size.x);
        content.walk.height = Size::Fixed(rect.size.y);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn popup_tracks_anchor_and_flips_above_at_bottom_edge() {
        let bounds = safe_popup_rect(dvec2(840.0, 600.0), 48.0);
        let size = dvec2(330.0, 128.0);
        for (anchor_y, expected_y) in [(244.0, 282.0), (550.0, 414.0)] {
            let anchor = Rect {
                pos: dvec2(292.0, anchor_y),
                size: dvec2(102.0, 30.0),
            };
            let rect = popup_rect(bounds, size, PopupPlacement::BelowAnchor(anchor));
            assert_eq!(rect.pos, dvec2(292.0, expected_y));
            assert_eq!(rect.size, size);
        }
    }

    #[test]
    fn all_anchor_corners_stay_inside_the_safe_bounds() {
        for viewport in [
            dvec2(320.0, 240.0),
            dvec2(840.0, 600.0),
            dvec2(1240.0, 800.0),
        ] {
            let bounds = safe_popup_rect(viewport, 48.0);
            for x in [-10.0, viewport.x - 20.0] {
                for y in [-10.0, viewport.y - 10.0] {
                    let anchor = Rect {
                        pos: dvec2(x, y),
                        size: dvec2(100.0, 30.0),
                    };
                    let rect = popup_rect(
                        bounds,
                        dvec2(330.0, 128.0),
                        PopupPlacement::BelowAnchor(anchor),
                    );
                    assert!(rect.pos.x >= bounds.pos.x && rect.pos.y >= bounds.pos.y);
                    assert!(rect.pos.x + rect.size.x <= viewport.x - 12.0);
                    assert!(rect.pos.y + rect.size.y <= viewport.y - 12.0);
                }
            }
        }
    }

    #[test]
    fn notification_is_below_caption_and_inset_from_right_edge() {
        let bounds = safe_popup_rect(dvec2(840.0, 600.0), 48.0);
        let rect = popup_rect(bounds, dvec2(300.0, 92.0), PopupPlacement::TopRight);
        assert_eq!(rect.pos, dvec2(528.0, 48.0));
        assert_eq!(rect.size, dvec2(300.0, 92.0));
    }
}
