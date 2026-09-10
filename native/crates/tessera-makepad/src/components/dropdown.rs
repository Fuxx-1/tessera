use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::Dropdown,
    ComponentFamily::Choice,
    InteractionKind::Select,
    "Click / Escape",
    "closed, open, selected; anchored placement deferred",
    "dropdown native sample",
);
