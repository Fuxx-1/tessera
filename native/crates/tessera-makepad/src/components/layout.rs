use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::Layout,
    ComponentFamily::Layout,
    InteractionKind::Navigate,
    "pointer / keyboard resize",
    "empty, compact, expanded, constrained",
    "layout native sample",
);
