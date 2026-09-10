//! Layout-aligned vector geometry and DIP-width strokes.

use crate::makepad_widgets::makepad_draw::vector::{
    LineCap, LineJoin, VECTOR_FLOATS_PER_VERTEX, VECTOR_PACKED_FLOATS_PER_VERTEX,
    pack_vector_record,
};
use crate::makepad_widgets::*;

script_mod! {
    use mod.pod.*
    use mod.math.*
    use mod.shader.*
    use mod.draw

    mod.draw.TesseraAlignedVector = mod.std.set_type_default() do #(AlignedVector::script_shader(vm)){
        ..mod.draw.DrawVector

        // The pinned vector vertex shader ignores turtle's rect_pos adjustment.
        // Retain its packed attributes, clipping and fragment shader, but translate
        // both geometry and paint coordinates by the final instance offset.
        vertex: fn() {
            let pos = vec2(self.geom.x, self.geom.y) + self.rect_pos;
            let g_uv = unpack2f16(self.geom.uv)
            let g_color = unpack4u8(self.geom.color)
            let g_p0s = unpack2f16(self.geom.p0s)
            let g_p12 = unpack2f16(self.geom.p12)
            let g_p3c = unpack2f16(self.geom.p3c)
            self.v_tcoord = g_uv;
            self.v_color = g_color;
            self.v_stroke_mult = self.geom.stroke_mult;
            self.v_stroke_dist = self.geom.stroke_dist;
            self.v_shape_id = g_p0s.y;
            self.v_param0 = g_p0s.x;
            self.v_param1 = g_p12.x;
            self.v_param2 = g_p12.y;
            self.v_param3 = g_p3c.x;
            self.v_param4 = self.geom.param4;
            self.v_param5 = self.geom.param5;
            if g_p0s.x > 0.5 || g_p0s.y > 0.5 {
                self.v_param1 = self.v_param1 + self.rect_pos.x;
                self.v_param2 = self.v_param2 + self.rect_pos.y;
                if g_p0s.x < 1.5 {
                    self.v_param3 = self.v_param3 + self.rect_pos.x;
                    self.v_param4 = self.v_param4 + self.rect_pos.y;
                }
            }
            let shifted = pos + self.draw_list.view_shift;
            self.v_world = shifted;
            let cr = g_p3c.y;
            let is_shadow = self.geom.stroke_mult < -0.5;
            if cr > 0.0 && !is_shadow {
                let clip = vec4(
                    max(self.draw_clip.x, self.draw_list.view_clip.x - self.draw_list.view_shift.x),
                    max(self.draw_clip.y, self.draw_list.view_clip.y - self.draw_list.view_shift.y),
                    min(self.draw_clip.z, self.draw_list.view_clip.z - self.draw_list.view_shift.x),
                    min(self.draw_clip.w, self.draw_list.view_clip.w - self.draw_list.view_shift.y)
                );
                if pos.x + cr < clip.x || pos.y + cr < clip.y
                    || pos.x - cr > clip.z || pos.y - cr > clip.w {
                    self.vertex_pos = vec4(2.0, 2.0, 2.0, 1.0);
                    return
                }
            }
            let world = self.draw_list.view_transform * vec4(
                shifted.x
                shifted.y
                self.draw_depth + self.draw_call.zbias + self.geom.zbias
                1.
            );
            self.v_world_clip = world;
            self.vertex_pos = self.draw_pass.camera_projection * (self.draw_pass.camera_view * world)
        }
    }
}

/// Component-local geometry that follows deferred parent alignment like DrawQuad.
/// Points remain in draw-time DIP coordinates; rect_pos contains only layout shift.
#[derive(Script, ScriptHook, Debug)]
#[repr(C)]
pub struct AlignedVector {
    #[rust]
    packed_vertices: Vec<f32>,
    #[rust]
    packed_indices: Vec<u32>,
    #[deref]
    draw_super: DrawVector,
}

impl AlignedVector {
    pub fn begin(&mut self) {
        self.draw_super.rect_pos = Vec2f::default();
        self.draw_super.begin();
    }

    fn prepare_solid_geometry(&mut self) -> bool {
        let draw = &mut self.draw_super;
        if draw.acc_verts.is_empty() || draw.acc_indices.is_empty() {
            return false;
        }
        debug_assert_eq!(draw.gradient_row_count, 0);
        self.packed_vertices.clear();
        self.packed_vertices.reserve(
            draw.acc_verts.len() / VECTOR_FLOATS_PER_VERTEX * VECTOR_PACKED_FLOATS_PER_VERTEX,
        );
        for record in draw.acc_verts.chunks_exact(VECTOR_FLOATS_PER_VERTEX) {
            self.packed_vertices
                .extend_from_slice(&pack_vector_record(record));
        }
        self.packed_indices.clear();
        self.packed_indices.extend_from_slice(&draw.acc_indices);
        true
    }

    fn upload_solid_geometry(&mut self, cx: &mut Cx) -> bool {
        if !self.prepare_solid_geometry() {
            return false;
        }
        let geometry = self
            .draw_super
            .geometry
            .get_or_insert_with(|| Geometry::new(cx));
        // Keep the previous upload buffers instead of dropping them each frame.
        geometry.update_with_recycled_buffers(
            cx,
            &mut self.packed_indices,
            &mut self.packed_vertices,
        );
        true
    }

    pub fn end(&mut self, cx: &mut Cx2d) {
        // Gradient texture normalization remains owned by the upstream renderer.
        if self.draw_super.gradient_row_count != 0 {
            self.draw_super.end(cx);
        } else if self.upload_solid_geometry(cx) {
            self.draw_super.submit_existing_geometry(cx);
        }
    }
}

pub(super) fn stroke_antialias_dip(dpi: f64) -> f32 {
    let fringe = dpi.recip() as f32;
    if fringe.is_finite() && fringe > 0.0 {
        fringe
    } else {
        1.0
    }
}

pub(crate) trait DpiStroke {
    fn stroke_dip(&mut self, cx: &Cx2d, width: f32);
}

impl DpiStroke for DrawVector {
    fn stroke_dip(&mut self, cx: &Cx2d, width: f32) {
        // The pinned DrawVector::stroke uses 1 DIP of fringe, but its shader
        // removes one device pixel. Match that ramp without changing path width.
        self.stroke_opts(
            width,
            LineCap::Butt,
            LineJoin::Miter,
            4.0,
            stroke_antialias_dip(cx.current_dpi_factor()),
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::makepad_widgets::makepad_draw::vector::{
        Tessellator, VectorPath, pack_vector_vertices, tessellate_path_stroke,
    };

    #[test]
    fn repeated_vector_uploads_match_upstream_and_reuse_both_buffer_sets() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let mut draw = cx.with_vm(|vm| {
            crate::script_mod(vm, tessera_core::ThemeMode::Light);
            let value = script_eval!(vm, { mod.draw.TesseraAlignedVector });
            AlignedVector::script_from_value(vm, value)
        });
        let mut buffers = std::collections::HashSet::new();
        for frame in 0..64 {
            draw.begin();
            draw.set_color(frame as f32 / 64.0, 0.4, 0.8, 1.0);
            for item in 0..if frame < 2 { 64 } else { 16 + frame % 48 } {
                draw.rect(item as f32 * 10.0, frame as f32, 8.0, 8.0);
                draw.fill();
            }
            let expected_vertices = pack_vector_vertices(&draw.acc_verts);
            let expected_indices = draw.acc_indices.clone();
            let logical_vertices = draw.acc_verts.clone();
            assert!(draw.prepare_solid_geometry());
            assert_eq!(draw.packed_indices, expected_indices);
            assert!(
                draw.packed_vertices
                    .iter()
                    .map(|v| v.to_bits())
                    .eq(expected_vertices.iter().map(|v| v.to_bits()))
            );
            assert_eq!(draw.acc_indices, expected_indices);
            assert_eq!(draw.acc_verts, logical_vertices);
            let allocation = (
                draw.packed_vertices.as_ptr() as usize,
                draw.packed_vertices.capacity(),
                draw.packed_indices.as_ptr() as usize,
                draw.packed_indices.capacity(),
            );
            if frame < 2 {
                assert!(buffers.insert(allocation));
            } else {
                assert!(
                    buffers.contains(&allocation),
                    "frame {frame} allocated new buffers"
                );
            }
            assert!(draw.upload_solid_geometry(&mut cx));
            assert_eq!(draw.acc_indices, expected_indices);
            assert_eq!(draw.acc_verts, logical_vertices);
            assert!(draw.packed_vertices.is_empty() && draw.packed_indices.is_empty());
        }
        assert_eq!(buffers.len(), 2);
    }

    #[test]
    fn empty_vector_picture_does_not_submit_stale_geometry() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let mut draw = cx.with_vm(|vm| {
            crate::script_mod(vm, tessera_core::ThemeMode::Light);
            let value = script_eval!(vm, { mod.draw.TesseraAlignedVector });
            AlignedVector::script_from_value(vm, value)
        });
        assert!(!draw.upload_solid_geometry(&mut cx));
        assert!(draw.geometry.is_none());
        draw.begin();
        draw.rect(0.0, 0.0, 30.0, 20.0);
        draw.fill();
        assert!(draw.upload_solid_geometry(&mut cx));
        draw.begin();
        assert!(!draw.upload_solid_geometry(&mut cx));
        assert!(draw.geometry.is_some());
    }

    #[test]
    fn aligned_vector_starts_each_picture_without_a_stale_layout_offset() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        cx.with_vm(|vm| {
            crate::script_mod(vm, tessera_core::ThemeMode::Light);
            let value = script_eval!(vm, { mod.draw.TesseraAlignedVector });
            let mut draw = AlignedVector::script_from_value(vm, value);
            for offset in [vec2(20.0, -12.0), vec2(-40.0, 64.0)] {
                draw.rect_pos = offset;
                draw.begin();
                assert_eq!(draw.rect_pos, Vec2f::default());
                assert!(draw.acc_verts.is_empty() && draw.acc_indices.is_empty());
                draw.set_color(0.2, 0.4, 0.8, 1.0);
                draw.rect(100.0, 200.0, 30.0, 20.0);
                draw.fill();
                assert!(!draw.acc_verts.is_empty() && !draw.acc_indices.is_empty());
            }
        });
    }

    #[test]
    fn stroke_antialias_fringe_is_one_physical_pixel() {
        for dpi in [0.5, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0] {
            assert!((f64::from(stroke_antialias_dip(dpi)) * dpi - 1.0).abs() < 1e-6);
        }
        for dpi in [0.0, -1.0, f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
            assert_eq!(stroke_antialias_dip(dpi), 1.0);
        }
    }

    #[test]
    fn icon_and_chart_strokes_preserve_dip_width_without_growing_meshes() {
        for width in [0.9, 1.0, 1.2, 1.5, 2.0, 2.64, 3.0, 7.0, 10.0] {
            let mut mesh_size = None;
            for dpi in [1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0] {
                for vertical in [false, true] {
                    let mut path = VectorPath::new();
                    path.move_to(10.0, 10.0);
                    path.line_to(
                        if vertical { 10.0 } else { 110.0 },
                        if vertical { 110.0 } else { 10.0 },
                    );
                    let mut vertices = Vec::new();
                    let mut indices = Vec::new();
                    tessellate_path_stroke(
                        &mut path,
                        &mut Tessellator::default(),
                        &mut vertices,
                        &mut indices,
                        width,
                        LineCap::Butt,
                        LineJoin::Miter,
                        4.0,
                        stroke_antialias_dip(dpi),
                        0.25,
                    );
                    let mut low = f32::INFINITY;
                    let mut high = f32::NEG_INFINITY;
                    for vertex in &vertices {
                        let normal = if vertical { vertex.x } else { vertex.y };
                        low = low.min(normal);
                        high = high.max(normal);
                    }
                    // Each edge loses half a device pixel to the shader's AA ramp.
                    let coverage_pixels = f64::from(high - low) * dpi - 1.0;
                    assert!((coverage_pixels - f64::from(width) * dpi).abs() < 1e-5);
                    assert!(!indices.is_empty());
                    let size = (vertices.len(), indices.len());
                    assert_eq!(*mesh_size.get_or_insert(size), size);
                }
            }
        }
    }
}
