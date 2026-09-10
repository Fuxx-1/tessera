use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::LineChart,
    ComponentFamily::Chart,
    InteractionKind::Inspect,
    "Pointer nearest point, Arrow select, + / - zoom, Home reset",
    "empty, populated with gaps, selected point, viewport changed, over-limit",
    "component-owned line-chart native sample",
);
