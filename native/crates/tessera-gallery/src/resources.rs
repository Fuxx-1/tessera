use tessera_makepad::foundation::resources::register_embedded_resource;
use tessera_makepad::makepad_widgets::*;

const FONT: &[u8] = include_bytes!("../resources/fonts/LXGWXiHeiMN.ttf.zlib");

fn decode_font() -> Vec<u8> {
    makepad_zune_inflate::DeflateDecoder::new(FONT)
        .decode_zlib()
        .expect("the compiled-in LXGW XiHei font must be valid")
}

pub fn register(vm: &mut ScriptVm) {
    register_embedded_resource(
        &vm.host.cx_mut().script_data.resources,
        concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/resources/fonts/LXGWXiHeiMN.ttf"
        ),
        "tessera_gallery/resources/fonts/LXGWXiHeiMN.ttf",
        decode_font,
    );
    tessera_makepad::components::shell::register_resources(vm);
}

pub fn install_font(vm: &mut ScriptVm) {
    register(vm);
    let _ = tessera_makepad::makepad_widgets::script_eval!(vm, {
        use mod.text.*
        use mod.res.*
        let tessera_font = FontFamily{
            latin := FontMember{res: crate_resource("self:resources/fonts/LXGWXiHeiMN.ttf") asc: 0.0 desc: 0.0}
            chinese := FontMember{res: crate_resource("self:resources/fonts/LXGWXiHeiMN.ttf") asc: 0.0 desc: 0.0}
            emoji := FontMember{res: crate_resource("makepad_widgets:resources/NotoColorEmoji.ttf") asc: 0.0 desc: 0.0}
        }
        mod.themes.light = mod.themes.light{
            font_label: TextStyle{font_family: tessera_font line_spacing: 1.2}
            font_regular: TextStyle{font_family: tessera_font line_spacing: 1.2}
            font_bold: TextStyle{font_family: tessera_font line_spacing: 1.2}
            font_italic: TextStyle{font_family: tessera_font line_spacing: 1.2}
            font_bold_italic: TextStyle{font_family: tessera_font line_spacing: 1.2}
            font_code: TextStyle{font_family: tessera_font line_spacing: 1.2}
        }
        mod.themes.dark = mod.themes.dark{
            font_label: TextStyle{font_family: tessera_font line_spacing: 1.2}
            font_regular: TextStyle{font_family: tessera_font line_spacing: 1.2}
            font_bold: TextStyle{font_family: tessera_font line_spacing: 1.2}
            font_italic: TextStyle{font_family: tessera_font line_spacing: 1.2}
            font_bold_italic: TextStyle{font_family: tessera_font line_spacing: 1.2}
            font_code: TextStyle{font_family: tessera_font line_spacing: 1.2}
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedded_font_is_a_complete_compressed_truetype() {
        let font = decode_font();
        assert_eq!(&font[..4], &[0, 1, 0, 0]);
        assert!(font.len() > 6_000_000);
        assert!(FONT.len() < font.len());
    }

    #[test]
    fn shared_theme_fonts_retain_cjk_and_color_emoji_fallback() {
        use std::{cell::RefCell, rc::Rc};
        use tessera_makepad::makepad_widgets::text::fonts::Fonts;

        for mode in [
            tessera_core::ThemeMode::Light,
            tessera_core::ThemeMode::Dark,
        ] {
            let mut cx = Cx::new(Box::new(|_, _| {}));
            let styles = cx.with_vm(|vm| {
                tessera_makepad::script_mod_with(vm, mode, install_font);
                let theme = script_eval!(vm, { mod.theme }).as_object().unwrap();
                [
                    "font_label",
                    "font_regular",
                    "font_bold",
                    "font_italic",
                    "font_bold_italic",
                    "font_code",
                ]
                .map(|name| {
                    let value = vm
                        .bx
                        .heap
                        .value(theme, LiveId::from_str(name).into(), NoTrap);
                    TextStyle::script_from_value(vm, value)
                })
            });
            for style in styles {
                style.ensure_fonts_loaded(&mut cx);
                let fonts = cx.get_global::<Rc<RefCell<Fonts>>>().clone();
                let family = fonts
                    .borrow_mut()
                    .get_or_load_font_family(style.font_family_id());
                for text in ["A", "\u{4e2d}", "\u{1f680}"] {
                    let shaped = family.get_or_shape(text.into());
                    assert!(!shaped.glyphs.is_empty(), "{mode:?} missing {text:?}");
                    assert!(shaped.glyphs.iter().all(|glyph| glyph.id != 0));
                }
                let emoji = family.get_or_shape("\u{1f680}".into());
                assert!(
                    emoji
                        .glyphs
                        .iter()
                        .any(|glyph| { glyph.font.has_glyph_raster_image(glyph.id, 32.0) })
                );
            }
        }
    }
}
