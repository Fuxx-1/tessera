use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::Typography,
    ComponentFamily::Decoration,
    InteractionKind::Inspect,
    "read-only",
    "default, reduced-motion, constrained",
    "typography native sample",
);
