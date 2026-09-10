use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::Empty,
    ComponentFamily::Display,
    InteractionKind::Inspect,
    "read / scroll",
    "empty, populated, overflow, loading, error",
    "empty native sample",
);
