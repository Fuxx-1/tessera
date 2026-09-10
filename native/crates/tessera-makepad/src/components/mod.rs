pub mod primitive;
pub mod shell;
pub mod surfaces;

pub use primitive::{PrimitiveRole, PrimitiveSpec, STANDARD_PRIMITIVES, standard_primitives};
pub mod affix;
pub mod alert;
pub mod anchor;
pub mod app;
pub mod area_chart;
pub mod auto_complete;
pub mod avatar;
pub mod badge;
pub mod bar_chart;
pub mod border_beam;
pub mod breadcrumb;
pub mod button;
pub mod calendar;
pub mod card;
pub mod carousel;
pub mod cascader;
pub mod checkbox;
pub mod code_block;
pub mod collapse;
pub mod color_picker;
pub mod command_palette;
pub mod component;
pub mod config_provider;
pub mod data_toolbar;
pub mod date_picker;
pub mod descriptions;
pub mod divider;
pub mod drawer;
pub mod dropdown;
pub mod empty;
pub mod filter_panel;
pub mod flex;
pub mod float_button;
pub mod form;
pub mod funnel_chart;
pub mod gauge_chart;
pub mod grid;
pub mod heatmap;
pub mod icon;
pub mod icon_button;
pub mod image;
pub mod input;
pub mod input_number;
pub mod layout;
pub mod line_chart;
pub mod list;
pub mod markdown_editor;
pub mod masonry;
pub mod mentions;
pub mod menu;
pub mod mermaid_svg_viewer;
pub mod message;
pub mod metric_card;
pub mod mind_map;
pub mod mini_chart_card;
pub mod mobile_preview_frame;
pub mod modal;
pub mod notification;
pub mod organization_chart;
pub mod pagination;
pub mod pie_chart;
pub mod popconfirm;
pub mod popover;
pub mod progress;
pub mod property_list;
pub mod qr_code;
pub mod radar_chart;
pub mod radio;
pub mod rate;
pub mod result;
pub mod sankey_chart;
pub mod scatter_chart;
pub mod segmented;
pub mod select;
pub mod skeleton;
pub mod slider;
pub mod space;
pub mod sparkline;
pub mod spin;
pub mod splitter;
pub mod statistic;
pub mod status_timeline;
pub mod steps;
pub mod switch;
pub mod table;
pub mod tabs;
pub mod tag;
pub mod textarea;
pub mod time_picker;
pub mod timeline;
pub mod toolbar;
pub mod tooltip;
pub mod tour;
pub mod transfer;
pub mod tree;
pub mod tree_select;
pub mod treemap;
pub mod typography;
pub mod upload;
pub mod util;
pub mod watermark;
pub mod word_cloud;

pub use component::{
    ComponentDefinition, ComponentFamily, ComponentSurface, ComponentSurfaceAvailability,
    ComponentSurfaceDescriptor, ComponentSurfaceDispatchError, ComponentSurfaceEvent,
    ComponentSurfacePhase, ComponentSurfaceRegistration, ComponentSurfaceRegistry,
    ComponentSurfaceSlot, ComponentSurfaceSnapshot, InteractionKind,
};

pub const COMPONENT_DEFINITIONS: [&ComponentDefinition; 101] = [
    &affix::DEFINITION,
    &alert::DEFINITION,
    &anchor::DEFINITION,
    &app::DEFINITION,
    &auto_complete::DEFINITION,
    &avatar::DEFINITION,
    &badge::DEFINITION,
    &border_beam::DEFINITION,
    &breadcrumb::DEFINITION,
    &button::DEFINITION,
    &calendar::DEFINITION,
    &card::DEFINITION,
    &carousel::DEFINITION,
    &cascader::DEFINITION,
    &checkbox::DEFINITION,
    &collapse::DEFINITION,
    &color_picker::DEFINITION,
    &config_provider::DEFINITION,
    &date_picker::DEFINITION,
    &descriptions::DEFINITION,
    &divider::DEFINITION,
    &drawer::DEFINITION,
    &dropdown::DEFINITION,
    &empty::DEFINITION,
    &flex::DEFINITION,
    &float_button::DEFINITION,
    &form::DEFINITION,
    &grid::DEFINITION,
    &icon::DEFINITION,
    &icon_button::DEFINITION,
    &image::DEFINITION,
    &input::DEFINITION,
    &input_number::DEFINITION,
    &layout::DEFINITION,
    &list::DEFINITION,
    &masonry::DEFINITION,
    &mentions::DEFINITION,
    &menu::DEFINITION,
    &message::DEFINITION,
    &modal::DEFINITION,
    &notification::DEFINITION,
    &pagination::DEFINITION,
    &popconfirm::DEFINITION,
    &popover::DEFINITION,
    &progress::DEFINITION,
    &qr_code::DEFINITION,
    &radio::DEFINITION,
    &rate::DEFINITION,
    &result::DEFINITION,
    &segmented::DEFINITION,
    &select::DEFINITION,
    &skeleton::DEFINITION,
    &slider::DEFINITION,
    &space::DEFINITION,
    &spin::DEFINITION,
    &splitter::DEFINITION,
    &statistic::DEFINITION,
    &steps::DEFINITION,
    &switch::DEFINITION,
    &table::DEFINITION,
    &tabs::DEFINITION,
    &tag::DEFINITION,
    &textarea::DEFINITION,
    &time_picker::DEFINITION,
    &timeline::DEFINITION,
    &toolbar::DEFINITION,
    &tooltip::DEFINITION,
    &tour::DEFINITION,
    &transfer::DEFINITION,
    &tree::DEFINITION,
    &tree_select::DEFINITION,
    &typography::DEFINITION,
    &upload::DEFINITION,
    &util::DEFINITION,
    &watermark::DEFINITION,
    &code_block::DEFINITION,
    &command_palette::DEFINITION,
    &data_toolbar::DEFINITION,
    &filter_panel::DEFINITION,
    &markdown_editor::DEFINITION,
    &mermaid_svg_viewer::DEFINITION,
    &metric_card::DEFINITION,
    &mini_chart_card::DEFINITION,
    &mobile_preview_frame::DEFINITION,
    &property_list::DEFINITION,
    &status_timeline::DEFINITION,
    &area_chart::DEFINITION,
    &bar_chart::DEFINITION,
    &funnel_chart::DEFINITION,
    &gauge_chart::DEFINITION,
    &heatmap::DEFINITION,
    &line_chart::DEFINITION,
    &mind_map::DEFINITION,
    &organization_chart::DEFINITION,
    &pie_chart::DEFINITION,
    &radar_chart::DEFINITION,
    &sankey_chart::DEFINITION,
    &scatter_chart::DEFINITION,
    &sparkline::DEFINITION,
    &treemap::DEFINITION,
    &word_cloud::DEFINITION,
];

pub fn definition(id: tessera_core::catalog::ComponentId) -> &'static ComponentDefinition {
    COMPONENT_DEFINITIONS
        .iter()
        .find(|definition| definition.id == id)
        .expect("every catalog component has a Makepad definition")
}

/// Returns the exact Gallery surface descriptor for one catalog component.
///
/// Surface catalogs are the sole runtime authority for native widget
/// registration. A component definition describes product semantics only; it
/// cannot make a metadata-only entry mountable. An unmapped id remains blocked
/// and no generic preview is rendered.
#[must_use]
pub fn surface(id: tessera_core::catalog::ComponentId) -> ComponentSurfaceDescriptor {
    let native_widget = surfaces::atomic::AtomicSurfaceCatalog::component(id)
        .map(surfaces::atomic::AtomicComponent::widget_name)
        .or_else(|| surfaces::feedback::FeedbackSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::code_block::CodeBlockSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::command_palette::CommandPaletteSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::data_toolbar::DataToolbarSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::filter_panel::FilterPanelSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::markdown_editor::MarkdownEditorSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::table::TableSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::mermaid_svg_viewer::MermaidSvgViewerSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::metric_card::MetricCardSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::mini_chart_card::MiniChartCardSurfaceCatalog::widget_name(id))
        .or_else(|| {
            surfaces::mobile_preview_frame::MobilePreviewFrameSurfaceCatalog::widget_name(id)
        })
        .or_else(|| surfaces::property_list::PropertyListSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::status_timeline::StatusTimelineSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::tour::TourSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::chart_registry::ChartSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::input_independent::InputWidgetCatalog::widget_name(id))
        .or_else(|| surfaces::input_composites::InputCompositeSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::input_advanced::AdvancedInputSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::calendar::CalendarSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::collapse::CollapseSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::descriptions::DescriptionsSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::image::ImageSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::list::ListSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::menu::MenuSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::qr_code::QrCodeSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::rate::RateSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::layout::LayoutSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::navigation::NavigationSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::interactive::InteractiveSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::runtime::RuntimeSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::breadcrumb::BreadcrumbSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::masonry::MasonrySurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::pagination::PaginationSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::skeleton::SkeletonSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::spin::SpinSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::statistic::StatisticSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::steps::StepsSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::timeline::TimelineSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::drawer::DrawerSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::dropdown::DropdownSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::message::MessageSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::modal::ModalSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::notification::NotificationSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::popconfirm::PopconfirmSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::popover::PopoverSurfaceCatalog::widget_name(id))
        .or_else(|| surfaces::tooltip::TooltipSurfaceCatalog::widget_name(id));
    native_widget.map_or_else(
        || ComponentSurfaceDescriptor::blocked(id),
        |widget| ComponentSurfaceDescriptor::connected(id, widget),
    )
}

pub fn definitions() -> &'static [&'static ComponentDefinition; 101] {
    &COMPONENT_DEFINITIONS
}

#[cfg(test)]
mod tests {
    use super::{COMPONENT_DEFINITIONS, definition};
    use tessera_core::catalog::ComponentId;

    #[test]
    fn definitions_round_trip_by_component_id() {
        assert_eq!(COMPONENT_DEFINITIONS.len(), ComponentId::ALL.len());
        for id in ComponentId::ALL {
            assert_eq!(definition(id).id, id);
        }
    }

    #[test]
    fn connected_surface_inventory_is_exactly_the_native_surface_batches() {
        let atomic = tessera_core::catalog::ComponentId::ALL
            .into_iter()
            .filter(|id| super::surfaces::atomic::AtomicSurfaceCatalog::contains(*id))
            .count();
        let charts = tessera_core::catalog::ComponentId::ALL
            .into_iter()
            .filter(|id| super::surfaces::chart_registry::ChartSurfaceCatalog::contains(*id))
            .count();
        let inputs = tessera_core::catalog::ComponentId::ALL
            .into_iter()
            .filter(|id| super::surfaces::input_independent::InputWidgetCatalog::contains(*id))
            .count();
        let input_composites = tessera_core::catalog::ComponentId::ALL
            .into_iter()
            .filter(|id| {
                super::surfaces::input_composites::InputCompositeSurfaceCatalog::contains(*id)
            })
            .count();
        let advanced_inputs = tessera_core::catalog::ComponentId::ALL
            .into_iter()
            .filter(|id| {
                super::surfaces::input_advanced::AdvancedInputSurfaceCatalog::contains(*id)
            })
            .count();
        let primitives = tessera_core::catalog::ComponentId::ALL
            .into_iter()
            .filter(|id| {
                super::surfaces::calendar::CalendarSurfaceCatalog::widget_name(*id).is_some()
                    || super::surfaces::collapse::CollapseSurfaceCatalog::widget_name(*id).is_some()
                    || super::surfaces::descriptions::DescriptionsSurfaceCatalog::widget_name(*id)
                        .is_some()
                    || super::surfaces::image::ImageSurfaceCatalog::widget_name(*id).is_some()
                    || super::surfaces::list::ListSurfaceCatalog::widget_name(*id).is_some()
                    || super::surfaces::menu::MenuSurfaceCatalog::widget_name(*id).is_some()
                    || super::surfaces::qr_code::QrCodeSurfaceCatalog::widget_name(*id).is_some()
                    || super::surfaces::rate::RateSurfaceCatalog::widget_name(*id).is_some()
            })
            .count();
        let feedback = tessera_core::catalog::ComponentId::ALL
            .into_iter()
            .filter(|id| super::surfaces::feedback::FeedbackSurfaceCatalog::contains(*id))
            .count();
        let layout = tessera_core::catalog::ComponentId::ALL
            .into_iter()
            .filter(|id| super::surfaces::layout::LayoutSurfaceCatalog::contains(*id))
            .count();
        let overlays = tessera_core::catalog::ComponentId::ALL
            .into_iter()
            .filter(|id| {
                super::surfaces::drawer::DrawerSurfaceCatalog::widget_name(*id).is_some()
                    || super::surfaces::dropdown::DropdownSurfaceCatalog::widget_name(*id).is_some()
                    || super::surfaces::message::MessageSurfaceCatalog::widget_name(*id).is_some()
                    || super::surfaces::modal::ModalSurfaceCatalog::widget_name(*id).is_some()
                    || super::surfaces::notification::NotificationSurfaceCatalog::widget_name(*id)
                        .is_some()
                    || super::surfaces::popconfirm::PopconfirmSurfaceCatalog::widget_name(*id)
                        .is_some()
                    || super::surfaces::popover::PopoverSurfaceCatalog::widget_name(*id).is_some()
                    || super::surfaces::tooltip::TooltipSurfaceCatalog::widget_name(*id).is_some()
            })
            .count();
        assert_eq!(atomic, 12);
        assert_eq!(charts, 15);
        assert_eq!(inputs, 8);
        assert_eq!(input_composites, 5);
        assert_eq!(advanced_inputs, 5);
        assert_eq!(primitives, 8);
        assert_eq!(feedback, 4);
        assert_eq!(layout, 6);
        let batch_b1 = tessera_core::catalog::ComponentId::ALL
            .into_iter()
            .filter(|id| {
                super::surfaces::breadcrumb::BreadcrumbSurfaceCatalog::widget_name(*id).is_some()
                    || super::surfaces::masonry::MasonrySurfaceCatalog::widget_name(*id).is_some()
                    || super::surfaces::pagination::PaginationSurfaceCatalog::widget_name(*id)
                        .is_some()
                    || super::surfaces::skeleton::SkeletonSurfaceCatalog::widget_name(*id).is_some()
                    || super::surfaces::spin::SpinSurfaceCatalog::widget_name(*id).is_some()
                    || super::surfaces::statistic::StatisticSurfaceCatalog::widget_name(*id)
                        .is_some()
                    || super::surfaces::steps::StepsSurfaceCatalog::widget_name(*id).is_some()
                    || super::surfaces::timeline::TimelineSurfaceCatalog::widget_name(*id).is_some()
            })
            .count();
        assert_eq!(batch_b1, 8);
        assert_eq!(overlays, 8);
        let current_batch = tessera_core::catalog::ComponentId::ALL
            .into_iter()
            .filter(|id| {
                super::surfaces::navigation::NavigationSurfaceCatalog::widget_name(*id).is_some()
                    || super::surfaces::interactive::InteractiveSurfaceCatalog::widget_name(*id)
                        .is_some()
                    || super::surfaces::runtime::RuntimeSurfaceCatalog::widget_name(*id).is_some()
            })
            .count();
        assert_eq!(current_batch, 9);
        assert_eq!(
            tessera_core::catalog::ComponentId::ALL
                .into_iter()
                .filter(|id| super::surface(*id).availability().is_connected())
                .count(),
            101
        );
    }
}
