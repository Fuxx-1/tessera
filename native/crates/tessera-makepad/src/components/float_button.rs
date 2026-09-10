use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::FloatButton,
    ComponentFamily::Action,
    InteractionKind::Activate,
    "Enter / Space",
    "default, hover, pressed, focus-visible, disabled",
    "float-button native sample",
);
