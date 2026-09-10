use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::Anchor,
    ComponentFamily::Choice,
    InteractionKind::Select,
    "Arrow / Enter / Space",
    "unchecked, checked, mixed, focus-visible, disabled",
    "anchor native sample",
);
