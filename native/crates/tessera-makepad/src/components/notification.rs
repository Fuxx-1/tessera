use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::Notification,
    ComponentFamily::Action,
    InteractionKind::Activate,
    "Click / Escape",
    "visible, hidden; global placement deferred",
    "notification native sample",
);
