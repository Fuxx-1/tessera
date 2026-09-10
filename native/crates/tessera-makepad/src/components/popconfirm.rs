use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::Popconfirm,
    ComponentFamily::Overlay,
    InteractionKind::Overlay,
    "Click / Escape",
    "closed, open, confirm, outside-cancel, escape-cancel, tab-cycle, focus-return; platform focus/AX capture unverified",
    "popconfirm native sample",
);
