use tessera_core::{ThemeMode, catalog::ComponentId};
use tessera_makepad::components::surfaces::{
    atomic::{
        AtomicComponent, AtomicIcon, AtomicPalette, AtomicSurfaceCatalog, AvatarConfig,
        ButtonConfig, FloatButtonConfig, IconButtonConfig, TagConfig, TesseraAvatar, TesseraBadge,
        TesseraButton, TesseraDivider, TesseraFloatButton, TesseraIcon, TesseraIconButton,
        TesseraTag, TesseraToolbar, TesseraTypography, TesseraWatermark, ToolbarConfig,
        ToolbarItem, TypographyAction, TypographyConfig, TypographyRole,
    },
    breadcrumb::{BreadcrumbSurfaceCatalog, TesseraBreadcrumb},
    calendar::{CalendarSurfaceCatalog, TesseraCalendar},
    chart_area::TesseraAreaChart,
    chart_bar::TesseraBarChart,
    chart_funnel::TesseraFunnelChart,
    chart_gauge::TesseraGaugeChart,
    chart_heatmap::TesseraHeatmap,
    chart_line::TesseraLineChart,
    chart_mind_map::TesseraMindMap,
    chart_organization::TesseraOrganizationChart,
    chart_pie::TesseraPieChart,
    chart_radar::TesseraRadarChart,
    chart_registry::ChartSurfaceCatalog,
    chart_sankey::TesseraSankeyChart,
    chart_scatter::TesseraScatterChart,
    chart_sparkline::TesseraSparkline,
    chart_treemap::TesseraTreemap,
    chart_word_cloud::TesseraWordCloud,
    code_block::{CodeBlockSurfaceCatalog, TesseraCodeBlock},
    collapse::{CollapseSurfaceCatalog, TesseraCollapse},
    command_palette::{CommandPaletteSurfaceCatalog, TesseraCommandPalette},
    data_toolbar::{DataToolbarSurfaceCatalog, TesseraDataToolbar},
    descriptions::{DescriptionsSurfaceCatalog, TesseraDescriptions},
    drawer::{DrawerSurfaceCatalog, TesseraDrawer},
    dropdown::{DropdownSurfaceCatalog, TesseraDropdown},
    feedback::{
        FeedbackSurfaceCatalog, TesseraAlert, TesseraEmpty, TesseraProgress, TesseraResult,
    },
    filter_panel::{FilterPanelSurfaceCatalog, TesseraFilterPanel},
    image::{ImageSurfaceCatalog, TesseraImage},
    input_advanced::{
        AdvancedInputSurfaceCatalog, TesseraCascader, TesseraForm, TesseraTransfer,
        TesseraTreeSelect, TesseraUpload,
    },
    input_composites::{
        InputCompositeSurfaceCatalog, TesseraAutoComplete, TesseraColorPicker, TesseraDatePicker,
        TesseraMentions, TesseraTimePicker,
    },
    input_independent::{
        InputWidgetCatalog, TesseraCheckbox, TesseraInput, TesseraInputNumber, TesseraRadio,
        TesseraSelect, TesseraSlider, TesseraSwitch, TesseraTextarea,
    },
    interactive::{InteractiveSurfaceCatalog, TesseraBorderBeam, TesseraCarousel, TesseraSplitter},
    layout::{
        LayoutSurfaceCatalog, TesseraAffix, TesseraAnchor, TesseraCard, TesseraFlex, TesseraGrid,
        TesseraLayout,
    },
    list::{ListSurfaceCatalog, TesseraList},
    markdown_editor::{MarkdownEditorSurfaceCatalog, TesseraMarkdownEditor},
    masonry::{MasonrySurfaceCatalog, TesseraMasonry},
    menu::{MenuSurfaceCatalog, TesseraMenu},
    mermaid_svg_viewer::{MermaidSvgViewerSurfaceCatalog, TesseraMermaidSvgViewer},
    message::{MessageSurfaceCatalog, TesseraMessage},
    metric_card::{MetricCardSurfaceCatalog, TesseraMetricCard},
    mini_chart_card::{MiniChartCardSurfaceCatalog, TesseraMiniChartCard},
    mobile_preview_frame::{MobilePreviewFrameSurfaceCatalog, TesseraMobilePreviewFrame},
    modal::{ModalSurfaceCatalog, TesseraModal},
    navigation::{NavigationSurfaceCatalog, TesseraSegmented, TesseraTabs, TesseraTree},
    notification::{NotificationSurfaceCatalog, TesseraNotification},
    pagination::{PaginationSurfaceCatalog, TesseraPagination},
    popconfirm::{PopconfirmSurfaceCatalog, TesseraPopconfirm},
    popover::{PopoverSurfaceCatalog, TesseraPopover},
    property_list::{PropertyListSurfaceCatalog, TesseraPropertyList},
    qr_code::{QrCodeSurfaceCatalog, TesseraQrCode},
    rate::{RateSurfaceCatalog, TesseraRate},
    runtime::{RuntimeSurfaceCatalog, TesseraApp, TesseraConfigProvider, TesseraUtil},
    skeleton::{SkeletonSurfaceCatalog, TesseraSkeleton},
    spin::{SpinSurfaceCatalog, TesseraSpin},
    statistic::{StatisticSurfaceCatalog, TesseraStatistic},
    status_timeline::{StatusTimelineSurfaceCatalog, TesseraStatusTimeline},
    steps::{StepsSurfaceCatalog, TesseraSteps},
    table::{TableSurfaceCatalog, TesseraTable},
    timeline::{TesseraTimeline, TimelineSurfaceCatalog},
    tooltip::{TesseraTooltip, TooltipSurfaceCatalog},
    tour::{TesseraTour, TourSurfaceCatalog},
};
use tessera_makepad::makepad_widgets::*;

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*

    mod.widgets.TesseraComponentDetailBase = #(ComponentDetail::register_widget(vm))
    mod.widgets.TesseraExampleSlot = mod.widgets.View{
        width: Fill
        height: Fit
        flow: Down
    }
    mod.widgets.TesseraAtomicExampleSlot = mod.widgets.RoundedView{
        width: Fill
        height: Fit
        flow: Down
        padding: Inset{left: 20, right: 20, top: 20, bottom: 20}
        show_bg: true
        draw_bg +: {
            color: theme.color_fg_app
            border_radius: 6.0
            border_size: 1.0
            border_color: theme.color_bevel
        }
    }
    mod.widgets.TesseraComponentDetail = set_type_default() do mod.widgets.TesseraComponentDetailBase{
        width: Fill
        height: Fit
        flow: Down
        spacing: 12
        padding: Inset{left: 18, right: 18, top: 16, bottom: 16}
        surface_status := Label{
            width: Fill
            height: Fit
            text: "No native surface selected."
            draw_text +: {
                color: theme.color_text_meta
                text_style +: {font_size: 10.0}
                flow: Flow.Right{wrap: true}
            }
        }

        button_slot := mod.widgets.TesseraAtomicExampleSlot{
            width: Fill
            height: Fit
            visible: false
            align: Align{x: 0.0, y: 0.5}
            button_surface := TesseraButton{
                width: 160
                height: 36
                text: "Primary action"
            }
        }
        float_button_slot := mod.widgets.TesseraAtomicExampleSlot{
            width: Fill
            height: Fit
            visible: false
            align: Align{x: 0.0, y: 0.5}
            float_button_surface := TesseraFloatButton{
                width: 44
                height: 44
            }
        }
        icon_slot := mod.widgets.TesseraAtomicExampleSlot{
            width: Fill
            height: Fit
            visible: false
            icon_surface := TesseraIcon{
                width: 24
                height: 24
            }
        }
        typography_slot := mod.widgets.TesseraAtomicExampleSlot{
            width: Fill
            height: Fit
            visible: false
            typography_surface := TesseraTypography{
                width: Fill
                height: 28
                text: "Tessera native typography"
            }
        }
        icon_button_slot := mod.widgets.TesseraAtomicExampleSlot{
            width: Fill
            height: Fit
            visible: false
            icon_button_surface := TesseraIconButton{
                width: 36
                height: 36
            }
        }
        toolbar_slot := mod.widgets.TesseraAtomicExampleSlot{
            width: Fill
            height: Fit
            flow: Down spacing: 8
            visible: false
            toolbar_fixtures := View{width: Fill height: Fit flow: Right spacing: 6
                toolbar_standard := Button{height: 28 text: "Standard"}
                toolbar_compact := Button{height: 28 text: "Compact"}
                toolbar_disabled := Button{height: 28 text: "Disabled"}
            }
            toolbar_frame := View{width: Fill height: 40
                toolbar_surface := TesseraToolbar{width: Fill height: 40}
            }
        }
        divider_slot := mod.widgets.TesseraAtomicExampleSlot{
            width: Fill
            height: Fit
            visible: false
            divider_surface := TesseraDivider{
                width: Fill
                height: 20
            }
        }
        space_slot := mod.widgets.TesseraAtomicExampleSlot{
            width: Fill
            height: Fit
            visible: false
            space_surface := TesseraSpace{
                width: 18
                height: 18
            }
        }
        watermark_slot := mod.widgets.TesseraAtomicExampleSlot{
            width: Fill
            height: Fit
            visible: false
            watermark_surface := TesseraWatermark{
                width: Fill
                height: 80
            }
        }
        badge_slot := mod.widgets.TesseraAtomicExampleSlot{
            width: Fill
            height: Fit
            visible: false
            badge_surface := TesseraBadge{
                width: 42
                height: 24
            }
        }
        tag_slot := mod.widgets.TesseraAtomicExampleSlot{
            width: Fill
            height: Fit
            visible: false
            tag_surface := TesseraTag{
                width: 120
                height: 28
            }
        }
        avatar_slot := mod.widgets.TesseraAtomicExampleSlot{
            width: Fill
            height: Fit
            visible: false
            avatar_surface := TesseraAvatar{
                width: 36
                height: 36
            }
        }
        line_chart_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: 260
            visible: false
            line_chart_surface := TesseraLineChart{
                width: Fill
                height: 260
            }
        }
        area_chart_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: 260
            visible: false
            area_chart_surface := TesseraAreaChart{
                width: Fill
                height: 260
            }
        }
        bar_chart_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: 260
            visible: false
            bar_chart_surface := TesseraBarChart{
                width: Fill
                height: 260
            }
        }
        scatter_chart_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: 260
            visible: false
            scatter_chart_surface := TesseraScatterChart{
                width: Fill
                height: 260
            }
        }
        sparkline_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: 260
            visible: false
            sparkline_surface := TesseraSparkline{
                width: Fill
                height: 260
            }
        }
        funnel_chart_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: 260 visible: false
            funnel_chart_surface := TesseraFunnelChart{width: Fill height: 260}
        }
        gauge_chart_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: 260 visible: false
            gauge_chart_surface := TesseraGaugeChart{width: Fill height: 260}
        }
        heatmap_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: 260 visible: false
            heatmap_surface := TesseraHeatmap{width: Fill height: 260}
        }
        mind_map_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: 260 visible: false
            mind_map_surface := TesseraMindMap{width: Fill height: 260}
        }
        organization_chart_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: 260 visible: false
            organization_chart_surface := TesseraOrganizationChart{width: Fill height: 260}
        }
        pie_chart_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: 260 visible: false
            pie_chart_surface := TesseraPieChart{width: Fill height: 260}
        }
        radar_chart_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: 260 visible: false
            radar_chart_surface := TesseraRadarChart{width: Fill height: 260}
        }
        sankey_chart_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: Fit flow: Down spacing: 8 visible: false
            sankey_chart_surface := TesseraSankeyChart{width: Fill height: 260}
            sankey_fixture_controls := View{
                width: Fill height: Fit flow: Right spacing: 8
                sankey_sample := Button{width: Fit height: 28 text: "Load sample"}
                sankey_empty := Button{width: Fit height: 28 text: "Clear"}
                sankey_cycle := Button{width: Fit height: 28 text: "Load cycle"}
                sankey_capacity := Button{width: Fit height: 28 text: "Load 120"}
                sankey_zero := Button{width: Fit height: 28 text: "Zero links"}
                sankey_overflow := Button{width: Fit height: 28 text: "Overflow"}
            }
        }
        treemap_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: 260 visible: false
            treemap_surface := TesseraTreemap{width: Fill height: 260}
        }
        word_cloud_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: 260 visible: false
            word_cloud_surface := TesseraWordCloud{width: Fill height: 260}
        }
        input_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: Fit visible: false
            input_surface := TesseraInput{width: Fill height: Fit}
        }
        textarea_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: Fit visible: false
            textarea_surface := TesseraTextarea{width: Fill height: Fit}
        }
        input_number_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: Fit visible: false
            input_number_surface := TesseraInputNumber{width: Fill height: Fit}
        }
        checkbox_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: Fit visible: false
            checkbox_surface := TesseraCheckbox{width: Fill height: Fit}
        }
        radio_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: Fit visible: false
            radio_surface := TesseraRadio{width: Fill height: Fit}
        }
        switch_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: Fit visible: false
            switch_surface := TesseraSwitch{width: Fill height: Fit}
        }
        slider_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: Fit visible: false
            slider_surface := TesseraSlider{width: Fill height: Fit}
        }
        select_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: Fit visible: false
            select_surface := TesseraSelect{width: Fill height: Fit}
        }
        input_composite_auto_complete_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: Fit visible: false
            auto_complete_surface := TesseraAutoComplete{width: Fill height: Fit}
        }
        input_composite_mentions_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: Fit visible: false
            mentions_surface := TesseraMentions{width: Fill height: Fit}
        }
        input_composite_color_picker_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: Fit visible: false
            color_picker_surface := TesseraColorPicker{width: Fill height: Fit}
        }
        input_composite_date_picker_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: Fit visible: false
            date_picker_surface := TesseraDatePicker{width: Fill height: Fit}
        }
        input_composite_time_picker_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: Fit visible: false
            time_picker_surface := TesseraTimePicker{width: Fill height: Fit}
        }
        input_advanced_cascader_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: Fit visible: false
            cascader_surface := TesseraCascader{width: Fill height: Fit}
        }
        input_advanced_tree_select_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: Fit visible: false
            tree_select_surface := TesseraTreeSelect{width: Fill height: Fit}
        }
        input_advanced_transfer_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: Fit visible: false
            transfer_surface := TesseraTransfer{width: Fill height: Fit}
        }
        input_advanced_upload_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: Fit visible: false
            upload_surface := TesseraUpload{width: Fill height: Fit}
        }
        input_advanced_form_slot := mod.widgets.TesseraExampleSlot{
            width: Fill height: Fit visible: false
            form_surface := TesseraForm{width: Fill height: Fit}
        }
        calendar_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            calendar_surface := TesseraCalendar{
                width: Fill
                height: Fit
            }
        }
        collapse_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            collapse_surface := TesseraCollapse{
                width: Fill
                height: Fit
            }
        }
        descriptions_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            descriptions_surface := TesseraDescriptions{
                width: Fill
                height: Fit
            }
        }
        image_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            image_surface := TesseraImage{
                width: Fill
                height: Fit
            }
        }
        list_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            list_surface := TesseraList{
                width: Fill
                height: Fit
            }
        }
        menu_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            menu_surface := TesseraMenu{
                width: Fill
                height: Fit
            }
        }
        qr_code_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            qr_code_surface := TesseraQrCode{
                width: Fill
                height: Fit
            }
        }
        rate_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            rate_surface := TesseraRate{
                width: Fill
                height: Fit
            }
        }
        masonry_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            masonry_surface := TesseraMasonry{
                width: Fill
                height: Fit
            }
        }
        breadcrumb_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            breadcrumb_surface := TesseraBreadcrumb{
                width: Fill
                height: Fit
            }
        }
        pagination_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            pagination_surface := TesseraPagination{
                width: Fill
                height: Fit
            }
        }
        steps_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            steps_surface := TesseraSteps{
                width: Fill
                height: Fit
            }
        }
        skeleton_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            skeleton_surface := TesseraSkeleton{
                width: Fill
                height: Fit
            }
        }
        spin_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            spin_surface := TesseraSpin{
                width: Fill
                height: Fit
            }
        }
        statistic_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            statistic_surface := TesseraStatistic{
                width: Fill
                height: Fit
            }
        }
        timeline_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            timeline_surface := TesseraTimeline{
                width: Fill
                height: Fit
            }
        }
        alert_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            alert_surface := TesseraAlert{
                width: Fill
                height: Fit
            }
        }
        empty_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            empty_surface := TesseraEmpty{
                width: Fill
                height: Fit
            }
        }
        progress_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            progress_surface := TesseraProgress{
                width: Fill
                height: Fit
            }
        }
        result_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            result_surface := TesseraResult{
                width: Fill
                height: Fit
            }
        }
        affix_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            affix_surface := TesseraAffix{
                width: Fill
                height: Fit
            }
        }
        anchor_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            anchor_surface := TesseraAnchor{
                width: Fill
                height: Fit
            }
        }
        card_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            card_surface := TesseraCard{
                width: Fill
                height: Fit
            }
        }
        flex_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            flex_surface := TesseraFlex{
                width: Fill
                height: Fit
            }
        }
        grid_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            grid_surface := TesseraGrid{
                width: Fill
                height: Fit
            }
        }
        layout_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            layout_surface := TesseraLayout{
                width: Fill
                height: Fit
            }
        }
        segmented_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            segmented_surface := TesseraSegmented{
                width: Fill
                height: Fit
            }
        }
        tabs_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            tabs_surface := TesseraTabs{
                width: Fill
                height: Fit
            }
        }
        tree_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            tree_surface := TesseraTree{
                width: Fill
                height: Fit
            }
        }
        carousel_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            carousel_surface := TesseraCarousel{
                width: Fill
                height: Fit
            }
        }
        splitter_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            splitter_surface := TesseraSplitter{
                width: Fill
                height: Fit
            }
        }
        border_beam_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            border_beam_surface := TesseraBorderBeam{
                width: Fill
                height: Fit
            }
        }
        app_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            app_surface := TesseraApp{
                width: Fill
                height: Fit
            }
        }
        config_provider_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            config_provider_surface := TesseraConfigProvider{
                width: Fill
                height: Fit
            }
        }
        util_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            util_surface := TesseraUtil{
                width: Fill
                height: Fit
            }
        }
        drawer_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            drawer_surface := TesseraDrawer{
                width: Fill
                height: Fit
            }
        }
        dropdown_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            dropdown_surface := TesseraDropdown{
                width: Fill
                height: Fit
            }
        }
        message_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            message_surface := TesseraMessage{
                width: Fill
                height: Fit
            }
        }
        modal_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            modal_surface := TesseraModal{
                width: Fill
                height: Fit
            }
        }
        notification_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            notification_surface := TesseraNotification{
                width: Fill
                height: Fit
            }
        }
        popconfirm_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            popconfirm_surface := TesseraPopconfirm{
                width: Fill
                height: Fit
            }
        }
        popover_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            popover_surface := TesseraPopover{
                width: Fill
                height: Fit
            }
        }
        tooltip_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            tooltip_surface := TesseraTooltip{
                width: Fill
                height: Fit
            }
        }
        code_block_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            code_block_surface := TesseraCodeBlock{
                width: Fill
                height: Fit
            }
        }
        command_palette_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            command_palette_surface := TesseraCommandPalette{
                width: Fill
                height: Fit
            }
        }
        data_toolbar_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            data_toolbar_surface := TesseraDataToolbar{
                width: Fill
                height: Fit
            }
        }
        filter_panel_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            filter_panel_surface := TesseraFilterPanel{
                width: Fill
                height: Fit
            }
        }
        markdown_editor_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            markdown_editor_surface := TesseraMarkdownEditor{
                width: Fill
                height: Fit
            }
        }
        table_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            table_surface := TesseraTable{
                width: Fill
                height: Fit
            }
        }
        mermaid_svg_viewer_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            mermaid_svg_viewer_surface := TesseraMermaidSvgViewer{
                width: Fill
                height: Fit
            }
        }
        metric_card_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            metric_card_surface := TesseraMetricCard{
                width: Fill
                height: Fit
            }
        }
        mini_chart_card_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            mini_chart_card_surface := TesseraMiniChartCard{
                width: Fill
                height: Fit
            }
        }
        mobile_preview_frame_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            mobile_preview_frame_surface := TesseraMobilePreviewFrame{
                width: Fill
                height: Fit
            }
        }
        property_list_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            property_list_surface := TesseraPropertyList{
                width: Fill
                height: Fit
            }
        }
        status_timeline_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            status_timeline_surface := TesseraStatusTimeline{
                width: Fill
                height: Fit
            }
        }
        tour_slot := mod.widgets.TesseraExampleSlot{
            width: Fill
            height: Fit
            visible: false
            tour_surface := TesseraTour{
                width: Fill
                height: Fit
            }
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum SurfaceSlot {
    Button,
    FloatButton,
    Icon,
    Typography,
    IconButton,
    Toolbar,
    Divider,
    Space,
    Watermark,
    Badge,
    Tag,
    Avatar,
    LineChart,
    AreaChart,
    BarChart,
    ScatterChart,
    Sparkline,
    FunnelChart,
    GaugeChart,
    Heatmap,
    MindMap,
    OrganizationChart,
    PieChart,
    RadarChart,
    SankeyChart,
    Treemap,
    WordCloud,
    Input,
    Textarea,
    InputNumber,
    Checkbox,
    Radio,
    Switch,
    Slider,
    Select,
    AutoComplete,
    Mentions,
    ColorPicker,
    DatePicker,
    TimePicker,
    Cascader,
    TreeSelect,
    Transfer,
    Upload,
    Form,
    Calendar,
    Collapse,
    Descriptions,
    Image,
    List,
    Menu,
    QrCode,
    Rate,
    Masonry,
    Breadcrumb,
    Pagination,
    Steps,
    Skeleton,
    Spin,
    Statistic,
    Timeline,
    Alert,
    Empty,
    Progress,
    Result,
    Affix,
    Anchor,
    Card,
    Flex,
    Grid,
    Layout,
    Segmented,
    Tabs,
    Tree,
    Carousel,
    Splitter,
    BorderBeam,
    App,
    ConfigProvider,
    Util,
    Drawer,
    Dropdown,
    Message,
    Modal,
    Notification,
    Popconfirm,
    Popover,
    Tooltip,
    CodeBlock,
    CommandPalette,
    DataToolbar,
    FilterPanel,
    MarkdownEditor,
    Table,
    MermaidSvgViewer,
    MetricCard,
    MiniChartCard,
    MobilePreviewFrame,
    PropertyList,
    StatusTimeline,
    Tour,
}

impl SurfaceSlot {
    const ALL: [Self; 101] = [
        Self::Button,
        Self::FloatButton,
        Self::Icon,
        Self::Typography,
        Self::IconButton,
        Self::Toolbar,
        Self::Divider,
        Self::Space,
        Self::Watermark,
        Self::Badge,
        Self::Tag,
        Self::Avatar,
        Self::LineChart,
        Self::AreaChart,
        Self::BarChart,
        Self::ScatterChart,
        Self::Sparkline,
        Self::FunnelChart,
        Self::GaugeChart,
        Self::Heatmap,
        Self::MindMap,
        Self::OrganizationChart,
        Self::PieChart,
        Self::RadarChart,
        Self::SankeyChart,
        Self::Treemap,
        Self::WordCloud,
        Self::Input,
        Self::Textarea,
        Self::InputNumber,
        Self::Checkbox,
        Self::Radio,
        Self::Switch,
        Self::Slider,
        Self::Select,
        Self::AutoComplete,
        Self::Mentions,
        Self::ColorPicker,
        Self::DatePicker,
        Self::TimePicker,
        Self::Cascader,
        Self::TreeSelect,
        Self::Transfer,
        Self::Upload,
        Self::Form,
        Self::Calendar,
        Self::Collapse,
        Self::Descriptions,
        Self::Image,
        Self::List,
        Self::Menu,
        Self::QrCode,
        Self::Rate,
        Self::Masonry,
        Self::Breadcrumb,
        Self::Pagination,
        Self::Steps,
        Self::Skeleton,
        Self::Spin,
        Self::Statistic,
        Self::Timeline,
        Self::Alert,
        Self::Empty,
        Self::Progress,
        Self::Result,
        Self::Affix,
        Self::Anchor,
        Self::Card,
        Self::Flex,
        Self::Grid,
        Self::Layout,
        Self::Segmented,
        Self::Tabs,
        Self::Tree,
        Self::Carousel,
        Self::Splitter,
        Self::BorderBeam,
        Self::App,
        Self::ConfigProvider,
        Self::Util,
        Self::Drawer,
        Self::Dropdown,
        Self::Message,
        Self::Modal,
        Self::Notification,
        Self::Popconfirm,
        Self::Popover,
        Self::Tooltip,
        Self::CodeBlock,
        Self::CommandPalette,
        Self::DataToolbar,
        Self::FilterPanel,
        Self::MarkdownEditor,
        Self::Table,
        Self::MermaidSvgViewer,
        Self::MetricCard,
        Self::MiniChartCard,
        Self::MobilePreviewFrame,
        Self::PropertyList,
        Self::StatusTimeline,
        Self::Tour,
    ];

    const fn widget_name(self) -> &'static str {
        match self {
            Self::Button => "TesseraButton",
            Self::FloatButton => "TesseraFloatButton",
            Self::Icon => "TesseraIcon",
            Self::Typography => "TesseraTypography",
            Self::IconButton => "TesseraIconButton",
            Self::Toolbar => "TesseraToolbar",
            Self::Divider => "TesseraDivider",
            Self::Space => "TesseraSpace",
            Self::Watermark => "TesseraWatermark",
            Self::Badge => "TesseraBadge",
            Self::Tag => "TesseraTag",
            Self::Avatar => "TesseraAvatar",
            Self::LineChart => "TesseraLineChart",
            Self::AreaChart => "TesseraAreaChart",
            Self::BarChart => "TesseraBarChart",
            Self::ScatterChart => "TesseraScatterChart",
            Self::Sparkline => "TesseraSparkline",
            Self::FunnelChart => "TesseraFunnelChart",
            Self::GaugeChart => "TesseraGaugeChart",
            Self::Heatmap => "TesseraHeatmap",
            Self::MindMap => "TesseraMindMap",
            Self::OrganizationChart => "TesseraOrganizationChart",
            Self::PieChart => "TesseraPieChart",
            Self::RadarChart => "TesseraRadarChart",
            Self::SankeyChart => "TesseraSankeyChart",
            Self::Treemap => "TesseraTreemap",
            Self::WordCloud => "TesseraWordCloud",
            Self::Input => "TesseraInput",
            Self::Textarea => "TesseraTextarea",
            Self::InputNumber => "TesseraInputNumber",
            Self::Checkbox => "TesseraCheckbox",
            Self::Radio => "TesseraRadio",
            Self::Switch => "TesseraSwitch",
            Self::Slider => "TesseraSlider",
            Self::Select => "TesseraSelect",
            Self::AutoComplete => "TesseraAutoComplete",
            Self::Mentions => "TesseraMentions",
            Self::ColorPicker => "TesseraColorPicker",
            Self::DatePicker => "TesseraDatePicker",
            Self::TimePicker => "TesseraTimePicker",
            Self::Cascader => "TesseraCascader",
            Self::TreeSelect => "TesseraTreeSelect",
            Self::Transfer => "TesseraTransfer",
            Self::Upload => "TesseraUpload",
            Self::Form => "TesseraForm",
            Self::Calendar => "TesseraCalendar",
            Self::Collapse => "TesseraCollapse",
            Self::Descriptions => "TesseraDescriptions",
            Self::Image => "TesseraImage",
            Self::List => "TesseraList",
            Self::Menu => "TesseraMenu",
            Self::QrCode => "TesseraQrCode",
            Self::Rate => "TesseraRate",
            Self::Masonry => "TesseraMasonry",
            Self::Breadcrumb => "TesseraBreadcrumb",
            Self::Pagination => "TesseraPagination",
            Self::Steps => "TesseraSteps",
            Self::Skeleton => "TesseraSkeleton",
            Self::Spin => "TesseraSpin",
            Self::Statistic => "TesseraStatistic",
            Self::Timeline => "TesseraTimeline",
            Self::Alert => "TesseraAlert",
            Self::Empty => "TesseraEmpty",
            Self::Progress => "TesseraProgress",
            Self::Result => "TesseraResult",
            Self::Affix => "TesseraAffix",
            Self::Anchor => "TesseraAnchor",
            Self::Card => "TesseraCard",
            Self::Flex => "TesseraFlex",
            Self::Grid => "TesseraGrid",
            Self::Layout => "TesseraLayout",
            Self::Segmented => "TesseraSegmented",
            Self::Tabs => "TesseraTabs",
            Self::Tree => "TesseraTree",
            Self::Carousel => "TesseraCarousel",
            Self::Splitter => "TesseraSplitter",
            Self::BorderBeam => "TesseraBorderBeam",
            Self::App => "TesseraApp",
            Self::ConfigProvider => "TesseraConfigProvider",
            Self::Util => "TesseraUtil",
            Self::Drawer => "TesseraDrawer",
            Self::Dropdown => "TesseraDropdown",
            Self::Message => "TesseraMessage",
            Self::Modal => "TesseraModal",
            Self::Notification => "TesseraNotification",
            Self::Popconfirm => "TesseraPopconfirm",
            Self::Popover => "TesseraPopover",
            Self::Tooltip => "TesseraTooltip",
            Self::CodeBlock => "TesseraCodeBlock",
            Self::CommandPalette => "TesseraCommandPalette",
            Self::DataToolbar => "TesseraDataToolbar",
            Self::FilterPanel => "TesseraFilterPanel",
            Self::MarkdownEditor => "TesseraMarkdownEditor",
            Self::Table => "TesseraTable",
            Self::MermaidSvgViewer => "TesseraMermaidSvgViewer",
            Self::MetricCard => "TesseraMetricCard",
            Self::MiniChartCard => "TesseraMiniChartCard",
            Self::MobilePreviewFrame => "TesseraMobilePreviewFrame",
            Self::PropertyList => "TesseraPropertyList",
            Self::StatusTimeline => "TesseraStatusTimeline",
            Self::Tour => "TesseraTour",
        }
    }
}

fn slot_for_atomic(component: AtomicComponent) -> SurfaceSlot {
    match component {
        AtomicComponent::Button => SurfaceSlot::Button,
        AtomicComponent::FloatButton => SurfaceSlot::FloatButton,
        AtomicComponent::Icon => SurfaceSlot::Icon,
        AtomicComponent::Typography => SurfaceSlot::Typography,
        AtomicComponent::IconButton => SurfaceSlot::IconButton,
        AtomicComponent::Toolbar => SurfaceSlot::Toolbar,
        AtomicComponent::Divider => SurfaceSlot::Divider,
        AtomicComponent::Space => SurfaceSlot::Space,
        AtomicComponent::Watermark => SurfaceSlot::Watermark,
        AtomicComponent::Badge => SurfaceSlot::Badge,
        AtomicComponent::Tag => SurfaceSlot::Tag,
        AtomicComponent::Avatar => SurfaceSlot::Avatar,
    }
}

fn slot_for_feedback(id: ComponentId) -> Option<SurfaceSlot> {
    match id {
        ComponentId::Alert => Some(SurfaceSlot::Alert),
        ComponentId::Empty => Some(SurfaceSlot::Empty),
        ComponentId::Progress => Some(SurfaceSlot::Progress),
        ComponentId::Result => Some(SurfaceSlot::Result),
        _ => None,
    }
}

fn slot_for_layout(id: ComponentId) -> Option<SurfaceSlot> {
    match id {
        ComponentId::Affix => Some(SurfaceSlot::Affix),
        ComponentId::Anchor => Some(SurfaceSlot::Anchor),
        ComponentId::Card => Some(SurfaceSlot::Card),
        ComponentId::Flex => Some(SurfaceSlot::Flex),
        ComponentId::Grid => Some(SurfaceSlot::Grid),
        ComponentId::Layout => Some(SurfaceSlot::Layout),
        _ => None,
    }
}

fn slot_for_current_batch(id: ComponentId) -> Option<SurfaceSlot> {
    match id {
        ComponentId::Segmented => Some(SurfaceSlot::Segmented),
        ComponentId::Tabs => Some(SurfaceSlot::Tabs),
        ComponentId::Tree => Some(SurfaceSlot::Tree),
        ComponentId::Carousel => Some(SurfaceSlot::Carousel),
        ComponentId::Splitter => Some(SurfaceSlot::Splitter),
        ComponentId::BorderBeam => Some(SurfaceSlot::BorderBeam),
        ComponentId::App => Some(SurfaceSlot::App),
        ComponentId::ConfigProvider => Some(SurfaceSlot::ConfigProvider),
        ComponentId::Util => Some(SurfaceSlot::Util),
        _ => None,
    }
}

fn current_batch_widget_name(id: ComponentId) -> Option<&'static str> {
    NavigationSurfaceCatalog::widget_name(id)
        .or_else(|| InteractiveSurfaceCatalog::widget_name(id))
        .or_else(|| RuntimeSurfaceCatalog::widget_name(id))
}

fn slot_for_display(id: ComponentId) -> Option<SurfaceSlot> {
    match id {
        ComponentId::Calendar => Some(SurfaceSlot::Calendar),
        ComponentId::Collapse => Some(SurfaceSlot::Collapse),
        ComponentId::Descriptions => Some(SurfaceSlot::Descriptions),
        ComponentId::Image => Some(SurfaceSlot::Image),
        ComponentId::List => Some(SurfaceSlot::List),
        ComponentId::Menu => Some(SurfaceSlot::Menu),
        ComponentId::QrCode => Some(SurfaceSlot::QrCode),
        ComponentId::Rate => Some(SurfaceSlot::Rate),
        _ => None,
    }
}

fn display_widget_name(id: ComponentId) -> Option<&'static str> {
    CalendarSurfaceCatalog::widget_name(id)
        .or_else(|| CollapseSurfaceCatalog::widget_name(id))
        .or_else(|| DescriptionsSurfaceCatalog::widget_name(id))
        .or_else(|| ImageSurfaceCatalog::widget_name(id))
        .or_else(|| ListSurfaceCatalog::widget_name(id))
        .or_else(|| MenuSurfaceCatalog::widget_name(id))
        .or_else(|| QrCodeSurfaceCatalog::widget_name(id))
        .or_else(|| RateSurfaceCatalog::widget_name(id))
}

fn slot_for_b1(id: ComponentId) -> Option<SurfaceSlot> {
    match id {
        ComponentId::Masonry => Some(SurfaceSlot::Masonry),
        ComponentId::Breadcrumb => Some(SurfaceSlot::Breadcrumb),
        ComponentId::Pagination => Some(SurfaceSlot::Pagination),
        ComponentId::Steps => Some(SurfaceSlot::Steps),
        ComponentId::Skeleton => Some(SurfaceSlot::Skeleton),
        ComponentId::Spin => Some(SurfaceSlot::Spin),
        ComponentId::Statistic => Some(SurfaceSlot::Statistic),
        ComponentId::Timeline => Some(SurfaceSlot::Timeline),
        _ => None,
    }
}

fn slot_for_overlay(id: ComponentId) -> Option<SurfaceSlot> {
    match id {
        ComponentId::Drawer => Some(SurfaceSlot::Drawer),
        ComponentId::Dropdown => Some(SurfaceSlot::Dropdown),
        ComponentId::Message => Some(SurfaceSlot::Message),
        ComponentId::Modal => Some(SurfaceSlot::Modal),
        ComponentId::Notification => Some(SurfaceSlot::Notification),
        ComponentId::Popconfirm => Some(SurfaceSlot::Popconfirm),
        ComponentId::Popover => Some(SurfaceSlot::Popover),
        ComponentId::Tooltip => Some(SurfaceSlot::Tooltip),
        _ => None,
    }
}

fn overlay_widget_name(id: ComponentId) -> Option<&'static str> {
    DrawerSurfaceCatalog::widget_name(id)
        .or_else(|| DropdownSurfaceCatalog::widget_name(id))
        .or_else(|| MessageSurfaceCatalog::widget_name(id))
        .or_else(|| ModalSurfaceCatalog::widget_name(id))
        .or_else(|| NotificationSurfaceCatalog::widget_name(id))
        .or_else(|| PopconfirmSurfaceCatalog::widget_name(id))
        .or_else(|| PopoverSurfaceCatalog::widget_name(id))
        .or_else(|| TooltipSurfaceCatalog::widget_name(id))
}

fn slot_for_new_surfaces(id: ComponentId) -> Option<SurfaceSlot> {
    match id {
        ComponentId::CodeBlock => Some(SurfaceSlot::CodeBlock),
        ComponentId::CommandPalette => Some(SurfaceSlot::CommandPalette),
        ComponentId::DataToolbar => Some(SurfaceSlot::DataToolbar),
        ComponentId::FilterPanel => Some(SurfaceSlot::FilterPanel),
        ComponentId::MarkdownEditor => Some(SurfaceSlot::MarkdownEditor),
        ComponentId::Table => Some(SurfaceSlot::Table),
        ComponentId::MermaidSvgViewer => Some(SurfaceSlot::MermaidSvgViewer),
        ComponentId::MetricCard => Some(SurfaceSlot::MetricCard),
        ComponentId::MiniChartCard => Some(SurfaceSlot::MiniChartCard),
        ComponentId::MobilePreviewFrame => Some(SurfaceSlot::MobilePreviewFrame),
        ComponentId::PropertyList => Some(SurfaceSlot::PropertyList),
        ComponentId::StatusTimeline => Some(SurfaceSlot::StatusTimeline),
        ComponentId::Tour => Some(SurfaceSlot::Tour),
        _ => None,
    }
}

fn slot_for_input(id: ComponentId) -> Option<SurfaceSlot> {
    match id {
        ComponentId::Input => Some(SurfaceSlot::Input),
        ComponentId::Textarea => Some(SurfaceSlot::Textarea),
        ComponentId::InputNumber => Some(SurfaceSlot::InputNumber),
        ComponentId::Checkbox => Some(SurfaceSlot::Checkbox),
        ComponentId::Radio => Some(SurfaceSlot::Radio),
        ComponentId::Switch => Some(SurfaceSlot::Switch),
        ComponentId::Slider => Some(SurfaceSlot::Slider),
        ComponentId::Select => Some(SurfaceSlot::Select),
        _ => None,
    }
}

fn new_surface_widget_name(id: ComponentId) -> Option<&'static str> {
    CodeBlockSurfaceCatalog::widget_name(id)
        .or_else(|| CommandPaletteSurfaceCatalog::widget_name(id))
        .or_else(|| DataToolbarSurfaceCatalog::widget_name(id))
        .or_else(|| FilterPanelSurfaceCatalog::widget_name(id))
        .or_else(|| MarkdownEditorSurfaceCatalog::widget_name(id))
        .or_else(|| TableSurfaceCatalog::widget_name(id))
        .or_else(|| MermaidSvgViewerSurfaceCatalog::widget_name(id))
        .or_else(|| MetricCardSurfaceCatalog::widget_name(id))
        .or_else(|| MiniChartCardSurfaceCatalog::widget_name(id))
        .or_else(|| MobilePreviewFrameSurfaceCatalog::widget_name(id))
        .or_else(|| PropertyListSurfaceCatalog::widget_name(id))
        .or_else(|| StatusTimelineSurfaceCatalog::widget_name(id))
        .or_else(|| TourSurfaceCatalog::widget_name(id))
}

fn slot_for_chart(id: ComponentId) -> Option<SurfaceSlot> {
    match id {
        ComponentId::LineChart => Some(SurfaceSlot::LineChart),
        ComponentId::AreaChart => Some(SurfaceSlot::AreaChart),
        ComponentId::BarChart => Some(SurfaceSlot::BarChart),
        ComponentId::ScatterChart => Some(SurfaceSlot::ScatterChart),
        ComponentId::Sparkline => Some(SurfaceSlot::Sparkline),
        ComponentId::FunnelChart => Some(SurfaceSlot::FunnelChart),
        ComponentId::GaugeChart => Some(SurfaceSlot::GaugeChart),
        ComponentId::Heatmap => Some(SurfaceSlot::Heatmap),
        ComponentId::MindMap => Some(SurfaceSlot::MindMap),
        ComponentId::OrganizationChart => Some(SurfaceSlot::OrganizationChart),
        ComponentId::PieChart => Some(SurfaceSlot::PieChart),
        ComponentId::RadarChart => Some(SurfaceSlot::RadarChart),
        ComponentId::SankeyChart => Some(SurfaceSlot::SankeyChart),
        ComponentId::Treemap => Some(SurfaceSlot::Treemap),
        ComponentId::WordCloud => Some(SurfaceSlot::WordCloud),
        _ => None,
    }
}

fn slot_for_any(id: ComponentId) -> Option<SurfaceSlot> {
    AtomicSurfaceCatalog::component(id)
        .map(slot_for_atomic)
        .or_else(|| slot_for_feedback(id))
        .or_else(|| slot_for_layout(id))
        .or_else(|| slot_for_current_batch(id))
        .or_else(|| slot_for_display(id))
        .or_else(|| slot_for_b1(id))
        .or_else(|| slot_for_overlay(id))
        .or_else(|| slot_for_new_surfaces(id))
        .or_else(|| slot_for_input(id))
        .or_else(|| slot_for_chart(id))
        .or_else(|| match id {
            ComponentId::AutoComplete => Some(SurfaceSlot::AutoComplete),
            ComponentId::Mentions => Some(SurfaceSlot::Mentions),
            ComponentId::ColorPicker => Some(SurfaceSlot::ColorPicker),
            ComponentId::DatePicker => Some(SurfaceSlot::DatePicker),
            ComponentId::TimePicker => Some(SurfaceSlot::TimePicker),
            ComponentId::Cascader => Some(SurfaceSlot::Cascader),
            ComponentId::TreeSelect => Some(SurfaceSlot::TreeSelect),
            ComponentId::Transfer => Some(SurfaceSlot::Transfer),
            ComponentId::Upload => Some(SurfaceSlot::Upload),
            ComponentId::Form => Some(SurfaceSlot::Form),
            _ => None,
        })
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) struct ComponentDetailMountAck {
    pub component: ComponentId,
    pub generation: u64,
    pub slot: SurfaceSlot,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct SurfaceMountRequest {
    component: ComponentId,
    generation: u64,
    slot: SurfaceSlot,
}

#[derive(Clone, Copy)]
enum ToolbarFixture {
    Standard,
    Compact,
    Disabled,
}

fn toolbar_fixture_config(fixture: ToolbarFixture) -> ToolbarConfig {
    let labels = [
        "Add",
        "Search",
        "Inspect",
        "Approve",
        "Review selected changes",
        "Members",
        "Confirm",
        "Recalculate selected workspace summaries without opening an external resource",
        "Archive",
        "Export",
        "Settings",
        "Help",
    ];
    let count = if matches!(fixture, ToolbarFixture::Standard) {
        3
    } else {
        labels.len()
    };
    let mut items: Vec<_> = labels
        .iter()
        .take(count)
        .enumerate()
        .map(|(index, label)| {
            ToolbarItem::new(
                index as u32 + 5,
                match index % 4 {
                    0 => AtomicIcon::Add,
                    1 => AtomicIcon::Search,
                    2 => AtomicIcon::Info,
                    _ => AtomicIcon::Check,
                },
                label,
            )
        })
        .collect();
    if count > 3 {
        items[1].enabled = false;
        items[8].enabled = false;
    }
    ToolbarConfig {
        items,
        enabled: !matches!(fixture, ToolbarFixture::Disabled),
    }
}

fn draw_geometry_is_valid(area_valid: bool, width: f64, height: f64) -> bool {
    area_valid && width.is_finite() && height.is_finite() && width > 0.0 && height > 0.0
}

fn mount_ack_matches(
    request: Option<SurfaceMountRequest>,
    ack: Option<ComponentDetailMountAck>,
) -> bool {
    request.is_some_and(|request| {
        ack.is_some_and(|ack| {
            request.component == ack.component
                && request.generation == ack.generation
                && request.slot == ack.slot
        })
    })
}

/// Gallery detail host for component-owned Makepad surfaces.
///
/// Each slot contains one concrete widget type and is independently hidden or
/// shown by `ComponentId`. Unsupported components keep the slots hidden and
/// expose a blocked status instead of falling back to metadata or a preview.
#[derive(Script, ScriptHook, Widget)]
pub struct ComponentDetail {
    #[deref]
    view: View,
    #[rust]
    selected: Option<ComponentId>,
    #[rust]
    selected_generation: u64,
    #[rust]
    selected_slot: Option<SurfaceSlot>,
    #[rust]
    mount_ack: Option<ComponentDetailMountAck>,
}

impl ComponentDetail {
    fn apply_toolbar_fixture(&mut self, cx: &mut Cx, fixture: ToolbarFixture) {
        if let Some(mut frame) = self.view.view(cx, ids!(toolbar_frame)).borrow_mut() {
            frame.walk.width = if matches!(fixture, ToolbarFixture::Standard) {
                Size::fill()
            } else {
                Size::Fixed(240.0)
            };
        }
        if let Some(mut widget) = self
            .view
            .widget(cx, ids!(toolbar_surface))
            .borrow_mut::<TesseraToolbar>()
        {
            let _ = widget.set_config(cx, toolbar_fixture_config(fixture));
        }
        self.view.redraw(cx);
    }

    fn slot_ref(&self, cx: &Cx, slot: SurfaceSlot) -> WidgetRef {
        match slot {
            SurfaceSlot::Button => self.view.widget(cx, ids!(button_slot)),
            SurfaceSlot::FloatButton => self.view.widget(cx, ids!(float_button_slot)),
            SurfaceSlot::Icon => self.view.widget(cx, ids!(icon_slot)),
            SurfaceSlot::Typography => self.view.widget(cx, ids!(typography_slot)),
            SurfaceSlot::IconButton => self.view.widget(cx, ids!(icon_button_slot)),
            SurfaceSlot::Toolbar => self.view.widget(cx, ids!(toolbar_slot)),
            SurfaceSlot::Divider => self.view.widget(cx, ids!(divider_slot)),
            SurfaceSlot::Space => self.view.widget(cx, ids!(space_slot)),
            SurfaceSlot::Watermark => self.view.widget(cx, ids!(watermark_slot)),
            SurfaceSlot::Badge => self.view.widget(cx, ids!(badge_slot)),
            SurfaceSlot::Tag => self.view.widget(cx, ids!(tag_slot)),
            SurfaceSlot::Avatar => self.view.widget(cx, ids!(avatar_slot)),
            SurfaceSlot::LineChart => self.view.widget(cx, ids!(line_chart_slot)),
            SurfaceSlot::AreaChart => self.view.widget(cx, ids!(area_chart_slot)),
            SurfaceSlot::BarChart => self.view.widget(cx, ids!(bar_chart_slot)),
            SurfaceSlot::ScatterChart => self.view.widget(cx, ids!(scatter_chart_slot)),
            SurfaceSlot::Sparkline => self.view.widget(cx, ids!(sparkline_slot)),
            SurfaceSlot::FunnelChart => self.view.widget(cx, ids!(funnel_chart_slot)),
            SurfaceSlot::GaugeChart => self.view.widget(cx, ids!(gauge_chart_slot)),
            SurfaceSlot::Heatmap => self.view.widget(cx, ids!(heatmap_slot)),
            SurfaceSlot::MindMap => self.view.widget(cx, ids!(mind_map_slot)),
            SurfaceSlot::OrganizationChart => self.view.widget(cx, ids!(organization_chart_slot)),
            SurfaceSlot::PieChart => self.view.widget(cx, ids!(pie_chart_slot)),
            SurfaceSlot::RadarChart => self.view.widget(cx, ids!(radar_chart_slot)),
            SurfaceSlot::SankeyChart => self.view.widget(cx, ids!(sankey_chart_slot)),
            SurfaceSlot::Treemap => self.view.widget(cx, ids!(treemap_slot)),
            SurfaceSlot::WordCloud => self.view.widget(cx, ids!(word_cloud_slot)),
            SurfaceSlot::Input => self.view.widget(cx, ids!(input_slot)),
            SurfaceSlot::Textarea => self.view.widget(cx, ids!(textarea_slot)),
            SurfaceSlot::InputNumber => self.view.widget(cx, ids!(input_number_slot)),
            SurfaceSlot::Checkbox => self.view.widget(cx, ids!(checkbox_slot)),
            SurfaceSlot::Radio => self.view.widget(cx, ids!(radio_slot)),
            SurfaceSlot::Switch => self.view.widget(cx, ids!(switch_slot)),
            SurfaceSlot::Slider => self.view.widget(cx, ids!(slider_slot)),
            SurfaceSlot::Select => self.view.widget(cx, ids!(select_slot)),
            SurfaceSlot::AutoComplete => self
                .view
                .widget(cx, ids!(input_composite_auto_complete_slot)),
            SurfaceSlot::Mentions => self.view.widget(cx, ids!(input_composite_mentions_slot)),
            SurfaceSlot::ColorPicker => self
                .view
                .widget(cx, ids!(input_composite_color_picker_slot)),
            SurfaceSlot::DatePicker => self.view.widget(cx, ids!(input_composite_date_picker_slot)),
            SurfaceSlot::TimePicker => self.view.widget(cx, ids!(input_composite_time_picker_slot)),
            SurfaceSlot::Cascader => self.view.widget(cx, ids!(input_advanced_cascader_slot)),
            SurfaceSlot::TreeSelect => self.view.widget(cx, ids!(input_advanced_tree_select_slot)),
            SurfaceSlot::Transfer => self.view.widget(cx, ids!(input_advanced_transfer_slot)),
            SurfaceSlot::Upload => self.view.widget(cx, ids!(input_advanced_upload_slot)),
            SurfaceSlot::Form => self.view.widget(cx, ids!(input_advanced_form_slot)),
            SurfaceSlot::Calendar => self.view.widget(cx, ids!(calendar_slot)),
            SurfaceSlot::Collapse => self.view.widget(cx, ids!(collapse_slot)),
            SurfaceSlot::Descriptions => self.view.widget(cx, ids!(descriptions_slot)),
            SurfaceSlot::Image => self.view.widget(cx, ids!(image_slot)),
            SurfaceSlot::List => self.view.widget(cx, ids!(list_slot)),
            SurfaceSlot::Menu => self.view.widget(cx, ids!(menu_slot)),
            SurfaceSlot::QrCode => self.view.widget(cx, ids!(qr_code_slot)),
            SurfaceSlot::Rate => self.view.widget(cx, ids!(rate_slot)),
            SurfaceSlot::Masonry => self.view.widget(cx, ids!(masonry_slot)),
            SurfaceSlot::Breadcrumb => self.view.widget(cx, ids!(breadcrumb_slot)),
            SurfaceSlot::Pagination => self.view.widget(cx, ids!(pagination_slot)),
            SurfaceSlot::Steps => self.view.widget(cx, ids!(steps_slot)),
            SurfaceSlot::Skeleton => self.view.widget(cx, ids!(skeleton_slot)),
            SurfaceSlot::Spin => self.view.widget(cx, ids!(spin_slot)),
            SurfaceSlot::Statistic => self.view.widget(cx, ids!(statistic_slot)),
            SurfaceSlot::Timeline => self.view.widget(cx, ids!(timeline_slot)),
            SurfaceSlot::Alert => self.view.widget(cx, ids!(alert_slot)),
            SurfaceSlot::Empty => self.view.widget(cx, ids!(empty_slot)),
            SurfaceSlot::Progress => self.view.widget(cx, ids!(progress_slot)),
            SurfaceSlot::Result => self.view.widget(cx, ids!(result_slot)),
            SurfaceSlot::Affix => self.view.widget(cx, ids!(affix_slot)),
            SurfaceSlot::Anchor => self.view.widget(cx, ids!(anchor_slot)),
            SurfaceSlot::Card => self.view.widget(cx, ids!(card_slot)),
            SurfaceSlot::Flex => self.view.widget(cx, ids!(flex_slot)),
            SurfaceSlot::Grid => self.view.widget(cx, ids!(grid_slot)),
            SurfaceSlot::Layout => self.view.widget(cx, ids!(layout_slot)),
            SurfaceSlot::Segmented => self.view.widget(cx, ids!(segmented_slot)),
            SurfaceSlot::Tabs => self.view.widget(cx, ids!(tabs_slot)),
            SurfaceSlot::Tree => self.view.widget(cx, ids!(tree_slot)),
            SurfaceSlot::Carousel => self.view.widget(cx, ids!(carousel_slot)),
            SurfaceSlot::Splitter => self.view.widget(cx, ids!(splitter_slot)),
            SurfaceSlot::BorderBeam => self.view.widget(cx, ids!(border_beam_slot)),
            SurfaceSlot::App => self.view.widget(cx, ids!(app_slot)),
            SurfaceSlot::ConfigProvider => self.view.widget(cx, ids!(config_provider_slot)),
            SurfaceSlot::Util => self.view.widget(cx, ids!(util_slot)),
            SurfaceSlot::Drawer => self.view.widget(cx, ids!(drawer_slot)),
            SurfaceSlot::Dropdown => self.view.widget(cx, ids!(dropdown_slot)),
            SurfaceSlot::Message => self.view.widget(cx, ids!(message_slot)),
            SurfaceSlot::Modal => self.view.widget(cx, ids!(modal_slot)),
            SurfaceSlot::Notification => self.view.widget(cx, ids!(notification_slot)),
            SurfaceSlot::Popconfirm => self.view.widget(cx, ids!(popconfirm_slot)),
            SurfaceSlot::Popover => self.view.widget(cx, ids!(popover_slot)),
            SurfaceSlot::Tooltip => self.view.widget(cx, ids!(tooltip_slot)),
            SurfaceSlot::CodeBlock => self.view.widget(cx, ids!(code_block_slot)),
            SurfaceSlot::CommandPalette => self.view.widget(cx, ids!(command_palette_slot)),
            SurfaceSlot::DataToolbar => self.view.widget(cx, ids!(data_toolbar_slot)),
            SurfaceSlot::FilterPanel => self.view.widget(cx, ids!(filter_panel_slot)),
            SurfaceSlot::MarkdownEditor => self.view.widget(cx, ids!(markdown_editor_slot)),
            SurfaceSlot::Table => self.view.widget(cx, ids!(table_slot)),
            SurfaceSlot::MermaidSvgViewer => self.view.widget(cx, ids!(mermaid_svg_viewer_slot)),
            SurfaceSlot::MetricCard => self.view.widget(cx, ids!(metric_card_slot)),
            SurfaceSlot::MiniChartCard => self.view.widget(cx, ids!(mini_chart_card_slot)),
            SurfaceSlot::MobilePreviewFrame => {
                self.view.widget(cx, ids!(mobile_preview_frame_slot))
            }
            SurfaceSlot::PropertyList => self.view.widget(cx, ids!(property_list_slot)),
            SurfaceSlot::StatusTimeline => self.view.widget(cx, ids!(status_timeline_slot)),
            SurfaceSlot::Tour => self.view.widget(cx, ids!(tour_slot)),
        }
    }

    fn hide_all(&self, cx: &mut Cx) {
        for slot in SurfaceSlot::ALL {
            tessera_makepad::foundation::activity::set_activity_visibility(
                &self.slot_ref(cx, slot),
                cx,
                false,
            );
        }
    }

    fn set_status(&self, cx: &mut Cx, text: &str) {
        self.view.label(cx, ids!(surface_status)).set_text(cx, text);
    }

    fn apply_atomic_palette(&self, cx: &mut Cx, component: AtomicComponent, theme: ThemeMode) {
        let palette = match theme {
            ThemeMode::Light => AtomicPalette::light(),
            ThemeMode::Dark => AtomicPalette::dark(),
        };
        let slot = self.slot_ref(cx, slot_for_atomic(component));

        match component {
            AtomicComponent::Button => {
                if let Some(mut widget) = slot
                    .widget(cx, ids!(button_surface))
                    .borrow_mut::<TesseraButton>()
                {
                    widget.set_palette(cx, palette);
                }
            }
            AtomicComponent::FloatButton => {
                if let Some(mut widget) = slot
                    .widget(cx, ids!(float_button_surface))
                    .borrow_mut::<TesseraFloatButton>()
                {
                    widget.set_palette(cx, palette);
                }
            }
            AtomicComponent::Icon => {
                if let Some(mut widget) = slot
                    .widget(cx, ids!(icon_surface))
                    .borrow_mut::<TesseraIcon>()
                {
                    widget.set_palette(cx, palette);
                }
            }
            AtomicComponent::Typography => {
                if let Some(mut widget) = slot
                    .widget(cx, ids!(typography_surface))
                    .borrow_mut::<TesseraTypography>()
                {
                    widget.set_palette(cx, palette);
                }
            }
            AtomicComponent::IconButton => {
                if let Some(mut widget) = slot
                    .widget(cx, ids!(icon_button_surface))
                    .borrow_mut::<TesseraIconButton>()
                {
                    widget.set_palette(cx, palette);
                }
            }
            AtomicComponent::Toolbar => {
                if let Some(mut widget) = slot
                    .widget(cx, ids!(toolbar_surface))
                    .borrow_mut::<TesseraToolbar>()
                {
                    widget.set_palette(cx, palette);
                }
            }
            AtomicComponent::Divider => {
                if let Some(mut widget) = slot
                    .widget(cx, ids!(divider_surface))
                    .borrow_mut::<TesseraDivider>()
                {
                    widget.set_palette(cx, palette);
                }
            }
            AtomicComponent::Space => {}
            AtomicComponent::Watermark => {
                if let Some(mut widget) = slot
                    .widget(cx, ids!(watermark_surface))
                    .borrow_mut::<TesseraWatermark>()
                {
                    widget.set_palette(cx, palette);
                }
            }
            AtomicComponent::Badge => {
                if let Some(mut widget) = slot
                    .widget(cx, ids!(badge_surface))
                    .borrow_mut::<TesseraBadge>()
                {
                    widget.set_palette(cx, palette);
                }
            }
            AtomicComponent::Tag => {
                if let Some(mut widget) = slot
                    .widget(cx, ids!(tag_surface))
                    .borrow_mut::<TesseraTag>()
                {
                    widget.set_palette(cx, palette);
                }
            }
            AtomicComponent::Avatar => {
                if let Some(mut widget) = slot
                    .widget(cx, ids!(avatar_surface))
                    .borrow_mut::<TesseraAvatar>()
                {
                    widget.set_palette(cx, palette);
                }
            }
        }
    }

    /// Reprojects the host theme into the currently selected atomic widget.
    pub fn apply_theme(&mut self, cx: &mut Cx, theme: ThemeMode) {
        if let Some(component) = self.selected.and_then(AtomicSurfaceCatalog::component) {
            self.apply_atomic_palette(cx, component, theme);
            self.view.redraw(cx);
        }
    }

    /// Selects and resets the concrete surface for a route.
    pub fn select(&mut self, cx: &mut Cx, id: ComponentId, theme: ThemeMode, generation: u64) {
        self.selected = Some(id);
        self.selected_generation = generation;
        self.selected_slot = slot_for_any(id);
        self.mount_ack = None;
        self.hide_all(cx);

        if let Some(component) = AtomicSurfaceCatalog::component(id) {
            let slot = slot_for_atomic(component);
            let slot_ref = self.slot_ref(cx, slot);
            tessera_makepad::foundation::activity::set_activity_visibility(&slot_ref, cx, true);
            self.apply_atomic_palette(cx, component, theme);
            match component {
                AtomicComponent::Button => {
                    if let Some(mut widget) = slot_ref
                        .widget(cx, ids!(button_surface))
                        .borrow_mut::<TesseraButton>()
                    {
                        widget.set_config(cx, ButtonConfig::new("Run native action", 1));
                    }
                }
                AtomicComponent::FloatButton => {
                    if let Some(mut widget) = slot_ref
                        .widget(cx, ids!(float_button_surface))
                        .borrow_mut::<TesseraFloatButton>()
                    {
                        widget
                            .set_config(cx, FloatButtonConfig::new(AtomicIcon::Add, "Add item", 2));
                    }
                }
                AtomicComponent::Typography => {
                    if let Some(mut widget) = slot_ref
                        .widget(cx, ids!(typography_surface))
                        .borrow_mut::<TesseraTypography>()
                    {
                        let mut config =
                            TypographyConfig::new("Copy native typography", TypographyRole::Link);
                        config.action = TypographyAction::Copy;
                        config.command = 3;
                        widget.set_config(cx, config);
                    }
                }
                AtomicComponent::IconButton => {
                    if let Some(mut widget) = slot_ref
                        .widget(cx, ids!(icon_button_surface))
                        .borrow_mut::<TesseraIconButton>()
                    {
                        if let Ok(config) =
                            IconButtonConfig::new(AtomicIcon::More, "More actions", 4)
                        {
                            widget.set_config(cx, config);
                        }
                    }
                }
                AtomicComponent::Toolbar => {
                    self.apply_toolbar_fixture(cx, ToolbarFixture::Standard);
                }
                AtomicComponent::Tag => {
                    if let Some(mut widget) = slot_ref
                        .widget(cx, ids!(tag_surface))
                        .borrow_mut::<TesseraTag>()
                    {
                        let mut config = TagConfig::new("Review", 8);
                        config.removable = true;
                        widget.set_config(cx, config);
                    }
                }
                AtomicComponent::Avatar => {
                    if let Some(mut widget) = slot_ref
                        .widget(cx, ids!(avatar_surface))
                        .borrow_mut::<TesseraAvatar>()
                    {
                        let mut config = AvatarConfig::unknown("Open profile");
                        config.command = Some(9);
                        widget.set_config(cx, config);
                    }
                }
                AtomicComponent::Icon
                | AtomicComponent::Divider
                | AtomicComponent::Space
                | AtomicComponent::Watermark
                | AtomicComponent::Badge => {}
            }
            self.set_status(
                cx,
                &format!("Native surface: {} / route {}", slot.widget_name(), id),
            );
        } else if InputCompositeSurfaceCatalog::contains(id) {
            let slot = match id {
                ComponentId::AutoComplete => SurfaceSlot::AutoComplete,
                ComponentId::Mentions => SurfaceSlot::Mentions,
                ComponentId::ColorPicker => SurfaceSlot::ColorPicker,
                ComponentId::DatePicker => SurfaceSlot::DatePicker,
                ComponentId::TimePicker => SurfaceSlot::TimePicker,
                _ => unreachable!("input composite catalog returned a foreign component"),
            };
            tessera_makepad::foundation::activity::set_activity_visibility(
                &self.slot_ref(cx, slot),
                cx,
                true,
            );
            match id {
                ComponentId::AutoComplete => {
                    if let Some(mut widget) = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(auto_complete_surface))
                        .borrow_mut::<TesseraAutoComplete>()
                    {
                        widget.reset(cx);
                    }
                }
                ComponentId::Mentions => {
                    if let Some(mut widget) = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(mentions_surface))
                        .borrow_mut::<TesseraMentions>()
                    {
                        widget.reset(cx);
                    }
                }
                ComponentId::ColorPicker => {
                    if let Some(mut widget) = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(color_picker_surface))
                        .borrow_mut::<TesseraColorPicker>()
                    {
                        widget.reset(cx);
                    }
                }
                ComponentId::DatePicker => {
                    if let Some(mut widget) = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(date_picker_surface))
                        .borrow_mut::<TesseraDatePicker>()
                    {
                        widget.reset(cx);
                    }
                }
                ComponentId::TimePicker => {
                    if let Some(mut widget) = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(time_picker_surface))
                        .borrow_mut::<TesseraTimePicker>()
                    {
                        widget.reset(cx);
                    }
                }
                _ => unreachable!("input composite catalog returned a foreign component"),
            }
            self.set_status(
                cx,
                &format!(
                    "Native surface: {} / route {}",
                    InputCompositeSurfaceCatalog::widget_name(id)
                        .expect("input composite has a widget name"),
                    id
                ),
            );
        } else if AdvancedInputSurfaceCatalog::contains(id) {
            let slot = match id {
                ComponentId::Cascader => SurfaceSlot::Cascader,
                ComponentId::TreeSelect => SurfaceSlot::TreeSelect,
                ComponentId::Transfer => SurfaceSlot::Transfer,
                ComponentId::Upload => SurfaceSlot::Upload,
                ComponentId::Form => SurfaceSlot::Form,
                _ => unreachable!("advanced input catalog returned a foreign component"),
            };
            tessera_makepad::foundation::activity::set_activity_visibility(
                &self.slot_ref(cx, slot),
                cx,
                true,
            );
            match id {
                ComponentId::Cascader => {
                    if let Some(mut widget) = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(cascader_surface))
                        .borrow_mut::<TesseraCascader>()
                    {
                        widget.reset(cx);
                    }
                }
                ComponentId::TreeSelect => {
                    if let Some(mut widget) = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(tree_select_surface))
                        .borrow_mut::<TesseraTreeSelect>()
                    {
                        widget.reset(cx);
                    }
                }
                ComponentId::Transfer => {
                    if let Some(mut widget) = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(transfer_surface))
                        .borrow_mut::<TesseraTransfer>()
                    {
                        widget.reset(cx);
                    }
                }
                ComponentId::Upload => {
                    if let Some(mut widget) = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(upload_surface))
                        .borrow_mut::<TesseraUpload>()
                    {
                        widget.reset(cx);
                    }
                }
                ComponentId::Form => {
                    if let Some(mut widget) = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(form_surface))
                        .borrow_mut::<TesseraForm>()
                    {
                        widget.reset(cx);
                    }
                }
                _ => unreachable!("advanced input catalog returned a foreign component"),
            }
            self.set_status(
                cx,
                &format!(
                    "Native surface: {} / route {}",
                    AdvancedInputSurfaceCatalog::widget_name(id)
                        .expect("advanced input has a widget name"),
                    id
                ),
            );
        } else if let Some(slot) = slot_for_input(id) {
            tessera_makepad::foundation::activity::set_activity_visibility(
                &self.slot_ref(cx, slot),
                cx,
                true,
            );
            match id {
                ComponentId::Input => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(input_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraInput>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Textarea => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(textarea_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraTextarea>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::InputNumber => {
                    let widget = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(input_number_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraInputNumber>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Checkbox => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(checkbox_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraCheckbox>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Radio => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(radio_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraRadio>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Switch => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(switch_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraSwitch>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Slider => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(slider_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraSlider>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Select => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(select_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraSelect>() {
                        widget.reset(cx);
                    }
                }
                _ => unreachable!("input slots only resolve foundational input routes"),
            }
            let widget_name =
                InputWidgetCatalog::widget_name(id).expect("input slot has an exact native widget");
            self.set_status(cx, &format!("Native surface: {widget_name} / route {id}"));
        } else if let Some(slot) = slot_for_display(id) {
            tessera_makepad::foundation::activity::set_activity_visibility(
                &self.slot_ref(cx, slot),
                cx,
                true,
            );
            match id {
                ComponentId::Calendar => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(calendar_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraCalendar>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Collapse => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(collapse_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraCollapse>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Descriptions => {
                    let widget = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(descriptions_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraDescriptions>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Image => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(image_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraImage>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::List => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(list_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraList>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Menu => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(menu_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraMenu>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::QrCode => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(qr_code_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraQrCode>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Rate => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(rate_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraRate>() {
                        widget.reset(cx);
                    }
                }
                _ => unreachable!("display slots only resolve display component routes"),
            }
            let widget_name =
                display_widget_name(id).expect("display slot has an exact native widget");
            self.set_status(cx, &format!("Native surface: {widget_name} / route {id}"));
        } else if let Some(slot) = slot_for_b1(id) {
            tessera_makepad::foundation::activity::set_activity_visibility(
                &self.slot_ref(cx, slot),
                cx,
                true,
            );
            match id {
                ComponentId::Masonry => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(masonry_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraMasonry>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Breadcrumb => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(breadcrumb_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraBreadcrumb>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Pagination => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(pagination_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraPagination>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Steps => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(steps_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraSteps>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Skeleton => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(skeleton_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraSkeleton>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Spin => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(spin_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraSpin>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Statistic => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(statistic_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraStatistic>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Timeline => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(timeline_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraTimeline>() {
                        widget.reset(cx);
                    }
                }
                _ => unreachable!("B1 slots only resolve B1 component routes"),
            }
            let widget_name = match id {
                ComponentId::Masonry => MasonrySurfaceCatalog::widget_name(id),
                ComponentId::Breadcrumb => BreadcrumbSurfaceCatalog::widget_name(id),
                ComponentId::Pagination => PaginationSurfaceCatalog::widget_name(id),
                ComponentId::Steps => StepsSurfaceCatalog::widget_name(id),
                ComponentId::Skeleton => SkeletonSurfaceCatalog::widget_name(id),
                ComponentId::Spin => SpinSurfaceCatalog::widget_name(id),
                ComponentId::Statistic => StatisticSurfaceCatalog::widget_name(id),
                ComponentId::Timeline => TimelineSurfaceCatalog::widget_name(id),
                _ => None,
            }
            .expect("B1 slot has an exact native widget");
            self.set_status(cx, &format!("Native surface: {widget_name} / route {id}"));
        } else if let Some(slot) = slot_for_feedback(id) {
            tessera_makepad::foundation::activity::set_activity_visibility(
                &self.slot_ref(cx, slot),
                cx,
                true,
            );
            match id {
                ComponentId::Alert => {
                    let alert = self.slot_ref(cx, slot).widget(cx, ids!(alert_surface));
                    if let Some(mut alert) = alert.borrow_mut::<TesseraAlert>() {
                        alert.reset(cx);
                    }
                }
                ComponentId::Empty => {
                    let empty = self.slot_ref(cx, slot).widget(cx, ids!(empty_surface));
                    if let Some(mut empty) = empty.borrow_mut::<TesseraEmpty>() {
                        empty.reset(cx);
                    }
                }
                ComponentId::Progress => {
                    let progress = self.slot_ref(cx, slot).widget(cx, ids!(progress_surface));
                    if let Some(mut progress) = progress.borrow_mut::<TesseraProgress>() {
                        progress.reset(cx);
                    }
                }
                ComponentId::Result => {
                    let result = self.slot_ref(cx, slot).widget(cx, ids!(result_surface));
                    if let Some(mut result) = result.borrow_mut::<TesseraResult>() {
                        result.reset(cx);
                    }
                }
                _ => unreachable!("feedback slots only resolve feedback component routes"),
            }
            let widget_name = FeedbackSurfaceCatalog::widget_name(id)
                .expect("feedback slot has an exact native widget");
            self.set_status(cx, &format!("Native surface: {widget_name} / route {id}"));
        } else if let Some(slot) = slot_for_layout(id) {
            tessera_makepad::foundation::activity::set_activity_visibility(
                &self.slot_ref(cx, slot),
                cx,
                true,
            );
            match id {
                ComponentId::Affix => {
                    let affix = self.slot_ref(cx, slot).widget(cx, ids!(affix_surface));
                    if let Some(mut affix) = affix.borrow_mut::<TesseraAffix>() {
                        affix.reset(cx);
                    }
                }
                ComponentId::Anchor => {
                    let anchor = self.slot_ref(cx, slot).widget(cx, ids!(anchor_surface));
                    if let Some(mut anchor) = anchor.borrow_mut::<TesseraAnchor>() {
                        anchor.reset(cx);
                    }
                }
                ComponentId::Card => {
                    let card = self.slot_ref(cx, slot).widget(cx, ids!(card_surface));
                    if let Some(mut card) = card.borrow_mut::<TesseraCard>() {
                        card.reset(cx);
                    }
                }
                ComponentId::Flex => {
                    let flex = self.slot_ref(cx, slot).widget(cx, ids!(flex_surface));
                    if let Some(mut flex) = flex.borrow_mut::<TesseraFlex>() {
                        flex.reset(cx);
                    }
                }
                ComponentId::Grid => {
                    let grid = self.slot_ref(cx, slot).widget(cx, ids!(grid_surface));
                    if let Some(mut grid) = grid.borrow_mut::<TesseraGrid>() {
                        grid.reset(cx);
                    }
                }
                ComponentId::Layout => {
                    let layout = self.slot_ref(cx, slot).widget(cx, ids!(layout_surface));
                    if let Some(mut layout) = layout.borrow_mut::<TesseraLayout>() {
                        layout.reset(cx);
                    }
                }
                _ => unreachable!("layout slots only resolve layout component routes"),
            }
            let widget_name = LayoutSurfaceCatalog::widget_name(id)
                .expect("layout slot has an exact native widget");
            self.set_status(cx, &format!("Native surface: {widget_name} / route {id}"));
        } else if let Some(slot) = slot_for_current_batch(id) {
            tessera_makepad::foundation::activity::set_activity_visibility(
                &self.slot_ref(cx, slot),
                cx,
                true,
            );
            match id {
                ComponentId::Segmented => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(segmented_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraSegmented>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Tabs => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(tabs_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraTabs>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Tree => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(tree_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraTree>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Carousel => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(carousel_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraCarousel>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Splitter => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(splitter_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraSplitter>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::BorderBeam => {
                    let widget = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(border_beam_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraBorderBeam>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::App => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(app_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraApp>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::ConfigProvider => {
                    let widget = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(config_provider_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraConfigProvider>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Util => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(util_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraUtil>() {
                        widget.reset(cx);
                    }
                }
                _ => {
                    unreachable!("current batch slots only resolve current batch component routes")
                }
            }
            let widget_name = current_batch_widget_name(id)
                .expect("current batch slot has an exact native widget");
            self.set_status(cx, &format!("Native surface: {widget_name} / route {id}"));
        } else if let Some(slot) = slot_for_overlay(id) {
            tessera_makepad::foundation::activity::set_activity_visibility(
                &self.slot_ref(cx, slot),
                cx,
                true,
            );
            match id {
                ComponentId::Drawer => {
                    let drawer = self.slot_ref(cx, slot).widget(cx, ids!(drawer_surface));
                    if let Some(mut drawer) = drawer.borrow_mut::<TesseraDrawer>() {
                        drawer.reset(cx);
                    }
                }
                ComponentId::Dropdown => {
                    let dropdown = self.slot_ref(cx, slot).widget(cx, ids!(dropdown_surface));
                    if let Some(mut dropdown) = dropdown.borrow_mut::<TesseraDropdown>() {
                        dropdown.reset(cx);
                    }
                }
                ComponentId::Message => {
                    let message = self.slot_ref(cx, slot).widget(cx, ids!(message_surface));
                    if let Some(mut message) = message.borrow_mut::<TesseraMessage>() {
                        message.reset(cx);
                    }
                }
                ComponentId::Modal => {
                    let modal = self.slot_ref(cx, slot).widget(cx, ids!(modal_surface));
                    if let Some(mut modal) = modal.borrow_mut::<TesseraModal>() {
                        modal.reset(cx);
                    }
                }
                ComponentId::Notification => {
                    let notification = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(notification_surface));
                    if let Some(mut notification) = notification.borrow_mut::<TesseraNotification>()
                    {
                        notification.reset(cx);
                    }
                }
                ComponentId::Popconfirm => {
                    let popconfirm = self.slot_ref(cx, slot).widget(cx, ids!(popconfirm_surface));
                    if let Some(mut popconfirm) = popconfirm.borrow_mut::<TesseraPopconfirm>() {
                        popconfirm.reset(cx);
                    }
                }
                ComponentId::Popover => {
                    let popover = self.slot_ref(cx, slot).widget(cx, ids!(popover_surface));
                    if let Some(mut popover) = popover.borrow_mut::<TesseraPopover>() {
                        popover.reset(cx);
                    }
                }
                ComponentId::Tooltip => {
                    let tooltip = self.slot_ref(cx, slot).widget(cx, ids!(tooltip_surface));
                    if let Some(mut tooltip) = tooltip.borrow_mut::<TesseraTooltip>() {
                        tooltip.reset(cx);
                    }
                }
                _ => unreachable!("overlay slots only resolve overlay component routes"),
            }
            let widget_name =
                overlay_widget_name(id).expect("overlay slot has an exact native widget");
            self.set_status(cx, &format!("Native surface: {widget_name} / route {id}"));
        } else if let Some(slot) = slot_for_new_surfaces(id) {
            tessera_makepad::foundation::activity::set_activity_visibility(
                &self.slot_ref(cx, slot),
                cx,
                true,
            );
            match id {
                ComponentId::CodeBlock => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(code_block_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraCodeBlock>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::CommandPalette => {
                    let widget = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(command_palette_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraCommandPalette>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::DataToolbar => {
                    let widget = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(data_toolbar_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraDataToolbar>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::FilterPanel => {
                    let widget = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(filter_panel_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraFilterPanel>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::MarkdownEditor => {
                    let widget = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(markdown_editor_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraMarkdownEditor>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Table => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(table_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraTable>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::MermaidSvgViewer => {
                    let widget = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(mermaid_svg_viewer_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraMermaidSvgViewer>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::MetricCard => {
                    let widget = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(metric_card_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraMetricCard>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::MiniChartCard => {
                    let widget = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(mini_chart_card_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraMiniChartCard>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::MobilePreviewFrame => {
                    let widget = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(mobile_preview_frame_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraMobilePreviewFrame>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::PropertyList => {
                    let widget = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(property_list_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraPropertyList>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::StatusTimeline => {
                    let widget = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(status_timeline_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraStatusTimeline>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Tour => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(tour_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraTour>() {
                        widget.reset(cx);
                    }
                }
                _ => unreachable!("new surface slots only resolve connected new routes"),
            }
            let widget_name =
                new_surface_widget_name(id).expect("new surface slot has an exact native widget");
            self.set_status(cx, &format!("Native surface: {widget_name} / route {id}"));
        } else if let Some(slot) = slot_for_chart(id) {
            tessera_makepad::foundation::activity::set_activity_visibility(
                &self.slot_ref(cx, slot),
                cx,
                true,
            );
            match id {
                ComponentId::LineChart => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(line_chart_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraLineChart>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::AreaChart => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(area_chart_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraAreaChart>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::BarChart => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(bar_chart_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraBarChart>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::ScatterChart => {
                    let widget = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(scatter_chart_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraScatterChart>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Sparkline => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(sparkline_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraSparkline>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::FunnelChart => {
                    let widget = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(funnel_chart_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraFunnelChart>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::GaugeChart => {
                    let widget = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(gauge_chart_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraGaugeChart>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Heatmap => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(heatmap_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraHeatmap>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::MindMap => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(mind_map_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraMindMap>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::OrganizationChart => {
                    let widget = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(organization_chart_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraOrganizationChart>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::PieChart => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(pie_chart_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraPieChart>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::RadarChart => {
                    let widget = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(radar_chart_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraRadarChart>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::SankeyChart => {
                    let widget = self
                        .slot_ref(cx, slot)
                        .widget(cx, ids!(sankey_chart_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraSankeyChart>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::Treemap => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(treemap_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraTreemap>() {
                        widget.reset(cx);
                    }
                }
                ComponentId::WordCloud => {
                    let widget = self.slot_ref(cx, slot).widget(cx, ids!(word_cloud_surface));
                    if let Some(mut widget) = widget.borrow_mut::<TesseraWordCloud>() {
                        widget.reset(cx);
                    }
                }
                _ => unreachable!("chart slot only resolves component-owned chart routes"),
            }
            let widget_name =
                ChartSurfaceCatalog::widget_name(id).expect("chart slot has exact widget");
            self.set_status(cx, &format!("Native surface: {widget_name} / route {id}"));
        } else {
            self.set_status(
                cx,
                &format!(
                    "Blocked: no component-owned Makepad surface is connected for {}.",
                    id.spec().name
                ),
            );
        }
        self.view.redraw(cx);
    }

    /// Return to the catalog without leaving a stale native widget visible.
    pub fn clear(&mut self, cx: &mut Cx) {
        self.selected = None;
        self.selected_generation = 0;
        self.selected_slot = None;
        self.mount_ack = None;
        self.hide_all(cx);
        self.set_status(cx, "Catalog route active; no component surface mounted.");
        self.view.redraw(cx);
    }

    #[must_use]
    pub const fn selected(&self) -> Option<ComponentId> {
        self.selected
    }

    fn record_post_draw_ack(&mut self, cx: &mut Cx) {
        let Some(component) = self.selected else {
            return;
        };
        let Some(slot) = self.selected_slot else {
            return;
        };
        let slot_ref = self.slot_ref(cx, slot);
        if slot_ref.is_empty() || !slot_ref.visible() {
            return;
        }
        let area = slot_ref.area();
        if !area.is_valid(cx) {
            return;
        }
        let rect = area.rect(cx);
        if !draw_geometry_is_valid(true, rect.size.x, rect.size.y) {
            return;
        }

        let ack = ComponentDetailMountAck {
            component,
            generation: self.selected_generation,
            slot,
        };
        if self.mount_ack != Some(ack) {
            self.mount_ack = Some(ack);
            cx.widget_action(self.widget_uid(), ack);
        }
    }

    /// A mount acknowledgement is accepted only after the selected concrete
    /// slot has completed a draw with a live, non-zero Area for this route.
    #[must_use]
    pub(crate) fn mount_acknowledged(&self, cx: &Cx, ack: ComponentDetailMountAck) -> bool {
        let Some(component) = self.selected else {
            return false;
        };
        let Some(slot) = self.selected_slot else {
            return false;
        };
        let request = SurfaceMountRequest {
            component,
            generation: self.selected_generation,
            slot,
        };
        if !mount_ack_matches(Some(request), Some(ack)) || self.mount_ack != Some(ack) {
            return false;
        }
        let slot_ref = self.slot_ref(cx, slot);
        if slot_ref.is_empty() || !slot_ref.visible() {
            return false;
        }
        let area = slot_ref.area();
        if !area.is_valid(cx) {
            return false;
        }
        let rect = area.rect(cx);
        draw_geometry_is_valid(true, rect.size.x, rect.size.y)
    }
}

fn input_is_route_local(event: &Event) -> bool {
    matches!(
        event,
        Event::KeyDown(_)
            | Event::KeyUp(_)
            | Event::TextInput(_)
            | Event::TextRangeReplace(_)
            | Event::TextCopy(_)
            | Event::TextCut(_)
            | Event::ImeAction(_)
            | Event::SelectionHandleDrag(_)
    )
}

impl Widget for ComponentDetail {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        let draw_step = self.view.draw_walk(cx, scope, walk);
        if draw_step.is_done() {
            self.record_post_draw_ack(cx);
        }
        draw_step
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        if self.selected == Some(ComponentId::Toolbar) && self.view.visible() {
            for (id, fixture) in [
                (ids!(toolbar_standard), ToolbarFixture::Standard),
                (ids!(toolbar_compact), ToolbarFixture::Compact),
                (ids!(toolbar_disabled), ToolbarFixture::Disabled),
            ] {
                let button = self.view.button(cx, id);
                let clicked = matches!(event, Event::Actions(actions) if button.clicked(actions));
                if clicked
                    || tessera_makepad::foundation::input::button_keyboard_activation(
                        &button, cx, event,
                    )
                {
                    self.apply_toolbar_fixture(cx, fixture);
                    break;
                }
            }
        }
        // Makepad's hidden View filter only covers pointer input. Keep text
        // and keyboard dispatch within the active route, while still allowing
        // all slots to receive lifecycle, timer and focus-loss cleanup events.
        if input_is_route_local(event) {
            if let Some(slot) = self.selected_slot {
                let target = self.slot_ref(cx, slot);
                if self.view.visible() && target.visible() {
                    target.handle_event(cx, event, scope);
                }
            }
            return;
        }
        self.view.handle_event(cx, event, scope);
    }
}

#[cfg(test)]
mod tests {
    use super::{
        ComponentDetailMountAck, SurfaceMountRequest, SurfaceSlot, draw_geometry_is_valid,
        input_is_route_local, mount_ack_matches, slot_for_any, slot_for_atomic, slot_for_b1,
        slot_for_chart, slot_for_current_batch, slot_for_display, slot_for_feedback,
        slot_for_input, slot_for_layout, slot_for_new_surfaces, slot_for_overlay,
    };
    use tessera_core::catalog::ComponentId;
    use tessera_makepad::makepad_widgets::{Area, Event, KeyEvent, KeyFocusEvent, TextInputEvent};

    #[test]
    fn hidden_routes_do_not_receive_keyboard_or_text_but_keep_lifecycle_events() {
        assert!(input_is_route_local(&Event::KeyDown(KeyEvent::default())));
        assert!(input_is_route_local(&Event::KeyUp(KeyEvent::default())));
        assert!(input_is_route_local(&Event::TextInput(
            TextInputEvent::default()
        )));
        assert!(!input_is_route_local(&Event::Signal));
        let focus = KeyFocusEvent {
            prev: Area::Empty,
            focus: Area::Empty,
        };
        assert!(!input_is_route_local(&Event::KeyFocusLost(focus.clone())));
        assert!(!input_is_route_local(&Event::KeyFocus(focus)));
    }

    #[test]
    fn example_slots_fit_atomic_controls_without_double_framing_surfaces() {
        use tessera_makepad::makepad_widgets::*;
        for mode in [
            tessera_core::ThemeMode::Light,
            tessera_core::ThemeMode::Dark,
        ] {
            let mut cx = Cx::new(Box::new(|_, _| {}));
            let detail = cx.with_vm(|vm| {
                tessera_makepad::script_mod(vm, mode);
                super::script_mod(vm);
                let value = script_eval!(vm, { mod.widgets.TesseraComponentDetail{} });
                super::ComponentDetail::script_from_value(vm, value)
            });
            for slot in [
                SurfaceSlot::Button,
                SurfaceSlot::FloatButton,
                SurfaceSlot::Icon,
                SurfaceSlot::Typography,
                SurfaceSlot::IconButton,
                SurfaceSlot::Toolbar,
                SurfaceSlot::Divider,
                SurfaceSlot::Space,
                SurfaceSlot::Watermark,
                SurfaceSlot::Badge,
                SurfaceSlot::Tag,
                SurfaceSlot::Avatar,
            ] {
                let widget = detail.slot_ref(&cx, slot);
                let view = widget.borrow::<View>().expect("atomic example slot");
                assert!(matches!(view.walk.height, Size::Fit { .. }), "{slot:?}");
                assert_eq!(view.layout.padding.left, 20.0);
                assert_eq!(view.layout.padding.top, 20.0);
                assert!(view.show_bg);
            }
            for slot in [
                SurfaceSlot::Input,
                SurfaceSlot::Select,
                SurfaceSlot::Alert,
                SurfaceSlot::Card,
                SurfaceSlot::LineChart,
            ] {
                let widget = detail.slot_ref(&cx, slot);
                let view = widget
                    .borrow::<View>()
                    .expect("component-owned surface slot");
                assert!(!view.show_bg, "{slot:?}: no duplicate frame");
                assert_eq!(view.layout.padding.left, 0.0);
            }
        }
    }

    #[test]
    fn every_component_binds_surface_widget_and_unique_detail_slot() {
        let mut slots = Vec::with_capacity(ComponentId::ALL.len());
        for id in ComponentId::ALL {
            let descriptor = tessera_makepad::components::surface(id);
            let widget = descriptor
                .availability()
                .widget()
                .expect("every component must bind a concrete Makepad widget");
            assert!(
                !widget.is_empty(),
                "widget name must not be empty for {id:?}"
            );

            let slot = slot_for_any(id).expect("every component must bind a detail slot");
            assert!(
                !slots.contains(&slot),
                "detail slot {slot:?} is reused by {id:?}"
            );
            slots.push(slot);
        }
        assert_eq!(slots.len(), 101);
    }

    #[test]
    fn mount_ack_requires_post_draw_identity_and_current_generation() {
        let request = SurfaceMountRequest {
            component: ComponentId::Button,
            generation: 7,
            slot: SurfaceSlot::Button,
        };
        let valid = ComponentDetailMountAck {
            component: ComponentId::Button,
            generation: 7,
            slot: SurfaceSlot::Button,
        };

        assert!(!mount_ack_matches(Some(request), None));
        assert!(!mount_ack_matches(
            Some(request),
            Some(ComponentDetailMountAck {
                component: ComponentId::Modal,
                ..valid
            })
        ));
        assert!(!mount_ack_matches(
            Some(request),
            Some(ComponentDetailMountAck {
                generation: 6,
                ..valid
            })
        ));
        assert!(!mount_ack_matches(
            Some(request),
            Some(ComponentDetailMountAck {
                slot: SurfaceSlot::Modal,
                ..valid
            })
        ));
        assert!(mount_ack_matches(Some(request), Some(valid)));
    }

    #[test]
    fn mount_ack_rejects_invalid_or_zero_draw_geometry() {
        assert!(!draw_geometry_is_valid(false, 100.0, 40.0));
        assert!(!draw_geometry_is_valid(true, 0.0, 40.0));
        assert!(!draw_geometry_is_valid(true, 100.0, 0.0));
        assert!(!draw_geometry_is_valid(true, f64::NAN, 40.0));
        assert!(!draw_geometry_is_valid(true, 100.0, f64::INFINITY));
        assert!(draw_geometry_is_valid(true, 100.0, 40.0));
    }

    #[test]
    fn component_owned_chart_routes_have_distinct_detail_slots() {
        let slots = [
            ComponentId::LineChart,
            ComponentId::AreaChart,
            ComponentId::BarChart,
            ComponentId::ScatterChart,
            ComponentId::Sparkline,
        ]
        .map(|id| slot_for_chart(id).expect("component-owned chart route"));

        assert_eq!(slots.len(), 5);
        assert!(slots.iter().all(|slot| SurfaceSlot::ALL.contains(slot)));
        for (index, slot) in slots.iter().enumerate() {
            assert!(!slots[..index].contains(slot));
        }
        assert_eq!(
            slots,
            [
                SurfaceSlot::LineChart,
                SurfaceSlot::AreaChart,
                SurfaceSlot::BarChart,
                SurfaceSlot::ScatterChart,
                SurfaceSlot::Sparkline,
            ]
        );
    }

    #[test]
    fn foundational_inputs_have_distinct_detail_slots() {
        let slots = [
            ComponentId::Input,
            ComponentId::Textarea,
            ComponentId::InputNumber,
            ComponentId::Checkbox,
            ComponentId::Radio,
            ComponentId::Switch,
            ComponentId::Slider,
            ComponentId::Select,
        ]
        .map(|id| slot_for_input(id).expect("foundational input route"));

        assert_eq!(slots.len(), 8);
        assert!(slots.iter().all(|slot| SurfaceSlot::ALL.contains(slot)));
        for (index, slot) in slots.iter().enumerate() {
            assert!(!slots[..index].contains(slot));
        }
        assert_eq!(
            slots,
            [
                SurfaceSlot::Input,
                SurfaceSlot::Textarea,
                SurfaceSlot::InputNumber,
                SurfaceSlot::Checkbox,
                SurfaceSlot::Radio,
                SurfaceSlot::Switch,
                SurfaceSlot::Slider,
                SurfaceSlot::Select,
            ]
        );
    }
    use tessera_makepad::components::surfaces::atomic::AtomicComponent;

    #[test]
    fn every_atomic_component_has_a_distinct_detail_slot() {
        let slots = AtomicComponent::ALL.map(slot_for_atomic);
        assert_eq!(slots.len(), 12);
        assert!(slots.iter().all(|slot| SurfaceSlot::ALL.contains(slot)));
        for (index, slot) in slots.iter().enumerate() {
            assert!(!slots[..index].contains(slot));
        }
        assert!(slots.iter().all(|slot| {
            !matches!(
                slot,
                SurfaceSlot::Input
                    | SurfaceSlot::Alert
                    | SurfaceSlot::Empty
                    | SurfaceSlot::Progress
                    | SurfaceSlot::Result
                    | SurfaceSlot::Affix
                    | SurfaceSlot::Anchor
                    | SurfaceSlot::Card
                    | SurfaceSlot::Flex
                    | SurfaceSlot::Grid
                    | SurfaceSlot::Layout
            )
        }));
    }

    #[test]
    fn every_feedback_component_has_a_distinct_detail_slot() {
        let slots = [
            ComponentId::Alert,
            ComponentId::Empty,
            ComponentId::Progress,
            ComponentId::Result,
        ]
        .map(|id| slot_for_feedback(id).expect("feedback route"));

        assert_eq!(slots.len(), 4);
        assert!(slots.iter().all(|slot| SurfaceSlot::ALL.contains(slot)));
        for (index, slot) in slots.iter().enumerate() {
            assert!(!slots[..index].contains(slot));
        }
        assert_eq!(
            slots,
            [
                SurfaceSlot::Alert,
                SurfaceSlot::Empty,
                SurfaceSlot::Progress,
                SurfaceSlot::Result,
            ]
        );
    }

    #[test]
    fn every_layout_component_has_a_distinct_detail_slot() {
        let slots = [
            ComponentId::Affix,
            ComponentId::Anchor,
            ComponentId::Card,
            ComponentId::Flex,
            ComponentId::Grid,
            ComponentId::Layout,
        ]
        .map(|id| slot_for_layout(id).expect("layout route"));

        assert_eq!(slots.len(), 6);
        assert!(slots.iter().all(|slot| SurfaceSlot::ALL.contains(slot)));
        for (index, slot) in slots.iter().enumerate() {
            assert!(!slots[..index].contains(slot));
        }
        assert_eq!(
            slots,
            [
                SurfaceSlot::Affix,
                SurfaceSlot::Anchor,
                SurfaceSlot::Card,
                SurfaceSlot::Flex,
                SurfaceSlot::Grid,
                SurfaceSlot::Layout,
            ]
        );
    }

    #[test]
    fn current_batch_components_have_distinct_detail_slots() {
        let slots = [
            ComponentId::Segmented,
            ComponentId::Tabs,
            ComponentId::Tree,
            ComponentId::Carousel,
            ComponentId::Splitter,
            ComponentId::BorderBeam,
            ComponentId::App,
            ComponentId::ConfigProvider,
            ComponentId::Util,
        ]
        .map(|id| slot_for_current_batch(id).expect("current batch route"));

        assert_eq!(slots.len(), 9);
        assert!(slots.iter().all(|slot| SurfaceSlot::ALL.contains(slot)));
        for (index, slot) in slots.iter().enumerate() {
            assert!(!slots[..index].contains(slot));
        }
        assert_eq!(
            slots,
            [
                SurfaceSlot::Segmented,
                SurfaceSlot::Tabs,
                SurfaceSlot::Tree,
                SurfaceSlot::Carousel,
                SurfaceSlot::Splitter,
                SurfaceSlot::BorderBeam,
                SurfaceSlot::App,
                SurfaceSlot::ConfigProvider,
                SurfaceSlot::Util,
            ]
        );
    }

    #[test]
    fn every_display_component_has_a_distinct_detail_slot() {
        let slots = [
            ComponentId::Calendar,
            ComponentId::Collapse,
            ComponentId::Descriptions,
            ComponentId::Image,
            ComponentId::List,
            ComponentId::Menu,
            ComponentId::QrCode,
            ComponentId::Rate,
        ]
        .map(|id| slot_for_display(id).expect("display route"));

        assert_eq!(slots.len(), 8);
        assert!(slots.iter().all(|slot| SurfaceSlot::ALL.contains(slot)));
        for (index, slot) in slots.iter().enumerate() {
            assert!(!slots[..index].contains(slot));
        }
        assert_eq!(
            slots,
            [
                SurfaceSlot::Calendar,
                SurfaceSlot::Collapse,
                SurfaceSlot::Descriptions,
                SurfaceSlot::Image,
                SurfaceSlot::List,
                SurfaceSlot::Menu,
                SurfaceSlot::QrCode,
                SurfaceSlot::Rate,
            ]
        );
    }

    #[test]
    fn every_b1_component_has_a_distinct_detail_slot() {
        let slots = [
            ComponentId::Masonry,
            ComponentId::Breadcrumb,
            ComponentId::Pagination,
            ComponentId::Steps,
            ComponentId::Skeleton,
            ComponentId::Spin,
            ComponentId::Statistic,
            ComponentId::Timeline,
        ]
        .map(|id| slot_for_b1(id).expect("B1 route"));

        assert_eq!(slots.len(), 8);
        assert!(slots.iter().all(|slot| SurfaceSlot::ALL.contains(slot)));
        for (index, slot) in slots.iter().enumerate() {
            assert!(!slots[..index].contains(slot));
        }
        assert_eq!(
            slots,
            [
                SurfaceSlot::Masonry,
                SurfaceSlot::Breadcrumb,
                SurfaceSlot::Pagination,
                SurfaceSlot::Steps,
                SurfaceSlot::Skeleton,
                SurfaceSlot::Spin,
                SurfaceSlot::Statistic,
                SurfaceSlot::Timeline,
            ]
        );
    }

    #[test]
    fn every_overlay_component_has_a_distinct_detail_slot() {
        let slots = [
            ComponentId::Drawer,
            ComponentId::Dropdown,
            ComponentId::Message,
            ComponentId::Modal,
            ComponentId::Notification,
            ComponentId::Popconfirm,
            ComponentId::Popover,
            ComponentId::Tooltip,
        ]
        .map(|id| slot_for_overlay(id).expect("overlay route"));

        assert_eq!(slots.len(), 8);
        assert!(slots.iter().all(|slot| SurfaceSlot::ALL.contains(slot)));
        for (index, slot) in slots.iter().enumerate() {
            assert!(!slots[..index].contains(slot));
        }
    }

    #[test]
    fn new_data_and_business_components_have_distinct_detail_slots() {
        let slots = [
            ComponentId::CodeBlock,
            ComponentId::CommandPalette,
            ComponentId::DataToolbar,
            ComponentId::FilterPanel,
            ComponentId::MarkdownEditor,
            ComponentId::Table,
            ComponentId::MermaidSvgViewer,
            ComponentId::MetricCard,
            ComponentId::MiniChartCard,
            ComponentId::MobilePreviewFrame,
            ComponentId::PropertyList,
            ComponentId::StatusTimeline,
            ComponentId::Tour,
        ]
        .map(|id| slot_for_new_surfaces(id).expect("new surface route"));

        assert_eq!(slots.len(), 13);
        assert!(slots.iter().all(|slot| SurfaceSlot::ALL.contains(slot)));
        for (index, slot) in slots.iter().enumerate() {
            assert!(!slots[..index].contains(slot));
        }
        assert_eq!(
            slots,
            [
                SurfaceSlot::CodeBlock,
                SurfaceSlot::CommandPalette,
                SurfaceSlot::DataToolbar,
                SurfaceSlot::FilterPanel,
                SurfaceSlot::MarkdownEditor,
                SurfaceSlot::Table,
                SurfaceSlot::MermaidSvgViewer,
                SurfaceSlot::MetricCard,
                SurfaceSlot::MiniChartCard,
                SurfaceSlot::MobilePreviewFrame,
                SurfaceSlot::PropertyList,
                SurfaceSlot::StatusTimeline,
                SurfaceSlot::Tour,
            ]
        );
    }
}
