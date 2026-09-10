use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::Message,
    ComponentFamily::Action,
    InteractionKind::Activate,
    "Click",
    "idle, sent",
    "message native sample",
);
