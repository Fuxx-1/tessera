use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::Input,
    ComponentFamily::Input,
    InteractionKind::Edit,
    "text / IME / selection",
    "empty, editing, invalid, disabled, read-only",
    "input native sample",
);
