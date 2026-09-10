//! Opt-in render state in Makepad's bounded remote log, without changing paint.
use std::{cell::RefCell, rc::Rc};

use crate::makepad_widgets::makepad_micro_serde::*;
use crate::makepad_widgets::text::fonts::Fonts;
use crate::makepad_widgets::*;

const MAX_RECORDS: u64 = 128;
const MAX_PASSES: usize = 8;
const MAX_WINDOWS: usize = 4;
const MAX_PASS_SCAN: usize = 512;
const MAX_WINDOW_SCAN: usize = 64;

#[derive(Default)]
struct RenderTrace {
    sequence: u64,
}

#[derive(SerJson, DeJson)]
struct FontRecord {
    outline_mode: String,
    slug_at_16_dpx: bool,
    slug_at_32_dpx: bool,
    slug_cache_generation: u64,
    slug_uploaded_generation: u64,
    max_rasterized_dpx_bits: u32,
    curve_texture_size: Option<[usize; 2]>,
    band_texture_size: Option<[usize; 2]>,
}

#[derive(SerJson, DeJson)]
struct WindowRecord {
    id: usize,
    main_pass_id: Option<String>,
    created: bool,
    native_dpi_bits: u64,
    effective_dpi_bits: u64,
    inner_size_bits: [u64; 2],
    position_bits: [u64; 2],
}

#[derive(SerJson, DeJson)]
struct PassRecord {
    id: String,
    main_window_id: Option<usize>,
    paint_dirty: bool,
    dpi_bits: Option<u64>,
    uniform_dpi_bits: u32,
    uniform_dilate_bits: u32,
    view_shift_bits: [u64; 2],
    view_scale_bits: [u64; 2],
    projection_bits: [u32; 16],
    camera_view_bits: [u32; 16],
}

#[derive(SerJson, DeJson)]
struct RenderRecord {
    sequence: u64,
    redraw: u64,
    stage: String,
    cpu_event_snapshot: bool,
    fonts: Option<FontRecord>,
    windows: Vec<WindowRecord>,
    windows_truncated: bool,
    window_slots_scanned: usize,
    window_scan_truncated: bool,
    passes: Vec<PassRecord>,
    passes_truncated: bool,
    pass_slots_scanned: usize,
    pass_scan_truncated: bool,
}

#[derive(Debug, PartialEq, Eq)]
pub enum EnableResult {
    Enabled,
    RemoteInactive,
}

/// Requires an active Makepad `--remote` endpoint; otherwise no state is installed.
pub fn enable(cx: &mut Cx) -> EnableResult {
    if !makepad_platform::remote::is_active() {
        return EnableResult::RemoteInactive;
    }
    cx.set_global(RenderTrace::default());
    EnableResult::Enabled
}

fn point_bits(point: Vec2d) -> [u64; 2] {
    [point.x.to_bits(), point.y.to_bits()]
}

fn stage(event: &Event) -> Option<&'static str> {
    match event {
        Event::Draw(_) => Some("draw-after"),
        Event::WindowGeomChange(_) => Some("window-geometry-after"),
        Event::WindowGotFocus(_) => Some("window-focus-after"),
        Event::WindowLostFocus(_) => Some("window-blur-after"),
        Event::Pause => Some("pause-after"),
        Event::Resume => Some("resume-after"),
        _ => None,
    }
}

fn snapshot(cx: &mut Cx, stage: &'static str) -> Option<RenderRecord> {
    if !cx.has_global::<RenderTrace>() {
        return None;
    }
    let trace = cx.global::<RenderTrace>();
    if trace.sequence >= MAX_RECORDS {
        return None;
    }
    trace.sequence += 1;
    let sequence = trace.sequence;
    let fonts = cx.has_global::<Rc<RefCell<Fonts>>>().then(|| {
        let fonts_rc = cx.get_global::<Rc<RefCell<Fonts>>>().clone();
        let fonts = fonts_rc.borrow();
        let mut texture_size = |texture: &Texture| {
            texture
                .get_format(cx)
                .vec_width_height()
                .map(|(width, height)| [width, height])
        };
        FontRecord {
            outline_mode: format!("{:?}", fonts.outline_rasterization_mode()),
            slug_at_16_dpx: fonts.should_use_slug_glyph(16.0),
            slug_at_32_dpx: fonts.should_use_slug_glyph(32.0),
            slug_cache_generation: fonts.slug_cache_generation(),
            slug_uploaded_generation: fonts.slug_uploaded_generation(),
            max_rasterized_dpx_bits: fonts.max_rasterized_glyph_dpxs_per_em().to_bits(),
            curve_texture_size: texture_size(fonts.slug_curve_texture()),
            band_texture_size: texture_size(fonts.slug_band_texture()),
        }
    });
    let mut window_pool = cx.windows.id_iter();
    let mut window_slots_scanned = 0;
    let mut window_ids: Vec<_> = window_pool
        .by_ref()
        .take(MAX_WINDOW_SCAN)
        .filter(|&id| {
            window_slots_scanned += 1;
            cx.windows[id].is_created || cx.windows[id].main_pass_id.is_some()
        })
        .collect();
    let window_scan_truncated = window_pool.next().is_some();
    window_ids.sort_by_key(|&id| !cx.windows[id].is_created);
    let windows_truncated = window_scan_truncated || window_ids.len() > MAX_WINDOWS;
    window_ids.truncate(MAX_WINDOWS);
    let windows = window_ids
        .iter()
        .map(|&id| {
            let window = &cx.windows[id];
            WindowRecord {
                id: id.id(),
                main_pass_id: window.main_pass_id.map(|id| format!("{id:?}")),
                created: window.is_created,
                native_dpi_bits: window.native_dpi_factor().to_bits(),
                effective_dpi_bits: window.effective_dpi_factor().to_bits(),
                inner_size_bits: point_bits(window.get_inner_size()),
                position_bits: point_bits(window.get_position()),
            }
        })
        .collect();
    // Pools include unused template slots. Always sample window passes first,
    // even when they lie beyond the bounded secondary scan.
    let mut pass_ids = Vec::with_capacity(MAX_PASSES);
    for &window_id in &window_ids {
        if let Some(id) = cx.windows[window_id].main_pass_id {
            if !pass_ids.contains(&id) {
                pass_ids.push(id);
            }
        }
    }
    let mut passes_truncated = false;
    let mut pass_slots_scanned = 0;
    let mut pool = cx.passes.id_iter();
    for id in pool.by_ref().take(MAX_PASS_SCAN) {
        pass_slots_scanned += 1;
        let pass = &cx.passes[id];
        if (pass.dpi_factor.is_some() || pass.main_draw_list_id.is_some())
            && !pass_ids.contains(&id)
        {
            if pass_ids.len() < MAX_PASSES {
                pass_ids.push(id);
            } else {
                passes_truncated = true;
            }
        }
    }
    let pass_scan_truncated = pool.next().is_some();
    let passes = pass_ids
        .into_iter()
        .map(|id| {
            let pass = &cx.passes[id];
            PassRecord {
                id: format!("{id:?}"),
                main_window_id: window_ids.iter().find_map(|&window_id| {
                    (cx.windows[window_id].main_pass_id == Some(id)).then_some(window_id.id())
                }),
                paint_dirty: pass.paint_dirty,
                dpi_bits: pass.dpi_factor.map(f64::to_bits),
                uniform_dpi_bits: pass.pass_uniforms.dpi_factor.to_bits(),
                uniform_dilate_bits: pass.pass_uniforms.dpi_dilate.to_bits(),
                view_shift_bits: point_bits(pass.view_shift),
                view_scale_bits: point_bits(pass.view_scale),
                projection_bits: pass.pass_uniforms.camera_projection.v.map(f32::to_bits),
                camera_view_bits: pass.pass_uniforms.camera_view.v.map(f32::to_bits),
            }
        })
        .collect();
    Some(RenderRecord {
        sequence,
        redraw: cx.redraw_id(),
        stage: stage.into(),
        cpu_event_snapshot: true,
        fonts,
        windows,
        windows_truncated,
        window_slots_scanned,
        window_scan_truncated,
        passes,
        passes_truncated: passes_truncated || pass_scan_truncated,
        pass_slots_scanned,
        pass_scan_truncated,
    })
}

/// Observes completed widget event handling, not GPU completion or capture readiness.
/// Float bit patterns retain exact transform differences and remain valid JSON
/// even for non-finite diagnostic state. No field text or resource bytes are read.
pub fn record_event(cx: &mut Cx, event: &Event) {
    let Some(stage) = stage(event) else {
        return;
    };
    if let Some(record) = snapshot(cx, stage) {
        makepad_platform::remote::push_log_line(format!(
            "[tessera-render] {}",
            record.serialize_json()
        ));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn disabled_trace_does_not_create_fonts_or_state() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        assert!(snapshot(&mut cx, "draw-after").is_none());
        assert!(!cx.has_global::<RenderTrace>());
        assert!(!cx.has_global::<Rc<RefCell<Fonts>>>());
    }

    #[test]
    fn trace_is_bounded_and_does_not_request_paint_or_change_focus() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        cx.set_global(RenderTrace::default());
        let list = DrawList::new(&mut cx);
        let area = Area::Rect(RectArea {
            draw_list_id: list.id(),
            rect_id: 0,
            redraw_id: 1,
        });
        cx.set_key_focus(area);
        cx.action(());
        cx.handle_actions();
        assert_eq!(cx.key_focus(), area);
        let focus = cx.key_focus();
        let redraw = cx.redraw_id();
        cx.new_draw_event = DrawEvent::default();
        cx.new_draw_event.draw_lists.push(list.id());
        let pending = cx.new_draw_event.clone();
        for expected in 1..=MAX_RECORDS {
            assert_eq!(snapshot(&mut cx, "draw-after").unwrap().sequence, expected);
        }
        assert!(snapshot(&mut cx, "draw-after").is_none());
        cx.action(());
        cx.handle_actions();
        assert_eq!(cx.key_focus(), focus);
        assert_eq!(cx.redraw_id(), redraw);
        assert_eq!(cx.new_draw_event.draw_lists, pending.draw_lists);
        assert_eq!(
            cx.new_draw_event.draw_lists_and_children,
            pending.draw_lists_and_children
        );
        assert_eq!(cx.new_draw_event.redraw_all, pending.redraw_all);
        assert_eq!(cx.new_draw_event.time.to_bits(), pending.time.to_bits());
        assert!(cx.new_draw_event.xr_state.is_none());
        assert!(!cx.has_global::<Rc<RefCell<Fonts>>>());
    }

    #[test]
    fn snapshots_keep_exact_float_bits_and_limit_passes() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        cx.set_global(RenderTrace::default());
        let passes: Vec<_> = (0..MAX_PASSES + 1)
            .map(|_| DrawPass::new(&mut cx))
            .collect();
        for pass in &passes {
            cx.passes[pass.draw_pass_id()].dpi_factor = Some(2.0);
        }
        let nan64 = 0x7ff8_1234_5678_9012;
        let nan32 = 0x7fc1_2345;
        let pass = &mut cx.passes[passes[0].draw_pass_id()];
        pass.view_shift = dvec2(-0.0, f64::from_bits(nan64));
        pass.pass_uniforms.dpi_dilate = f32::from_bits(nan32);
        pass.pass_uniforms.camera_projection.v[0] = -0.0;
        let record = snapshot(&mut cx, "draw-after").unwrap();
        assert_eq!(record.passes.len(), MAX_PASSES);
        assert!(record.passes_truncated);
        let parsed = RenderRecord::deserialize_json(&record.serialize_json()).unwrap();
        assert_eq!(parsed.passes[0].view_shift_bits[0], (-0.0f64).to_bits());
        assert_eq!(parsed.passes[0].view_shift_bits[1], nan64);
        assert_eq!(parsed.passes[0].uniform_dilate_bits, nan32);
        assert_eq!(parsed.passes[0].projection_bits[0], (-0.0f32).to_bits());
        assert!(!parsed.pass_scan_truncated);
    }

    #[test]
    fn inactive_remote_does_not_install_trace() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        assert!(!makepad_platform::remote::is_active());
        assert_eq!(enable(&mut cx), EnableResult::RemoteInactive);
        assert!(!cx.has_global::<RenderTrace>());
    }

    #[test]
    fn window_main_pass_is_prioritized_beyond_unused_pool_slots() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        cx.set_global(RenderTrace::default());
        let _unused: Vec<_> = (0..MAX_PASS_SCAN + 1)
            .map(|_| DrawPass::new(&mut cx))
            .collect();
        let pass = DrawPass::new(&mut cx);
        let id = pass.draw_pass_id();
        let _template_windows: Vec<_> = (0..MAX_WINDOWS + 1)
            .map(|_| WindowHandle::new(&mut cx))
            .collect();
        let window = WindowHandle::new(&mut cx);
        cx.windows[window.window_id()].is_created = true;
        cx.windows[window.window_id()].main_pass_id = Some(id);
        cx.passes[id].dpi_factor = Some(2.0);
        let record = snapshot(&mut cx, "draw-after").unwrap();
        assert_eq!(record.passes.len(), 1);
        assert_eq!(record.passes[0].id, format!("{id:?}"));
        assert_eq!(
            record.passes[0].main_window_id,
            Some(window.window_id().id())
        );
        assert_eq!(record.passes[0].dpi_bits, Some(2.0f64.to_bits()));
        assert_eq!(record.windows[0].main_pass_id, Some(format!("{id:?}")));
        assert_eq!(record.pass_slots_scanned, MAX_PASS_SCAN);
        assert_eq!(record.windows.len(), 1);
        assert_eq!(record.window_slots_scanned, MAX_WINDOWS + 2);
        assert!(!record.window_scan_truncated);
        assert!(record.pass_scan_truncated && record.passes_truncated);
    }

    #[test]
    fn window_pass_is_not_duplicated_by_secondary_scan() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        cx.set_global(RenderTrace::default());
        let pass = DrawPass::new(&mut cx);
        let window = WindowHandle::new(&mut cx);
        cx.windows[window.window_id()].main_pass_id = Some(pass.draw_pass_id());
        cx.passes[pass.draw_pass_id()].dpi_factor = Some(1.25);
        let record = snapshot(&mut cx, "draw-after").unwrap();
        assert_eq!(record.passes.len(), 1);
        assert!(!record.passes_truncated);
    }

    #[test]
    fn window_scan_and_output_are_bounded() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        cx.set_global(RenderTrace::default());
        let windows: Vec<_> = (0..MAX_WINDOW_SCAN + 1)
            .map(|_| WindowHandle::new(&mut cx))
            .collect();
        for window in &windows {
            cx.windows[window.window_id()].is_created = true;
        }
        let record = snapshot(&mut cx, "draw-after").unwrap();
        assert_eq!(record.windows.len(), MAX_WINDOWS);
        assert_eq!(record.window_slots_scanned, MAX_WINDOW_SCAN);
        assert!(record.window_scan_truncated && record.windows_truncated);
    }

    #[test]
    fn initialized_font_textures_and_generations_are_unchanged() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        cx.set_global(RenderTrace::default());
        CxDraw::lazy_construct_fonts(&mut cx);
        let fonts_rc = cx.get_global::<Rc<RefCell<Fonts>>>().clone();
        let fonts = fonts_rc.borrow();
        let textures = [
            fonts.slug_curve_texture().clone(),
            fonts.slug_band_texture().clone(),
        ];
        // Nondefault dimensions and pending uploads catch mutation of either texture.
        for (i, texture) in textures.iter().enumerate() {
            *texture.get_format(&mut cx) = TextureFormat::VecRGBAf32 {
                width: i + 2,
                height: 1,
                data: Some(vec![0.25; (i + 2) * 4]),
                updated: TextureUpdated::Full,
            };
        }
        let generations = (
            fonts.slug_cache_generation(),
            fonts.slug_uploaded_generation(),
        );
        drop(fonts);
        let record = snapshot(&mut cx, "draw-after").unwrap().fonts.unwrap();
        assert_eq!(record.curve_texture_size, Some([2, 1]));
        assert_eq!(record.band_texture_size, Some([3, 1]));
        assert_eq!(
            (
                record.slug_cache_generation,
                record.slug_uploaded_generation
            ),
            generations
        );
        for (i, texture) in textures.iter().enumerate() {
            let TextureFormat::VecRGBAf32 {
                width,
                height,
                data,
                updated,
            } = texture.get_format(&mut cx)
            else {
                panic!("trace changed font texture format");
            };
            assert_eq!((*width, *height), (i + 2, 1));
            let data_bits: Vec<_> = data
                .as_ref()
                .expect("trace consumed texture data")
                .iter()
                .map(|v| v.to_bits())
                .collect();
            assert_eq!(data_bits, vec![0.25f32.to_bits(); (i + 2) * 4]);
            assert!(matches!(updated, TextureUpdated::Full));
        }
        let fonts = fonts_rc.borrow();
        assert_eq!(
            (
                fonts.slug_cache_generation(),
                fonts.slug_uploaded_generation()
            ),
            generations
        );
    }

    #[test]
    fn ordinary_events_are_not_recorded() {
        assert!(stage(&Event::Startup).is_none());
        assert!(stage(&Event::Pause).is_some());
    }
}
