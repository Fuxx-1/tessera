//! Native Treemap widget with deterministic weighted tiles and local selection.

use crate::foundation::focus::FocusRegion;
use crate::foundation::vector::AlignedVector as DrawVector;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

use super::chart_common::{GraphNode, MAX_GRAPH_NODES, treemap_fixture};

pub struct TreemapSurfaceCatalog;

impl TreemapSurfaceCatalog {
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Treemap => Some("TesseraTreemap"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TreemapConfig {
    pub max_nodes: usize,
}

impl Default for TreemapConfig {
    fn default() -> Self {
        Self {
            max_nodes: MAX_GRAPH_NODES,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct TreemapState {
    pub selected_tile: Option<u32>,
    pub viewport_changes: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TreemapEvent {
    TileSelected(Option<u32>),
    ViewportChanged,
    Reset,
}

impl TreemapState {
    pub fn reduce(&mut self, event: TreemapEvent) {
        match event {
            TreemapEvent::TileSelected(tile) => self.selected_tile = tile,
            TreemapEvent::ViewportChanged => {
                self.viewport_changes = self.viewport_changes.saturating_add(1);
            }
            TreemapEvent::Reset => *self = Self::default(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum TreemapAction {
    TileSelected {
        tile: Option<u32>,
    },
    ViewportChanged {
        changes: u32,
    },
    #[default]
    Reset,
}

#[derive(Clone)]
struct TreemapTile {
    id: u32,
    label: String,
    rect: Rect,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    use mod.text.*

    mod.widgets.TesseraTreemapBase = #(TesseraTreemap::register_widget(vm))
    mod.widgets.TesseraTreemap = set_type_default() do mod.widgets.TesseraTreemapBase{
        width: Fill
        height: 260
        accent: theme.color_chart_primary
        accent_alt: theme.color_chart_secondary
        positive: theme.color_chart_positive
        warning: theme.color_chart_warning
        selection: theme.color_chart_selection
        ink: theme.color_text
        muted: theme.color_text_meta
        danger: theme.color_chart_negative
        draw_bg +: {color: theme.color_fg_app}
        draw_grid +: {color: theme.color_bevel}
        draw_text +: {draw_depth: 3.0 color: theme.color_text text_style: theme.font_regular {font_size: 11.0}}
        draw_vector +: {draw_depth: 2.0}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraTreemap {
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
    positive: Vec4f,
    #[live]
    warning: Vec4f,
    #[live]
    selection: Vec4f,
    #[live]
    muted: Vec4f,
    #[live]
    ink: Vec4f,
    #[live]
    danger: Vec4f,
    #[rust]
    config: TreemapConfig,
    #[rust]
    state: TreemapState,
    #[rust]
    nodes: Vec<GraphNode>,
    #[rust]
    focus_region: FocusRegion,
}

impl TesseraTreemap {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.config = TreemapConfig::default();
        self.state.reduce(TreemapEvent::Reset);
        self.nodes = treemap_fixture();
        self.draw_bg.redraw(cx);
        cx.widget_action(self.uid, TreemapAction::Reset);
    }

    fn ensure_fixture(&mut self) {
        if self.nodes.is_empty() {
            self.nodes = treemap_fixture();
        }
    }

    fn emit(&mut self, cx: &mut Cx, event: TreemapEvent) {
        self.state.reduce(event);
        let action = match event {
            TreemapEvent::TileSelected(tile) => TreemapAction::TileSelected { tile },
            TreemapEvent::ViewportChanged => TreemapAction::ViewportChanged {
                changes: self.state.viewport_changes,
            },
            TreemapEvent::Reset => TreemapAction::Reset,
        };
        cx.widget_action(self.uid, action);
        self.draw_bg.redraw(cx);
    }

    fn tiles(&self, plot: Rect) -> Result<Vec<TreemapTile>, &'static str> {
        if self.nodes.len() > self.config.max_nodes {
            return Err("treemap exceeds node budget");
        }
        let root = self
            .nodes
            .iter()
            .find(|node| node.parent_id.is_none())
            .map(|node| node.id)
            .ok_or("treemap has no root")?;
        let items: Vec<&GraphNode> = self
            .nodes
            .iter()
            .filter(|node| {
                node.parent_id == Some(root) && node.weight.is_finite() && node.weight > 0.0
            })
            .collect();
        if items.is_empty() {
            return Err("treemap has no positive root children");
        }
        let total = items.iter().map(|node| node.weight).sum::<f64>();
        let mut cursor = plot.pos.x;
        Ok(items
            .into_iter()
            .map(|node| {
                let width = (plot.size.x * node.weight / total).max(1.0);
                let tile = TreemapTile {
                    id: node.id,
                    label: node.label.clone(),
                    rect: Rect {
                        pos: dvec2(cursor + 1.0, plot.pos.y + 1.0),
                        size: dvec2((width - 2.0).max(1.0), (plot.size.y - 2.0).max(1.0)),
                    },
                };
                cursor += width;
                tile
            })
            .collect())
    }

    fn selected_index(&self, tiles: &[TreemapTile]) -> usize {
        self.state
            .selected_tile
            .and_then(|selected| tiles.iter().position(|tile| tile.id == selected))
            .unwrap_or(0)
    }

    fn draw_tiles(&mut self, cx: &mut Cx2d, rect: Rect) {
        self.ensure_fixture();
        let plot = Rect {
            pos: dvec2(rect.pos.x + 18.0, rect.pos.y + 38.0),
            size: dvec2((rect.size.x - 36.0).max(1.0), (rect.size.y - 68.0).max(1.0)),
        };
        let Ok(tiles) = self.tiles(plot) else {
            self.draw_text.color = super::chart_label::readable_on(self.draw_bg.color, self.danger);
            self.draw_text.text_style.font_size = 12.0;
            self.draw_text.draw_abs(
                cx,
                dvec2(rect.pos.x + 16.0, rect.pos.y + 50.0),
                "invalid treemap fixture",
            );
            return;
        };
        let colors = [self.accent, self.accent_alt, self.positive, self.warning];
        self.draw_vector.begin();
        for (index, tile) in tiles.iter().enumerate() {
            let color = if self.state.selected_tile == Some(tile.id) {
                self.selection
            } else {
                colors[index % colors.len()]
            };
            self.draw_vector
                .set_color(color.x, color.y, color.z, color.w);
            self.draw_vector.clear();
            self.draw_vector.rect(
                tile.rect.pos.x as f32,
                tile.rect.pos.y as f32,
                tile.rect.size.x as f32,
                tile.rect.size.y as f32,
            );
            self.draw_vector.fill();
        }
        self.draw_vector.end(cx);
        self.draw_text.new_draw_call(cx);
        for (index, tile) in tiles.iter().enumerate() {
            let fill = if self.state.selected_tile == Some(tile.id) {
                self.selection
            } else {
                colors[index % colors.len()]
            };
            self.draw_text.color = super::chart_label::on_fill(fill);
            self.draw_text.text_style.font_size = 10.0;
            super::chart_label::draw_label(
                &mut self.draw_text,
                cx,
                Rect {
                    pos: tile.rect.pos + dvec2(7.0, 10.0),
                    size: dvec2(tile.rect.size.x - 14.0, 24.0),
                },
                &tile.label,
                Align::default(),
            );
        }
    }
}

impl Widget for TesseraTreemap {
    fn is_interactive(&self) -> bool {
        true
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, _scope: &mut Scope) {
        self.ensure_fixture();
        match event.hits_with_capture_overload(cx, self.draw_bg.area(), true) {
            Hit::KeyDown(key) if !key.is_repeat => {
                let rect = self.draw_bg.area().rect(cx);
                let plot = Rect {
                    pos: dvec2(rect.pos.x + 18.0, rect.pos.y + 38.0),
                    size: dvec2((rect.size.x - 36.0).max(1.0), (rect.size.y - 68.0).max(1.0)),
                };
                if let Ok(tiles) = self.tiles(plot) {
                    let current = self.selected_index(&tiles);
                    match key.key_code {
                        KeyCode::ArrowLeft | KeyCode::ArrowUp => self.emit(
                            cx,
                            TreemapEvent::TileSelected(
                                tiles.get(current.saturating_sub(1)).map(|tile| tile.id),
                            ),
                        ),
                        KeyCode::ArrowRight | KeyCode::ArrowDown | KeyCode::Space => self.emit(
                            cx,
                            TreemapEvent::TileSelected(
                                tiles
                                    .get((current + 1).min(tiles.len() - 1))
                                    .map(|tile| tile.id),
                            ),
                        ),
                        KeyCode::Home => self.emit(
                            cx,
                            TreemapEvent::TileSelected(tiles.first().map(|tile| tile.id)),
                        ),
                        KeyCode::End => self.emit(
                            cx,
                            TreemapEvent::TileSelected(tiles.last().map(|tile| tile.id)),
                        ),
                        KeyCode::Escape => self.emit(cx, TreemapEvent::TileSelected(None)),
                        _ => {}
                    }
                }
            }
            Hit::FingerDown(fe) if fe.is_primary_hit() => {
                let rect = self.draw_bg.area().rect(cx);
                let plot = Rect {
                    pos: dvec2(rect.pos.x + 18.0, rect.pos.y + 38.0),
                    size: dvec2((rect.size.x - 36.0).max(1.0), (rect.size.y - 68.0).max(1.0)),
                };
                if let Ok(tiles) = self.tiles(plot) {
                    let tile = tiles.iter().find(|tile| {
                        fe.abs.x >= tile.rect.pos.x
                            && fe.abs.x <= tile.rect.pos.x + tile.rect.size.x
                            && fe.abs.y >= tile.rect.pos.y
                            && fe.abs.y <= tile.rect.pos.y + tile.rect.size.y
                    });
                    self.emit(cx, TreemapEvent::TileSelected(tile.map(|tile| tile.id)));
                }
                cx.set_key_focus(self.draw_bg.area());
            }
            Hit::FingerScroll(_) => self.emit(cx, TreemapEvent::ViewportChanged),
            _ => {}
        }
        self.draw_bg.redraw(cx);
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        let rect = self.draw_bg.draw_walk(cx, walk);
        self.draw_text.color = self.ink;
        self.draw_text.text_style.font_size = 12.0;
        self.draw_text
            .draw_abs(cx, dvec2(rect.pos.x + 12.0, rect.pos.y + 9.0), "Treemap");
        self.draw_text.color = self.muted;
        self.draw_text.text_style.font_size = 9.0;
        self.draw_text.draw_abs(
            cx,
            dvec2(rect.pos.x + 12.0, rect.pos.y + rect.size.y - 14.0),
            "Arrow tile  click tile  Escape clear",
        );
        self.draw_tiles(cx, rect);
        self.focus_region
            .register(cx, self.uid, self.draw_bg.area(), NavRole::Slider, 0.0);
        DrawStep::done()
    }
}

#[cfg(test)]
mod tests {
    use super::{TreemapConfig, TreemapEvent, TreemapState, TreemapSurfaceCatalog};
    use tessera_core::catalog::ComponentId;

    #[test]
    fn treemap_has_an_exact_route_and_bounded_input() {
        assert_eq!(
            TreemapSurfaceCatalog::widget_name(ComponentId::Treemap),
            Some("TesseraTreemap")
        );
        assert!(TreemapConfig::default().max_nodes > 0);
    }

    #[test]
    fn treemap_reducer_resets_the_selected_tile() {
        let mut state = TreemapState::default();
        state.reduce(TreemapEvent::TileSelected(Some(202)));
        state.reduce(TreemapEvent::Reset);
        assert_eq!(state, TreemapState::default());
    }
}
