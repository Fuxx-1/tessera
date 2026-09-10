use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::ScatterChart,
    ComponentFamily::Chart,
    InteractionKind::Inspect,
    "Arrow / + / - / 0",
    "loading, empty, populated, selected, over-limit",
    "scatter-chart native sample",
);
