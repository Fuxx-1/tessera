use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::FilterPanel,
    ComponentFamily::Input,
    InteractionKind::Edit,
    "text / IME / selection",
    "empty, editing, invalid, disabled, read-only",
    "filter-panel native sample",
);
