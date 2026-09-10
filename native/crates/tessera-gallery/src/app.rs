use std::sync::atomic::{AtomicU8, Ordering};

use tessera_core::{RequestedTheme, ThemeMode, catalog::ComponentId};
use tessera_makepad::components::{
    self,
    surfaces::{
        atomic::{AtomicAction, AtomicComponent, AtomicSurfaceCatalog},
        breadcrumb::BreadcrumbAction,
        calendar::CalendarAction,
        chart_area::AreaChartAction,
        chart_bar::BarChartAction,
        chart_funnel::FunnelChartAction,
        chart_gauge::GaugeChartAction,
        chart_heatmap::HeatmapAction,
        chart_line::LineChartAction,
        chart_mind_map::MindMapAction,
        chart_organization::OrganizationChartAction,
        chart_pie::PieChartAction,
        chart_radar::RadarChartAction,
        chart_sankey::{SankeyChartAction, TesseraSankeyChart},
        chart_scatter::ScatterChartAction,
        chart_sparkline::SparklineAction,
        chart_treemap::TreemapAction,
        chart_word_cloud::WordCloudAction,
        code_block::CodeBlockAction,
        collapse::CollapseAction,
        command_palette::CommandPaletteAction,
        data_toolbar::DataToolbarAction,
        descriptions::DescriptionsAction,
        drawer::DrawerAction,
        dropdown::DropdownAction,
        feedback::{AlertAction, EmptyAction, ProgressAction, ResultAction},
        filter_panel::FilterPanelAction,
        image::ImageAction,
        input_advanced::{
            AdvancedInputSurfaceCatalog, CascaderAction, FormAction, TransferAction,
            TreeSelectAction, UploadAction,
        },
        input_composites::{
            AutoCompleteAction, ColorPickerAction, DatePickerAction, InputCompositeSurfaceCatalog,
            MentionsAction, TimePickerAction,
        },
        input_independent::{InputSurfaceAction, InputWidgetCatalog},
        interactive::{BorderBeamAction, CarouselAction, SplitterAction},
        layout::{AffixAction, AnchorAction, CardAction, FlexAction, GridAction, LayoutAction},
        list::ListAction,
        markdown_editor::MarkdownEditorAction,
        masonry::MasonryAction,
        menu::MenuAction,
        mermaid_svg_viewer::MermaidSvgViewerAction,
        message::MessageAction,
        metric_card::MetricCardAction,
        mini_chart_card::MiniChartCardAction,
        mobile_preview_frame::MobilePreviewFrameAction,
        modal::ModalAction,
        navigation::{SegmentedAction, TabsAction, TreeAction},
        notification::NotificationAction,
        pagination::PaginationAction,
        popconfirm::PopconfirmAction,
        popover::PopoverAction,
        property_list::PropertyListAction,
        qr_code::QrCodeAction,
        rate::RateAction,
        runtime::{AppAction, ConfigProviderAction, UtilAction},
        skeleton::SkeletonAction,
        spin::SpinAction,
        statistic::StatisticAction,
        status_timeline::StatusTimelineAction,
        steps::StepsAction,
        table::TableAction,
        timeline::TimelineAction,
        tooltip::TooltipAction,
        tour::TourAction,
    },
};
use tessera_makepad::foundation::theme_templates::{ThemeRuntimeState, ThemeTemplates};
use tessera_makepad::makepad_widgets::*;

use crate::{
    component_detail::{ComponentDetail, ComponentDetailMountAck},
    host::GalleryHost,
    route::GalleryPage,
};

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ComponentSelectorError {
    MissingValue,
    MissingEquals,
    UnknownSlug(String),
    Duplicate,
}

impl std::fmt::Display for ComponentSelectorError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::MissingValue => formatter.write_str("--component requires a non-empty slug"),
            Self::MissingEquals => formatter.write_str("use --component=<slug>"),
            Self::UnknownSlug(slug) => write!(formatter, "unknown component slug `{slug}`"),
            Self::Duplicate => formatter.write_str("--component may be specified only once"),
        }
    }
}

pub fn component_selector_from_args<I, S>(
    arguments: I,
) -> Result<Option<ComponentId>, ComponentSelectorError>
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    let mut selected = None;

    for argument in arguments {
        let argument = argument.as_ref();
        if let Some(slug) = argument.strip_prefix("--component=") {
            if slug.is_empty() {
                return Err(ComponentSelectorError::MissingValue);
            }
            let component = ComponentId::from_slug(slug)
                .ok_or_else(|| ComponentSelectorError::UnknownSlug(slug.to_owned()))?;
            if selected.replace(component).is_some() {
                return Err(ComponentSelectorError::Duplicate);
            }
        } else if argument.starts_with("--component") {
            return Err(ComponentSelectorError::MissingEquals);
        }
    }

    Ok(selected)
}

const MIN_VIEWPORT_WIDTH: u16 = 320;
const MIN_VIEWPORT_HEIGHT: u16 = 320;
const MAX_VIEWPORT_WIDTH: u16 = 7680;
const MAX_VIEWPORT_HEIGHT: u16 = 4320;

fn viewport_from_arg(argument: &str) -> Option<(u16, u16)> {
    let dimensions = argument.strip_prefix("--viewport=")?;
    let (width, height) = dimensions.split_once('x')?;
    let width = width.parse::<u16>().ok()?;
    let height = height.parse::<u16>().ok()?;
    (MIN_VIEWPORT_WIDTH..=MAX_VIEWPORT_WIDTH)
        .contains(&width)
        .then_some(())
        .and_then(|()| {
            (MIN_VIEWPORT_HEIGHT..=MAX_VIEWPORT_HEIGHT)
                .contains(&height)
                .then_some((width, height))
        })
}

pub fn validate_component_selector_args<I, S>(arguments: I) -> Result<(), ComponentSelectorError>
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    component_selector_from_args(arguments).map(|_| ())
}

const THEME_UNSET: u8 = 0;
const THEME_LIGHT: u8 = 1;
const THEME_DARK: u8 = 2;

static ACTIVE_THEME: AtomicU8 = AtomicU8::new(THEME_UNSET);
static SYSTEM_THEME: AtomicU8 = AtomicU8::new(THEME_UNSET);

const fn encode_theme(theme: ThemeMode) -> u8 {
    match theme {
        ThemeMode::Light => THEME_LIGHT,
        ThemeMode::Dark => THEME_DARK,
    }
}

const fn decode_theme(value: u8) -> Option<ThemeMode> {
    match value {
        THEME_LIGHT => Some(ThemeMode::Light),
        THEME_DARK => Some(ThemeMode::Dark),
        _ => None,
    }
}

fn requested_theme_from_args() -> RequestedTheme {
    std::env::args().fold(RequestedTheme::System, |theme, argument| {
        match argument.as_str() {
            "--light" | "--theme=light" => RequestedTheme::Light,
            "--dark" | "--theme=dark" => RequestedTheme::Dark,
            "--theme=system" => RequestedTheme::System,
            _ => theme,
        }
    })
}

fn system_theme() -> ThemeMode {
    if let Some(theme) = decode_theme(SYSTEM_THEME.load(Ordering::Acquire)) {
        return theme;
    }

    // Makepad's desktop widgets default to the dark native palette. Keep the
    // System resolution aligned with the renderer until a platform appearance
    // event is exposed by the pinned Makepad runtime.
    let theme = ThemeMode::Dark;
    let _ = SYSTEM_THEME.compare_exchange(
        THEME_UNSET,
        encode_theme(theme),
        Ordering::AcqRel,
        Ordering::Acquire,
    );
    theme
}

fn resolved_theme(requested: RequestedTheme) -> ThemeMode {
    match requested {
        RequestedTheme::Light => ThemeMode::Light,
        RequestedTheme::Dark => ThemeMode::Dark,
        RequestedTheme::System => system_theme(),
    }
}

fn active_theme() -> ThemeMode {
    if let Some(theme) = decode_theme(ACTIVE_THEME.load(Ordering::Acquire)) {
        return theme;
    }

    let theme = resolved_theme(requested_theme_from_args());
    let _ = ACTIVE_THEME.compare_exchange(
        THEME_UNSET,
        encode_theme(theme),
        Ordering::AcqRel,
        Ordering::Acquire,
    );
    theme
}

fn set_active_theme(theme: ThemeMode) {
    ACTIVE_THEME.store(encode_theme(theme), Ordering::Release);
}

fn counts_as_native_surface_action(action: &AtomicAction) -> bool {
    matches!(
        action,
        AtomicAction::Activated { .. }
            | AtomicAction::CopyRequested { .. }
            | AtomicAction::TagRemoved { .. }
    )
}

fn feedback_action_label(action: &AlertAction) -> Option<String> {
    match action {
        AlertAction::Dismissed { dismissals } => Some(format!("Alert dismissed ({dismissals})")),
        AlertAction::ActionFailed { attempts } => Some(format!("Alert action failed ({attempts})")),
        AlertAction::Restored => Some(String::from("Alert restored")),
        AlertAction::None => None,
    }
}

fn empty_action_label(action: &EmptyAction) -> Option<String> {
    match action {
        EmptyAction::CreateRequested { count } => {
            Some(format!("Empty-state action requested ({count})"))
        }
        EmptyAction::Recovered { attempts } => Some(format!("Empty state recovered ({attempts})")),
        EmptyAction::RecoveryFailed { attempts } => {
            Some(format!("Empty state recovery failed ({attempts})"))
        }
        EmptyAction::Reset => Some(String::from("Empty state reset")),
        EmptyAction::None => None,
    }
}

fn progress_action_label(action: &ProgressAction) -> Option<String> {
    match action {
        ProgressAction::MotionChanged { reduced } => {
            Some(format!("Progress reduced motion {reduced}"))
        }
        ProgressAction::Changed { percent } => Some(format!("Progress changed to {percent}%")),
        ProgressAction::ModeChanged { mode } => Some(format!("Progress mode {mode:?}")),
        ProgressAction::Failed => Some(String::from("Progress failed")),
        ProgressAction::Retried { retries } => Some(format!("Progress retry {retries}")),
        ProgressAction::Reset => Some(String::from("Progress reset")),
        ProgressAction::None => None,
    }
}

fn result_action_label(action: &ResultAction) -> Option<String> {
    match action {
        ResultAction::RetryRequested { count } => Some(format!("Result retry requested ({count})")),
        ResultAction::MarkedSuccess => Some(String::from("Result marked successful")),
        ResultAction::EmptyShown => Some(String::from("Result empty state shown")),
        ResultAction::ErrorShown => Some(String::from("Result error shown")),
        ResultAction::Reset => Some(String::from("Result reset")),
        ResultAction::None => None,
    }
}

fn input_action_label(action: &InputSurfaceAction) -> Option<String> {
    match action {
        InputSurfaceAction::Changed { component, outcome } => {
            Some(format!("{} input {:?}", component.spec().name, outcome))
        }
        InputSurfaceAction::Failed { component } => {
            Some(format!("{} input validation failed", component.spec().name))
        }
        InputSurfaceAction::None => None,
    }
}

fn input_action_label_for_component(
    expected: ComponentId,
    action: &InputSurfaceAction,
) -> Option<String> {
    match action {
        InputSurfaceAction::Changed { component, .. }
        | InputSurfaceAction::Failed { component }
            if *component == expected =>
        {
            input_action_label(action)
        }
        _ => None,
    }
}

fn funnel_chart_action_label(action: &FunnelChartAction) -> Option<String> {
    match action {
        FunnelChartAction::StageSelected { stage } => stage.map_or_else(
            || {
                Some(format!(
                    "{} selection cleared",
                    ComponentId::FunnelChart.spec().name
                ))
            },
            |stage| {
                Some(format!(
                    "{} stage {} selected",
                    ComponentId::FunnelChart.spec().name,
                    stage + 1
                ))
            },
        ),
        FunnelChartAction::ViewportChanged { changes } => Some(format!(
            "{} viewport changed ({changes})",
            ComponentId::FunnelChart.spec().name
        )),
        FunnelChartAction::Reset => Some(format!("{} reset", ComponentId::FunnelChart.spec().name)),
    }
}

fn gauge_chart_action_label(action: &GaugeChartAction) -> Option<String> {
    match action {
        GaugeChartAction::ValueChanged { value } => Some(format!(
            "{} value {:.0}",
            ComponentId::GaugeChart.spec().name,
            value
        )),
        GaugeChartAction::ViewportChanged { changes } => Some(format!(
            "{} viewport changed ({changes})",
            ComponentId::GaugeChart.spec().name
        )),
        GaugeChartAction::Reset => Some(format!("{} reset", ComponentId::GaugeChart.spec().name)),
    }
}

fn heatmap_action_label(action: &HeatmapAction) -> Option<String> {
    match action {
        HeatmapAction::CellSelected { cell } => cell.map_or_else(
            || Some(String::from("Heatmap selection cleared")),
            |cell| Some(format!("Heatmap cell {} selected", cell + 1)),
        ),
        HeatmapAction::ViewportChanged { changes } => {
            Some(format!("Heatmap viewport changed ({changes})"))
        }
        HeatmapAction::Reset => Some(String::from("Heatmap reset")),
    }
}

fn mind_map_action_label(action: &MindMapAction) -> Option<String> {
    match action {
        MindMapAction::NodeSelected { node } => node.map_or_else(
            || Some(String::from("MindMap selection cleared")),
            |node| Some(format!("MindMap node {node} selected")),
        ),
        MindMapAction::Collapsed { collapsed } => Some(format!(
            "MindMap {}",
            if *collapsed { "collapsed" } else { "expanded" }
        )),
        MindMapAction::ViewportChanged { changes } => {
            Some(format!("MindMap viewport changed ({changes})"))
        }
        MindMapAction::Reset => Some(String::from("MindMap reset")),
    }
}

fn organization_chart_action_label(action: &OrganizationChartAction) -> Option<String> {
    match action {
        OrganizationChartAction::NodeSelected { node } => node.map_or_else(
            || Some(String::from("OrganizationChart selection cleared")),
            |node| Some(format!("OrganizationChart node {node} selected")),
        ),
        OrganizationChartAction::ViewportChanged { changes } => {
            Some(format!("OrganizationChart viewport changed ({changes})"))
        }
        OrganizationChartAction::Reset => Some(String::from("OrganizationChart reset")),
    }
}

fn pie_chart_action_label(action: &PieChartAction) -> Option<String> {
    match action {
        PieChartAction::SliceSelected { slice } => slice.map_or_else(
            || Some(String::from("PieChart selection cleared")),
            |slice| Some(format!("PieChart slice {} selected", slice + 1)),
        ),
        PieChartAction::ViewportChanged { changes } => {
            Some(format!("PieChart viewport changed ({changes})"))
        }
        PieChartAction::Reset => Some(String::from("PieChart reset")),
    }
}

fn radar_chart_action_label(action: &RadarChartAction) -> Option<String> {
    match action {
        RadarChartAction::AxisSelected { axis } => axis.map_or_else(
            || Some(String::from("RadarChart selection cleared")),
            |axis| Some(format!("RadarChart axis {} selected", axis + 1)),
        ),
        RadarChartAction::ViewportChanged { changes } => {
            Some(format!("RadarChart viewport changed ({changes})"))
        }
        RadarChartAction::Reset => Some(String::from("RadarChart reset")),
    }
}

fn sankey_chart_action_label(action: &SankeyChartAction) -> Option<String> {
    match action {
        SankeyChartAction::NodeSelected { node } => node.map_or_else(
            || Some(String::from("SankeyChart selection cleared")),
            |node| Some(format!("SankeyChart node {node} selected")),
        ),
        SankeyChartAction::LinkSelected { link } => link.map_or_else(
            || Some(String::from("SankeyChart selection cleared")),
            |link| Some(format!("SankeyChart flow {link} selected")),
        ),
        SankeyChartAction::DataChanged { state } => Some(format!("SankeyChart data {state}")),
        SankeyChartAction::ViewportChanged { changes } => {
            Some(format!("SankeyChart viewport changed ({changes})"))
        }
        SankeyChartAction::Reset => Some(String::from("SankeyChart reset")),
    }
}

fn treemap_action_label(action: &TreemapAction) -> Option<String> {
    match action {
        TreemapAction::TileSelected { tile } => tile.map_or_else(
            || Some(String::from("Treemap selection cleared")),
            |tile| Some(format!("Treemap tile {tile} selected")),
        ),
        TreemapAction::ViewportChanged { changes } => {
            Some(format!("Treemap viewport changed ({changes})"))
        }
        TreemapAction::Reset => Some(String::from("Treemap reset")),
    }
}

fn word_cloud_action_label(action: &WordCloudAction) -> Option<String> {
    match action {
        WordCloudAction::WordSelected { word } => word.map_or_else(
            || Some(String::from("WordCloud selection cleared")),
            |word| Some(format!("WordCloud word {} selected", word + 1)),
        ),
        WordCloudAction::ViewportChanged { changes } => {
            Some(format!("WordCloud viewport changed ({changes})"))
        }
        WordCloudAction::Reset => Some(String::from("WordCloud reset")),
    }
}

fn auto_complete_action_label(action: &AutoCompleteAction) -> Option<(ComponentId, String)> {
    match action {
        AutoCompleteAction::Opened { component } => Some((
            *component,
            format!("{} suggestions opened", component.spec().name),
        )),
        AutoCompleteAction::Focused { component, index } => Some((
            *component,
            format!("{} suggestion {} focused", component.spec().name, index + 1),
        )),
        AutoCompleteAction::Committed { component, index } => Some((
            *component,
            format!(
                "{} suggestion {} committed",
                component.spec().name,
                index + 1
            ),
        )),
        AutoCompleteAction::Cancelled { component } => {
            Some((*component, format!("{} cancelled", component.spec().name)))
        }
        AutoCompleteAction::Reset { component } => {
            Some((*component, format!("{} reset", component.spec().name)))
        }
        AutoCompleteAction::None => None,
    }
}

fn mentions_action_label(action: &MentionsAction) -> Option<(ComponentId, String)> {
    match action {
        MentionsAction::Opened { component } => Some((
            *component,
            format!("{} suggestions opened", component.spec().name),
        )),
        MentionsAction::Focused { component, index } => Some((
            *component,
            format!("{} suggestion {} focused", component.spec().name, index + 1),
        )),
        MentionsAction::Inserted { component, index } => Some((
            *component,
            format!("{} {} inserted", component.spec().name, index + 1),
        )),
        MentionsAction::Cancelled { component } => {
            Some((*component, format!("{} cancelled", component.spec().name)))
        }
        MentionsAction::Reset { component } => {
            Some((*component, format!("{} reset", component.spec().name)))
        }
        MentionsAction::None => None,
    }
}

fn color_picker_action_label(action: &ColorPickerAction) -> Option<(ComponentId, String)> {
    match action {
        ColorPickerAction::Opened { component } => {
            Some((*component, format!("{} opened", component.spec().name)))
        }
        ColorPickerAction::Focused { component, index } => Some((
            *component,
            format!("{} option {} focused", component.spec().name, index + 1),
        )),
        ColorPickerAction::Selected { component, index } => Some((
            *component,
            format!("{} {} selected", component.spec().name, index + 1),
        )),
        ColorPickerAction::Committed { component } => Some((
            *component,
            format!("{} custom value committed", component.spec().name),
        )),
        ColorPickerAction::Cancelled { component } => {
            Some((*component, format!("{} cancelled", component.spec().name)))
        }
        ColorPickerAction::Reset { component } => {
            Some((*component, format!("{} reset", component.spec().name)))
        }
        ColorPickerAction::None => None,
    }
}

fn date_picker_action_label(action: &DatePickerAction) -> Option<(ComponentId, String)> {
    match action {
        DatePickerAction::Opened { component } => {
            Some((*component, format!("{} opened", component.spec().name)))
        }
        DatePickerAction::Focused { component, index } => Some((
            *component,
            format!("{} option {} focused", component.spec().name, index + 1),
        )),
        DatePickerAction::Selected { component, index } => Some((
            *component,
            format!("{} {} selected", component.spec().name, index + 1),
        )),
        DatePickerAction::Committed { component } => Some((
            *component,
            format!("{} custom date committed", component.spec().name),
        )),
        DatePickerAction::Cancelled { component } => {
            Some((*component, format!("{} cancelled", component.spec().name)))
        }
        DatePickerAction::Reset { component } => {
            Some((*component, format!("{} reset", component.spec().name)))
        }
        DatePickerAction::None => None,
    }
}

fn time_picker_action_label(action: &TimePickerAction) -> Option<(ComponentId, String)> {
    match action {
        TimePickerAction::Opened { component } => {
            Some((*component, format!("{} opened", component.spec().name)))
        }
        TimePickerAction::Focused { component, index } => Some((
            *component,
            format!("{} option {} focused", component.spec().name, index + 1),
        )),
        TimePickerAction::Selected { component, index } => Some((
            *component,
            format!("{} {} selected", component.spec().name, index + 1),
        )),
        TimePickerAction::Committed { component } => Some((
            *component,
            format!("{} custom time committed", component.spec().name),
        )),
        TimePickerAction::Cancelled { component } => {
            Some((*component, format!("{} cancelled", component.spec().name)))
        }
        TimePickerAction::Reset { component } => {
            Some((*component, format!("{} reset", component.spec().name)))
        }
        TimePickerAction::None => None,
    }
}

fn cascader_action_label(action: &CascaderAction) -> Option<(ComponentId, String)> {
    match action {
        CascaderAction::Opened { component } => Some((
            *component,
            format!("{} options opened", component.spec().name),
        )),
        CascaderAction::ParentSelected { component, index } => Some((
            *component,
            format!("{} category {} selected", component.spec().name, index + 1),
        )),
        CascaderAction::LeafSelected { component, index } => Some((
            *component,
            format!(
                "{} destination {} selected",
                component.spec().name,
                index + 1
            ),
        )),
        CascaderAction::Committed {
            component,
            parent,
            leaf,
        } => Some((
            *component,
            format!(
                "{} path {} / {} committed",
                component.spec().name,
                parent + 1,
                leaf + 1
            ),
        )),
        CascaderAction::Cancelled { component } => {
            Some((*component, format!("{} cancelled", component.spec().name)))
        }
        CascaderAction::Reset { component } => {
            Some((*component, format!("{} reset", component.spec().name)))
        }
        CascaderAction::None => None,
    }
}

fn tree_select_action_label(action: &TreeSelectAction) -> Option<(ComponentId, String)> {
    match action {
        TreeSelectAction::Opened { component } => Some((
            *component,
            format!("{} options opened", component.spec().name),
        )),
        TreeSelectAction::Expanded {
            component,
            expanded,
        } => Some((
            *component,
            format!(
                "{} workspace {}",
                component.spec().name,
                if *expanded { "expanded" } else { "collapsed" }
            ),
        )),
        TreeSelectAction::Selected { component, index } => Some((
            *component,
            format!("{} node {} selected", component.spec().name, index + 1),
        )),
        TreeSelectAction::Committed { component, index } => Some((
            *component,
            format!("{} node {} committed", component.spec().name, index + 1),
        )),
        TreeSelectAction::Cancelled { component } => {
            Some((*component, format!("{} cancelled", component.spec().name)))
        }
        TreeSelectAction::Reset { component } => {
            Some((*component, format!("{} reset", component.spec().name)))
        }
        TreeSelectAction::None => None,
    }
}

fn transfer_action_label(action: &TransferAction) -> Option<(ComponentId, String)> {
    match action {
        TransferAction::SourceSelected { component, index } => Some((
            *component,
            format!("{} source {} selected", component.spec().name, index + 1),
        )),
        TransferAction::MovedToTarget { component, count } => Some((
            *component,
            format!(
                "{} moved {count} item(s) to selected",
                component.spec().name
            ),
        )),
        TransferAction::ReturnedToSource { component, count } => Some((
            *component,
            format!("{} returned {count} item(s)", component.spec().name),
        )),
        TransferAction::Cancelled { component } => {
            Some((*component, format!("{} cancelled", component.spec().name)))
        }
        TransferAction::Reset { component } => {
            Some((*component, format!("{} reset", component.spec().name)))
        }
        TransferAction::None => None,
    }
}

fn upload_action_label(action: &UploadAction) -> Option<(ComponentId, String)> {
    match action {
        UploadAction::Unsupported { component, reason } => Some((
            *component,
            format!("{} unsupported: {reason}", component.spec().name),
        )),
        UploadAction::Cancelled { component } => {
            Some((*component, format!("{} cancelled", component.spec().name)))
        }
        UploadAction::Reset { component } => {
            Some((*component, format!("{} reset", component.spec().name)))
        }
        UploadAction::None => None,
    }
}

fn form_action_label(action: &FormAction) -> Option<(ComponentId, String)> {
    match action {
        FormAction::Submitted { component } => {
            Some((*component, format!("{} submitted", component.spec().name)))
        }
        FormAction::ValidationFailed { component } => Some((
            *component,
            format!("{} validation failed", component.spec().name),
        )),
        FormAction::Reset { component } => {
            Some((*component, format!("{} reset", component.spec().name)))
        }
        FormAction::None => None,
    }
}

fn component_scoped_label(
    expected: ComponentId,
    action: Option<(ComponentId, String)>,
) -> Option<String> {
    action.and_then(|(component, label)| (component == expected).then_some(label))
}

fn calendar_action_label(action: &CalendarAction) -> Option<String> {
    match action {
        CalendarAction::MonthChanged { offset } => Some(format!("Calendar month offset {offset}")),
        CalendarAction::DaySelected { day } => Some(format!("Calendar day {day} selected")),
        CalendarAction::DisabledSelection { day } => {
            Some(format!("Calendar day {day} unavailable"))
        }
        CalendarAction::None => None,
    }
}

fn collapse_action_label(action: &CollapseAction) -> Option<String> {
    match action {
        CollapseAction::Toggled { open, toggles } => Some(format!(
            "Collapse {} ({toggles})",
            if *open { "opened" } else { "closed" }
        )),
        CollapseAction::Acknowledged { acknowledgements } => {
            Some(format!("Collapse acknowledged ({acknowledgements})"))
        }
        CollapseAction::ReducedMotionChanged { enabled } => Some(format!(
            "Collapse reduced motion {}",
            if *enabled { "enabled" } else { "disabled" }
        )),
        CollapseAction::None => None,
    }
}

fn descriptions_action_label(action: &DescriptionsAction) -> Option<String> {
    match action {
        DescriptionsAction::DensityChanged { compact } => Some(format!(
            "Descriptions density {}",
            if *compact { "compact" } else { "comfortable" }
        )),
        DescriptionsAction::DisclosureChanged { disclosed } => Some(format!(
            "Descriptions full values {}",
            if *disclosed { "shown" } else { "hidden" }
        )),
        DescriptionsAction::CopyDenied => Some(String::from("Descriptions clipboard denied")),
        DescriptionsAction::None => None,
    }
}

fn image_action_label(action: &ImageAction) -> Option<String> {
    match action {
        ImageAction::ZoomChanged { zoomed } => Some(format!(
            "Image zoom {}",
            if *zoomed { "enabled" } else { "reset" }
        )),
        ImageAction::Reloaded => Some(String::from("Image reloaded")),
        ImageAction::DecodeFailed => Some(String::from("Image decode failure shown")),
        ImageAction::None => None,
    }
}

fn list_action_label(action: &ListAction) -> Option<String> {
    match action {
        ListAction::Selected { index } => Some(format!("List item {} selected", index + 1)),
        ListAction::Reloaded { count } => Some(format!("List reloaded ({count})")),
        ListAction::StatusChanged { status } => Some(format!("List status {status:?}")),
        ListAction::Retried => Some(String::from("List loading retried")),
        ListAction::None => None,
    }
}

fn menu_action_label(action: &MenuAction) -> Option<String> {
    match action {
        MenuAction::Selected { index } => Some(format!("Menu item {} selected", index + 1)),
        MenuAction::Expanded { expanded } => Some(format!(
            "Menu {}",
            if *expanded { "opened" } else { "closed" }
        )),
        MenuAction::None => None,
    }
}

fn rate_action_label(action: &RateAction) -> Option<String> {
    match action {
        RateAction::Changed { value } => Some(format!("Rate changed to {value}")),
        RateAction::Cleared => Some(String::from("Rate cleared")),
        RateAction::None => None,
    }
}

fn qr_code_action_label(action: &QrCodeAction) -> Option<String> {
    match action {
        QrCodeAction::Regenerated { regenerations } => {
            Some(format!("QR code regenerated ({regenerations})"))
        }
        QrCodeAction::FallbackChanged { enabled } => Some(format!(
            "QR fallback {}",
            if *enabled { "shown" } else { "hidden" }
        )),
        QrCodeAction::None => None,
    }
}

fn layout_action_label(action: &AffixAction) -> Option<String> {
    match action {
        AffixAction::Changed { pinned, changes } => Some(format!(
            "Affix {} ({changes})",
            if *pinned { "pinned" } else { "released" }
        )),
        AffixAction::None => None,
    }
}

fn anchor_action_label(action: &AnchorAction) -> Option<String> {
    match action {
        AnchorAction::Selected { index } => Some(format!("Anchor selected section {}", index + 1)),
        AnchorAction::None => None,
    }
}

fn card_action_label(action: &CardAction) -> Option<String> {
    match action {
        CardAction::DetailsToggled { expanded } => Some(format!(
            "Card details {}",
            if *expanded { "shown" } else { "hidden" }
        )),
        CardAction::None => None,
    }
}

fn flex_action_label(action: &FlexAction) -> Option<String> {
    match action {
        FlexAction::DirectionChanged { reversed } => Some(format!(
            "Flex direction {}",
            if *reversed { "reversed" } else { "restored" }
        )),
        FlexAction::None => None,
    }
}

fn grid_action_label(action: &GridAction) -> Option<String> {
    match action {
        GridAction::DensityChanged { compact } => Some(format!(
            "Grid density {}",
            if *compact { "compact" } else { "comfortable" }
        )),
        GridAction::None => None,
    }
}

fn app_layout_action_label(action: &LayoutAction) -> Option<String> {
    match action {
        LayoutAction::SidebarChanged { visible } => Some(format!(
            "Layout navigation {}",
            if *visible { "shown" } else { "hidden" }
        )),
        LayoutAction::None => None,
    }
}

fn masonry_action_label(action: &MasonryAction) -> Option<String> {
    match action {
        MasonryAction::DensityChanged { dense } => Some(format!(
            "Masonry density {}",
            if *dense { "dense" } else { "comfortable" }
        )),
        MasonryAction::None => None,
    }
}

fn breadcrumb_action_label(action: &BreadcrumbAction) -> Option<String> {
    match action {
        BreadcrumbAction::Selected { index } => {
            Some(format!("Breadcrumb selected item {}", index + 1))
        }
        BreadcrumbAction::OverflowToggled { open } => Some(format!(
            "Breadcrumb overflow {}",
            if *open { "opened" } else { "closed" }
        )),
        BreadcrumbAction::None => None,
    }
}

fn pagination_action_label(action: &PaginationAction) -> Option<String> {
    match action {
        PaginationAction::PageChanged { page } => Some(format!("Pagination page {page}")),
        PaginationAction::Reset => Some(String::from("Pagination reset")),
        PaginationAction::None => None,
    }
}

fn steps_action_label(action: &StepsAction) -> Option<String> {
    match action {
        StepsAction::Advanced { current } => Some(format!("Steps advanced to {}", current + 1)),
        StepsAction::Error => Some(String::from("Steps entered error state")),
        StepsAction::Retried => Some(String::from("Steps retry completed")),
        StepsAction::Reset => Some(String::from("Steps reset")),
        StepsAction::None => None,
    }
}

fn skeleton_action_label(action: &SkeletonAction) -> Option<String> {
    match action {
        SkeletonAction::LoadingChanged { loading } => Some(format!(
            "Skeleton {}",
            if *loading { "loading" } else { "idle" }
        )),
        SkeletonAction::MotionChanged { reduced } => Some(format!(
            "Skeleton motion {}",
            if *reduced { "reduced" } else { "enabled" }
        )),
        SkeletonAction::Restarted => Some(String::from("Skeleton motion restarted")),
        SkeletonAction::Reset => Some(String::from("Skeleton reset")),
        SkeletonAction::None => None,
    }
}

fn spin_action_label(action: &SpinAction) -> Option<String> {
    match action {
        SpinAction::ActiveChanged { active } => {
            Some(format!("Spin {}", if *active { "active" } else { "idle" }))
        }
        SpinAction::MotionChanged { reduced } => Some(format!(
            "Spin motion {}",
            if *reduced { "reduced" } else { "enabled" }
        )),
        SpinAction::Restarted => Some(String::from("Spin motion restarted")),
        SpinAction::None => None,
    }
}

fn statistic_action_label(action: &StatisticAction) -> Option<String> {
    match action {
        StatisticAction::ValueChanged { value } => Some(format!("Statistic value {value}")),
        StatisticAction::TrendChanged { positive } => Some(format!(
            "Statistic trend {}",
            if *positive { "up" } else { "down" }
        )),
        StatisticAction::Reset => Some(String::from("Statistic reset")),
        StatisticAction::None => None,
    }
}

fn timeline_action_label(action: &TimelineAction) -> Option<String> {
    match action {
        TimelineAction::Advanced { current } => {
            Some(format!("Timeline advanced to event {}", current + 1))
        }
        TimelineAction::Failed => Some(String::from("Timeline entered failed state")),
        TimelineAction::Retried => Some(String::from("Timeline retry completed")),
        TimelineAction::None => None,
    }
}

fn line_chart_action_label(action: &LineChartAction) -> Option<String> {
    match action {
        LineChartAction::PointSelected { point } => point
            .map(|point| {
                format!(
                    "{} point {} selected",
                    ComponentId::LineChart.spec().name,
                    point + 1
                )
            })
            .or_else(|| {
                Some(format!(
                    "{} selection cleared",
                    ComponentId::LineChart.spec().name
                ))
            }),
        LineChartAction::ViewportChanged { changes } => Some(format!(
            "{} viewport changed ({changes})",
            ComponentId::LineChart.spec().name
        )),
        LineChartAction::Reset => Some(format!("{} reset", ComponentId::LineChart.spec().name)),
    }
}

fn area_chart_action_label(action: &AreaChartAction) -> Option<String> {
    match action {
        AreaChartAction::PointSelected { point } => point
            .map(|point| {
                format!(
                    "{} point {} selected",
                    ComponentId::AreaChart.spec().name,
                    point + 1
                )
            })
            .or_else(|| {
                Some(format!(
                    "{} selection cleared",
                    ComponentId::AreaChart.spec().name
                ))
            }),
        AreaChartAction::ViewportChanged { changes } => Some(format!(
            "{} viewport changed ({changes})",
            ComponentId::AreaChart.spec().name
        )),
        AreaChartAction::Reset => Some(format!("{} reset", ComponentId::AreaChart.spec().name)),
    }
}

fn bar_chart_action_label(action: &BarChartAction) -> Option<String> {
    match action {
        BarChartAction::CategorySelected { category } => category
            .map(|category| {
                format!(
                    "{} category {} selected",
                    ComponentId::BarChart.spec().name,
                    category + 1
                )
            })
            .or_else(|| {
                Some(format!(
                    "{} selection cleared",
                    ComponentId::BarChart.spec().name
                ))
            }),
        BarChartAction::ViewportChanged { changes } => Some(format!(
            "{} viewport changed ({changes})",
            ComponentId::BarChart.spec().name
        )),
        BarChartAction::Reset => Some(format!("{} reset", ComponentId::BarChart.spec().name)),
    }
}

fn scatter_chart_action_label(action: &ScatterChartAction) -> Option<String> {
    match action {
        ScatterChartAction::PointSelected { point } => point
            .map(|point| {
                format!(
                    "{} point {} selected",
                    ComponentId::ScatterChart.spec().name,
                    point + 1
                )
            })
            .or_else(|| {
                Some(format!(
                    "{} selection cleared",
                    ComponentId::ScatterChart.spec().name
                ))
            }),
        ScatterChartAction::ViewportChanged { changes } => Some(format!(
            "{} viewport changed ({changes})",
            ComponentId::ScatterChart.spec().name
        )),
        ScatterChartAction::Reset => {
            Some(format!("{} reset", ComponentId::ScatterChart.spec().name))
        }
    }
}

fn sparkline_action_label(action: &SparklineAction) -> Option<String> {
    match action {
        SparklineAction::EndpointSelected { point } => point
            .map(|point| {
                format!(
                    "{} endpoint {} selected",
                    ComponentId::Sparkline.spec().name,
                    point + 1
                )
            })
            .or_else(|| {
                Some(format!(
                    "{} selection cleared",
                    ComponentId::Sparkline.spec().name
                ))
            }),
        SparklineAction::ViewportChanged { changes } => Some(format!(
            "{} viewport changed ({changes})",
            ComponentId::Sparkline.spec().name
        )),
        SparklineAction::Reset => Some(format!("{} reset", ComponentId::Sparkline.spec().name)),
    }
}

fn segmented_action_label(action: &SegmentedAction) -> Option<String> {
    match action {
        SegmentedAction::Selected { index } => {
            Some(format!("Segmented option {} selected", index + 1))
        }
        SegmentedAction::None => None,
    }
}

fn tabs_action_label(action: &TabsAction) -> Option<String> {
    match action {
        TabsAction::PanelSelected { index } => Some(format!("Tabs panel {} selected", index + 1)),
        TabsAction::None => None,
    }
}

fn tree_action_label(action: &TreeAction) -> Option<String> {
    match action {
        TreeAction::NodeSelected { visible_index } => {
            Some(format!("Tree node {} selected", visible_index + 1))
        }
        TreeAction::Expanded { expanded } => Some(format!(
            "Tree {}",
            if *expanded { "expanded" } else { "collapsed" }
        )),
        TreeAction::None => None,
    }
}

fn carousel_action_label(action: &CarouselAction) -> Option<String> {
    match action {
        CarouselAction::SlideChanged { index } => {
            Some(format!("Carousel slide {} selected", index + 1))
        }
        CarouselAction::PlaybackChanged { idle } => Some(format!(
            "Carousel {}",
            if *idle { "idle" } else { "active" }
        )),
        CarouselAction::None => None,
    }
}

fn splitter_action_label(action: &SplitterAction) -> Option<String> {
    match action {
        SplitterAction::Resized { leading } => Some(format!("Splitter resized to {leading} px")),
        SplitterAction::None => None,
    }
}

fn border_beam_action_label(action: &BorderBeamAction) -> Option<String> {
    match action {
        BorderBeamAction::Restarted => Some(String::from("Border beam motion restarted")),
        BorderBeamAction::MotionChanged { static_frame } => Some(format!(
            "Border beam {}",
            if *static_frame {
                "static fallback"
            } else {
                "running"
            }
        )),
        BorderBeamAction::None => None,
    }
}

fn app_action_label(action: &AppAction) -> Option<String> {
    match action {
        AppAction::Activated { count } => Some(format!("App workspace activated ({count})")),
        AppAction::Denied => Some(String::from("App activation denied")),
        AppAction::None => None,
    }
}

fn config_provider_action_label(action: &ConfigProviderAction) -> Option<String> {
    match action {
        ConfigProviderAction::ConfigurationChanged {
            dark,
            compact,
            denied,
        } => Some(format!(
            "Config provider: {} / {} / {}",
            if *dark { "dark" } else { "light" },
            if *compact { "compact" } else { "comfortable" },
            if *denied { "denied" } else { "permitted" }
        )),
        ConfigProviderAction::None => None,
    }
}

fn util_action_label(action: &UtilAction) -> Option<String> {
    match action {
        UtilAction::Executed { runs } => Some(format!("Utility completed local run {runs}")),
        UtilAction::Denied => Some(String::from("Utility network policy denied")),
        UtilAction::None => None,
    }
}

fn drawer_action_label(action: &DrawerAction) -> Option<String> {
    match action {
        DrawerAction::Opened { opens } => Some(format!("Drawer opened ({opens})")),
        DrawerAction::Closed { reason } => Some(format!("Drawer closed: {reason:?}")),
        DrawerAction::FocusTrapped { target } => Some(format!("Drawer focus trapped: {target:?}")),
        DrawerAction::None => None,
    }
}

fn dropdown_action_label(action: &DropdownAction) -> Option<String> {
    match action {
        DropdownAction::Opened => Some(String::from("Dropdown opened")),
        DropdownAction::Selected { index } => {
            Some(format!("Dropdown option {} selected", index + 1))
        }
        DropdownAction::Closed { reason } => Some(format!("Dropdown closed: {reason:?}")),
        DropdownAction::None => None,
    }
}

fn message_action_label(action: &MessageAction) -> Option<String> {
    match action {
        MessageAction::Queued { id } => Some(format!("Message {id} queued")),
        MessageAction::TimedOut { id } => Some(format!("Message {id} timed out")),
        MessageAction::Dismissed { id } => Some(format!("Message {id} dismissed")),
        MessageAction::Retried { id, retries } => Some(format!("Message {id} retried ({retries})")),
        MessageAction::Reset => Some(String::from("Message queue reset")),
        MessageAction::None => None,
    }
}

fn modal_action_label(action: &ModalAction) -> Option<String> {
    match action {
        ModalAction::Opened { opens } => Some(format!("Modal opened ({opens})")),
        ModalAction::Closed { reason } => Some(format!("Modal closed: {reason:?}")),
        ModalAction::FocusTrapped { target } => Some(format!("Modal focus trapped: {target:?}")),
        ModalAction::None => None,
    }
}

fn notification_action_label(action: &NotificationAction) -> Option<String> {
    match action {
        NotificationAction::Queued { id } => Some(format!("Notification {id} queued")),
        NotificationAction::TimedOut { id } => Some(format!("Notification {id} timed out")),
        NotificationAction::Dismissed { id } => Some(format!("Notification {id} hidden")),
        NotificationAction::Retried { id, retries } => {
            Some(format!("Notification {id} retried ({retries})"))
        }
        NotificationAction::Reset => Some(String::from("Notification queue reset")),
        NotificationAction::None => None,
    }
}

fn code_block_action_label(action: &CodeBlockAction) -> Option<String> {
    match action {
        CodeBlockAction::CopyDenied => Some(String::from("Code block clipboard denied")),
        CodeBlockAction::WrapChanged { wrapped } => Some(format!(
            "Code block wrapping {}",
            if *wrapped { "enabled" } else { "disabled" }
        )),
        CodeBlockAction::None => None,
    }
}

fn command_palette_action_label(action: &CommandPaletteAction) -> Option<String> {
    match action {
        CommandPaletteAction::OpenChanged { open } => Some(format!(
            "Command palette {}",
            if *open { "opened" } else { "closed" }
        )),
        CommandPaletteAction::DomainChanged {
            command,
            compact,
            diagnostics_visible,
        } => Some(format!(
            "Command palette {:?}: compact={compact} diagnostics={diagnostics_visible}",
            command
        )),
        CommandPaletteAction::Unsupported => {
            Some(String::from("Command palette action unsupported"))
        }
        CommandPaletteAction::Reset => Some(String::from("Command palette reset")),
        CommandPaletteAction::None => None,
    }
}

fn data_toolbar_action_label(action: &DataToolbarAction) -> Option<String> {
    match action {
        DataToolbarAction::QueryChanged { bytes } => {
            Some(format!("Data toolbar query changed ({bytes} bytes)"))
        }
        DataToolbarAction::DensityChanged { compact } => Some(format!(
            "Data toolbar density {}",
            if *compact { "compact" } else { "comfortable" }
        )),
        DataToolbarAction::Unsupported { reason } => {
            Some(format!("Data toolbar unsupported: {reason}"))
        }
        DataToolbarAction::Reset => Some(String::from("Data toolbar reset")),
        DataToolbarAction::None => None,
    }
}

fn filter_panel_action_label(action: &FilterPanelAction) -> Option<String> {
    match action {
        FilterPanelAction::DraftChanged { active, archived } => Some(format!(
            "Filter panel draft active={active} archived={archived}"
        )),
        FilterPanelAction::Committed {
            active,
            archived,
            query_bytes,
        } => Some(format!(
            "Filter panel committed active={active} archived={archived} ({query_bytes} query bytes)"
        )),
        FilterPanelAction::Reset => Some(String::from("Filter panel reset")),
        FilterPanelAction::None => None,
    }
}

fn markdown_editor_action_label(action: &MarkdownEditorAction) -> Option<String> {
    match action {
        MarkdownEditorAction::SourceChanged { bytes } => {
            Some(format!("Markdown draft changed ({bytes} bytes)"))
        }
        MarkdownEditorAction::PreviewChanged { live_preview } => Some(format!(
            "Markdown preview {}",
            if *live_preview { "enabled" } else { "disabled" }
        )),
        MarkdownEditorAction::Reset => Some(String::from("Markdown editor reset")),
        MarkdownEditorAction::None => None,
    }
}

fn table_action_label(action: &TableAction) -> Option<String> {
    match action {
        TableAction::Selected { row } => Some(format!("Table row {} selected", row + 1)),
        TableAction::PageChanged { page } => Some(format!("Table page {}", page + 1)),
        TableAction::DensityChanged { dense } => Some(format!(
            "Table density {}",
            if *dense { "dense" } else { "comfortable" }
        )),
        TableAction::Reloaded { reloads } => Some(format!("Table reloaded ({reloads})")),
        TableAction::None => None,
    }
}

fn mermaid_svg_viewer_action_label(action: &MermaidSvgViewerAction) -> Option<String> {
    match action {
        MermaidSvgViewerAction::Edited { edits } => {
            Some(format!("Mermaid source edited ({edits})"))
        }
        MermaidSvgViewerAction::Validated { valid, validations } => Some(format!(
            "Mermaid validation {} ({validations})",
            if *valid { "passed" } else { "blocked" }
        )),
        MermaidSvgViewerAction::PreviewToggled { visible } => Some(format!(
            "Mermaid preview {}",
            if *visible { "shown" } else { "hidden" }
        )),
        MermaidSvgViewerAction::Blocked { blocks } => {
            Some(format!("Mermaid preview blocked ({blocks})"))
        }
        MermaidSvgViewerAction::None => None,
    }
}

fn metric_card_action_label(action: &MetricCardAction) -> Option<String> {
    match action {
        MetricCardAction::ValueChanged { value, updates } => {
            Some(format!("Metric card value {value} ({updates})"))
        }
        MetricCardAction::TrendChanged { positive } => Some(format!(
            "Metric card trend {}",
            if *positive { "up" } else { "down" }
        )),
        MetricCardAction::None => None,
    }
}

fn mini_chart_card_action_label(action: &MiniChartCardAction) -> Option<String> {
    match action {
        MiniChartCardAction::SeriesChanged { series } => {
            Some(format!("Mini chart series {}", series + 1))
        }
        MiniChartCardAction::PlaybackChanged { paused } => Some(format!(
            "Mini chart playback {}",
            if *paused { "paused" } else { "running" }
        )),
        MiniChartCardAction::MotionChanged { reduced_motion } => Some(format!(
            "Mini chart motion {}",
            if *reduced_motion { "reduced" } else { "full" }
        )),
        MiniChartCardAction::None => None,
    }
}

fn mobile_preview_frame_action_label(action: &MobilePreviewFrameAction) -> Option<String> {
    match action {
        MobilePreviewFrameAction::DeviceChanged { device } => {
            Some(format!("Mobile preview device {}", device + 1))
        }
        MobilePreviewFrameAction::OrientationChanged { landscape } => Some(format!(
            "Mobile preview orientation {}",
            if *landscape { "landscape" } else { "portrait" }
        )),
        MobilePreviewFrameAction::FixtureActivated { visits } => {
            Some(format!("Mobile preview fixture saved ({visits})"))
        }
        MobilePreviewFrameAction::None => None,
    }
}

fn property_list_action_label(action: &PropertyListAction) -> Option<String> {
    match action {
        PropertyListAction::Selected { index } => Some(format!("Property {} selected", index + 1)),
        PropertyListAction::CopyDenied { index } => {
            Some(format!("Property {} clipboard denied", index + 1))
        }
        PropertyListAction::DensityChanged { dense } => Some(format!(
            "Property list density {}",
            if *dense { "dense" } else { "comfortable" }
        )),
        PropertyListAction::None => None,
    }
}

fn status_timeline_action_label(action: &StatusTimelineAction) -> Option<String> {
    match action {
        StatusTimelineAction::Advanced { current } | StatusTimelineAction::Selected { current } => {
            Some(format!("Status timeline stage {}", current + 1))
        }
        StatusTimelineAction::Failed { current } => {
            Some(format!("Status timeline stage {} failed", current + 1))
        }
        StatusTimelineAction::Retried { retries } => {
            Some(format!("Status timeline retry ({retries})"))
        }
        StatusTimelineAction::None => None,
    }
}

fn tour_action_label(action: &TourAction) -> Option<String> {
    match action {
        TourAction::Started { visits } => Some(format!("Tour started ({visits})")),
        TourAction::StepChanged { step } => Some(format!("Tour step {}", step + 1)),
        TourAction::Completed { completions } => Some(format!("Tour completed ({completions})")),
        TourAction::None => None,
    }
}

fn popconfirm_action_label(action: &PopconfirmAction) -> Option<String> {
    match action {
        PopconfirmAction::Opened => Some(String::from("Popconfirm opened")),
        PopconfirmAction::Confirmed => Some(String::from("Popconfirm confirmed")),
        PopconfirmAction::Closed { reason } => Some(format!("Popconfirm cancelled: {reason:?}")),
        PopconfirmAction::FocusTrapped { target } => {
            Some(format!("Popconfirm focus trapped: {target:?}"))
        }
        PopconfirmAction::None => None,
    }
}

fn popover_action_label(action: &PopoverAction) -> Option<String> {
    match action {
        PopoverAction::Opened { toggles } => Some(format!("Popover opened ({toggles})")),
        PopoverAction::Closed { reason } => Some(format!("Popover closed: {reason:?}")),
        PopoverAction::None => None,
    }
}

fn tooltip_action_label(action: &TooltipAction) -> Option<String> {
    match action {
        TooltipAction::Shown => Some(String::from("Tooltip shown")),
        TooltipAction::Hidden { reason } => Some(format!("Tooltip hidden: {reason:?}")),
        TooltipAction::Reset => Some(String::from("Tooltip reset")),
        TooltipAction::None => None,
    }
}

fn native_surface_payload_label(
    id: ComponentId,
    payload: &dyn WidgetActionTrait,
) -> Option<String> {
    if AtomicSurfaceCatalog::contains(id) {
        return payload.downcast_ref::<AtomicAction>().and_then(|action| {
            counts_as_native_surface_action(action).then(|| match action {
                AtomicAction::Activated {
                    component: AtomicComponent::Toolbar,
                    command,
                } => format!("Toolbar command {command} completed"),
                _ => String::from("Native atomic action completed"),
            })
        });
    }

    if InputWidgetCatalog::contains(id) {
        return payload
            .downcast_ref::<InputSurfaceAction>()
            .and_then(|action| input_action_label_for_component(id, action));
    }

    if InputCompositeSurfaceCatalog::contains(id) {
        return match id {
            ComponentId::AutoComplete => payload
                .downcast_ref::<AutoCompleteAction>()
                .and_then(auto_complete_action_label)
                .and_then(|action| component_scoped_label(id, Some(action))),
            ComponentId::Mentions => payload
                .downcast_ref::<MentionsAction>()
                .and_then(mentions_action_label)
                .and_then(|action| component_scoped_label(id, Some(action))),
            ComponentId::ColorPicker => payload
                .downcast_ref::<ColorPickerAction>()
                .and_then(color_picker_action_label)
                .and_then(|action| component_scoped_label(id, Some(action))),
            ComponentId::DatePicker => payload
                .downcast_ref::<DatePickerAction>()
                .and_then(date_picker_action_label)
                .and_then(|action| component_scoped_label(id, Some(action))),
            ComponentId::TimePicker => payload
                .downcast_ref::<TimePickerAction>()
                .and_then(time_picker_action_label)
                .and_then(|action| component_scoped_label(id, Some(action))),
            _ => None,
        };
    }

    if AdvancedInputSurfaceCatalog::contains(id) {
        return match id {
            ComponentId::Cascader => payload
                .downcast_ref::<CascaderAction>()
                .and_then(cascader_action_label)
                .and_then(|action| component_scoped_label(id, Some(action))),
            ComponentId::TreeSelect => payload
                .downcast_ref::<TreeSelectAction>()
                .and_then(tree_select_action_label)
                .and_then(|action| component_scoped_label(id, Some(action))),
            ComponentId::Transfer => payload
                .downcast_ref::<TransferAction>()
                .and_then(transfer_action_label)
                .and_then(|action| component_scoped_label(id, Some(action))),
            ComponentId::Upload => payload
                .downcast_ref::<UploadAction>()
                .and_then(upload_action_label)
                .and_then(|action| component_scoped_label(id, Some(action))),
            ComponentId::Form => payload
                .downcast_ref::<FormAction>()
                .and_then(form_action_label)
                .and_then(|action| component_scoped_label(id, Some(action))),
            _ => None,
        };
    }

    match id {
        ComponentId::Alert => payload
            .downcast_ref::<AlertAction>()
            .and_then(feedback_action_label),
        ComponentId::Empty => payload
            .downcast_ref::<EmptyAction>()
            .and_then(empty_action_label),
        ComponentId::Progress => payload
            .downcast_ref::<ProgressAction>()
            .and_then(progress_action_label),
        ComponentId::Result => payload
            .downcast_ref::<ResultAction>()
            .and_then(result_action_label),
        ComponentId::Calendar => payload
            .downcast_ref::<CalendarAction>()
            .and_then(calendar_action_label),
        ComponentId::Collapse => payload
            .downcast_ref::<CollapseAction>()
            .and_then(collapse_action_label),
        ComponentId::Descriptions => payload
            .downcast_ref::<DescriptionsAction>()
            .and_then(descriptions_action_label),
        ComponentId::Image => payload
            .downcast_ref::<ImageAction>()
            .and_then(image_action_label),
        ComponentId::List => payload
            .downcast_ref::<ListAction>()
            .and_then(list_action_label),
        ComponentId::Menu => payload
            .downcast_ref::<MenuAction>()
            .and_then(menu_action_label),
        ComponentId::QrCode => payload
            .downcast_ref::<QrCodeAction>()
            .and_then(qr_code_action_label),
        ComponentId::Rate => payload
            .downcast_ref::<RateAction>()
            .and_then(rate_action_label),
        ComponentId::Affix => payload
            .downcast_ref::<AffixAction>()
            .and_then(layout_action_label),
        ComponentId::Anchor => payload
            .downcast_ref::<AnchorAction>()
            .and_then(anchor_action_label),
        ComponentId::Card => payload
            .downcast_ref::<CardAction>()
            .and_then(card_action_label),
        ComponentId::Flex => payload
            .downcast_ref::<FlexAction>()
            .and_then(flex_action_label),
        ComponentId::Grid => payload
            .downcast_ref::<GridAction>()
            .and_then(grid_action_label),
        ComponentId::Layout => payload
            .downcast_ref::<LayoutAction>()
            .and_then(app_layout_action_label),
        ComponentId::Masonry => payload
            .downcast_ref::<MasonryAction>()
            .and_then(masonry_action_label),
        ComponentId::Breadcrumb => payload
            .downcast_ref::<BreadcrumbAction>()
            .and_then(breadcrumb_action_label),
        ComponentId::Pagination => payload
            .downcast_ref::<PaginationAction>()
            .and_then(pagination_action_label),
        ComponentId::Steps => payload
            .downcast_ref::<StepsAction>()
            .and_then(steps_action_label),
        ComponentId::Skeleton => payload
            .downcast_ref::<SkeletonAction>()
            .and_then(skeleton_action_label),
        ComponentId::Spin => payload
            .downcast_ref::<SpinAction>()
            .and_then(spin_action_label),
        ComponentId::Statistic => payload
            .downcast_ref::<StatisticAction>()
            .and_then(statistic_action_label),
        ComponentId::Timeline => payload
            .downcast_ref::<TimelineAction>()
            .and_then(timeline_action_label),
        ComponentId::LineChart => payload
            .downcast_ref::<LineChartAction>()
            .and_then(line_chart_action_label),
        ComponentId::AreaChart => payload
            .downcast_ref::<AreaChartAction>()
            .and_then(area_chart_action_label),
        ComponentId::BarChart => payload
            .downcast_ref::<BarChartAction>()
            .and_then(bar_chart_action_label),
        ComponentId::FunnelChart => payload
            .downcast_ref::<FunnelChartAction>()
            .and_then(funnel_chart_action_label),
        ComponentId::GaugeChart => payload
            .downcast_ref::<GaugeChartAction>()
            .and_then(gauge_chart_action_label),
        ComponentId::Heatmap => payload
            .downcast_ref::<HeatmapAction>()
            .and_then(heatmap_action_label),
        ComponentId::MindMap => payload
            .downcast_ref::<MindMapAction>()
            .and_then(mind_map_action_label),
        ComponentId::OrganizationChart => payload
            .downcast_ref::<OrganizationChartAction>()
            .and_then(organization_chart_action_label),
        ComponentId::PieChart => payload
            .downcast_ref::<PieChartAction>()
            .and_then(pie_chart_action_label),
        ComponentId::RadarChart => payload
            .downcast_ref::<RadarChartAction>()
            .and_then(radar_chart_action_label),
        ComponentId::SankeyChart => payload
            .downcast_ref::<SankeyChartAction>()
            .and_then(sankey_chart_action_label),
        ComponentId::ScatterChart => payload
            .downcast_ref::<ScatterChartAction>()
            .and_then(scatter_chart_action_label),
        ComponentId::Sparkline => payload
            .downcast_ref::<SparklineAction>()
            .and_then(sparkline_action_label),
        ComponentId::Treemap => payload
            .downcast_ref::<TreemapAction>()
            .and_then(treemap_action_label),
        ComponentId::WordCloud => payload
            .downcast_ref::<WordCloudAction>()
            .and_then(word_cloud_action_label),
        ComponentId::Segmented => payload
            .downcast_ref::<SegmentedAction>()
            .and_then(segmented_action_label),
        ComponentId::Tabs => payload
            .downcast_ref::<TabsAction>()
            .and_then(tabs_action_label),
        ComponentId::Tree => payload
            .downcast_ref::<TreeAction>()
            .and_then(tree_action_label),
        ComponentId::Carousel => payload
            .downcast_ref::<CarouselAction>()
            .and_then(carousel_action_label),
        ComponentId::Splitter => payload
            .downcast_ref::<SplitterAction>()
            .and_then(splitter_action_label),
        ComponentId::BorderBeam => payload
            .downcast_ref::<BorderBeamAction>()
            .and_then(border_beam_action_label),
        ComponentId::App => payload
            .downcast_ref::<AppAction>()
            .and_then(app_action_label),
        ComponentId::ConfigProvider => payload
            .downcast_ref::<ConfigProviderAction>()
            .and_then(config_provider_action_label),
        ComponentId::Util => payload
            .downcast_ref::<UtilAction>()
            .and_then(util_action_label),
        ComponentId::Drawer => payload
            .downcast_ref::<DrawerAction>()
            .and_then(drawer_action_label),
        ComponentId::Dropdown => payload
            .downcast_ref::<DropdownAction>()
            .and_then(dropdown_action_label),
        ComponentId::Message => payload
            .downcast_ref::<MessageAction>()
            .and_then(message_action_label),
        ComponentId::Modal => payload
            .downcast_ref::<ModalAction>()
            .and_then(modal_action_label),
        ComponentId::Notification => payload
            .downcast_ref::<NotificationAction>()
            .and_then(notification_action_label),
        ComponentId::Popconfirm => payload
            .downcast_ref::<PopconfirmAction>()
            .and_then(popconfirm_action_label),
        ComponentId::Popover => payload
            .downcast_ref::<PopoverAction>()
            .and_then(popover_action_label),
        ComponentId::Tooltip => payload
            .downcast_ref::<TooltipAction>()
            .and_then(tooltip_action_label),
        ComponentId::CodeBlock => payload
            .downcast_ref::<CodeBlockAction>()
            .and_then(code_block_action_label),
        ComponentId::CommandPalette => payload
            .downcast_ref::<CommandPaletteAction>()
            .and_then(command_palette_action_label),
        ComponentId::DataToolbar => payload
            .downcast_ref::<DataToolbarAction>()
            .and_then(data_toolbar_action_label),
        ComponentId::FilterPanel => payload
            .downcast_ref::<FilterPanelAction>()
            .and_then(filter_panel_action_label),
        ComponentId::MarkdownEditor => payload
            .downcast_ref::<MarkdownEditorAction>()
            .and_then(markdown_editor_action_label),
        ComponentId::Table => payload
            .downcast_ref::<TableAction>()
            .and_then(table_action_label),
        ComponentId::MermaidSvgViewer => payload
            .downcast_ref::<MermaidSvgViewerAction>()
            .and_then(mermaid_svg_viewer_action_label),
        ComponentId::MetricCard => payload
            .downcast_ref::<MetricCardAction>()
            .and_then(metric_card_action_label),
        ComponentId::MiniChartCard => payload
            .downcast_ref::<MiniChartCardAction>()
            .and_then(mini_chart_card_action_label),
        ComponentId::MobilePreviewFrame => payload
            .downcast_ref::<MobilePreviewFrameAction>()
            .and_then(mobile_preview_frame_action_label),
        ComponentId::PropertyList => payload
            .downcast_ref::<PropertyListAction>()
            .and_then(property_list_action_label),
        ComponentId::StatusTimeline => payload
            .downcast_ref::<StatusTimelineAction>()
            .and_then(status_timeline_action_label),
        ComponentId::Tour => payload
            .downcast_ref::<TourAction>()
            .and_then(tour_action_label),
        _ => None,
    }
}

fn native_surface_action_label(id: ComponentId, actions: &Actions) -> Option<String> {
    actions.iter().find_map(|action| {
        let widget_action = action.as_widget_action()?;
        let payload = &widget_action.action;
        native_surface_payload_label(id, payload.as_ref())
    })
}

fn detail_surface_is_mountable(
    id: ComponentId,
    route_generation: u64,
    ack: Option<ComponentDetailMountAck>,
) -> bool {
    components::surface(id).availability().is_connected()
        && ack.is_some_and(|ack| ack.component == id && ack.generation == route_generation)
}

script_mod! {
    use mod.prelude.widgets.*
    use mod.widgets.*

    startup() do #(App::script_component(vm)){
        ui: Root{
            main_window := Window{
                pass.clear_color: theme.color_bg_app
                window.inner_size: vec2(1240, 800)
                window.title: "Tessera Makepad"
                body +: {
                    TesseraShell{
                        sidebar +: {
                            sidebar_content +: {
                                component_sidebar := ComponentSidebar{}
                            }
                        }
                    }
                }
            }
        }
    }
}

#[derive(Script, ScriptHook)]
pub struct App {
    #[source]
    source: ScriptObjectRef,
    #[live]
    ui: WidgetRef,
    #[rust]
    theme_templates: ThemeTemplates,
    #[rust]
    requested_theme: RequestedTheme,
    #[rust]
    resolved_theme: ThemeMode,
    #[rust]
    gallery_host: GalleryHost,
    #[rust]
    sample_runs: u32,
    #[rust]
    last_surface_action: Option<String>,
    #[rust]
    acceptance_expanded: bool,
}

impl Default for App {
    fn default() -> Self {
        let requested_theme = requested_theme_from_args();
        let resolved_theme = resolved_theme(requested_theme);
        set_active_theme(resolved_theme);
        Self {
            source: ScriptObjectRef::default(),
            ui: WidgetRef::default(),
            theme_templates: ThemeTemplates::default(),
            requested_theme,
            resolved_theme,
            gallery_host: GalleryHost::bootstrap(),
            sample_runs: 0,
            last_surface_action: None,
            acceptance_expanded: false,
        }
    }
}

impl App {
    fn retain_initial_theme(&mut self, vm: &mut ScriptVm, rendered_theme: ThemeMode) {
        let source = self.source.clone();
        self.theme_templates
            .get_or_init(vm, rendered_theme, |_| source.as_object().into());
    }

    fn requested_theme_label(&self) -> &'static str {
        match self.requested_theme {
            RequestedTheme::Light => "Light",
            RequestedTheme::Dark => "Dark",
            RequestedTheme::System => "System",
        }
    }

    fn cycle_requested_theme(&mut self) {
        self.requested_theme = match self.requested_theme {
            RequestedTheme::Light => RequestedTheme::Dark,
            RequestedTheme::Dark => RequestedTheme::System,
            RequestedTheme::System => RequestedTheme::Light,
        };
        self.resolved_theme = resolved_theme(self.requested_theme);
        set_active_theme(self.resolved_theme);
    }

    fn update_theme_status(&self, cx: &mut Cx) {
        let message = format!(
            "Requested {} -> resolved {}",
            self.requested_theme_label(),
            self.resolved_theme.label(),
        );
        self.ui.label(cx, ids!(theme_status)).set_text(cx, &message);
    }

    fn apply_theme_template(&mut self, cx: &mut Cx) {
        let runtime = ThemeRuntimeState::capture(&self.ui);
        let theme = self.resolved_theme;
        cx.with_vm(|vm| {
            let template = self.theme_templates.get_or_init(vm, theme, |vm| {
                vm.with_reload(|vm| Self::themed_script_mod(vm, theme))
            });
            self.script_apply(
                vm,
                &Apply::ScriptReapply,
                &mut Scope::empty(),
                template.as_object().into(),
            );
        });
        runtime.restore(cx);
        self.apply_component_theme(cx);
        self.update_theme_status(cx);
        self.update_component_detail(cx);
        cx.redraw_all();
    }

    fn update_component_detail(&self, cx: &mut Cx) {
        let Some(selected_component) = self.gallery_host.active_route().component_id() else {
            self.ui
                .label(cx, ids!(component_name))
                .set_text(cx, "Component catalog");
            self.ui
                .label(cx, ids!(component_summary))
                .set_text(cx, "Select a component to open its native detail route.");
            self.ui
                .label(cx, ids!(component_category))
                .set_text(cx, "101 routes / Makepad surfaces");
            self.ui
                .label(cx, ids!(component_interaction))
                .set_text(cx, "open");
            self.ui
                .label(cx, ids!(component_family))
                .set_text(cx, "Gallery");
            self.ui
                .label(cx, ids!(component_keyboard))
                .set_text(cx, "Tab / Enter");
            self.ui
                .label(cx, ids!(component_states))
                .set_text(cx, "catalog / detail");
            self.ui
                .label(cx, ids!(component_sample))
                .set_text(cx, "independent route selection");
            self.ui
                .label(cx, ids!(component_action_status))
                .set_text(cx, "Catalog route ready.");
            self.ui
                .label(cx, ids!(component_code))
                .set_text(cx, "Select a component to inspect its Makepad source.");
            self.ui
                .label(cx, ids!(component_docs))
                .set_text(cx, "native/docs/product-acceptance.md");
            return;
        };
        let spec = selected_component.spec();
        let definition = components::definition(selected_component);
        let interaction_status = self.component_interaction_status(selected_component);

        self.ui
            .label(cx, ids!(component_name))
            .set_text(cx, spec.name);
        self.ui
            .label(cx, ids!(component_summary))
            .set_text(cx, spec.summary);
        self.ui.label(cx, ids!(component_category)).set_text(
            cx,
            &format!(
                "{} / {} / {}",
                spec.category.label(),
                spec.group.label(),
                spec.slug
            ),
        );
        self.ui
            .label(cx, ids!(component_interaction))
            .set_text(cx, definition.interaction.label());
        self.ui
            .label(cx, ids!(component_family))
            .set_text(cx, definition.family.label());
        self.ui
            .label(cx, ids!(component_keyboard))
            .set_text(cx, definition.keyboard);
        self.ui
            .label(cx, ids!(component_states))
            .set_text(cx, definition.states);
        self.ui
            .label(cx, ids!(component_sample))
            .set_text(cx, definition.sample);
        self.ui
            .label(cx, ids!(component_action_status))
            .set_text(cx, &interaction_status);
        let source_path = if let Some(widget) = components::surface(selected_component)
            .availability()
            .widget()
        {
            format!(
                "Widget: {widget}\nDefinition: native/crates/tessera-makepad/src/components/{}.rs",
                selected_component.as_str().replace('-', "_")
            )
        } else {
            format!(
                "Definition: native/crates/tessera-makepad/src/components/{}.rs",
                selected_component.as_str().replace('-', "_")
            )
        };
        self.ui
            .label(cx, ids!(component_code))
            .set_text(cx, &source_path);
        self.ui.label(cx, ids!(component_docs)).set_text(
            cx,
            &format!(
                "native/docs/product-acceptance.md#{}\nnative/crates/tessera-gallery/src/component_detail.rs",
                spec.slug
            ),
        );
    }

    fn component_interaction_status(&self, id: ComponentId) -> String {
        if !components::surface(id).availability().is_connected() {
            return String::from("Native surface blocked; route smoke only.");
        }

        let definition = components::definition(id);
        if self.sample_runs == 0 {
            format!("Ready to exercise {}.", definition.interaction.label())
        } else if let Some(action) = &self.last_surface_action {
            format!(
                "{action} recorded for {} (run {}).",
                id.spec().name,
                self.sample_runs
            )
        } else {
            format!(
                "{} interaction recorded for {} (run {}).",
                definition.interaction.label(),
                id.spec().name,
                self.sample_runs
            )
        }
    }

    fn sync_component_surface(&mut self, cx: &mut Cx, id: ComponentId) {
        if let Some(mut sidebar) = self
            .ui
            .widget(cx, ids!(component_sidebar))
            .borrow_mut::<crate::component_catalog::ComponentSidebar>()
        {
            sidebar.set_selected(cx, Some(id));
        }
        self.show_component_detail(cx);
        self.ui
            .view(cx, ids!(content_scroll))
            .set_scroll_pos(cx, dvec2(0.0, 0.0));
        let route = GalleryPage::component(id);
        let transition = self.gallery_host.navigate(route).ok();
        let route_generation = transition.as_ref().map_or_else(
            || self.gallery_host.state().route_generation(),
            |t| t.generation,
        );
        if transition.is_some_and(|transition| transition.changed) {
            self.sample_runs = 0;
            self.last_surface_action = None;
            self.acceptance_expanded = false;
            self.ui
                .view(cx, ids!(acceptance_panel))
                .set_visible(cx, false);
            self.ui
                .button(cx, ids!(acceptance_toggle))
                .set_text(cx, "Details and acceptance");
        }
        if let Some(mut detail) = self
            .ui
            .widget(cx, ids!(component_surface))
            .borrow_mut::<ComponentDetail>()
        {
            detail.select(cx, id, self.resolved_theme, route_generation);
        }
        self.update_component_detail(cx);
    }

    fn apply_component_theme(&mut self, cx: &mut Cx) {
        let theme = self.resolved_theme;
        if let Some(mut detail) = self
            .ui
            .widget(cx, ids!(component_surface))
            .borrow_mut::<ComponentDetail>()
        {
            detail.apply_theme(cx, theme);
        }
    }

    fn clear_component_surface(&mut self, cx: &mut Cx) {
        let opener = self.gallery_host.take_component_opener();
        if let Some(mut sidebar) = self
            .ui
            .widget(cx, ids!(component_sidebar))
            .borrow_mut::<crate::component_catalog::ComponentSidebar>()
        {
            sidebar.set_selected(cx, None);
        }
        self.show_component_catalog(cx);
        let _ = self.gallery_host.navigate(GalleryPage::Shell);
        self.sample_runs = 0;
        self.last_surface_action = None;
        self.acceptance_expanded = false;
        self.ui
            .view(cx, ids!(acceptance_panel))
            .set_visible(cx, false);
        self.ui
            .button(cx, ids!(acceptance_toggle))
            .set_text(cx, "Details and acceptance");
        if let Some(mut detail) = self
            .ui
            .widget(cx, ids!(component_surface))
            .borrow_mut::<ComponentDetail>()
        {
            detail.clear(cx);
        }
        self.update_component_detail(cx);
        if let Some(opener) = opener {
            match opener.origin {
                crate::route::NavigationOrigin::Catalog => {
                    if let Some(mut catalog) =
                        self.ui
                            .widget(cx, ids!(component_catalog))
                            .borrow_mut::<crate::component_catalog::ComponentCatalog>()
                    {
                        catalog.restore_focus(cx, opener.component, opener.reveal_on_return);
                    }
                }
                crate::route::NavigationOrigin::Sidebar => {
                    if let Some(mut sidebar) =
                        self.ui
                            .widget(cx, ids!(component_sidebar))
                            .borrow_mut::<crate::component_catalog::ComponentSidebar>()
                    {
                        sidebar.restore_focus(cx, opener.component);
                    }
                }
            }
        }
    }

    fn show_component_catalog(&self, cx: &mut Cx) {
        self.ui.view(cx, ids!(catalog_page)).set_visible(cx, true);
        self.ui
            .view(cx, ids!(content_scroll))
            .set_visible(cx, false);
    }

    fn show_component_detail(&self, cx: &mut Cx) {
        self.ui.view(cx, ids!(catalog_page)).set_visible(cx, false);
        self.ui.view(cx, ids!(content_scroll)).set_visible(cx, true);
    }

    fn update_component_action_status(&self, cx: &mut Cx) {
        let Some(id) = self.gallery_host.active_route().component_id() else {
            self.ui
                .label(cx, ids!(component_action_status))
                .set_text(cx, "Catalog route ready.");
            return;
        };
        self.ui
            .label(cx, ids!(component_action_status))
            .set_text(cx, &self.component_interaction_status(id));
    }
}

impl MatchEvent for App {
    fn handle_startup(&mut self, cx: &mut Cx) {
        if std::env::args().any(|argument| argument == "--focus-trace") {
            tessera_makepad::foundation::focus_trace::enable(cx);
        }
        if std::env::args().any(|argument| argument == "--render-trace") {
            tessera_makepad::foundation::render_trace::enable(cx);
        }
        // Script-created components initialize Rust fields from their field
        // defaults, not this type's `Default` implementation. Rehydrate all
        // command-scoped state here so every independent gallery launch opens
        // the requested component with the matching theme state.
        self.requested_theme = requested_theme_from_args();
        self.resolved_theme = resolved_theme(self.requested_theme);
        set_active_theme(self.resolved_theme);
        self.gallery_host = GalleryHost::bootstrap();
        self.sample_runs = 0;
        self.last_surface_action = None;
        self.acceptance_expanded = false;
        let viewport = std::env::args().find_map(|argument| viewport_from_arg(&argument));
        if let Some((width, height)) = viewport {
            self.ui
                .window(cx, ids!(main_window))
                .resize(cx, dvec2(f64::from(width), f64::from(height)));
        }

        self.update_theme_status(cx);
        match component_selector_from_args(std::env::args().skip(1)) {
            Ok(Some(component)) => self.sync_component_surface(cx, component),
            Ok(None) => self.clear_component_surface(cx),
            Err(error) => {
                eprintln!("invalid component selector: {error}");
                std::process::exit(2);
            }
        }
        // A scripted Makepad root has no first paint until the host requests one.
        // Scheduling it from Rust avoids re-entering the script VM during startup.
        cx.redraw_all();
    }

    fn handle_actions(&mut self, cx: &mut Cx, actions: &Actions) {
        if self.gallery_host.active_route().component_id() == Some(ComponentId::SankeyChart) {
            use crate::fixtures::SankeyFixture;
            for (control, fixture) in [
                (ids!(sankey_sample), SankeyFixture::Sample),
                (ids!(sankey_empty), SankeyFixture::Empty),
                (ids!(sankey_cycle), SankeyFixture::Cycle),
                (ids!(sankey_capacity), SankeyFixture::Capacity),
                (ids!(sankey_zero), SankeyFixture::ZeroFlows),
                (ids!(sankey_overflow), SankeyFixture::Overflow),
            ] {
                if self.ui.button(cx, control).clicked(actions) {
                    let (nodes, links) = fixture.data();
                    if let Some(mut widget) = self
                        .ui
                        .widget(cx, ids!(sankey_chart_surface))
                        .borrow_mut::<TesseraSankeyChart>()
                    {
                        widget.set_data(cx, nodes, links);
                    }
                }
            }
        }
        if let Some(opener) =
            crate::component_catalog::ComponentCatalog::opener_from_actions(actions)
        {
            self.sync_component_surface(cx, opener.component);
            self.gallery_host.record_component_opener(opener);
            tessera_makepad::foundation::focus_trace::record(cx, "route-open", None, || {
                format!(
                    "opener={opener:?} generation={}",
                    self.gallery_host.state().route_generation()
                )
            });
        }

        if let Some(mount_ack) = actions.iter().find_map(|action| {
            let widget_action = action.as_widget_action()?;
            widget_action
                .action
                .downcast_ref::<ComponentDetailMountAck>()
                .copied()
        }) {
            if let Some(id) = self.gallery_host.active_route().component_id() {
                let route_generation = self.gallery_host.state().route_generation();
                let detail_acknowledged = self
                    .ui
                    .widget(cx, ids!(component_surface))
                    .borrow_mut::<ComponentDetail>()
                    .is_some_and(|detail| detail.mount_acknowledged(cx, mount_ack));
                tessera_makepad::foundation::focus_trace::record(cx, "mount-ack", None, || {
                    format!(
                        "ack={mount_ack:?} generation={route_generation} valid={detail_acknowledged}"
                    )
                });
                if detail_acknowledged
                    && detail_surface_is_mountable(id, route_generation, Some(mount_ack))
                {
                    let _ = self.gallery_host.dispatch_surface(
                        tessera_makepad::components::ComponentSurfaceEvent::Mount,
                    );
                    let back = self.ui.button(cx, ids!(component_back));
                    if back.area().is_valid(cx)
                        && self.gallery_host.take_detail_focus(route_generation)
                    {
                        cx.set_key_focus(back.area());
                        tessera_makepad::foundation::focus_trace::record(
                            cx,
                            "detail-focus-request",
                            Some(back.area()),
                            || format!("component={id:?} generation={route_generation}"),
                        );
                    }
                }
            }
        }

        if let Some(id) = self.gallery_host.active_route().component_id() {
            if let Some(action_label) = native_surface_action_label(id, actions) {
                self.sample_runs = self.sample_runs.saturating_add(1);
                self.last_surface_action = Some(action_label);
                self.update_component_action_status(cx);
            }
        }

        if self.ui.button(cx, ids!(component_back)).clicked(actions) {
            tessera_makepad::foundation::focus_trace::record(cx, "route-back", None, || {
                format!(
                    "route={:?} generation={}",
                    self.gallery_host.active_route(),
                    self.gallery_host.state().route_generation()
                )
            });
            self.clear_component_surface(cx);
        }

        if self.ui.button(cx, ids!(catalog_button)).clicked(actions) {
            self.clear_component_surface(cx);
        }

        if self.ui.button(cx, ids!(acceptance_toggle)).clicked(actions) {
            self.acceptance_expanded = !self.acceptance_expanded;
            self.ui
                .view(cx, ids!(acceptance_panel))
                .set_visible(cx, self.acceptance_expanded);
            self.ui.button(cx, ids!(acceptance_toggle)).set_text(
                cx,
                if self.acceptance_expanded {
                    "Hide details"
                } else {
                    "Details and acceptance"
                },
            );
        }

        if self.ui.button(cx, ids!(toggle_theme)).clicked(actions) {
            let previous = self.resolved_theme;
            self.cycle_requested_theme();
            if self.resolved_theme != previous {
                self.apply_theme_template(cx);
            } else {
                self.update_theme_status(cx);
            }
        }
    }
}

impl App {
    fn trace_focus_event(&self, cx: &mut Cx, event: &Event, stage: &'static str) {
        use tessera_makepad::foundation::focus_trace;
        if !focus_trace::enabled(cx) {
            return;
        }
        let name = match event {
            Event::KeyDown(_) => "key-down",
            Event::KeyUp(_) => "key-up",
            Event::KeyFocus(_) => "key-focus",
            Event::KeyFocusLost(_) => "key-focus-lost",
            Event::WindowGotFocus(_) => "window-got-focus",
            Event::WindowLostFocus(_) => "window-lost-focus",
            Event::Pause => "pause",
            Event::Resume => "resume",
            _ => return,
        };
        let key = match event {
            Event::KeyDown(key) | Event::KeyUp(key) => Some((key.key_code, key.modifiers)),
            _ => None,
        };
        let back = self.ui.button(cx, ids!(component_back));
        focus_trace::record(cx, stage, Some(back.area()), || {
            format!(
                "event={name} key={key:?} route={:?} generation={}",
                self.gallery_host.active_route(),
                self.gallery_host.state().route_generation()
            )
        });
    }

    fn themed_script_mod(vm: &mut ScriptVm, theme: ThemeMode) -> ScriptValue {
        tessera_makepad::script_mod_with(vm, theme, crate::resources::install_font);
        crate::component_catalog::script_mod(vm);
        crate::component_detail::script_mod(vm);
        tessera_makepad::components::shell::script_mod(vm);
        self::script_mod(vm)
    }
}

impl AppMain for App {
    fn script_mod(vm: &mut ScriptVm) -> ScriptValue {
        Self::themed_script_mod(vm, active_theme())
    }

    fn after_new_from_script(vm: &mut ScriptVm, app: &mut Self) {
        // Rust fields still have type defaults here; startup hydrates them later.
        // The retained graph must be indexed by the theme used in script_mod.
        app.retain_initial_theme(vm, active_theme());
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event) {
        self.trace_focus_event(cx, event, "event-before");
        self.match_event(cx, event);
        if matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Tab) {
            let window = self.ui.window(cx, ids!(main_window));
            tessera_makepad::foundation::focus::dispatch_tab_navigation(cx, event, &window, |cx| {
                self.ui.handle_event(cx, event, &mut Scope::empty());
            });
        } else {
            self.ui.handle_event(cx, event, &mut Scope::empty());
        }
        if matches!(event, Event::LiveEdit) {
            self.update_theme_status(cx);
            self.update_component_detail(cx);
            cx.redraw_all();
        }
        self.trace_focus_event(cx, event, "event-after");
        tessera_makepad::foundation::render_trace::record_event(cx, event);
    }
}

#[cfg(test)]
mod tests {
    use super::{
        ComponentSelectorError, anchor_action_label, app_layout_action_label,
        breadcrumb_action_label, card_action_label, code_block_action_label,
        command_palette_action_label, component_selector_from_args,
        counts_as_native_surface_action, data_toolbar_action_label, detail_surface_is_mountable,
        drawer_action_label, dropdown_action_label, empty_action_label, feedback_action_label,
        filter_panel_action_label, flex_action_label, grid_action_label, input_action_label,
        layout_action_label, markdown_editor_action_label, masonry_action_label,
        mermaid_svg_viewer_action_label, message_action_label, metric_card_action_label,
        mini_chart_card_action_label, mobile_preview_frame_action_label, modal_action_label,
        native_surface_payload_label, notification_action_label, pagination_action_label,
        popconfirm_action_label, popover_action_label, progress_action_label,
        property_list_action_label, result_action_label, skeleton_action_label, spin_action_label,
        statistic_action_label, status_timeline_action_label, steps_action_label,
        table_action_label, timeline_action_label, tour_action_label, viewport_from_arg,
    };
    use crate::component_detail::{ComponentDetailMountAck, SurfaceSlot};
    use tessera_core::catalog::ComponentId;
    use tessera_makepad::components::surfaces::{
        atomic::{AtomicAction, AtomicComponent},
        breadcrumb::BreadcrumbAction,
        chart_funnel::FunnelChartAction,
        chart_gauge::GaugeChartAction,
        code_block::CodeBlockAction,
        command_palette::CommandPaletteAction,
        data_toolbar::DataToolbarAction,
        drawer::DrawerAction,
        dropdown::DropdownAction,
        feedback::{AlertAction, EmptyAction, ProgressAction, ResultAction},
        filter_panel::FilterPanelAction,
        input_advanced::{
            CascaderAction, FormAction, TransferAction, TreeSelectAction, UploadAction,
        },
        input_composites::{AutoCompleteAction, DatePickerAction},
        input_independent::InputSurfaceAction,
        layout::{AffixAction, AnchorAction, CardAction, FlexAction, GridAction, LayoutAction},
        markdown_editor::MarkdownEditorAction,
        masonry::MasonryAction,
        mermaid_svg_viewer::MermaidSvgViewerAction,
        message::MessageAction,
        metric_card::MetricCardAction,
        mini_chart_card::MiniChartCardAction,
        mobile_preview_frame::MobilePreviewFrameAction,
        modal::ModalAction,
        notification::NotificationAction,
        pagination::PaginationAction,
        popconfirm::PopconfirmAction,
        popover::PopoverAction,
        property_list::PropertyListAction,
        skeleton::SkeletonAction,
        spin::SpinAction,
        statistic::StatisticAction,
        status_timeline::StatusTimelineAction,
        steps::StepsAction,
        table::TableAction,
        timeline::TimelineAction,
        tour::TourAction,
    };

    #[test]
    fn initial_template_tracks_rendered_theme_before_startup_hydration() {
        use super::{App, ThemeMode};
        use tessera_makepad::makepad_widgets::*;

        for initial in [ThemeMode::Light, ThemeMode::Dark] {
            let mut cx = Cx::new(Box::new(|_, _| {}));
            let mut app = cx.with_vm(|vm| {
                let source = App::themed_script_mod(vm, initial);
                let mut app = App::script_from_value(vm, source);
                assert_eq!(app.resolved_theme, ThemeMode::Light);
                app.retain_initial_theme(vm, initial);
                app
            });
            for theme in [initial, ThemeMode::Light, ThemeMode::Dark, ThemeMode::Light] {
                app.resolved_theme = theme;
                app.apply_theme_template(&mut cx);
                let heading = app.ui.label(&cx, ids!(component_name));
                let color = heading.borrow().unwrap().draw_text.color;
                let expected = match theme {
                    ThemeMode::Light => vec4(26.0 / 255.0, 28.0 / 255.0, 31.0 / 255.0, 1.0),
                    ThemeMode::Dark => vec4(237.0 / 255.0, 237.0 / 255.0, 237.0 / 255.0, 1.0),
                };
                assert_eq!(color, expected, "initial={initial:?}, requested={theme:?}");
            }
        }
    }

    #[test]
    fn stock_disabled_labels_use_the_opaque_semantic_text_color() {
        use super::{App, ThemeMode};
        use tessera_makepad::makepad_widgets::*;

        for theme in [ThemeMode::Light, ThemeMode::Dark] {
            let mut cx = Cx::new(Box::new(|_, _| {}));
            let labels = cx.with_vm(|vm| {
                App::themed_script_mod(vm, theme);
                let source = script_eval!(vm, {
                    use mod.prelude.widgets.*
                    use mod.widgets.*
                    View{
                        semantic := Label{draw_text +: {color: theme.color_text_disabled}}
                        inner := Label{draw_text +: {color: theme.color_label_inner_disabled}}
                        outer := Label{draw_text +: {color: theme.color_label_outer_disabled}}
                    }
                });
                WidgetRef::script_from_value(vm, source)
            });
            let semantic = labels
                .label(&cx, ids!(semantic))
                .borrow()
                .unwrap()
                .draw_text
                .color;
            assert_eq!(semantic.w, 1.0);
            for id in [ids!(inner), ids!(outer)] {
                let actual = labels.label(&cx, id).borrow().unwrap().draw_text.color;
                assert_eq!(actual, semantic, "disabled label theme={theme:?}");
            }
        }
    }

    #[test]
    fn shared_choice_defaults_preserve_native_types_and_opaque_semantic_colors() {
        use super::{App, ThemeMode};
        use tessera_makepad::makepad_widgets::*;

        for theme in [ThemeMode::Light, ThemeMode::Dark] {
            let mut cx = Cx::new(Box::new(|_, _| {}));
            let ui = cx.with_vm(|vm| {
                App::themed_script_mod(vm, theme);
                let source = script_eval!(vm, {
                    use mod.prelude.widgets.*
                    use mod.widgets.*
                    View{
                        check := CheckBox{}
                        radio := RadioButton{}
                        toggle := Toggle{}
                        check_border := Label{draw_text +: {color: CheckBox.draw_bg.border_color}}
                        radio_border := Label{draw_text +: {color: RadioButton.draw_bg.border_color}}
                        toggle_border := Label{draw_text +: {color: Toggle.draw_bg.border_color}}
                        check_mark := Label{draw_text +: {color: CheckBox.draw_bg.mark_color_active}}
                        radio_mark := Label{draw_text +: {color: RadioButton.draw_bg.mark_color_active}}
                        toggle_mark := Label{draw_text +: {color: Toggle.draw_bg.mark_color_active}}
                    }
                });
                WidgetRef::script_from_value(vm, source)
            });
            assert!(ui.child_by_path(ids!(check)).borrow::<CheckBox>().is_some());
            assert!(
                ui.child_by_path(ids!(radio))
                    .borrow::<RadioButton>()
                    .is_some()
            );
            assert!(
                ui.child_by_path(ids!(toggle))
                    .borrow::<CheckBox>()
                    .is_some()
            );
            let (border, mark) = match theme {
                ThemeMode::Light => (
                    vec4(107.0 / 255.0, 109.0 / 255.0, 111.0 / 255.0, 1.0),
                    vec4(0.0, 109.0 / 255.0, 186.0 / 255.0, 1.0),
                ),
                ThemeMode::Dark => (
                    vec4(163.0 / 255.0, 163.0 / 255.0, 163.0 / 255.0, 1.0),
                    vec4(102.0 / 255.0, 181.0 / 255.0, 240.0 / 255.0, 1.0),
                ),
            };
            for (id, expected) in [
                (ids!(check_border), border),
                (ids!(radio_border), border),
                (ids!(toggle_border), border),
                (ids!(check_mark), mark),
                (ids!(radio_mark), mark),
                (ids!(toggle_mark), mark),
            ] {
                let color = ui.label(&cx, id).borrow().unwrap().draw_text.color;
                assert_eq!(color, expected, "theme={theme:?}, property={id:?}");
            }
        }
    }

    #[test]
    fn component_selector_distinguishes_absent_valid_and_invalid_arguments() {
        assert_eq!(component_selector_from_args(["--dark"]), Ok(None));
        assert_eq!(
            component_selector_from_args(["--component=button"]),
            Ok(Some(ComponentId::Button))
        );
        assert_eq!(
            component_selector_from_args(["--component="]),
            Err(ComponentSelectorError::MissingValue)
        );
        assert_eq!(
            component_selector_from_args(["--component"]),
            Err(ComponentSelectorError::MissingEquals)
        );
        assert_eq!(
            component_selector_from_args(["--component=not-real"]),
            Err(ComponentSelectorError::UnknownSlug(String::from(
                "not-real"
            )))
        );
        assert_eq!(
            component_selector_from_args(["--component=button", "--component=alert"]),
            Err(ComponentSelectorError::Duplicate)
        );
    }

    #[test]
    fn viewport_argument_is_bounded_and_well_formed() {
        assert_eq!(viewport_from_arg("--viewport=840x600"), Some((840, 600)));
        assert_eq!(viewport_from_arg("--viewport=319x600"), None);
        assert_eq!(viewport_from_arg("--viewport=840x319"), None);
        assert_eq!(viewport_from_arg("--viewport=7681x600"), None);
        assert_eq!(viewport_from_arg("--viewport=840X600"), None);
        assert_eq!(viewport_from_arg("--viewport=wide"), None);
    }

    #[test]
    fn only_completed_native_actions_count_as_interactions() {
        let component = AtomicComponent::Button;
        assert!(!counts_as_native_surface_action(&AtomicAction::Pressed {
            component,
            command: 1,
        }));
        assert!(!counts_as_native_surface_action(&AtomicAction::Released {
            component,
            command: 1,
        }));
        assert!(counts_as_native_surface_action(&AtomicAction::Activated {
            component,
            command: 1,
        }));
        for action in [
            AtomicAction::ToolbarMoved { active_index: 1 },
            AtomicAction::ToolbarOverflowOpened,
            AtomicAction::ToolbarOverflowClosed,
        ] {
            assert!(!counts_as_native_surface_action(&action));
        }
    }

    #[test]
    fn detail_must_select_a_connected_surface_before_mounting() {
        let button_ack = ComponentDetailMountAck {
            component: ComponentId::Button,
            generation: 7,
            slot: SurfaceSlot::Button,
        };
        assert!(detail_surface_is_mountable(
            ComponentId::Button,
            7,
            Some(button_ack)
        ));
        assert!(!detail_surface_is_mountable(ComponentId::Button, 7, None));
        assert!(!detail_surface_is_mountable(
            ComponentId::Button,
            7,
            Some(ComponentDetailMountAck {
                component: ComponentId::Alert,
                ..button_ack
            })
        ));
        assert!(!detail_surface_is_mountable(
            ComponentId::Button,
            8,
            Some(button_ack)
        ));
        let modal_ack = ComponentDetailMountAck {
            component: ComponentId::Modal,
            generation: 7,
            slot: SurfaceSlot::Modal,
        };
        assert!(detail_surface_is_mountable(
            ComponentId::Modal,
            7,
            Some(modal_ack)
        ));
        assert!(!detail_surface_is_mountable(
            ComponentId::Modal,
            7,
            Some(ComponentDetailMountAck {
                component: ComponentId::Drawer,
                ..modal_ack
            })
        ));
    }

    #[test]
    fn native_surface_action_labels_are_scoped_to_active_component() {
        let table_action = TableAction::Selected { row: 1 };
        assert_eq!(
            native_surface_payload_label(ComponentId::Select, &table_action),
            None
        );
        assert_eq!(
            native_surface_payload_label(ComponentId::Table, &table_action),
            Some(String::from("Table row 2 selected"))
        );

        let select_action = InputSurfaceAction::Changed {
            component: ComponentId::Select,
            outcome: tessera_makepad::components::surfaces::input::SurfaceOutcome::Changed,
        };
        assert_eq!(
            native_surface_payload_label(ComponentId::Select, &select_action),
            Some(String::from("Select input Changed"))
        );
        assert_eq!(
            native_surface_payload_label(ComponentId::Input, &select_action),
            None
        );

        let funnel_chart = FunnelChartAction::StageSelected { stage: Some(1) };
        assert_eq!(
            native_surface_payload_label(ComponentId::FunnelChart, &funnel_chart),
            Some(format!(
                "{} stage 2 selected",
                ComponentId::FunnelChart.spec().name
            ))
        );
        assert_eq!(
            native_surface_payload_label(ComponentId::Heatmap, &funnel_chart),
            None
        );

        let gauge_chart = GaugeChartAction::ValueChanged { value: 80.0 };
        assert_eq!(
            native_surface_payload_label(ComponentId::GaugeChart, &gauge_chart),
            Some(format!("{} value 80", ComponentId::GaugeChart.spec().name))
        );
        assert_eq!(
            native_surface_payload_label(ComponentId::FunnelChart, &gauge_chart),
            None
        );

        let auto_complete = AutoCompleteAction::Committed {
            component: ComponentId::AutoComplete,
            index: 1,
        };
        assert_eq!(
            native_surface_payload_label(ComponentId::AutoComplete, &auto_complete),
            Some(String::from("AutoComplete suggestion 2 committed"))
        );
        assert_eq!(
            native_surface_payload_label(ComponentId::Mentions, &auto_complete),
            None
        );

        let date_picker = DatePickerAction::Cancelled {
            component: ComponentId::DatePicker,
        };
        assert_eq!(
            native_surface_payload_label(ComponentId::DatePicker, &date_picker),
            Some(String::from("DatePicker cancelled"))
        );
        assert_eq!(
            native_surface_payload_label(ComponentId::TimePicker, &date_picker),
            None
        );

        let cascader = CascaderAction::Committed {
            component: ComponentId::Cascader,
            parent: 1,
            leaf: 0,
        };
        assert_eq!(
            native_surface_payload_label(ComponentId::Cascader, &cascader),
            Some(String::from("Cascader path 2 / 1 committed"))
        );
        assert_eq!(
            native_surface_payload_label(ComponentId::TreeSelect, &cascader),
            None
        );

        let tree_select = TreeSelectAction::Committed {
            component: ComponentId::TreeSelect,
            index: 1,
        };
        assert_eq!(
            native_surface_payload_label(ComponentId::TreeSelect, &tree_select),
            Some(String::from("TreeSelect node 2 committed"))
        );

        let transfer = TransferAction::MovedToTarget {
            component: ComponentId::Transfer,
            count: 1,
        };
        assert_eq!(
            native_surface_payload_label(ComponentId::Transfer, &transfer),
            Some(String::from("Transfer moved 1 item(s) to selected"))
        );

        let upload = UploadAction::Unsupported {
            component: ComponentId::Upload,
            reason: "No reviewed file-picker adapter is available on this platform",
        };
        assert_eq!(
            native_surface_payload_label(ComponentId::Upload, &upload),
            Some(String::from(
                "Upload unsupported: No reviewed file-picker adapter is available on this platform",
            ))
        );

        let form = FormAction::ValidationFailed {
            component: ComponentId::Form,
        };
        assert_eq!(
            native_surface_payload_label(ComponentId::Form, &form),
            Some(String::from("Form validation failed"))
        );
    }

    #[test]
    fn feedback_and_layout_actions_have_visible_status_labels() {
        assert_eq!(
            feedback_action_label(&AlertAction::Dismissed { dismissals: 2 }),
            Some(String::from("Alert dismissed (2)"))
        );
        assert_eq!(
            empty_action_label(&EmptyAction::CreateRequested { count: 1 }),
            Some(String::from("Empty-state action requested (1)"))
        );
        assert_eq!(
            progress_action_label(&ProgressAction::Changed { percent: 64 }),
            Some(String::from("Progress changed to 64%"))
        );
        assert_eq!(
            result_action_label(&ResultAction::RetryRequested { count: 3 }),
            Some(String::from("Result retry requested (3)"))
        );
        assert_eq!(
            input_action_label(&InputSurfaceAction::Changed {
                component: ComponentId::Checkbox,
                outcome: tessera_makepad::components::surfaces::input::SurfaceOutcome::Changed,
            }),
            Some(String::from("Checkbox input Changed"))
        );
        assert_eq!(
            input_action_label(&InputSurfaceAction::Failed {
                component: ComponentId::Checkbox,
            }),
            Some(String::from("Checkbox input validation failed"))
        );
        assert_eq!(
            layout_action_label(&AffixAction::Changed {
                pinned: true,
                changes: 1,
            }),
            Some(String::from("Affix pinned (1)"))
        );
        assert_eq!(
            anchor_action_label(&AnchorAction::Selected { index: 1 }),
            Some(String::from("Anchor selected section 2"))
        );
        assert_eq!(
            card_action_label(&CardAction::DetailsToggled { expanded: true }),
            Some(String::from("Card details shown"))
        );
        assert_eq!(
            flex_action_label(&FlexAction::DirectionChanged { reversed: false }),
            Some(String::from("Flex direction restored"))
        );
        assert_eq!(
            grid_action_label(&GridAction::DensityChanged { compact: true }),
            Some(String::from("Grid density compact"))
        );
        assert_eq!(
            app_layout_action_label(&LayoutAction::SidebarChanged { visible: false }),
            Some(String::from("Layout navigation hidden"))
        );
        assert_eq!(
            masonry_action_label(&MasonryAction::DensityChanged { dense: true }),
            Some(String::from("Masonry density dense"))
        );
        assert_eq!(
            breadcrumb_action_label(&BreadcrumbAction::Selected { index: 1 }),
            Some(String::from("Breadcrumb selected item 2"))
        );
        assert_eq!(
            pagination_action_label(&PaginationAction::PageChanged { page: 3 }),
            Some(String::from("Pagination page 3"))
        );
        assert_eq!(
            steps_action_label(&StepsAction::Error),
            Some(String::from("Steps entered error state"))
        );
        assert_eq!(
            skeleton_action_label(&SkeletonAction::MotionChanged { reduced: true }),
            Some(String::from("Skeleton motion reduced"))
        );
        assert_eq!(
            spin_action_label(&SpinAction::ActiveChanged { active: true }),
            Some(String::from("Spin active"))
        );
        assert_eq!(
            statistic_action_label(&StatisticAction::ValueChanged { value: 129 }),
            Some(String::from("Statistic value 129"))
        );
        assert_eq!(
            timeline_action_label(&TimelineAction::Failed),
            Some(String::from("Timeline entered failed state"))
        );
        assert_eq!(
            drawer_action_label(&DrawerAction::Opened { opens: 1 }),
            Some(String::from("Drawer opened (1)"))
        );
        assert_eq!(
            dropdown_action_label(&DropdownAction::Selected { index: 2 }),
            Some(String::from("Dropdown option 3 selected"))
        );
        assert_eq!(
            message_action_label(&MessageAction::Queued { id: 1 }),
            Some(String::from("Message 1 queued"))
        );
        assert_eq!(
            modal_action_label(&ModalAction::Closed {
                reason: tessera_makepad::components::surfaces::modal::ModalCloseReason::Explicit,
            }),
            Some(String::from("Modal closed: Explicit"))
        );
        assert_eq!(
            notification_action_label(&NotificationAction::Queued { id: 1 }),
            Some(String::from("Notification 1 queued"))
        );
        assert_eq!(
            code_block_action_label(&CodeBlockAction::CopyDenied),
            Some(String::from("Code block clipboard denied"))
        );
        assert_eq!(
            command_palette_action_label(&CommandPaletteAction::OpenChanged { open: true }),
            Some(String::from("Command palette opened"))
        );
        assert_eq!(
            data_toolbar_action_label(&DataToolbarAction::Unsupported {
                reason: "No connected data source"
            }),
            Some(String::from(
                "Data toolbar unsupported: No connected data source"
            ))
        );
        assert_eq!(
            filter_panel_action_label(&FilterPanelAction::Committed {
                active: true,
                archived: false,
                query_bytes: 7
            }),
            Some(String::from(
                "Filter panel committed active=true archived=false (7 query bytes)"
            ))
        );
        assert_eq!(
            markdown_editor_action_label(&MarkdownEditorAction::PreviewChanged {
                live_preview: false,
            }),
            Some(String::from("Markdown preview disabled"))
        );
        assert_eq!(
            table_action_label(&TableAction::Reloaded { reloads: 1 }),
            Some(String::from("Table reloaded (1)"))
        );
        assert_eq!(
            mermaid_svg_viewer_action_label(&MermaidSvgViewerAction::Validated {
                valid: true,
                validations: 1,
            }),
            Some(String::from("Mermaid validation passed (1)"))
        );
        assert_eq!(
            metric_card_action_label(&MetricCardAction::ValueChanged {
                value: 45,
                updates: 1,
            }),
            Some(String::from("Metric card value 45 (1)"))
        );
        assert_eq!(
            mini_chart_card_action_label(&MiniChartCardAction::PlaybackChanged { paused: true }),
            Some(String::from("Mini chart playback paused"))
        );
        assert_eq!(
            mobile_preview_frame_action_label(&MobilePreviewFrameAction::OrientationChanged {
                landscape: true,
            }),
            Some(String::from("Mobile preview orientation landscape"))
        );
        assert_eq!(
            property_list_action_label(&PropertyListAction::CopyDenied { index: 1 }),
            Some(String::from("Property 2 clipboard denied"))
        );
        assert_eq!(
            status_timeline_action_label(&StatusTimelineAction::Failed { current: 2 }),
            Some(String::from("Status timeline stage 3 failed"))
        );
        assert_eq!(
            tour_action_label(&TourAction::Completed { completions: 1 }),
            Some(String::from("Tour completed (1)"))
        );
        assert_eq!(
            popconfirm_action_label(&PopconfirmAction::Confirmed),
            Some(String::from("Popconfirm confirmed"))
        );
        assert_eq!(
            popover_action_label(&PopoverAction::Opened { toggles: 1 }),
            Some(String::from("Popover opened (1)"))
        );
    }
}
