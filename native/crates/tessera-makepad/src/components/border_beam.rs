use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::BorderBeam,
    ComponentFamily::Feedback,
    InteractionKind::Inspect,
    "read status / retry",
    "idle, loading, success, warning, error",
    "border-beam native sample",
);
