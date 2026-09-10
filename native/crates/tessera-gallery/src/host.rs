use crate::lifecycle::LifecycleEvent;
use crate::route::{ComponentOpener, GalleryPage, PageContract};
use crate::state::{GalleryState, RouteError, RouteTransition};
use tessera_makepad::components::{
    ComponentSurfaceDispatchError, ComponentSurfaceEvent, ComponentSurfaceSnapshot,
};

#[derive(Debug, Clone, PartialEq)]
pub struct HostSnapshot {
    pub state: GalleryState,
    pub contract: PageContract,
}

impl HostSnapshot {
    #[must_use]
    pub fn describe(&self) -> String {
        format!(
            "route={} title={} lifecycle={}",
            self.contract.slug,
            self.contract.title,
            self.state.lifecycle()
        )
    }
}

#[derive(Debug, Clone)]
pub struct GalleryHost {
    state: GalleryState,
}

impl Default for GalleryHost {
    fn default() -> Self {
        Self::bootstrap()
    }
}

impl GalleryHost {
    #[must_use]
    pub fn bootstrap() -> Self {
        let mut state = GalleryState::default();
        let _ = state.apply_lifecycle(LifecycleEvent::Startup);
        Self { state }
    }

    #[must_use]
    pub const fn state(&self) -> &GalleryState {
        &self.state
    }

    #[must_use]
    pub const fn active_route(&self) -> GalleryPage {
        self.state.active_route()
    }

    #[must_use]
    pub fn active_contract(&self) -> PageContract {
        self.state.active_contract()
    }

    pub fn navigate(&mut self, route: GalleryPage) -> Result<RouteTransition, RouteError> {
        self.state.navigate(route)
    }

    pub fn record_component_opener(&mut self, opener: ComponentOpener) {
        self.state.record_component_opener(opener);
    }

    pub fn take_component_opener(&mut self) -> Option<ComponentOpener> {
        self.state.take_component_opener()
    }

    pub fn take_detail_focus(&mut self, generation: u64) -> bool {
        self.state.take_detail_focus(generation)
    }

    #[must_use]
    pub fn active_surface_snapshot(&self) -> Option<ComponentSurfaceSnapshot> {
        self.state.active_surface_snapshot()
    }

    pub fn dispatch_surface(
        &mut self,
        event: ComponentSurfaceEvent,
    ) -> Result<ComponentSurfaceSnapshot, ComponentSurfaceDispatchError> {
        self.state.dispatch_surface(event)
    }

    #[must_use]
    pub fn apply_lifecycle(
        &mut self,
        event: LifecycleEvent,
    ) -> crate::lifecycle::LifecycleTransition {
        self.state.apply_lifecycle(event)
    }

    #[must_use]
    pub fn snapshot(&self) -> HostSnapshot {
        HostSnapshot {
            state: self.state.clone(),
            contract: self.state.active_contract(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::lifecycle::{LifecycleEvent, LifecyclePhase};
    use tessera_core::catalog::ComponentId;

    #[test]
    fn bootstrap_starts_on_shell_with_a_typed_host_snapshot() {
        let host = GalleryHost::bootstrap();
        assert_eq!(host.active_route(), GalleryPage::Shell);
        assert_eq!(host.active_contract().page, GalleryPage::Shell);
        assert_eq!(host.state().lifecycle().phase(), LifecyclePhase::Booted);
        assert!(host.snapshot().describe().contains("route=shell"));
    }

    #[test]
    fn host_routes_and_lifecycle_are_typed_and_separate() {
        let mut host = GalleryHost::bootstrap();
        let route = host
            .navigate(GalleryPage::component(ComponentId::Grid))
            .expect("navigate");
        assert!(route.changed);
        assert_eq!(
            host.active_route(),
            GalleryPage::component(ComponentId::Grid)
        );

        let lifecycle = host.apply_lifecycle(LifecycleEvent::Show);
        assert_eq!(lifecycle.current.phase(), LifecyclePhase::Visible);
        assert!(host.state().needs_frame());
    }
}
