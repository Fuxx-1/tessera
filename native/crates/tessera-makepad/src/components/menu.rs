use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::Menu,
    ComponentFamily::Choice,
    InteractionKind::Select,
    "Arrow / Enter / Space",
    "unchecked, checked, mixed, focus-visible, disabled",
    "menu native sample",
);
