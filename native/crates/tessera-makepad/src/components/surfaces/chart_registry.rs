//! Registry of component-owned chart widgets.
//!
//! This is an integration mapping only. It does not render, manage state, or
//! carry chart data; every listed route is implemented by its own module.

use tessera_core::catalog::ComponentId;

pub struct ChartSurfaceCatalog;

impl ChartSurfaceCatalog {
    pub const COMPONENTS: [ComponentId; 15] = [
        ComponentId::AreaChart,
        ComponentId::BarChart,
        ComponentId::FunnelChart,
        ComponentId::GaugeChart,
        ComponentId::Heatmap,
        ComponentId::LineChart,
        ComponentId::MindMap,
        ComponentId::OrganizationChart,
        ComponentId::PieChart,
        ComponentId::RadarChart,
        ComponentId::SankeyChart,
        ComponentId::ScatterChart,
        ComponentId::Sparkline,
        ComponentId::Treemap,
        ComponentId::WordCloud,
    ];

    #[must_use]
    pub const fn contains(id: ComponentId) -> bool {
        matches!(
            id,
            ComponentId::AreaChart
                | ComponentId::BarChart
                | ComponentId::FunnelChart
                | ComponentId::GaugeChart
                | ComponentId::Heatmap
                | ComponentId::LineChart
                | ComponentId::MindMap
                | ComponentId::OrganizationChart
                | ComponentId::PieChart
                | ComponentId::RadarChart
                | ComponentId::SankeyChart
                | ComponentId::ScatterChart
                | ComponentId::Sparkline
                | ComponentId::Treemap
                | ComponentId::WordCloud
        )
    }

    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::AreaChart => Some("TesseraAreaChart"),
            ComponentId::BarChart => Some("TesseraBarChart"),
            ComponentId::FunnelChart => Some("TesseraFunnelChart"),
            ComponentId::GaugeChart => Some("TesseraGaugeChart"),
            ComponentId::Heatmap => Some("TesseraHeatmap"),
            ComponentId::LineChart => Some("TesseraLineChart"),
            ComponentId::MindMap => Some("TesseraMindMap"),
            ComponentId::OrganizationChart => Some("TesseraOrganizationChart"),
            ComponentId::PieChart => Some("TesseraPieChart"),
            ComponentId::RadarChart => Some("TesseraRadarChart"),
            ComponentId::SankeyChart => Some("TesseraSankeyChart"),
            ComponentId::ScatterChart => Some("TesseraScatterChart"),
            ComponentId::Sparkline => Some("TesseraSparkline"),
            ComponentId::Treemap => Some("TesseraTreemap"),
            ComponentId::WordCloud => Some("TesseraWordCloud"),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::ChartSurfaceCatalog;
    use tessera_core::catalog::ComponentId;

    #[test]
    fn chart_registry_is_exactly_the_fifteen_component_owned_widgets() {
        assert_eq!(ChartSurfaceCatalog::COMPONENTS.len(), 15);
        for id in ChartSurfaceCatalog::COMPONENTS {
            assert!(ChartSurfaceCatalog::contains(id));
            assert!(ChartSurfaceCatalog::widget_name(id).is_some());
        }
        assert_eq!(ChartSurfaceCatalog::widget_name(ComponentId::Button), None);
    }
}
