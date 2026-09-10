use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::Button,
    ComponentFamily::Action,
    InteractionKind::Activate,
    "Enter / Space",
    "default, hover, pressed, focus-visible, disabled",
    "button native sample",
);
