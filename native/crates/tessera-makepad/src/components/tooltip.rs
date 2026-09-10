use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::Tooltip,
    ComponentFamily::Overlay,
    InteractionKind::Overlay,
    "Click / Escape",
    "hidden, visible, trigger-hide, escape-hide; anchor/focus return deferred",
    "tooltip native sample",
);
