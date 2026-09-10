use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::ColorPicker,
    ComponentFamily::Input,
    InteractionKind::Edit,
    "text / IME / selection",
    "empty, editing, invalid, disabled, read-only",
    "color-picker native sample",
);
