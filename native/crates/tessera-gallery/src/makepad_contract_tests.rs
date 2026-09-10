use std::collections::BTreeSet;

use tessera_core::catalog::ComponentId;

use crate::fixtures::{
    DRAW_POINT_BUDGET, DataGridFixture, FixtureSpec, INPUT_POINT_COUNT, LineChartFixture,
    MAX_CURVE_SEGMENTS, MAX_MARKDOWN_BYTES, MarkdownRejectReason, MermaidCubicPathFixture,
    ROW_COUNT, validate_markdown,
};
use crate::host::GalleryHost;
use crate::route::{GalleryPage, PAGE_COUNT, page_registry};

#[test]
fn gallery_exposes_the_required_makepad_pages_without_generic_fallbacks() {
    let registry = page_registry();
    assert_eq!(registry.len(), PAGE_COUNT);

    let mut pages = BTreeSet::new();
    let mut slugs = BTreeSet::new();
    let mut fixtures = BTreeSet::new();
    for contract in registry {
        assert!(pages.insert(contract.page));
        assert!(slugs.insert(contract.slug));
        assert!(fixtures.insert(contract.fixture.label()));
        assert_eq!(GalleryPage::try_from(contract.slug), Ok(contract.page));
    }

    assert_eq!(pages, GalleryPage::ALL.into_iter().collect());
    assert_eq!(slugs.len(), PAGE_COUNT);
    assert!(slugs.contains("shell"));
    assert!(
        ComponentId::ALL
            .iter()
            .all(|id| slugs.contains(id.as_str()))
    );
    assert_eq!(fixtures.len(), PAGE_COUNT);
    assert!(fixtures.contains("Shell"));
    assert!(
        ComponentId::ALL
            .iter()
            .all(|id| fixtures.contains(id.spec().name))
    );
}

#[test]
fn route_contracts_bind_to_the_frozen_core_component_ids() {
    assert_eq!(GalleryPage::Shell.contract().component_id, None);
    assert_eq!(
        GalleryPage::component(ComponentId::Button)
            .contract()
            .component_id,
        Some(ComponentId::Button)
    );
    assert_eq!(
        GalleryPage::component(ComponentId::Input)
            .contract()
            .component_id,
        Some(ComponentId::Input)
    );
    assert_eq!(
        GalleryPage::component(ComponentId::Grid)
            .contract()
            .component_id,
        Some(ComponentId::Grid)
    );
    assert_eq!(
        GalleryPage::component(ComponentId::LineChart)
            .contract()
            .component_id,
        Some(ComponentId::LineChart)
    );
    assert_eq!(
        GalleryPage::component(ComponentId::MarkdownEditor)
            .contract()
            .component_id,
        Some(ComponentId::MarkdownEditor)
    );
    assert_eq!(
        GalleryPage::component(ComponentId::MermaidSvgViewer)
            .contract()
            .component_id,
        Some(ComponentId::MermaidSvgViewer)
    );
    assert_eq!(
        GalleryPage::component(ComponentId::Modal)
            .contract()
            .component_id,
        Some(ComponentId::Modal)
    );
}

#[test]
fn gallery_host_snapshot_is_backed_by_the_real_makepad_host() {
    let host = GalleryHost::bootstrap();
    let snapshot = host.snapshot();

    assert_eq!(snapshot.contract.page, GalleryPage::Shell);
    assert!(snapshot.describe().contains("route=shell"));
}

#[test]
fn data_grid_and_line_chart_capacity_budgets_match_the_m0_contract() {
    let grid = match FixtureSpec::data_grid() {
        FixtureSpec::DataGrid(fixture) => fixture,
        fixture => panic!("unexpected fixture: {fixture:?}"),
    };
    assert_eq!(grid, DataGridFixture::DEFAULT);
    assert_eq!(grid.row_count, ROW_COUNT);
    assert_eq!(grid.visible_row_limit(), 30);

    let chart = match FixtureSpec::line_chart() {
        FixtureSpec::LineChart(fixture) => fixture,
        fixture => panic!("unexpected fixture: {fixture:?}"),
    };
    assert_eq!(chart, LineChartFixture::DEFAULT);
    assert_eq!(chart.input_point_count, INPUT_POINT_COUNT);
    assert_eq!(chart.draw_point_budget, DRAW_POINT_BUDGET);
    assert!(chart.sampled_points().len() <= DRAW_POINT_BUDGET);
}

#[test]
fn markdown_and_mermaid_security_boundaries_are_fail_closed() {
    assert_eq!(
        validate_markdown(&"x".repeat(MAX_MARKDOWN_BYTES + 1)),
        Err(MarkdownRejectReason::Oversize)
    );
    assert_eq!(
        validate_markdown("[x](data&#58;text/html;base64,AA==)"),
        Err(MarkdownRejectReason::DangerousScheme)
    );
    assert_eq!(
        validate_markdown("live_design! { UserControlled }"),
        Err(MarkdownRejectReason::LiveOrScript)
    );

    let mermaid = match FixtureSpec::mermaid_cubic_path() {
        FixtureSpec::MermaidCubicPath(fixture) => fixture,
        fixture => panic!("unexpected fixture: {fixture:?}"),
    };
    assert_eq!(mermaid, MermaidCubicPathFixture::DEFAULT);
    assert_eq!(
        mermaid.curve.sample(usize::MAX).len(),
        MAX_CURVE_SEGMENTS + 1
    );
}

#[test]
fn every_component_page_has_a_component_fixture() {
    for id in ComponentId::ALL {
        let contract = GalleryPage::component(id).contract();
        assert_eq!(contract.component_id, Some(id));
        assert!(matches!(contract.fixture, FixtureSpec::Component(fixture) if fixture.id == id));
    }
}
