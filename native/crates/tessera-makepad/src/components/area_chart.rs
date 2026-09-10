use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::AreaChart,
    ComponentFamily::Chart,
    InteractionKind::Inspect,
    "Arrow / + / - / 0",
    "loading, empty, populated, selected, over-limit",
    "area-chart native sample",
);
