use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::Splitter,
    ComponentFamily::Layout,
    InteractionKind::Navigate,
    "pointer / keyboard resize",
    "empty, compact, expanded, constrained",
    "splitter native sample",
);
