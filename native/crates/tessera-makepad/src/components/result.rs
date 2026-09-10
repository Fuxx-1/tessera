use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::Result,
    ComponentFamily::Feedback,
    InteractionKind::Inspect,
    "read status / retry",
    "idle, loading, success, warning, error",
    "result native sample",
);
