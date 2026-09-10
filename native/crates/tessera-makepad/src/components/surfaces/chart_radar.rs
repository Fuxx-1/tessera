//! Native RadarChart widget with explicit bounded axes and series.

use crate::foundation::focus::FocusRegion;
use crate::foundation::vector::{AlignedVector as DrawVector, DpiStroke};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

use super::chart_common::{
    MAX_RADAR_AXES, MAX_RADAR_SERIES, RadarData, radar_fixture, validate_radar,
};

pub struct RadarChartSurfaceCatalog;

impl RadarChartSurfaceCatalog {
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::RadarChart => Some("TesseraRadarChart"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct RadarChartConfig {
    pub max_axes: usize,
    pub max_series: usize,
}

impl Default for RadarChartConfig {
    fn default() -> Self {
        Self {
            max_axes: MAX_RADAR_AXES,
            max_series: MAX_RADAR_SERIES,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct RadarChartState {
    pub selected_axis: Option<u32>,
    pub viewport_changes: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RadarChartEvent {
    AxisSelected(Option<u32>),
    ViewportChanged,
    Reset,
}

impl RadarChartState {
    pub fn reduce(&mut self, event: RadarChartEvent) {
        match event {
            RadarChartEvent::AxisSelected(axis) => self.selected_axis = axis,
            RadarChartEvent::ViewportChanged => {
                self.viewport_changes = self.viewport_changes.saturating_add(1);
            }
            RadarChartEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy)]
struct RadarLayout {
    center: DVec2,
    radius: f64,
    label_size: DVec2,
}

impl RadarLayout {
    const SPOKE_EXTENSION: f64 = 8.0;
    const LABEL_GAP: f64 = 6.0;

    fn new(rect: Rect, axes: usize) -> Option<Self> {
        if !(3..=MAX_RADAR_AXES).contains(&axes)
            || ![rect.pos.x, rect.pos.y, rect.size.x, rect.size.y]
                .iter()
                .all(|value| value.is_finite())
        {
            return None;
        }
        // Keep title/footer space separate from the radial plot and its labels.
        let bounds = Rect {
            pos: rect.pos + dvec2(12.0, 32.0),
            size: rect.size - dvec2(24.0, 56.0),
        };
        let label_size = dvec2((bounds.size.x * 0.25).min(92.0), 16.0);
        let reserve = Self::SPOKE_EXTENSION + Self::LABEL_GAP;
        let radius = (bounds.size.x * 0.5 - label_size.x - reserve)
            .min(bounds.size.y * 0.5 - label_size.y - reserve);
        if radius < if axes > 8 { 44.0 } else { 24.0 } {
            return None;
        }
        Some(Self {
            center: bounds.pos + bounds.size * 0.5,
            radius,
            label_size,
        })
    }

    fn direction(index: usize, axes: usize) -> DVec2 {
        let theta =
            -std::f64::consts::FRAC_PI_2 + std::f64::consts::TAU * index as f64 / axes as f64;
        dvec2(theta.cos(), theta.sin())
    }

    fn spoke(self, index: usize, axes: usize) -> DVec2 {
        self.center + Self::direction(index, axes) * (self.radius + Self::SPOKE_EXTENSION)
    }

    fn label(self, index: usize, axes: usize) -> (Rect, Align) {
        let direction = Self::direction(index, axes);
        let (x, align_x) = if direction.x.abs() < 0.25 {
            (-self.label_size.x * 0.5, 0.5)
        } else if direction.x > 0.0 {
            (Self::LABEL_GAP, 0.0)
        } else {
            (-self.label_size.x - Self::LABEL_GAP, 1.0)
        };
        let y = if direction.y.abs() < 0.25 {
            -self.label_size.y * 0.5
        } else if direction.y > 0.0 {
            Self::LABEL_GAP
        } else {
            -self.label_size.y - Self::LABEL_GAP
        };
        (
            Rect {
                pos: self.spoke(index, axes) + dvec2(x, y),
                size: self.label_size,
            },
            Align { x: align_x, y: 0.5 },
        )
    }

    fn hit_axis(self, position: DVec2, axes: usize) -> usize {
        let theta = (position.y - self.center.y).atan2(position.x - self.center.x)
            + std::f64::consts::FRAC_PI_2;
        let fraction = theta.rem_euclid(std::f64::consts::TAU) / std::f64::consts::TAU;
        (fraction * axes as f64).round() as usize % axes
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum RadarChartAction {
    AxisSelected {
        axis: Option<u32>,
    },
    ViewportChanged {
        changes: u32,
    },
    #[default]
    Reset,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    use mod.text.*

    mod.widgets.TesseraRadarChartBase = #(TesseraRadarChart::register_widget(vm))
    mod.widgets.TesseraRadarChart = set_type_default() do mod.widgets.TesseraRadarChartBase{
        width: Fill
        height: 260
        accent: theme.color_chart_primary
        accent_alt: theme.color_chart_secondary
        selection: theme.color_chart_selection
        ink: theme.color_text
        muted: theme.color_text_meta
        danger: theme.color_chart_negative
        draw_bg +: {color: theme.color_fg_app}
        draw_grid +: {color: theme.color_bevel}
        draw_text +: {color: theme.color_text text_style: theme.font_regular {font_size: 11.0}}
        draw_vector +: {draw_depth: 2.0}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraRadarChart {
    #[uid]
    uid: WidgetUid,
    #[source]
    source: ScriptObjectRef,
    #[walk]
    walk: Walk,
    #[layout]
    layout: Layout,
    #[redraw]
    #[live]
    draw_bg: DrawColor,
    #[live]
    draw_grid: DrawColor,
    #[live]
    draw_text: DrawText,
    #[live]
    draw_vector: DrawVector,
    #[live]
    accent: Vec4f,
    #[live]
    accent_alt: Vec4f,
    #[live]
    selection: Vec4f,
    #[live]
    muted: Vec4f,
    #[live]
    ink: Vec4f,
    #[live]
    danger: Vec4f,
    #[rust]
    config: RadarChartConfig,
    #[rust]
    state: RadarChartState,
    #[rust]
    data: RadarData,
    #[rust]
    focus_region: FocusRegion,
}

impl TesseraRadarChart {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.config = RadarChartConfig::default();
        self.state.reduce(RadarChartEvent::Reset);
        self.data = radar_fixture();
        self.draw_bg.redraw(cx);
        cx.widget_action(self.uid, RadarChartAction::Reset);
    }

    fn ensure_fixture(&mut self) {
        if self.data.axes.is_empty() || self.data.series.is_empty() {
            self.data = radar_fixture();
        }
    }

    fn emit(&mut self, cx: &mut Cx, event: RadarChartEvent) {
        self.state.reduce(event);
        let action = match event {
            RadarChartEvent::AxisSelected(axis) => RadarChartAction::AxisSelected { axis },
            RadarChartEvent::ViewportChanged => RadarChartAction::ViewportChanged {
                changes: self.state.viewport_changes,
            },
            RadarChartEvent::Reset => RadarChartAction::Reset,
        };
        cx.widget_action(self.uid, action);
        self.draw_bg.redraw(cx);
    }

    fn axis_count(&self) -> usize {
        self.data.axes.len().min(self.config.max_axes).max(1)
    }

    fn select_axis(&mut self, cx: &mut Cx, index: usize) {
        self.emit(
            cx,
            RadarChartEvent::AxisSelected(Some(index.min(self.axis_count() - 1) as u32)),
        );
    }

    fn selected_axis(&self) -> usize {
        self.state.selected_axis.unwrap_or(0) as usize
    }

    fn draw_radar(&mut self, cx: &mut Cx2d, rect: Rect) {
        self.ensure_fixture();
        let data = self.data.clone();
        let state = validate_radar(&data);
        if !state.is_ready()
            || data.axes.len() > self.config.max_axes
            || data.series.len() > self.config.max_series
        {
            self.draw_text.color = super::chart_label::readable_on(self.draw_bg.color, self.danger);
            self.draw_text.text_style.font_size = 12.0;
            self.draw_text.draw_abs(
                cx,
                dvec2(rect.pos.x + 16.0, rect.pos.y + 50.0),
                state.label(),
            );
            return;
        }
        let sides = data.axes.len();
        let Some(layout) = RadarLayout::new(rect, sides) else {
            self.draw_text.color = self.muted;
            self.draw_text.text_style.font_size = 11.0;
            super::chart_label::draw_label(
                &mut self.draw_text,
                cx,
                Rect {
                    pos: rect.pos + dvec2(12.0, 36.0),
                    size: dvec2((rect.size.x - 24.0).max(0.0), 24.0),
                },
                "Chart viewport is too small",
                Align::default(),
            );
            return;
        };
        let RadarLayout { center, radius, .. } = layout;
        self.draw_vector.begin();
        for ring in [0.33_f64, 0.66, 1.0] {
            self.draw_vector
                .set_color(self.muted.x, self.muted.y, self.muted.z, 0.35);
            self.draw_vector.clear();
            for index in 0..=sides {
                let theta = -std::f64::consts::FRAC_PI_2
                    + std::f64::consts::TAU * index as f64 / sides as f64;
                let point = dvec2(
                    center.x + theta.cos() * radius * ring,
                    center.y + theta.sin() * radius * ring,
                );
                if index == 0 {
                    self.draw_vector.move_to(point.x as f32, point.y as f32);
                } else {
                    self.draw_vector.line_to(point.x as f32, point.y as f32);
                }
            }
            self.draw_vector.close();
            self.draw_vector.stroke_dip(cx, 1.0);
        }
        for (index, label) in data.axes.iter().enumerate() {
            let outer = layout.spoke(index, sides);
            self.draw_vector
                .set_color(self.muted.x, self.muted.y, self.muted.z, 0.48);
            self.draw_vector.clear();
            self.draw_vector.move_to(center.x as f32, center.y as f32);
            self.draw_vector.line_to(outer.x as f32, outer.y as f32);
            let width = if self.selected_axis() == index {
                2.0
            } else {
                1.0
            };
            self.draw_vector.stroke_dip(cx, width);
            self.draw_text.color = if self.selected_axis() == index {
                super::chart_label::readable_on(self.draw_bg.color, self.selection)
            } else {
                self.muted
            };
            self.draw_text.text_style.font_size = 9.0;
            let (bounds, align) = layout.label(index, sides);
            super::chart_label::draw_label(&mut self.draw_text, cx, bounds, label, align);
        }
        for (series_index, (_, values)) in data.series.iter().enumerate() {
            let color = if series_index == 0 {
                self.accent
            } else {
                self.accent_alt
            };
            self.draw_vector
                .set_color(color.x, color.y, color.z, color.w);
            self.draw_vector.clear();
            for (index, value) in values.iter().enumerate() {
                let theta = -std::f64::consts::FRAC_PI_2
                    + std::f64::consts::TAU * index as f64 / sides as f64;
                let point = dvec2(
                    center.x + theta.cos() * radius * value.clamp(0.0, 1.0),
                    center.y + theta.sin() * radius * value.clamp(0.0, 1.0),
                );
                if index == 0 {
                    self.draw_vector.move_to(point.x as f32, point.y as f32);
                } else {
                    self.draw_vector.line_to(point.x as f32, point.y as f32);
                }
            }
            self.draw_vector.close();
            self.draw_vector.stroke_dip(cx, 2.0);
        }
        self.draw_vector.end(cx);
    }
}

impl Widget for TesseraRadarChart {
    fn is_interactive(&self) -> bool {
        true
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, _scope: &mut Scope) {
        self.ensure_fixture();
        match event.hits_with_capture_overload(cx, self.draw_bg.area(), true) {
            Hit::KeyDown(key) if !key.is_repeat => match key.key_code {
                KeyCode::ArrowLeft | KeyCode::ArrowUp => {
                    self.select_axis(cx, self.selected_axis().saturating_sub(1));
                }
                KeyCode::ArrowRight | KeyCode::ArrowDown | KeyCode::Space => {
                    self.select_axis(cx, self.selected_axis() + 1);
                }
                KeyCode::Home => self.select_axis(cx, 0),
                KeyCode::End => self.select_axis(cx, self.axis_count() - 1),
                KeyCode::Escape => self.emit(cx, RadarChartEvent::AxisSelected(None)),
                _ => {}
            },
            Hit::FingerDown(fe) if fe.is_primary_hit() => {
                let rect = self.draw_bg.area().rect(cx);
                if let Some(layout) = RadarLayout::new(rect, self.axis_count()) {
                    self.select_axis(cx, layout.hit_axis(fe.abs, self.axis_count()));
                }
                cx.set_key_focus(self.draw_bg.area());
            }
            Hit::FingerScroll(_) => self.emit(cx, RadarChartEvent::ViewportChanged),
            _ => {}
        }
        self.draw_bg.redraw(cx);
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        let rect = self.draw_bg.draw_walk(cx, walk);
        self.draw_text.color = self.ink;
        self.draw_text.text_style.font_size = 12.0;
        self.draw_text.draw_abs(
            cx,
            dvec2(rect.pos.x + 12.0, rect.pos.y + 9.0),
            "Radar chart",
        );
        self.draw_text.color = self.muted;
        self.draw_text.text_style.font_size = 9.0;
        self.draw_text.draw_abs(
            cx,
            dvec2(rect.pos.x + 12.0, rect.pos.y + rect.size.y - 14.0),
            "Arrow axis  click spoke  Escape clear",
        );
        self.draw_radar(cx, rect);
        self.focus_region
            .register(cx, self.uid, self.draw_bg.area(), NavRole::Slider, 0.0);
        DrawStep::done()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tessera_core::catalog::ComponentId;

    #[test]
    fn radar_labels_stay_bounded_and_clear_of_all_guides() {
        for width in [260.0, 532.0, 932.0] {
            for axes in 3..=MAX_RADAR_AXES {
                let rect = Rect {
                    pos: dvec2(280.0, 203.0),
                    size: dvec2(width, 260.0),
                };
                let layout = RadarLayout::new(rect, axes).unwrap();
                for index in 0..axes {
                    let (label, _) = layout.label(index, axes);
                    assert!(label.pos.x >= rect.pos.x + 12.0 - 1e-6);
                    assert!(label.pos.y >= rect.pos.y + 32.0 - 1e-6);
                    assert!(label.pos.x + label.size.x <= rect.pos.x + width - 12.0 + 1e-6);
                    assert!(label.pos.y + label.size.y <= rect.pos.y + 236.0 + 1e-6);
                    let nearest = dvec2(
                        layout
                            .center
                            .x
                            .clamp(label.pos.x, label.pos.x + label.size.x),
                        layout
                            .center
                            .y
                            .clamp(label.pos.y, label.pos.y + label.size.y),
                    );
                    let distance = (nearest - layout.center).length();
                    assert!(distance >= layout.radius + RadarLayout::SPOKE_EXTENSION + 4.0);
                    for other in index + 1..axes {
                        let (other, _) = layout.label(other, axes);
                        let overlap_x = label.pos.x < other.pos.x + other.size.x
                            && other.pos.x < label.pos.x + label.size.x;
                        let overlap_y = label.pos.y < other.pos.y + other.size.y
                            && other.pos.y < label.pos.y + label.size.y;
                        assert!(!(overlap_x && overlap_y), "width={width}, axes={axes}");
                    }
                }
            }
        }
    }

    #[test]
    fn radar_hit_testing_uses_the_drawn_center_and_wraps_the_first_spoke() {
        let rect = Rect {
            pos: dvec2(280.0, 203.0),
            size: dvec2(532.0, 260.0),
        };
        for axes in 3..=MAX_RADAR_AXES {
            let layout = RadarLayout::new(rect, axes).unwrap();
            for index in 0..axes {
                assert_eq!(layout.hit_axis(layout.spoke(index, axes), axes), index);
            }
            let near_first = layout.spoke(0, axes) - dvec2(0.01, 0.0);
            assert_eq!(layout.hit_axis(near_first, axes), 0);
        }
    }

    #[test]
    fn radar_rejects_unusable_geometry_instead_of_overlapping_content() {
        for size in [
            dvec2(100.0, 260.0),
            dvec2(532.0, 100.0),
            dvec2(f64::NAN, 260.0),
        ] {
            assert!(
                RadarLayout::new(
                    Rect {
                        pos: dvec2(0.0, 0.0),
                        size
                    },
                    12
                )
                .is_none()
            );
        }
        let rect = Rect {
            pos: dvec2(0.0, 0.0),
            size: dvec2(532.0, 260.0),
        };
        assert!(RadarLayout::new(rect, 2).is_none());
        assert!(RadarLayout::new(rect, MAX_RADAR_AXES + 1).is_none());
    }

    #[test]
    fn radar_chart_has_one_exact_native_route() {
        assert_eq!(
            RadarChartSurfaceCatalog::widget_name(ComponentId::RadarChart),
            Some("TesseraRadarChart")
        );
        assert!(RadarChartConfig::default().max_axes >= 3);
    }

    #[test]
    fn radar_chart_reducer_resets_selected_axis() {
        let mut state = RadarChartState::default();
        state.reduce(RadarChartEvent::AxisSelected(Some(4)));
        state.reduce(RadarChartEvent::Reset);
        assert_eq!(state, RadarChartState::default());
    }
}
