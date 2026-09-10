use crate::makepad_widgets::{shader::draw_text::TextOverflow, *};

fn luminance(color: Vec4f) -> f32 {
    let linear = |value: f32| {
        if value <= 0.04045 {
            value / 12.92
        } else {
            ((value + 0.055) / 1.055).powf(2.4)
        }
    };
    0.2126 * linear(color.x) + 0.7152 * linear(color.y) + 0.0722 * linear(color.z)
}

pub(super) fn on_fill(fill: Vec4f) -> Vec4f {
    if luminance(fill) > 0.179 {
        vec4(0.0, 0.0, 0.0, 1.0)
    } else {
        vec4(1.0, 1.0, 1.0, 1.0)
    }
}

pub(super) fn readable_on(fill: Vec4f, preferred: Vec4f) -> Vec4f {
    let background = luminance(fill);
    let foreground = luminance(preferred);
    if (background.max(foreground) + 0.05) / (background.min(foreground) + 0.05) >= 4.5 {
        preferred
    } else {
        on_fill(fill)
    }
}

pub(super) fn draw_label(draw: &mut DrawText, cx: &mut Cx2d, rect: Rect, text: &str, align: Align) {
    if rect.size.x <= 0.0 || rect.size.y <= 0.0 {
        return;
    }
    let size = draw.text_style.font_size;
    // Leave room for glyph rounding so a fitted label does not gain an ellipsis.
    let available_width = (rect.size.x as f32 - 2.0).max(1.0);
    let layout = draw.layout(cx, 0.0, 0.0, None, false, Align::default(), text);
    if let Some(row) = layout.rows.first() {
        if row.width_in_lpxs > available_width {
            draw.text_style.font_size = (size * available_width / row.width_in_lpxs)
                .max(8.0)
                .min(size);
        }
    }
    draw.max_lines = 1;
    draw.text_overflow = TextOverflow::Ellipsis;
    cx.begin_turtle(
        Walk {
            abs_pos: Some(rect.pos),
            width: Size::Fixed(rect.size.x),
            height: Size::Fixed(rect.size.y),
            ..Walk::default()
        },
        Layout {
            clip_x: true,
            clip_y: true,
            align: Align { x: 0.0, y: align.y },
            ..Layout::default()
        },
    );
    draw.draw_walk(
        cx,
        Walk {
            width: Size::fill(),
            height: Size::fit(),
            ..Walk::default()
        },
        align,
        text,
    );
    cx.end_turtle();
    draw.text_style.font_size = size;
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::foundation::theme::{DARK, LIGHT};

    fn color(hex: &str) -> Vec4f {
        let channel =
            |offset| u8::from_str_radix(&hex[offset..offset + 2], 16).unwrap() as f32 / 255.0;
        vec4(channel(1), channel(3), channel(5), 1.0)
    }

    fn contrast(a: Vec4f, b: Vec4f) -> f32 {
        let a = luminance(a);
        let b = luminance(b);
        (a.max(b) + 0.05) / (a.min(b) + 0.05)
    }

    #[test]
    fn theme_chart_text_meets_small_text_contrast() {
        for theme in [LIGHT, DARK] {
            for text in [theme.text, theme.text_tertiary] {
                assert!(contrast(color(theme.surface), color(text)) >= 4.5);
            }
        }
    }

    #[test]
    fn colored_labels_keep_readable_colors_and_fallback_for_low_contrast() {
        for background in ["#ffffff", "#303030"] {
            for preferred in ["#1a73e8", "#8b5cf6", "#ffa51d", "#c83a3a", "#07895b"] {
                let fill = color(background);
                let preferred = color(preferred);
                let readable = readable_on(fill, preferred);
                assert!(contrast(fill, readable) >= 4.5);
                if contrast(fill, preferred) >= 4.5 {
                    assert_eq!(readable, preferred);
                }
            }
        }
    }
}
