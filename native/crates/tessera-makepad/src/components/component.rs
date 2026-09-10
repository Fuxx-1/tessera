use tessera_core::catalog::{COMPONENT_COUNT, ComponentId};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ComponentFamily {
    Action,
    Input,
    Choice,
    Layout,
    Overlay,
    Feedback,
    Display,
    Chart,
    Service,
    Decoration,
}

impl ComponentFamily {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Action => "Action",
            Self::Input => "Input",
            Self::Choice => "Choice",
            Self::Layout => "Layout",
            Self::Overlay => "Overlay",
            Self::Feedback => "Feedback",
            Self::Display => "Display",
            Self::Chart => "Chart",
            Self::Service => "Service",
            Self::Decoration => "Decoration",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InteractionKind {
    Activate,
    Edit,
    Select,
    Navigate,
    Overlay,
    Inspect,
    Configure,
}

/// The stable route identity for one native component surface.
///
/// This is deliberately keyed by `ComponentId`, rather than by visual family
/// or widget class. A family owner can reuse a low-level primitive, but it may
/// not route a different catalog entry through that primitive's demo state.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct ComponentSurfaceSlot {
    id: ComponentId,
}

impl ComponentSurfaceSlot {
    #[must_use]
    pub const fn for_component(id: ComponentId) -> Self {
        Self { id }
    }

    #[must_use]
    pub const fn component_id(self) -> ComponentId {
        self.id
    }

    #[must_use]
    pub const fn route_key(self) -> &'static str {
        self.id.as_str()
    }
}

/// Declares whether a component-owned native widget has been connected to the
/// Gallery surface host. `Blocked` is intentional: it prevents metadata from
/// being rendered as a working component while a family implementation is
/// still absent.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ComponentSurfaceAvailability {
    Blocked,
    Connected { widget: &'static str },
}

impl ComponentSurfaceAvailability {
    #[must_use]
    pub const fn label(self) -> &'static str {
        match self {
            Self::Blocked => "blocked",
            Self::Connected { .. } => "connected",
        }
    }

    #[must_use]
    pub const fn widget(self) -> Option<&'static str> {
        match self {
            Self::Blocked => None,
            Self::Connected { widget } => Some(widget),
        }
    }

    #[must_use]
    pub const fn is_connected(self) -> bool {
        matches!(self, Self::Connected { .. })
    }
}

/// Compile-time declaration a family module adds to its component definition
/// once it owns an actual Makepad widget. The Gallery can then mount and
/// dispatch that component without any family-based fallback.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ComponentSurfaceRegistration {
    pub slot: ComponentSurfaceSlot,
    pub availability: ComponentSurfaceAvailability,
}

impl ComponentSurfaceRegistration {
    #[must_use]
    pub const fn blocked(id: ComponentId) -> Self {
        Self {
            slot: ComponentSurfaceSlot::for_component(id),
            availability: ComponentSurfaceAvailability::Blocked,
        }
    }

    #[must_use]
    pub const fn connected(id: ComponentId, widget: &'static str) -> Self {
        Self {
            slot: ComponentSurfaceSlot::for_component(id),
            availability: ComponentSurfaceAvailability::Connected { widget },
        }
    }
}

/// A complete, typed surface declaration used by the Gallery dispatcher.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ComponentSurfaceDescriptor {
    pub id: ComponentId,
    pub registration: ComponentSurfaceRegistration,
}

impl ComponentSurfaceDescriptor {
    #[must_use]
    pub const fn blocked(id: ComponentId) -> Self {
        Self {
            id,
            registration: ComponentSurfaceRegistration::blocked(id),
        }
    }

    #[must_use]
    pub const fn connected(id: ComponentId, widget: &'static str) -> Self {
        Self {
            id,
            registration: ComponentSurfaceRegistration::connected(id, widget),
        }
    }

    #[must_use]
    pub const fn slot(self) -> ComponentSurfaceSlot {
        self.registration.slot
    }

    #[must_use]
    pub const fn availability(self) -> ComponentSurfaceAvailability {
        self.registration.availability
    }
}

/// Events flowing only between an individual component surface and its host.
///
/// Family modules reduce their own values and controls. The host only tracks
/// routing, lifecycle and whether a surface actually mounted; it never turns a
/// generic action into component behavior.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ComponentSurfaceEvent {
    Mount,
    Activate,
    Reset,
    Suspend,
    Fail,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ComponentSurfacePhase {
    Dormant,
    AwaitingMount,
    Mounted,
    Active,
    Blocked,
    Failed,
}

impl ComponentSurfacePhase {
    #[must_use]
    pub const fn label(self) -> &'static str {
        match self {
            Self::Dormant => "dormant",
            Self::AwaitingMount => "awaiting native mount",
            Self::Mounted => "mounted",
            Self::Active => "active",
            Self::Blocked => "blocked: native surface not connected",
            Self::Failed => "failed",
        }
    }
}

/// The only public contract a real component-owned surface needs to implement.
///
/// The trait intentionally contains no Live/HTML/string renderer escape hatch.
/// A surface declares its exact catalog ID, widget name and typed event reducer;
/// Gallery integration remains responsible for mount and route generations.
pub trait ComponentSurface {
    const ID: ComponentId;
    const WIDGET: &'static str;

    fn handle_surface_event(&mut self, event: ComponentSurfaceEvent);
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ComponentSurfaceDispatchError {
    ComponentMismatch,
    NotConnected,
    NotMounted,
    RouteMismatch,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ComponentSurfaceSnapshot {
    pub descriptor: ComponentSurfaceDescriptor,
    pub phase: ComponentSurfacePhase,
    pub route_generation: u64,
    pub activation_count: u32,
    pub reset_count: u32,
}

impl ComponentSurfaceSnapshot {
    #[must_use]
    pub const fn id(self) -> ComponentId {
        self.descriptor.id
    }

    #[must_use]
    pub const fn is_interactive(self) -> bool {
        matches!(
            self.phase,
            ComponentSurfacePhase::Mounted | ComponentSurfacePhase::Active
        )
    }

    #[must_use]
    pub const fn status_label(self) -> &'static str {
        self.phase.label()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct ComponentSurfaceState {
    phase: ComponentSurfacePhase,
    route_generation: u64,
    activation_count: u32,
    reset_count: u32,
}

impl ComponentSurfaceState {
    const fn new(_id: ComponentId) -> Self {
        Self {
            phase: ComponentSurfacePhase::Dormant,
            route_generation: 0,
            activation_count: 0,
            reset_count: 0,
        }
    }

    const fn snapshot(self, descriptor: ComponentSurfaceDescriptor) -> ComponentSurfaceSnapshot {
        ComponentSurfaceSnapshot {
            descriptor,
            phase: self.phase,
            route_generation: self.route_generation,
            activation_count: self.activation_count,
            reset_count: self.reset_count,
        }
    }
}

const fn build_surface_states() -> [ComponentSurfaceState; COMPONENT_COUNT] {
    let mut states = [ComponentSurfaceState::new(ComponentId::Button); COMPONENT_COUNT];
    let mut index = 0;
    while index < ComponentId::ALL.len() {
        states[index] = ComponentSurfaceState::new(ComponentId::ALL[index]);
        index += 1;
    }
    states
}

/// Fixed-size state for the 101 catalog surfaces.
///
/// The registry avoids a per-route heap allocation and preserves each
/// component's local lifecycle counters across catalog navigation. It is a
/// routing state machine, not a visual fallback renderer.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ComponentSurfaceRegistry {
    states: [ComponentSurfaceState; COMPONENT_COUNT],
    active: Option<ComponentId>,
}

impl Default for ComponentSurfaceRegistry {
    fn default() -> Self {
        Self {
            states: build_surface_states(),
            active: None,
        }
    }
}

impl ComponentSurfaceRegistry {
    #[must_use]
    pub const fn active_id(&self) -> Option<ComponentId> {
        self.active
    }

    #[must_use]
    pub fn snapshot(&self, descriptor: ComponentSurfaceDescriptor) -> ComponentSurfaceSnapshot {
        self.states[descriptor.id as usize].snapshot(descriptor)
    }

    pub fn select(&mut self, descriptor: ComponentSurfaceDescriptor, route_generation: u64) {
        debug_assert_eq!(descriptor.id, descriptor.slot().component_id());
        if let Some(previous) = self.active.filter(|previous| *previous != descriptor.id) {
            self.states[previous as usize].phase = ComponentSurfacePhase::Dormant;
        }

        let state = &mut self.states[descriptor.id as usize];
        state.route_generation = route_generation;
        state.phase = if descriptor.availability().is_connected() {
            ComponentSurfacePhase::AwaitingMount
        } else {
            ComponentSurfacePhase::Blocked
        };
        self.active = Some(descriptor.id);
    }

    pub fn clear(&mut self) {
        if let Some(active) = self.active.take() {
            self.states[active as usize].phase = ComponentSurfacePhase::Dormant;
        }
    }

    pub fn dispatch(
        &mut self,
        descriptor: ComponentSurfaceDescriptor,
        route_generation: u64,
        event: ComponentSurfaceEvent,
    ) -> Result<ComponentSurfaceSnapshot, ComponentSurfaceDispatchError> {
        if descriptor.id != descriptor.slot().component_id() {
            return Err(ComponentSurfaceDispatchError::ComponentMismatch);
        }
        if self.active != Some(descriptor.id) {
            return Err(ComponentSurfaceDispatchError::RouteMismatch);
        }
        if !descriptor.availability().is_connected() {
            return Err(ComponentSurfaceDispatchError::NotConnected);
        }

        let state = &mut self.states[descriptor.id as usize];
        if state.route_generation != route_generation {
            return Err(ComponentSurfaceDispatchError::RouteMismatch);
        }

        match event {
            ComponentSurfaceEvent::Mount => state.phase = ComponentSurfacePhase::Mounted,
            ComponentSurfaceEvent::Activate => {
                if !matches!(
                    state.phase,
                    ComponentSurfacePhase::Mounted | ComponentSurfacePhase::Active
                ) {
                    return Err(ComponentSurfaceDispatchError::NotMounted);
                }
                state.activation_count = state.activation_count.saturating_add(1);
                state.phase = ComponentSurfacePhase::Active;
            }
            ComponentSurfaceEvent::Reset => {
                if !matches!(
                    state.phase,
                    ComponentSurfacePhase::Mounted | ComponentSurfacePhase::Active
                ) {
                    return Err(ComponentSurfaceDispatchError::NotMounted);
                }
                state.reset_count = state.reset_count.saturating_add(1);
                state.phase = ComponentSurfacePhase::Mounted;
            }
            ComponentSurfaceEvent::Suspend => state.phase = ComponentSurfacePhase::Dormant,
            ComponentSurfaceEvent::Fail => state.phase = ComponentSurfacePhase::Failed,
        }
        Ok(state.snapshot(descriptor))
    }
}

impl InteractionKind {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Activate => "activate",
            Self::Edit => "edit",
            Self::Select => "select",
            Self::Navigate => "navigate",
            Self::Overlay => "overlay",
            Self::Inspect => "inspect",
            Self::Configure => "configure",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ComponentDefinition {
    pub id: ComponentId,
    pub family: ComponentFamily,
    pub interaction: InteractionKind,
    pub keyboard: &'static str,
    pub states: &'static str,
    pub sample: &'static str,
}

impl ComponentDefinition {
    pub const fn new(
        id: ComponentId,
        family: ComponentFamily,
        interaction: InteractionKind,
        keyboard: &'static str,
        states: &'static str,
        sample: &'static str,
    ) -> Self {
        Self {
            id,
            family,
            interaction,
            keyboard,
            states,
            sample,
        }
    }

    pub const fn slug(self) -> &'static str {
        self.id.as_str()
    }

    pub const fn name(self) -> &'static str {
        self.id.spec().name
    }

    pub const fn summary(self) -> &'static str {
        self.id.spec().summary
    }

    pub fn describe(self) -> String {
        format!(
            "{} / {} / {} / {}",
            self.name(),
            self.family.label(),
            self.interaction.label(),
            self.keyboard
        )
    }
}

#[cfg(test)]
mod tests {
    use super::super::{ComponentFamily, definitions};
    use super::{
        ComponentSurfaceAvailability, ComponentSurfaceDescriptor, ComponentSurfaceDispatchError,
        ComponentSurfaceEvent, ComponentSurfacePhase, ComponentSurfaceRegistry,
    };
    use std::collections::BTreeSet;
    use tessera_core::catalog::ComponentId;

    #[test]
    fn every_native_component_has_an_independent_definition() {
        let definitions = definitions();
        assert_eq!(definitions.len(), 101);
        let ids = definitions
            .iter()
            .map(|definition| definition.id)
            .collect::<BTreeSet<_>>();
        assert_eq!(ids.len(), 101);
        assert!(
            definitions
                .iter()
                .all(|definition| !definition.sample.is_empty())
        );
    }

    #[test]
    fn every_component_uses_a_known_visual_family() {
        assert!(definitions().iter().all(|definition| {
            matches!(
                definition.family,
                ComponentFamily::Action
                    | ComponentFamily::Input
                    | ComponentFamily::Choice
                    | ComponentFamily::Layout
                    | ComponentFamily::Overlay
                    | ComponentFamily::Feedback
                    | ComponentFamily::Display
                    | ComponentFamily::Chart
                    | ComponentFamily::Service
                    | ComponentFamily::Decoration
            )
        }));
    }

    #[test]
    fn every_catalog_id_has_an_exact_surface_slot_without_a_family_fallback() {
        let mut slots = BTreeSet::new();
        for id in ComponentId::ALL {
            let descriptor = ComponentSurfaceDescriptor::blocked(id);
            assert_eq!(descriptor.id, id);
            assert_eq!(descriptor.slot().component_id(), id);
            assert!(slots.insert(descriptor.slot()));
        }
        assert_eq!(slots.len(), ComponentId::ALL.len());
    }

    #[test]
    fn unregistered_surface_rejects_generic_activation() {
        let descriptor = ComponentSurfaceDescriptor::blocked(ComponentId::Button);
        assert_eq!(
            descriptor.availability(),
            ComponentSurfaceAvailability::Blocked
        );

        let mut registry = ComponentSurfaceRegistry::default();
        registry.select(descriptor, 7);
        assert_eq!(
            registry.snapshot(descriptor).phase,
            ComponentSurfacePhase::Blocked
        );
        assert_eq!(
            registry.dispatch(descriptor, 7, ComponentSurfaceEvent::Activate),
            Err(ComponentSurfaceDispatchError::NotConnected)
        );
        assert_eq!(registry.snapshot(descriptor).activation_count, 0);
    }

    #[test]
    fn connected_surface_requires_mount_before_typed_events() {
        let descriptor =
            ComponentSurfaceDescriptor::connected(ComponentId::Button, "ButtonSurface");
        let mut registry = ComponentSurfaceRegistry::default();
        registry.select(descriptor, 3);
        assert_eq!(
            registry.dispatch(descriptor, 3, ComponentSurfaceEvent::Activate),
            Err(ComponentSurfaceDispatchError::NotMounted)
        );
        assert_eq!(
            registry
                .dispatch(descriptor, 3, ComponentSurfaceEvent::Mount)
                .expect("mount")
                .phase,
            ComponentSurfacePhase::Mounted
        );
        let active = registry
            .dispatch(descriptor, 3, ComponentSurfaceEvent::Activate)
            .expect("activate");
        assert_eq!(active.phase, ComponentSurfacePhase::Active);
        assert_eq!(active.activation_count, 1);
    }
}
