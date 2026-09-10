use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::FunnelChart,
    ComponentFamily::Chart,
    InteractionKind::Inspect,
    "Arrow / + / - / 0",
    "loading, empty, populated, selected, over-limit",
    "funnel-chart native sample",
);
