use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::CommandPalette,
    ComponentFamily::Overlay,
    InteractionKind::Overlay,
    "Enter / Escape",
    "closed, open, outside-close, escape-close, focus-return",
    "command-palette native sample",
);
