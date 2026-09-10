use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::App,
    ComponentFamily::Service,
    InteractionKind::Configure,
    "host configuration",
    "default, configured, invalid, fallback",
    "app native sample",
);
