use super::{ComponentDefinition, ComponentFamily, InteractionKind};
use tessera_core::catalog::ComponentId;

pub const DEFINITION: ComponentDefinition = ComponentDefinition::new(
    ComponentId::Popover,
    ComponentFamily::Overlay,
    InteractionKind::Overlay,
    "Click / Escape",
    "closed, open, anchor flip/clamp, outside-close, escape-close, focus-return; platform focus/AX capture unverified",
    "popover native sample",
);
