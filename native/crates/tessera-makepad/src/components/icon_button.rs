use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::IconButton,
    ComponentFamily::Action,
    InteractionKind::Activate,
    "Enter / Space",
    "default, hover, pressed, focus-visible, disabled",
    "icon-button native sample",
);
