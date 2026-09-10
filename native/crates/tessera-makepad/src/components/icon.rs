use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::Icon,
    ComponentFamily::Decoration,
    InteractionKind::Inspect,
    "read-only",
    "default, reduced-motion, constrained",
    "icon native sample",
);
