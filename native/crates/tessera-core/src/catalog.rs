use std::fmt;

pub const COMPONENT_COUNT: usize = 101;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ComponentCategory {
    Base,
    Business,
    Charts,
}

impl ComponentCategory {
    pub const ALL: [Self; 3] = [Self::Base, Self::Business, Self::Charts];

    #[must_use]
    pub const fn label(self) -> &'static str {
        match self {
            Self::Base => "Base",
            Self::Business => "Business",
            Self::Charts => "Charts",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ComponentGroup {
    General,
    Layout,
    Navigation,
    DataEntry,
    DataDisplay,
    Feedback,
    Other,
    Extensions,
    Business,
    BasicCharts,
    Indicators,
    Analysis,
    Relations,
    Text,
}

impl ComponentGroup {
    #[must_use]
    pub const fn label(self) -> &'static str {
        match self {
            Self::General => "General",
            Self::Layout => "Layout",
            Self::Navigation => "Navigation",
            Self::DataEntry => "Data Entry",
            Self::DataDisplay => "Data Display",
            Self::Feedback => "Feedback",
            Self::Other => "Other",
            Self::Extensions => "Extensions",
            Self::Business => "Business",
            Self::BasicCharts => "Basic Charts",
            Self::Indicators => "Indicators",
            Self::Analysis => "Analysis",
            Self::Relations => "Relations",
            Self::Text => "Text",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UnknownComponentId {
    slug: String,
}

impl UnknownComponentId {
    #[must_use]
    pub fn slug(&self) -> &str {
        &self.slug
    }
}

impl fmt::Display for UnknownComponentId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "unknown component id: {}", self.slug)
    }
}

impl std::error::Error for UnknownComponentId {}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct ComponentSpec {
    pub id: ComponentId,
    pub slug: &'static str,
    pub name: &'static str,
    pub category: ComponentCategory,
    pub group: ComponentGroup,
    pub summary: &'static str,
}

impl ComponentSpec {
    #[must_use]
    pub const fn search_key(self) -> &'static str {
        self.slug
    }
}

// The declaration table is the only catalog source. The macro only removes
// mechanical copies of IDs, metadata, and parsing branches.
macro_rules! component_registry {
    ($(($variant:ident, $slug:literal, $name:literal, $category:ident, $group:ident, $summary:literal)),+ $(,)?) => {
        #[repr(usize)]
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
        pub enum ComponentId {
            $($variant),+
        }

        impl ComponentId {
            pub const ALL: [Self; COMPONENT_COUNT] = [$(Self::$variant),+];

            #[must_use]
            pub const fn as_str(self) -> &'static str {
                match self {
                    $(Self::$variant => $slug),+
                }
            }

            #[must_use]
            pub const fn spec(self) -> &'static ComponentSpec {
                &COMPONENTS[self as usize]
            }

            #[must_use]
            pub fn from_slug(slug: &str) -> Option<Self> {
                match slug {
                    $($slug => Some(Self::$variant),)+
                    _ => None,
                }
            }
        }

        impl TryFrom<&str> for ComponentId {
            type Error = UnknownComponentId;

            fn try_from(slug: &str) -> Result<Self, Self::Error> {
                Self::from_slug(slug).ok_or_else(|| UnknownComponentId {
                    slug: slug.to_owned(),
                })
            }
        }

        impl From<ComponentId> for &'static str {
            fn from(id: ComponentId) -> Self {
                id.as_str()
            }
        }

        impl fmt::Display for ComponentId {
            fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str(self.as_str())
            }
        }

        pub const COMPONENTS: &[ComponentSpec; 101] = &[
            $(ComponentSpec {
                id: ComponentId::$variant,
                slug: $slug,
                name: $name,
                category: ComponentCategory::$category,
                group: ComponentGroup::$group,
                summary: $summary,
            }),+
        ];

        pub const BASE_COMPONENT_COUNT: usize = 0 $(+ category_count!(@base $category))+;
        pub const BUSINESS_COMPONENT_COUNT: usize = 0 $(+ category_count!(@business $category))+;
        pub const CHART_COMPONENT_COUNT: usize = 0 $(+ category_count!(@charts $category))+;
    };
}

macro_rules! category_count {
    (@base Base) => {
        1
    };
    (@base $category:ident) => {
        0
    };
    (@business Business) => {
        1
    };
    (@business $category:ident) => {
        0
    };
    (@charts Charts) => {
        1
    };
    (@charts $category:ident) => {
        0
    };
}

component_registry!(
    (
        Button,
        "button",
        "Button",
        Base,
        General,
        "General action control."
    ),
    (
        FloatButton,
        "float-button",
        "FloatButton",
        Base,
        General,
        "Floating action control."
    ),
    (
        Icon,
        "icon",
        "Icon",
        Base,
        General,
        "Semantic icon primitive."
    ),
    (
        Typography,
        "typography",
        "Typography",
        Base,
        General,
        "Text and typography primitive."
    ),
    (
        Divider,
        "divider",
        "Divider",
        Base,
        Layout,
        "Visual content separator."
    ),
    (
        Flex,
        "flex",
        "Flex",
        Base,
        Layout,
        "Flexible linear layout."
    ),
    (Grid, "grid", "Grid", Base, Layout, "Grid layout primitive."),
    (
        Layout,
        "layout",
        "Layout",
        Base,
        Layout,
        "Page layout primitive."
    ),
    (
        Masonry,
        "masonry",
        "Masonry",
        Base,
        Layout,
        "Masonry content layout."
    ),
    (
        Space,
        "space",
        "Space",
        Base,
        Layout,
        "Explicit layout spacing."
    ),
    (
        Splitter,
        "splitter",
        "Splitter",
        Base,
        Layout,
        "Resizable pane separator."
    ),
    (
        Anchor,
        "anchor",
        "Anchor",
        Base,
        Navigation,
        "In-page navigation anchor."
    ),
    (
        Breadcrumb,
        "breadcrumb",
        "Breadcrumb",
        Base,
        Navigation,
        "Hierarchical navigation trail."
    ),
    (
        Dropdown,
        "dropdown",
        "Dropdown",
        Base,
        Navigation,
        "Anchored navigation menu."
    ),
    (
        Menu,
        "menu",
        "Menu",
        Base,
        Navigation,
        "Keyboard navigable menu."
    ),
    (
        Pagination,
        "pagination",
        "Pagination",
        Base,
        Navigation,
        "Paged result navigation."
    ),
    (
        Steps,
        "steps",
        "Steps",
        Base,
        Navigation,
        "Ordered process navigation."
    ),
    (
        Tabs,
        "tabs",
        "Tabs",
        Base,
        Navigation,
        "Section navigation tabs."
    ),
    (
        AutoComplete,
        "auto-complete",
        "AutoComplete",
        Base,
        DataEntry,
        "Asynchronous candidate input."
    ),
    (
        Cascader,
        "cascader",
        "Cascader",
        Base,
        DataEntry,
        "Hierarchical value picker."
    ),
    (
        Checkbox,
        "checkbox",
        "Checkbox",
        Base,
        DataEntry,
        "Binary or indeterminate input."
    ),
    (
        ColorPicker,
        "color-picker",
        "ColorPicker",
        Base,
        DataEntry,
        "Color value picker."
    ),
    (
        DatePicker,
        "date-picker",
        "DatePicker",
        Base,
        DataEntry,
        "Date value picker."
    ),
    (
        Form,
        "form",
        "Form",
        Base,
        DataEntry,
        "Controlled validation coordinator."
    ),
    (
        Input,
        "input",
        "Input",
        Base,
        DataEntry,
        "Single-line text input."
    ),
    (
        InputNumber,
        "input-number",
        "InputNumber",
        Base,
        DataEntry,
        "Numeric value input."
    ),
    (
        Mentions,
        "mentions",
        "Mentions",
        Base,
        DataEntry,
        "Mention-aware text input."
    ),
    (
        Radio,
        "radio",
        "Radio",
        Base,
        DataEntry,
        "Mutually exclusive choice input."
    ),
    (
        Rate,
        "rate",
        "Rate",
        Base,
        DataEntry,
        "Discrete rating input."
    ),
    (
        Select,
        "select",
        "Select",
        Base,
        DataEntry,
        "Single-value overlay selector."
    ),
    (
        Slider,
        "slider",
        "Slider",
        Base,
        DataEntry,
        "Bounded continuous value input."
    ),
    (
        Switch,
        "switch",
        "Switch",
        Base,
        DataEntry,
        "Binary toggle input."
    ),
    (
        TimePicker,
        "time-picker",
        "TimePicker",
        Base,
        DataEntry,
        "Time value picker."
    ),
    (
        Transfer,
        "transfer",
        "Transfer",
        Base,
        DataEntry,
        "Two-collection transfer input."
    ),
    (
        TreeSelect,
        "tree-select",
        "TreeSelect",
        Base,
        DataEntry,
        "Hierarchical overlay selector."
    ),
    (
        Upload,
        "upload",
        "Upload",
        Base,
        DataEntry,
        "Brokered file staging input."
    ),
    (
        Avatar,
        "avatar",
        "Avatar",
        Base,
        DataDisplay,
        "Identity image display."
    ),
    (
        Badge,
        "badge",
        "Badge",
        Base,
        DataDisplay,
        "Compact status display."
    ),
    (
        Calendar,
        "calendar",
        "Calendar",
        Base,
        DataDisplay,
        "Calendar data display."
    ),
    (
        Card,
        "card",
        "Card",
        Base,
        DataDisplay,
        "Framed content surface."
    ),
    (
        Carousel,
        "carousel",
        "Carousel",
        Base,
        DataDisplay,
        "User-driven content carousel."
    ),
    (
        Collapse,
        "collapse",
        "Collapse",
        Base,
        DataDisplay,
        "Expandable content sections."
    ),
    (
        Descriptions,
        "descriptions",
        "Descriptions",
        Base,
        DataDisplay,
        "Label-value descriptions."
    ),
    (
        Empty,
        "empty",
        "Empty",
        Base,
        DataDisplay,
        "Explicit empty-state display."
    ),
    (
        Image,
        "image",
        "Image",
        Base,
        DataDisplay,
        "Bounded image display."
    ),
    (
        List,
        "list",
        "List",
        Base,
        DataDisplay,
        "Uniform item list."
    ),
    (
        Popover,
        "popover",
        "Popover",
        Base,
        DataDisplay,
        "Anchored supplementary surface."
    ),
    (
        QrCode,
        "qr-code",
        "QRCode",
        Base,
        DataDisplay,
        "Bounded QR code display."
    ),
    (
        Segmented,
        "segmented",
        "Segmented",
        Base,
        DataDisplay,
        "Segmented value control."
    ),
    (
        Statistic,
        "statistic",
        "Statistic",
        Base,
        DataDisplay,
        "Numeric statistic display."
    ),
    (
        Table,
        "table",
        "Table",
        Base,
        DataDisplay,
        "Structured tabular data display."
    ),
    (
        Tag,
        "tag",
        "Tag",
        Base,
        DataDisplay,
        "Compact labeled value."
    ),
    (
        Timeline,
        "timeline",
        "Timeline",
        Base,
        DataDisplay,
        "Ordered event display."
    ),
    (
        Tooltip,
        "tooltip",
        "Tooltip",
        Base,
        DataDisplay,
        "Anchored descriptive overlay."
    ),
    (
        Tour,
        "tour",
        "Tour",
        Base,
        DataDisplay,
        "Guided overlay sequence."
    ),
    (
        Tree,
        "tree",
        "Tree",
        Base,
        DataDisplay,
        "Expandable hierarchical display."
    ),
    (
        Alert,
        "alert",
        "Alert",
        Base,
        Feedback,
        "Inline semantic feedback."
    ),
    (
        Drawer,
        "drawer",
        "Drawer",
        Base,
        Feedback,
        "Edge-origin panel."
    ),
    (
        Message,
        "message",
        "Message",
        Base,
        Feedback,
        "Ephemeral feedback message."
    ),
    (
        Modal,
        "modal",
        "Modal",
        Base,
        Feedback,
        "Blocking dialog surface."
    ),
    (
        Notification,
        "notification",
        "Notification",
        Base,
        Feedback,
        "Rich feedback notification."
    ),
    (
        Popconfirm,
        "popconfirm",
        "Popconfirm",
        Base,
        Feedback,
        "Anchored action confirmation."
    ),
    (
        Progress,
        "progress",
        "Progress",
        Base,
        Feedback,
        "Task progress feedback."
    ),
    (
        Result,
        "result",
        "Result",
        Base,
        Feedback,
        "Terminal outcome display."
    ),
    (
        Skeleton,
        "skeleton",
        "Skeleton",
        Base,
        Feedback,
        "Structural loading placeholder."
    ),
    (
        Spin,
        "spin",
        "Spin",
        Base,
        Feedback,
        "Visible loading indicator."
    ),
    (
        Watermark,
        "watermark",
        "Watermark",
        Base,
        Feedback,
        "Content ownership paint layer."
    ),
    (
        Util,
        "util",
        "Util",
        Base,
        Other,
        "Typed foundation utilities."
    ),
    (
        Affix,
        "affix",
        "Affix",
        Base,
        Other,
        "Scroll-container pinned region."
    ),
    (App, "app", "App", Base, Other, "Native application host."),
    (
        BorderBeam,
        "border-beam",
        "BorderBeam",
        Base,
        Other,
        "Optional bounded paint decoration."
    ),
    (
        ConfigProvider,
        "config-provider",
        "ConfigProvider",
        Base,
        Other,
        "Typed application configuration."
    ),
    (
        Textarea,
        "textarea",
        "Textarea",
        Base,
        Extensions,
        "Controlled multiline text input."
    ),
    (
        IconButton,
        "icon-button",
        "IconButton",
        Base,
        Extensions,
        "Labeled icon-only action."
    ),
    (
        Toolbar,
        "toolbar",
        "Toolbar",
        Base,
        Extensions,
        "Dense command row."
    ),
    (
        MetricCard,
        "metric-card",
        "MetricCard",
        Business,
        Business,
        "Single metric summary."
    ),
    (
        MiniChartCard,
        "mini-chart-card",
        "MiniChartCard",
        Business,
        Business,
        "Compact metric and trend summary."
    ),
    (
        DataToolbar,
        "data-toolbar",
        "DataToolbar",
        Business,
        Business,
        "Data query and action controls."
    ),
    (
        FilterPanel,
        "filter-panel",
        "FilterPanel",
        Business,
        Business,
        "Structured host-controlled filters."
    ),
    (
        PropertyList,
        "property-list",
        "PropertyList",
        Business,
        Business,
        "Typed property summary."
    ),
    (
        StatusTimeline,
        "status-timeline",
        "StatusTimeline",
        Business,
        Business,
        "Workflow event timeline."
    ),
    (
        CommandPalette,
        "command-palette",
        "CommandPalette",
        Business,
        Business,
        "Global command search dialog."
    ),
    (
        CodeBlock,
        "code-block",
        "CodeBlock",
        Business,
        Business,
        "Non-executing code viewer."
    ),
    (
        MarkdownEditor,
        "markdown-editor",
        "MarkdownEditor",
        Business,
        Business,
        "Bounded Markdown editor."
    ),
    (
        MermaidSvgViewer,
        "mermaid-svg-viewer",
        "MermaidSvgViewer",
        Business,
        Business,
        "Restricted native diagram viewer."
    ),
    (
        MobilePreviewFrame,
        "mobile-preview-frame",
        "MobilePreviewFrame",
        Business,
        Business,
        "Fixed logical preview frame."
    ),
    (
        LineChart,
        "line-chart",
        "LineChart",
        Charts,
        BasicCharts,
        "Line-series chart."
    ),
    (
        BarChart,
        "bar-chart",
        "BarChart",
        Charts,
        BasicCharts,
        "Bar-series chart."
    ),
    (
        PieChart,
        "pie-chart",
        "PieChart",
        Charts,
        BasicCharts,
        "Part-to-whole chart."
    ),
    (
        AreaChart,
        "area-chart",
        "AreaChart",
        Charts,
        BasicCharts,
        "Area-series chart."
    ),
    (
        Sparkline,
        "sparkline",
        "Sparkline",
        Charts,
        Indicators,
        "Compact trend chart."
    ),
    (
        ScatterChart,
        "scatter-chart",
        "ScatterChart",
        Charts,
        Analysis,
        "Point distribution chart."
    ),
    (
        RadarChart,
        "radar-chart",
        "RadarChart",
        Charts,
        BasicCharts,
        "Radial multivariate chart."
    ),
    (
        Heatmap,
        "heatmap",
        "Heatmap",
        Charts,
        Analysis,
        "Matrix intensity chart."
    ),
    (
        Treemap,
        "treemap",
        "Treemap",
        Charts,
        Analysis,
        "Hierarchical area chart."
    ),
    (
        FunnelChart,
        "funnel-chart",
        "FunnelChart",
        Charts,
        Analysis,
        "Stage conversion chart."
    ),
    (
        GaugeChart,
        "gauge-chart",
        "GaugeChart",
        Charts,
        Indicators,
        "Threshold gauge chart."
    ),
    (
        SankeyChart,
        "sankey-chart",
        "SankeyChart",
        Charts,
        Relations,
        "Directed flow chart."
    ),
    (
        OrganizationChart,
        "organization-chart",
        "OrganizationChart",
        Charts,
        Relations,
        "Hierarchical relationship chart."
    ),
    (
        MindMap,
        "mind-map",
        "MindMap",
        Charts,
        Relations,
        "Expandable concept map."
    ),
    (
        WordCloud,
        "word-cloud",
        "WordCloud",
        Charts,
        Text,
        "Weighted keyword chart."
    ),
);

/// Compatibility name for consumers that only read component facts.
///
/// This is an alias, not a second metadata type or registry. Migrate imports
/// to [`ComponentSpec`] while changing route/message fields to `ComponentId`.
pub type ComponentMeta = ComponentSpec;

#[must_use]
pub const fn component(id: ComponentId) -> &'static ComponentSpec {
    id.spec()
}

#[must_use]
pub fn component_by_slug(slug: &str) -> Option<&'static ComponentSpec> {
    ComponentId::from_slug(slug).map(ComponentId::spec)
}

const _: () = assert!(COMPONENTS.len() == COMPONENT_COUNT);
const _: () = assert!(BASE_COMPONENT_COUNT == 75);
const _: () = assert!(BUSINESS_COMPONENT_COUNT == 11);
const _: () = assert!(CHART_COMPONENT_COUNT == 15);

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use super::{
        COMPONENT_COUNT, COMPONENTS, ComponentCategory, ComponentId, ComponentSpec,
        component_by_slug,
    };

    const _: &[ComponentSpec; COMPONENT_COUNT] = COMPONENTS;

    #[test]
    fn registry_matches_the_frozen_101_component_inventory() {
        assert_eq!(COMPONENTS.len(), COMPONENT_COUNT);
        assert_eq!(
            COMPONENTS
                .iter()
                .filter(|item| item.category == ComponentCategory::Base)
                .count(),
            75
        );
        assert_eq!(
            COMPONENTS
                .iter()
                .filter(|item| item.category == ComponentCategory::Business)
                .count(),
            11
        );
        assert_eq!(
            COMPONENTS
                .iter()
                .filter(|item| item.category == ComponentCategory::Charts)
                .count(),
            15
        );
    }

    #[test]
    fn ids_are_unique_and_round_trip_through_the_single_declaration_table() {
        let mut slugs = HashSet::with_capacity(COMPONENTS.len());
        let mut ids = HashSet::with_capacity(COMPONENTS.len());

        for component in COMPONENTS {
            assert!(!component.slug.is_empty());
            assert!(!component.name.is_empty());
            assert!(!component.summary.is_empty());
            assert!(
                slugs.insert(component.slug),
                "duplicate slug: {}",
                component.slug
            );
            assert!(ids.insert(component.id), "duplicate id: {}", component.id);
            assert_eq!(ComponentId::try_from(component.slug), Ok(component.id));
            assert_eq!(component_by_slug(component.slug), Some(component));
            assert_eq!(component.id.as_str(), component.slug);
            assert_eq!(component.id.spec(), component);
        }
    }

    #[test]
    fn unknown_slugs_are_rejected_without_a_fallback_identity() {
        let error = ComponentId::try_from("not-in-the-catalog").expect_err("unknown slug");

        assert_eq!(error.slug(), "not-in-the-catalog");
        assert_eq!(component_by_slug("not-in-the-catalog"), None);
    }
}
