use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::Upload,
    ComponentFamily::Action,
    InteractionKind::Activate,
    "Enter / Space",
    "default, hover, pressed, focus-visible, disabled",
    "upload native sample",
);
