use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::Flex,
    ComponentFamily::Layout,
    InteractionKind::Navigate,
    "pointer / keyboard resize",
    "empty, compact, expanded, constrained",
    "flex native sample",
);
