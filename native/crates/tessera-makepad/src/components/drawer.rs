use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::Drawer,
    ComponentFamily::Overlay,
    InteractionKind::Overlay,
    "Click / Escape",
    "closed, open, outside-close, escape-close, tab-cycle, focus-return; platform focus/AX capture unverified",
    "drawer native sample",
);
