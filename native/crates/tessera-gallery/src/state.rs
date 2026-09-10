use crate::lifecycle::{LifecycleEvent, LifecycleState, LifecycleTransition};
use crate::route::{ComponentOpener, GalleryPage, PageContract};
use tessera_makepad::components::{
    ComponentSurfaceDispatchError, ComponentSurfaceEvent, ComponentSurfaceRegistry,
    ComponentSurfaceSnapshot,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RouteError {
    GenerationExhausted,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RouteTransition {
    pub previous: GalleryPage,
    pub current: GalleryPage,
    pub generation: u64,
    pub changed: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GalleryState {
    active_route: GalleryPage,
    previous_route: Option<GalleryPage>,
    route_generation: u64,
    lifecycle: LifecycleState,
    surface_registry: ComponentSurfaceRegistry,
    component_opener: Option<ComponentOpener>,
    pending_detail_focus: Option<u64>,
}

impl Default for GalleryState {
    fn default() -> Self {
        Self {
            active_route: GalleryPage::Shell,
            previous_route: None,
            route_generation: 0,
            lifecycle: LifecycleState::default(),
            surface_registry: ComponentSurfaceRegistry::default(),
            component_opener: None,
            pending_detail_focus: None,
        }
    }
}

impl GalleryState {
    #[must_use]
    pub const fn active_route(&self) -> GalleryPage {
        self.active_route
    }

    #[must_use]
    pub const fn previous_route(&self) -> Option<GalleryPage> {
        self.previous_route
    }

    #[must_use]
    pub const fn route_generation(&self) -> u64 {
        self.route_generation
    }

    #[must_use]
    pub const fn lifecycle(&self) -> LifecycleState {
        self.lifecycle
    }

    #[must_use]
    pub fn active_contract(&self) -> PageContract {
        self.active_route.contract()
    }

    #[must_use]
    pub fn active_surface_snapshot(&self) -> Option<ComponentSurfaceSnapshot> {
        let descriptor = self.active_contract().surface_descriptor()?;
        Some(self.surface_registry.snapshot(descriptor))
    }

    #[must_use]
    pub fn surface_registry(&self) -> &ComponentSurfaceRegistry {
        &self.surface_registry
    }

    #[must_use]
    pub fn needs_frame(&self) -> bool {
        self.lifecycle.needs_frame()
    }

    pub fn navigate(&mut self, route: GalleryPage) -> Result<RouteTransition, RouteError> {
        let previous = self.active_route;
        let changed = previous != route;
        if changed {
            let generation = self
                .route_generation
                .checked_add(1)
                .ok_or(RouteError::GenerationExhausted)?;
            self.previous_route = Some(previous);
            self.active_route = route;
            self.route_generation = generation;
            self.component_opener = None;
            self.pending_detail_focus = None;
            if let Some(descriptor) = self.active_contract().surface_descriptor() {
                self.surface_registry.select(descriptor, generation);
            } else {
                self.surface_registry.clear();
            }
        }

        Ok(RouteTransition {
            previous,
            current: self.active_route,
            generation: self.route_generation,
            changed,
        })
    }

    pub fn record_component_opener(&mut self, opener: ComponentOpener) {
        if self.active_route.component_id() == Some(opener.component) {
            self.component_opener = Some(opener);
            self.pending_detail_focus = Some(self.route_generation);
        }
    }

    pub fn take_component_opener(&mut self) -> Option<ComponentOpener> {
        self.component_opener.take()
    }

    pub fn take_detail_focus(&mut self, generation: u64) -> bool {
        if self.pending_detail_focus == Some(generation) && generation == self.route_generation {
            self.pending_detail_focus = None;
            true
        } else {
            false
        }
    }

    pub fn dispatch_surface(
        &mut self,
        event: ComponentSurfaceEvent,
    ) -> Result<ComponentSurfaceSnapshot, ComponentSurfaceDispatchError> {
        let descriptor = self
            .active_contract()
            .surface_descriptor()
            .ok_or(ComponentSurfaceDispatchError::RouteMismatch)?;
        self.surface_registry
            .dispatch(descriptor, self.route_generation, event)
    }

    pub fn apply_lifecycle(&mut self, event: LifecycleEvent) -> LifecycleTransition {
        self.lifecycle.apply(event)
    }

    #[cfg(test)]
    pub(crate) fn with_route_generation(route_generation: u64) -> Self {
        Self {
            route_generation,
            ..Self::default()
        }
    }
}

#[cfg(test)]
mod tests {
    use tessera_core::catalog::ComponentId;
    use tessera_makepad::components::{
        ComponentSurfaceEvent, ComponentSurfacePhase,
        surfaces::{
            atomic::AtomicComponent, breadcrumb::BreadcrumbSurfaceCatalog,
            chart_registry::ChartSurfaceCatalog, drawer::DrawerSurfaceCatalog,
            dropdown::DropdownSurfaceCatalog, feedback::FeedbackSurfaceCatalog,
            input_independent::InputWidgetCatalog, layout::LayoutSurfaceCatalog,
            masonry::MasonrySurfaceCatalog, message::MessageSurfaceCatalog,
            modal::ModalSurfaceCatalog, notification::NotificationSurfaceCatalog,
            pagination::PaginationSurfaceCatalog, popconfirm::PopconfirmSurfaceCatalog,
            popover::PopoverSurfaceCatalog, skeleton::SkeletonSurfaceCatalog,
            spin::SpinSurfaceCatalog, statistic::StatisticSurfaceCatalog,
            steps::StepsSurfaceCatalog, timeline::TimelineSurfaceCatalog,
            tooltip::TooltipSurfaceCatalog,
        },
    };

    use super::*;
    use crate::lifecycle::{LifecycleEvent, LifecyclePhase};

    #[test]
    fn gallery_state_boots_on_shell_and_tracks_previous_route() {
        let mut state = GalleryState::default();
        assert_eq!(state.active_route(), GalleryPage::Shell);
        assert_eq!(state.previous_route(), None);
        assert_eq!(state.route_generation(), 0);
        assert_eq!(state.active_contract().page, GalleryPage::Shell);

        let button = GalleryPage::component(ComponentId::Button);
        let moved = state.navigate(button).expect("navigate");
        assert!(moved.changed);
        assert_eq!(moved.previous, GalleryPage::Shell);
        assert_eq!(moved.current, button);
        assert_eq!(state.previous_route(), Some(GalleryPage::Shell));
        assert_eq!(state.route_generation(), 1);

        let repeated = state.navigate(button).expect("same route");
        assert!(!repeated.changed);
        assert_eq!(state.route_generation(), 1);
    }

    #[test]
    fn detail_focus_is_generation_bound_and_consumed_once() {
        let mut state = GalleryState::default();
        state
            .navigate(GalleryPage::component(ComponentId::Button))
            .unwrap();
        let opener = ComponentOpener {
            component: ComponentId::Button,
            origin: crate::route::NavigationOrigin::Catalog,
            reveal_on_return: true,
        };
        state.record_component_opener(opener);
        let generation = state.route_generation();
        assert!(!state.take_detail_focus(generation - 1));
        assert!(!state.take_detail_focus(generation + 1));
        assert!(state.take_detail_focus(generation));
        assert!(!state.take_detail_focus(generation));
        assert_eq!(state.take_component_opener(), Some(opener));
        assert_eq!(state.take_component_opener(), None);
    }

    #[test]
    fn startup_and_route_changes_do_not_reuse_an_old_opener() {
        let mut state = GalleryState::default();
        state
            .navigate(GalleryPage::component(ComponentId::Button))
            .unwrap();
        assert!(!state.take_detail_focus(state.route_generation()));
        state.record_component_opener(ComponentOpener {
            component: ComponentId::Input,
            origin: crate::route::NavigationOrigin::Sidebar,
            reveal_on_return: false,
        });
        assert_eq!(state.take_component_opener(), None);
        state.record_component_opener(ComponentOpener {
            component: ComponentId::Button,
            origin: crate::route::NavigationOrigin::Sidebar,
            reveal_on_return: false,
        });
        let old_generation = state.route_generation();
        state
            .navigate(GalleryPage::component(ComponentId::Input))
            .unwrap();
        assert!(!state.take_detail_focus(old_generation));
        assert!(!state.take_detail_focus(state.route_generation()));
        assert_eq!(state.take_component_opener(), None);
    }

    #[test]
    fn gallery_state_lifecycle_uses_the_shared_phase_machine() {
        let mut state = GalleryState::default();
        let startup = state.apply_lifecycle(LifecycleEvent::Startup);
        assert_eq!(startup.current.phase(), LifecyclePhase::Booted);
        let show = state.apply_lifecycle(LifecycleEvent::Show);
        assert_eq!(show.current.phase(), LifecyclePhase::Visible);
        assert!(state.needs_frame());
    }

    #[test]
    fn route_generation_exhaustion_rejects_navigation_without_mutation() {
        let mut state = GalleryState::with_route_generation(u64::MAX);
        assert_eq!(
            state.navigate(GalleryPage::component(ComponentId::Button)),
            Err(RouteError::GenerationExhausted)
        );
        assert_eq!(state.active_route(), GalleryPage::Shell);
        assert_eq!(state.previous_route(), None);
        assert_eq!(state.route_generation(), u64::MAX);
    }

    #[test]
    fn connected_input_route_awaits_its_native_mount() {
        let mut state = GalleryState::default();
        state
            .navigate(GalleryPage::component(ComponentId::Input))
            .expect("navigate");
        let snapshot = state.active_surface_snapshot().expect("surface");
        assert_eq!(snapshot.id(), ComponentId::Input);
        assert_eq!(snapshot.status_label(), "awaiting native mount");
        assert_eq!(
            state.dispatch_surface(ComponentSurfaceEvent::Activate),
            Err(ComponentSurfaceDispatchError::NotMounted)
        );
    }

    #[test]
    fn connected_component_routes_mount_and_activate_their_owned_surfaces() {
        let connected_ids = AtomicComponent::ALL
            .into_iter()
            .map(AtomicComponent::component_id)
            .chain(ChartSurfaceCatalog::COMPONENTS)
            .chain(
                ComponentId::ALL
                    .into_iter()
                    .filter(|id| InputWidgetCatalog::contains(*id)),
            )
            .chain(
                ComponentId::ALL
                    .into_iter()
                    .filter(|id| FeedbackSurfaceCatalog::contains(*id)),
            )
            .chain(
                ComponentId::ALL
                    .into_iter()
                    .filter(|id| LayoutSurfaceCatalog::contains(*id)),
            )
            .chain(
                ComponentId::ALL
                    .into_iter()
                    .filter(|id| BreadcrumbSurfaceCatalog::widget_name(*id).is_some()),
            )
            .chain(
                ComponentId::ALL
                    .into_iter()
                    .filter(|id| MasonrySurfaceCatalog::widget_name(*id).is_some()),
            )
            .chain(
                ComponentId::ALL
                    .into_iter()
                    .filter(|id| PaginationSurfaceCatalog::widget_name(*id).is_some()),
            )
            .chain(
                ComponentId::ALL
                    .into_iter()
                    .filter(|id| StepsSurfaceCatalog::widget_name(*id).is_some()),
            )
            .chain(
                ComponentId::ALL
                    .into_iter()
                    .filter(|id| SkeletonSurfaceCatalog::widget_name(*id).is_some()),
            )
            .chain(
                ComponentId::ALL
                    .into_iter()
                    .filter(|id| SpinSurfaceCatalog::widget_name(*id).is_some()),
            )
            .chain(
                ComponentId::ALL
                    .into_iter()
                    .filter(|id| StatisticSurfaceCatalog::widget_name(*id).is_some()),
            )
            .chain(
                ComponentId::ALL
                    .into_iter()
                    .filter(|id| TimelineSurfaceCatalog::widget_name(*id).is_some()),
            )
            .chain(
                ComponentId::ALL
                    .into_iter()
                    .filter(|id| DrawerSurfaceCatalog::widget_name(*id).is_some()),
            )
            .chain(
                ComponentId::ALL
                    .into_iter()
                    .filter(|id| DropdownSurfaceCatalog::widget_name(*id).is_some()),
            )
            .chain(
                ComponentId::ALL
                    .into_iter()
                    .filter(|id| MessageSurfaceCatalog::widget_name(*id).is_some()),
            )
            .chain(
                ComponentId::ALL
                    .into_iter()
                    .filter(|id| ModalSurfaceCatalog::widget_name(*id).is_some()),
            )
            .chain(
                ComponentId::ALL
                    .into_iter()
                    .filter(|id| NotificationSurfaceCatalog::widget_name(*id).is_some()),
            )
            .chain(
                ComponentId::ALL
                    .into_iter()
                    .filter(|id| PopconfirmSurfaceCatalog::widget_name(*id).is_some()),
            )
            .chain(
                ComponentId::ALL
                    .into_iter()
                    .filter(|id| PopoverSurfaceCatalog::widget_name(*id).is_some()),
            )
            .chain(
                ComponentId::ALL
                    .into_iter()
                    .filter(|id| TooltipSurfaceCatalog::widget_name(*id).is_some()),
            );
        let mut state = GalleryState::default();

        for id in connected_ids {
            state
                .navigate(GalleryPage::component(id))
                .expect("navigate to connected component");
            let descriptor = state
                .active_surface_snapshot()
                .expect("component route has a surface descriptor")
                .descriptor;
            assert!(descriptor.availability().is_connected());
            assert!(descriptor.availability().widget().is_some());

            let mounted = state
                .dispatch_surface(ComponentSurfaceEvent::Mount)
                .expect("mount connected surface");
            assert_eq!(mounted.phase, ComponentSurfacePhase::Mounted);
            let active = state
                .dispatch_surface(ComponentSurfaceEvent::Activate)
                .expect("activate connected surface");
            assert_eq!(active.phase, ComponentSurfacePhase::Active);
            assert_eq!(active.activation_count, 1);
        }
    }
}
