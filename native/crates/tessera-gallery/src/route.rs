use std::fmt;

use tessera_core::catalog::{ComponentId, ComponentSpec};
use tessera_makepad::components::ComponentSurfaceDescriptor;

use crate::fixtures::FixtureSpec;

pub const PAGE_COUNT: usize = 1 + ComponentId::ALL.len();

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NavigationOrigin {
    Catalog,
    Sidebar,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ComponentOpener {
    pub component: ComponentId,
    pub origin: NavigationOrigin,
    pub reveal_on_return: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum GalleryPage {
    Shell,
    Component(ComponentId),
}

const fn build_all_pages() -> [GalleryPage; PAGE_COUNT] {
    let mut pages = [GalleryPage::Shell; PAGE_COUNT];
    let mut index = 0;
    while index < ComponentId::ALL.len() {
        pages[index + 1] = GalleryPage::Component(ComponentId::ALL[index]);
        index += 1;
    }
    pages
}

impl GalleryPage {
    pub const ALL: [Self; PAGE_COUNT] = build_all_pages();

    #[must_use]
    pub const fn component(id: ComponentId) -> Self {
        Self::Component(id)
    }

    #[must_use]
    pub const fn slug(self) -> &'static str {
        match self {
            Self::Shell => "shell",
            Self::Component(id) => id.as_str(),
        }
    }

    #[must_use]
    pub const fn title(self) -> &'static str {
        match self {
            Self::Shell => "Shell",
            Self::Component(id) => id.spec().name,
        }
    }

    #[must_use]
    pub const fn summary(self) -> &'static str {
        match self {
            Self::Shell => "Host shell, navigation, lifecycle, and shared controls.",
            Self::Component(id) => id.spec().summary,
        }
    }

    #[must_use]
    pub const fn component_id(self) -> Option<ComponentId> {
        match self {
            Self::Shell => None,
            Self::Component(id) => Some(id),
        }
    }

    #[must_use]
    pub const fn index(self) -> usize {
        match self {
            Self::Shell => 0,
            Self::Component(id) => 1 + id as usize,
        }
    }

    #[must_use]
    pub fn contract(self) -> PageContract {
        PAGE_CONTRACTS[self.index()]
    }

    #[must_use]
    pub fn from_slug(slug: &str) -> Option<Self> {
        if slug == "shell" {
            Some(Self::Shell)
        } else {
            ComponentId::from_slug(slug).map(Self::Component)
        }
    }
}

impl fmt::Display for GalleryPage {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.slug())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PageLookupError {
    slug: String,
}

impl PageLookupError {
    #[must_use]
    pub fn slug(&self) -> &str {
        &self.slug
    }
}

impl fmt::Display for PageLookupError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "unknown gallery page slug: {}", self.slug)
    }
}

impl std::error::Error for PageLookupError {}

impl TryFrom<&str> for GalleryPage {
    type Error = PageLookupError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        Self::from_slug(value).ok_or_else(|| PageLookupError {
            slug: value.to_owned(),
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PageContract {
    pub page: GalleryPage,
    pub slug: &'static str,
    pub title: &'static str,
    pub summary: &'static str,
    pub component_id: Option<ComponentId>,
    pub fixture: FixtureSpec,
}

impl PageContract {
    #[must_use]
    pub const fn new(
        page: GalleryPage,
        component_id: Option<ComponentId>,
        fixture: FixtureSpec,
    ) -> Self {
        Self {
            page,
            slug: page.slug(),
            title: page.title(),
            summary: page.summary(),
            component_id,
            fixture,
        }
    }

    #[must_use]
    pub fn component_spec(self) -> Option<&'static ComponentSpec> {
        self.component_id.map(ComponentId::spec)
    }

    /// Resolve the exact component-owned surface for this page.
    ///
    /// The shell page has no component surface. Component pages resolve by
    /// `ComponentId`; they never select a family preview or a shared demo.
    #[must_use]
    pub fn surface_descriptor(self) -> Option<ComponentSurfaceDescriptor> {
        self.component_id.map(tessera_makepad::components::surface)
    }
}

impl fmt::Display for PageContract {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self.component_id {
            Some(component_id) => write!(
                formatter,
                "{} [{}] -> component {}",
                self.title, self.slug, component_id
            ),
            None => write!(formatter, "{} [{}] -> host", self.title, self.slug),
        }
    }
}

const fn build_page_contracts() -> [PageContract; PAGE_COUNT] {
    let mut contracts =
        [PageContract::new(GalleryPage::Shell, None, FixtureSpec::shell()); PAGE_COUNT];
    let mut index = 0;
    while index < ComponentId::ALL.len() {
        let id = ComponentId::ALL[index];
        let page = GalleryPage::Component(id);
        contracts[index + 1] = PageContract::new(page, Some(id), FixtureSpec::component(id));
        index += 1;
    }
    contracts
}

pub static PAGE_CONTRACTS: [PageContract; PAGE_COUNT] = build_page_contracts();

#[must_use]
pub fn page_registry() -> &'static [PageContract; PAGE_COUNT] {
    &PAGE_CONTRACTS
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeSet;

    use tessera_core::catalog::ComponentId;

    use super::*;

    #[test]
    fn page_registry_covers_shell_and_every_component() {
        assert_eq!(PAGE_COUNT, 102);
        assert_eq!(GalleryPage::ALL.len(), PAGE_COUNT);
        assert_eq!(PAGE_CONTRACTS.len(), PAGE_COUNT);

        let pages = GalleryPage::ALL.into_iter().collect::<BTreeSet<_>>();
        let registry_pages = PAGE_CONTRACTS
            .iter()
            .map(|contract| contract.page)
            .collect::<BTreeSet<_>>();
        assert_eq!(pages, registry_pages);
        assert_eq!(pages.len(), PAGE_COUNT);
    }

    #[test]
    fn every_component_slug_round_trips_to_its_page() {
        for id in ComponentId::ALL {
            let page = GalleryPage::Component(id);
            assert_eq!(GalleryPage::try_from(page.slug()), Ok(page));
            assert_eq!(page.contract().component_id, Some(id));
            assert!(matches!(page.contract().fixture, FixtureSpec::Component(_)));
            assert_eq!(
                page.contract()
                    .surface_descriptor()
                    .map(|surface| surface.id),
                Some(id)
            );
        }
    }

    #[test]
    fn special_host_page_remains_explicit() {
        assert_eq!(GalleryPage::Shell.component_id(), None);
        assert_eq!(
            GalleryPage::Shell.contract().fixture,
            FixtureSpec::Shell(crate::fixtures::ShellFixture::DEFAULT)
        );
        assert_eq!(GalleryPage::from_slug("unknown"), None);
    }
}
