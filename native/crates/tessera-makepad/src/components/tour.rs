use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::Tour,
    ComponentFamily::Overlay,
    InteractionKind::Overlay,
    "Enter / Escape",
    "closed, open, outside-close, escape-close, focus-return",
    "tour native sample",
);
