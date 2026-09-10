import { useEffect, useState, type ReactNode } from "react";
import {
  Button,
  Card,
  Descriptions,
  Icon,
  IconButton,
  Input,
  InputNumber,
  Mentions,
  Popconfirm,
  Progress,
  Segmented,
  Skeleton,
  Switch,
  Spin,
  Tabs,
  Tag,
  Textarea,
  Toolbar,
  ToolbarGroup,
} from "./components/base";
import {
  CodeBlock,
  CommandPalette,
  DataToolbar,
  FilterPanel,
  MarkdownEditor,
  MetricCard,
  MiniChartCard,
  MobilePreviewFrame,
  PropertyList,
  StatusTimeline,
} from "./components/business";
import { Sparkline } from "./components/charts";
import {
  AffixDoc,
  AlertDoc,
  AnchorDoc,
  AppDoc,
  AreaChartDoc,
  AutoCompleteDoc,
  AvatarDoc,
  BadgeDoc,
  BarChartDoc,
  BorderBeamDoc,
  ButtonDoc,
  BreadcrumbDoc,
  CalendarDoc,
  CardDoc,
  CarouselDoc,
  CascaderDoc,
  CheckboxDoc,
  CodeBlockDoc,
  CollapseDoc,
  ColorPickerDoc,
  CommandPaletteDoc,
  ConfigProviderDoc,
  ComponentDetailDoc,
  ComponentsOverview,
  DataToolbarDoc,
  DatePickerDoc,
  DemoContainer,
  DescriptionsDoc,
  DividerDoc,
  DocsShell,
  DrawerDoc,
  DropdownDoc,
  EmptyDoc,
  FilterPanelDoc,
  FlexDoc,
  FloatButtonDoc,
  FormDoc,
  FunnelChartDoc,
  GaugeChartDoc,
  GridDoc,
  HeatmapDoc,
  IconButtonDoc,
  IconDoc,
  ImageDoc,
  InputDoc,
  InputNumberDoc,
  LayoutDoc,
  ListDoc,
  LineChartDoc,
  MasonryDoc,
  MarkdownEditorDoc,
  MermaidSvgViewerDoc,
  MetricCardDoc,
  MiniChartCardDoc,
  MessageDoc,
  MenuDoc,
  MindMapDoc,
  MentionsDoc,
  MobilePreviewFrameDoc,
  ModalDoc,
  NotificationDoc,
  OrganizationChartDoc,
  PaginationDoc,
  PieChartDoc,
  PopconfirmDoc,
  PopoverDoc,
  ProgressDoc,
  PropertyListDoc,
  QRCodeDoc,
  RadarChartDoc,
  RadioDoc,
  RateDoc,
  ResultDoc,
  SankeyChartDoc,
  SegmentedDoc,
  SelectDoc,
  ScatterChartDoc,
  SkeletonDoc,
  SliderDoc,
  SpaceDoc,
  SparklineDoc,
  SpinDoc,
  SplitterDoc,
  StatisticDoc,
  StatusTimelineDoc,
  StepsDoc,
  SwitchDoc,
  TabsDoc,
  TagDoc,
  TableDoc,
  TextareaDoc,
  TimelineDoc,
  TimePickerDoc,
  ToolbarDoc,
  TooltipDoc,
  TourDoc,
  TreemapDoc,
  TransferDoc,
  TreeDoc,
  TreeSelectDoc,
  UploadDoc,
  TypographyDoc,
  UtilDoc,
  WatermarkDoc,
  WordCloudDoc,
  getDocsComponentItem,
  isDocsComponentId,
  type BusinessComponentId,
  type DocsComponentId,
  type DocsPageId,
} from "./docs";

const markdownWithMermaid = `# MarkdownEditor specimen

This example keeps editing and preview close together so Markdown and Mermaid support can be reviewed in one place.

\`\`\`mermaid
flowchart LR
  Draft[Draft markdown] --> Parse[Parse blocks]
  Parse --> Preview[Render preview]
  Parse --> Mermaid[Mermaid viewer]
  Mermaid --> Inspect[Inspect diagram state]
\`\`\`

- Base primitives stay neutral.
- Business components compose primitives without external UI libraries.
- Mermaid blocks render as SVG in the preview for acceptance review.`;

const defaultDocsPage: DocsPageId = "button";

const metricTrend = [
  { label: "Mon", value: 42 },
  { label: "Tue", value: 53 },
  { label: "Wed", value: 49 },
  { label: "Thu", value: 67 },
  { label: "Fri", value: 72 },
  { label: "Sat", value: 81 },
  { label: "Sun", value: 78 },
];

function readDocsPageFromHash(): DocsPageId {
  if (typeof window === "undefined") {
    return defaultDocsPage;
  }

  const hashValue = window.location.hash.replace(/^#\/?/, "").trim().toLowerCase();

  if (hashValue === "overview" || hashValue === "playground" || isDocsComponentId(hashValue)) {
    return hashValue;
  }

  return defaultDocsPage;
}

function isComponentPage(page: DocsPageId): page is DocsComponentId {
  return page !== "overview" && page !== "playground";
}

function SpecimenAppendix() {
  const [enabled, setEnabled] = useState(true);
  const [compact, setCompact] = useState(false);
  const [retryLimit, setRetryLimit] = useState<number | "">(5);
  const [markdownValue, setMarkdownValue] = useState(markdownWithMermaid);

  return (
    <section className="app-shell" aria-labelledby="specimen-appendix-title">
      <header className="app-header">
        <p className="eyebrow">Tessera</p>
        <h1 id="specimen-appendix-title">Specimen Appendix</h1>
        <p>
          Internal review specimens for the self-owned React component library, split into base
          primitives and business-level compositions.
        </p>
      </header>

      <section className="section" aria-labelledby="sample-container">
        <div className="section__heading">
          <div>
            <p className="eyebrow">tutorial</p>
            <h2 id="sample-container">样例容器</h2>
          </div>
          <p>通用 DemoContainer：令牌驱动、亮/暗主题自适配，用于在教程中统一承载示例与代码片段。</p>
        </div>

        <div className="specimen-grid specimen-grid--three">
          <DemoContainer
            title="按钮样例"
            description="solid / soft / ghost 在样例容器中的呈现。"
            code={'<Button variant="solid">发布</Button>\n<Button>草稿</Button>\n<Button variant="ghost">取消</Button>'}
          >
            <Button variant="solid">发布</Button>
            <Button>草稿</Button>
            <Button variant="ghost">取消</Button>
          </DemoContainer>

          <DemoContainer
            background="sunken"
            title="标签样例"
            description="预览区使用 sunken 凹陷底，凸显内容层级。"
            code={'<Tag tone="strong">ready</Tag>\n<Tag tone="subtle">subtle</Tag>'}
          >
            <Tag tone="strong">ready</Tag>
            <Tag tone="subtle">subtle</Tag>
            <Tag>base</Tag>
          </DemoContainer>
        </div>
      </section>

      <section className="section" aria-labelledby="base-components">
        <div className="section__heading">
          <div>
            <p className="eyebrow">base</p>
            <h2 id="base-components">Base Components</h2>
          </div>
          <p>Available exports are rendered directly, with common variants and states visible in place.</p>
        </div>

        <div className="specimen-grid specimen-grid--three">
          <DemoContainer
            title="Button"
            description="Solid, soft, ghost, and small states."
            code={'<Button variant="solid">Run</Button>\n<Button>Draft</Button>\n<Button variant="ghost">Cancel</Button>'}
          >
            <div className="demo-row">
              <Button variant="solid">Run</Button>
              <Button>Draft</Button>
              <Button variant="ghost">Cancel</Button>
              <Button size="sm">Small</Button>
            </div>
          </DemoContainer>

          <DemoContainer
            title="Input"
            description="Label, hint, placeholder, and disabled states."
            code={'<Input label="Package name" defaultValue="tessera" />\n<Input disabled label="Disabled" />'}
          >
            <div className="demo-stack">
              <Input
                defaultValue="tessera"
                hint="Uses the exported base Input."
                label="Package name"
                name="packageName"
              />
              <Input disabled label="Disabled" name="disabledInput" placeholder="Waiting for value" />
            </div>
          </DemoContainer>

          <DemoContainer
            title="InputNumber"
            description="Controlled value, stepper controls, range, error, and help text."
            code={'<InputNumber label="Retry limit" min={0} max={10} value={retryLimit} />'}
          >
            <div className="demo-stack">
              <InputNumber
                helpText="Arrow keys and buttons step by 1."
                label="Retry limit"
                max={10}
                min={0}
                onValueChange={setRetryLimit}
                value={retryLimit}
              />
              <InputNumber
                controls={false}
                defaultValue={128}
                error
                helpText="Inventory must stay below 99."
                inputMode="numeric"
                label="Inventory"
                max={99}
                min={0}
              />
            </div>
          </DemoContainer>

          <DemoContainer
            title="Switch"
            description="Controlled checked and unchecked states."
            code={'<Switch checked={enabled} label="Rendering enabled" onCheckedChange={setEnabled} />'}
          >
            <div className="demo-stack">
              <Switch
                checked={enabled}
                label={enabled ? "Rendering enabled" : "Rendering disabled"}
                onCheckedChange={setEnabled}
              />
              <Switch
                checked={compact}
                label={compact ? "Compact density" : "Comfort density"}
                onCheckedChange={setCompact}
              />
            </div>
          </DemoContainer>

          <DemoContainer
            title="Tabs"
            description="Base tablist with restrained panel content."
            code={'<Tabs items={[{ id: "overview", label: "Overview", content: <p>...</p> }]} />'}
          >
            <Tabs
              items={[
                {
                  id: "overview",
                  label: "Overview",
                  content: <p>Primitive components keep edges, spacing, and type quiet.</p>,
                },
                {
                  id: "states",
                  label: "States",
                  content: <p>Each specimen should expose ready, hoverable, disabled, and dense states.</p>,
                },
                {
                  id: "exports",
                  label: "Exports",
                  content: <p>Rendered here from the base barrel when available.</p>,
                },
              ]}
            />
          </DemoContainer>

          <DemoContainer
            title="Textarea"
            description="Multiline input with label, hint, and density."
            code={'<Textarea label="Prompt notes" minRows={5} defaultValue="..." />'}
          >
            <Textarea
              defaultValue="Textarea is rendered from the base barrel. Use it for prompts, notes, and long-form configuration."
              hint="Exported base Textarea."
              label="Prompt notes"
              minRows={5}
              name="promptNotes"
            />
          </DemoContainer>

          <DemoContainer
            title="Mentions"
            description="Textarea-based @ suggestions with keyboard insertion."
            code={'<Mentions label="Review owner" options={[{ label: "Ada", value: "ada" }]} />'}
          >
            <Mentions
              defaultValue="Ask @"
              helpText="Type @, use arrows, then Enter or Tab."
              label="Review owner"
              name="specimenMentions"
              options={[
                { label: "Ada Lovelace", value: "ada", description: "Algorithm notes" },
                { label: "Grace Hopper", value: "grace", description: "Compiler review" },
                { label: "Design Systems", value: "design systems", description: "Sanitized on insert" },
              ]}
            />
          </DemoContainer>

          <DemoContainer
            title="IconButton"
            description="Icon-only controls with accessible labels."
            code={'<IconButton label="Search"><Icon decorative name="search" /></IconButton>'}
          >
            <div className="demo-row">
              <IconButton label="Add item" tooltip="Add item">
                <Icon decorative name="add" />
              </IconButton>
              <IconButton label="Search" tooltip="Search">
                <Icon decorative name="search" />
              </IconButton>
              <IconButton label="More actions" pressed tooltip="More actions">
                <Icon decorative name="more" />
              </IconButton>
              <IconButton disabled label="Close" tooltip="Close">
                <Icon decorative name="close" />
              </IconButton>
            </div>
          </DemoContainer>

          <DemoContainer
            title="Segmented"
            description="Radio-style segmented selection."
            code={'<Segmented label="Density" options={[{ label: "Comfort", value: "comfort" }]} />'}
          >
            <Segmented
              label="Density"
              onValueChange={(value) => setCompact(value === "compact")}
              options={[
                { label: "Comfort", value: "comfort" },
                { label: "Compact", value: "compact" },
                { disabled: true, label: "Dense", value: "dense" },
              ]}
              value={compact ? "compact" : "comfort"}
            />
          </DemoContainer>

          <DemoContainer
            title="Toolbar"
            description="Neutral command strip for editor-like surfaces."
            code={'<Toolbar compact><ToolbarGroup><IconButton label="Bold">B</IconButton></ToolbarGroup></Toolbar>'}
          >
            <Toolbar compact aria-label="Formatting toolbar">
              <ToolbarGroup aria-label="Text style">
                <IconButton label="Bold" size="sm" tooltip="Bold">
                  B
                </IconButton>
                <IconButton label="Italic" size="sm" tooltip="Italic">
                  I
                </IconButton>
              </ToolbarGroup>
              <ToolbarGroup aria-label="Insert">
                <Button size="sm" variant="ghost">
                  Link
                </Button>
                <Button size="sm" variant="ghost">
                  Code
                </Button>
              </ToolbarGroup>
            </Toolbar>
          </DemoContainer>

          <DemoContainer
            title="Tag"
            description="Small metadata labels and emphasis tones."
            code={'<Tag>base</Tag>\n<Tag tone="strong">ready</Tag>'}
          >
            <div className="demo-row">
              <Tag>base</Tag>
              <Tag size="md">business</Tag>
              <Tag tone="subtle">subtle</Tag>
              <Tag tone="strong">ready</Tag>
            </div>
          </DemoContainer>

          <DemoContainer
            title="Descriptions"
            description="Object facts with responsive dl/table semantics."
            code={'<Descriptions bordered title="Release facts" items={[{ key: "owner", label: "Owner", value: "Base" }]} />'}
          >
            <Descriptions
              bordered
              column={{ default: 2, sm: 1 }}
              items={[
                { key: "owner", label: "Owner", value: "Base components" },
                { key: "status", label: "Status", value: <Tag tone="strong">ready</Tag> },
                { key: "hash", label: "Trace", value: "trace_01JY0KQH5M2W3VTZ9R4N6P7S8A", span: 2 },
              ]}
              title="Release facts"
            />
          </DemoContainer>

          <DemoContainer
            title="Card"
            description="Container primitive with title, body, and nested content."
            code={'<Card title="Review-ready surface">...</Card>'}
          >
            <div className="demo-card-sample">
              <span className="demo-kicker">Nested sample</span>
              <strong>Review-ready surface</strong>
              <p>Cards frame repeated specimens without turning the page into a dashboard.</p>
            </div>
          </DemoContainer>

          <DemoContainer
            title="Skeleton, Spin, Progress"
            description="Production loading and progress feedback states."
            code={'<Skeleton paragraph={{ rows: 3 }} />\n<Spin label="Syncing records">...</Spin>\n<Progress value={68} />'}
          >
            <div className="demo-stack">
              <Skeleton avatar={{ size: "md" }} paragraph={{ rows: 3, widths: ["100%", "86%", "58%"] }} title={{ width: "48%" }} />
              <Spin label="Syncing records" size="sm">
                <div className="demo-card-sample" aria-label="Records panel">
                  <span className="demo-kicker">aria-busy container</span>
                  <strong>Deployment records</strong>
                  <p>Wrapped content remains visible while the overlay communicates loading.</p>
                </div>
              </Spin>
              <Progress label="Export progress" value={68} status="active" />
              <Progress indeterminate label="Waiting for worker" size="sm" />
            </div>
          </DemoContainer>

          <DemoContainer
            title="Popconfirm"
            description="Independent lightweight confirmation overlay."
            code={'<Popconfirm title="Archive this release?"><Button>Archive release</Button></Popconfirm>'}
          >
            <div className="demo-stack">
              <Popconfirm
                confirmText="Archive"
                description="The release stays recoverable from history."
                title="Archive this release?"
              >
                <Button variant="ghost">Archive release</Button>
              </Popconfirm>
            </div>
          </DemoContainer>
        </div>
      </section>

      <section className="section" aria-labelledby="business-components">
        <div className="section__heading">
          <div>
            <p className="eyebrow">business</p>
            <h2 id="business-components">Business Components</h2>
          </div>
          <p>Production-oriented desktop business components with states, composition, and a11y surfaces visible.</p>
        </div>

        <div className="specimen-grid specimen-grid--business">
          <DemoContainer
            title="MetricCard"
            description="Metric summary with graceful chart fallback."
            code={'<MetricCard title="Active sessions" value="24,918" chart={<Sparkline data={metricTrend} />} />'}
          >
            <div className="business-demo-grid">
              <MetricCard
                chart={<Sparkline data={metricTrend} height={68} summary="Active sessions trend rose through the week." title="Active sessions trend" tone="sage" />}
                chartLabel="Active sessions weekly trend"
                delta={{ description: "week over week", direction: "up", label: "+12.8%", tone: "positive" }}
                description="Compared with last week"
                eyebrow="Realtime"
                footer="Updated 2 minutes ago"
                title="Active sessions"
                unit="sessions"
                value="24,918"
              />
              <MetricCard description="Waiting for upstream data" loading loadingText="Loading conversion metric" title="Conversion" />
              <MetricCard
                delta={{ direction: "flat", label: "0%", tone: "warning" }}
                empty="No revenue reported"
                emptyDescription="Adjust the date range or refresh after ingestion finishes."
                title="Revenue"
              />
              <MetricCard
                density="compact"
                description="Compact mobile-friendly density"
                error="Data source is temporarily unavailable."
                title="Retention"
              />
            </div>
          </DemoContainer>

          <DemoContainer
            title="DataToolbar and FilterPanel"
            description="Search, filters, actions, and structured fields."
            code={'<DataToolbar title="Deployments" search={{ placeholder: "Search deployments" }} />\n<FilterPanel fields={fields} />'}
          >
            <div className="business-demo-grid business-demo-grid--stack">
              <DataToolbar
                activeFilters={
                  <>
                    <Tag tone="subtle">status: ready</Tag>
                    <Tag tone="subtle">owner: design systems</Tag>
                  </>
                }
                filters={<Tag tone="subtle">2 filters</Tag>}
                primaryAction={{ id: "create", label: "Create", priority: "primary" }}
                resultCount={128}
                search={{
                  defaultValue: "release",
                  placeholder: "Search deployments",
                  showSubmit: true,
                  onSubmit: () => undefined,
                }}
                secondaryActions={[{ id: "export", label: "Export", priority: "ghost" }]}
                title="Deployments"
              />
              <FilterPanel
                activeCount={2}
                columns={2}
                description="Desktop panel for repeated query workflows."
                fields={[
                  {
                    id: "owner",
                    label: "Owner",
                    control: <Input id="owner" placeholder="Owner name" />,
                    help: "Matches owner display name.",
                  },
                  {
                    id: "status",
                    label: "Status",
                    control: (
                      <Segmented
                        options={[
                          { label: "All", value: "all" },
                          { label: "Ready", value: "ready" },
                          { label: "Blocked", value: "blocked" },
                        ]}
                        size="sm"
                        value="ready"
                      />
                    ),
                  },
                  {
                    id: "environment",
                    label: "Environment",
                    control: <Input id="environment" placeholder="prod, staging" />,
                    span: 2,
                  },
                ]}
                onApply={() => undefined}
                onReset={() => undefined}
              />
            </div>
          </DemoContainer>

          <DemoContainer
            title="PropertyList and StatusTimeline"
            description="Object facts and workflow states."
            code={'<PropertyList items={metadata} />\n<StatusTimeline items={steps} />'}
          >
            <div className="business-demo-grid">
              <PropertyList
                aria-label="Release metadata"
                columns={3}
                density="compact"
                items={[
                  { id: "env", label: "Environment", value: "Production", badge: <Tag tone="strong">live</Tag> },
                  { id: "owner", label: "Owner", value: "Component team" },
                  { id: "region", label: "Region", value: "ap-southeast-1" },
                  { id: "window", label: "Maintenance window", description: "Optional metadata stays visible." },
                ]}
                emptyValue="Unscheduled"
                title="Release metadata"
              />
              <StatusTimeline
                aria-label="Deployment status timeline"
                density="compact"
                items={[
                  {
                    id: "queued",
                    title: "Queued",
                    time: "09:12",
                    dateTime: "2026-06-07T09:12:00+08:00",
                    state: "complete",
                    description: "Request accepted.",
                  },
                  {
                    id: "build",
                    title: "Build running",
                    time: "09:18",
                    dateTime: "2026-06-07T09:18:00+08:00",
                    state: "current",
                    meta: <Tag>CI</Tag>,
                  },
                  { id: "verify", title: "Verification", state: "warning", stateLabel: "Needs review" },
                ]}
                title="Deployment status"
              />
            </div>
          </DemoContainer>

          <DemoContainer
            title="CommandPalette and CodeBlock"
            description="Desktop command surface and copyable code."
            code={'<CommandPalette items={commands} />\n<CodeBlock language="tsx" code="..." />'}
          >
            <div className="business-demo-grid">
              <CommandPalette
                items={[
                  { id: "open", label: "Open component", description: "Jump to selected component docs", shortcut: "Enter" },
                  { id: "copy", label: "Copy import", description: "Copy package import snippet", shortcut: "C" },
                  { id: "disabled", label: "Archive component", description: "Disabled command example", disabled: true },
                ]}
              />
              <CodeBlock
                code={`import { MetricCard } from "./components/business";\n\n<MetricCard title="Active sessions" value="24,918" />`}
                language="tsx"
                title="Import snippet"
              />
            </div>
          </DemoContainer>

          <DemoContainer
            title="MarkdownEditor"
            description="Markdown sample includes a Mermaid block for preview validation."
            code={'<MarkdownEditor value={markdownValue} onChange={setMarkdownValue} />'}
          >
            <MarkdownEditor value={markdownValue} onChange={setMarkdownValue} />
          </DemoContainer>

          <DemoContainer
            title="MiniChartCard"
            description="Business mini chart card composed from MetricCard and Sparkline."
            code={'<MiniChartCard title="Usage trend" value="78.4%" sparkline={metricTrend} />'}
          >
            <MiniChartCard
              a11yLabel="Mini chart card static preview"
              delta={{ label: "+12.8%", direction: "up", description: "Compared with previous week" }}
              footer="Self-owned MetricCard + Sparkline"
              sparkline={metricTrend}
              sparklineSummary="Weekly usage rises through Saturday and finishes slightly lower on Sunday."
              status="success"
              title="Usage trend"
              value="78.4%"
            />
          </DemoContainer>

          <DemoContainer
            title="MobilePreviewFrame"
            description="Mobile capability mapping without an external mobile UI kit."
            code={'<MobilePreviewFrame screenLabel="Mobile component static preview" />'}
          >
            <MobilePreviewFrame screenLabel="Mobile component static preview" />
          </DemoContainer>
        </div>
      </section>
    </section>
  );
}

function App() {
  const [selectedPage, setSelectedPage] = useState<DocsPageId>(readDocsPageFromHash);

  useEffect(() => {
    const handleHashChange = () => setSelectedPage(readDocsPageFromHash());

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleNavigate = (nextPage: DocsPageId) => {
    setSelectedPage(nextPage);

    if (typeof window === "undefined") {
      return;
    }

    const nextHash = `#${nextPage}`;
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  };

  let pageContent: ReactNode;
  if (selectedPage === "overview") {
    pageContent = <ComponentsOverview selectedId={selectedPage} onSelect={handleNavigate} />;
  } else if (selectedPage === "playground") {
    pageContent = <SpecimenAppendix />;
  } else if (selectedPage === "affix") {
    pageContent = <AffixDoc showAnchors />;
  } else if (selectedPage === "button") {
    pageContent = <ButtonDoc showAnchors />;
  } else if (selectedPage === "typography") {
    pageContent = <TypographyDoc showAnchors />;
  } else if (selectedPage === "anchor") {
    pageContent = <AnchorDoc />;
  } else if (selectedPage === "float-button") {
    pageContent = <FloatButtonDoc showAnchors />;
  } else if (selectedPage === "alert") {
    pageContent = <AlertDoc />;
  } else if (selectedPage === "auto-complete") {
    pageContent = <AutoCompleteDoc showAnchors />;
  } else if (selectedPage === "checkbox") {
    pageContent = <CheckboxDoc showAnchors />;
  } else if (selectedPage === "radio") {
    pageContent = <RadioDoc showAnchors />;
  } else if (selectedPage === "color-picker") {
    pageContent = <ColorPickerDoc showAnchors />;
  } else if (selectedPage === "avatar") {
    pageContent = <AvatarDoc showAnchors />;
  } else if (selectedPage === "badge") {
    pageContent = <BadgeDoc showAnchors />;
  } else if (selectedPage === "border-beam") {
    pageContent = <BorderBeamDoc showAnchors />;
  } else if (selectedPage === "breadcrumb") {
    pageContent = <BreadcrumbDoc />;
  } else if (selectedPage === "calendar") {
    pageContent = <CalendarDoc showAnchors />;
  } else if (selectedPage === "card") {
    pageContent = <CardDoc showAnchors />;
  } else if (selectedPage === "carousel") {
    pageContent = <CarouselDoc showAnchors />;
  } else if (selectedPage === "collapse") {
    pageContent = <CollapseDoc showAnchors />;
  } else if (selectedPage === "cascader") {
    pageContent = <CascaderDoc showAnchors />;
  } else if (selectedPage === "descriptions") {
    pageContent = <DescriptionsDoc showAnchors />;
  } else if (selectedPage === "dropdown") {
    pageContent = <DropdownDoc showAnchors />;
  } else if (selectedPage === "menu") {
    pageContent = <MenuDoc showAnchors />;
  } else if (selectedPage === "empty") {
    pageContent = <EmptyDoc showAnchors />;
  } else if (selectedPage === "form") {
    pageContent = <FormDoc showAnchors />;
  } else if (selectedPage === "image") {
    pageContent = <ImageDoc showAnchors />;
  } else if (selectedPage === "icon-button") {
    pageContent = <IconButtonDoc showAnchors />;
  } else if (selectedPage === "icon") {
    pageContent = <IconDoc showAnchors />;
  } else if (selectedPage === "input") {
    pageContent = <InputDoc />;
  } else if (selectedPage === "input-number") {
    pageContent = <InputNumberDoc />;
  } else if (selectedPage === "date-picker") {
    pageContent = <DatePickerDoc showAnchors />;
  } else if (selectedPage === "mentions") {
    pageContent = <MentionsDoc showAnchors />;
  } else if (selectedPage === "layout") {
    pageContent = <LayoutDoc />;
  } else if (selectedPage === "masonry") {
    pageContent = <MasonryDoc />;
  } else if (selectedPage === "divider") {
    pageContent = <DividerDoc showAnchors />;
  } else if (selectedPage === "space") {
    pageContent = <SpaceDoc showAnchors />;
  } else if (selectedPage === "flex") {
    pageContent = <FlexDoc showAnchors />;
  } else if (selectedPage === "grid") {
    pageContent = <GridDoc showAnchors />;
  } else if (selectedPage === "list") {
    pageContent = <ListDoc />;
  } else if (selectedPage === "message") {
    pageContent = <MessageDoc showAnchors />;
  } else if (selectedPage === "notification") {
    pageContent = <NotificationDoc showAnchors />;
  } else if (selectedPage === "command-palette") {
    pageContent = <CommandPaletteDoc showAnchors />;
  } else if (selectedPage === "code-block") {
    pageContent = <CodeBlockDoc showAnchors />;
  } else if (selectedPage === "app") {
    pageContent = <AppDoc showAnchors />;
  } else if (selectedPage === "config-provider") {
    pageContent = <ConfigProviderDoc showAnchors />;
  } else if (selectedPage === "markdown-editor") {
    pageContent = <MarkdownEditorDoc showAnchors />;
  } else if (selectedPage === "mermaid-svg-viewer") {
    pageContent = <MermaidSvgViewerDoc showAnchors />;
  } else if (selectedPage === "mini-chart-card") {
    pageContent = <MiniChartCardDoc showAnchors />;
  } else if (selectedPage === "mobile-preview-frame") {
    pageContent = <MobilePreviewFrameDoc showAnchors />;
  } else if (selectedPage === "pagination") {
    pageContent = <PaginationDoc showAnchors />;
  } else if (selectedPage === "popconfirm") {
    pageContent = <PopconfirmDoc showAnchors />;
  } else if (selectedPage === "qr-code") {
    pageContent = <QRCodeDoc showAnchors />;
  } else if (selectedPage === "radar-chart") {
    pageContent = <RadarChartDoc showAnchors />;
  } else if (selectedPage === "rate") {
    pageContent = <RateDoc showAnchors />;
  } else if (selectedPage === "result") {
    pageContent = <ResultDoc showAnchors />;
  } else if (selectedPage === "segmented") {
    pageContent = <SegmentedDoc showAnchors />;
  } else if (selectedPage === "select") {
    pageContent = <SelectDoc />;
  } else if (selectedPage === "scatter-chart") {
    pageContent = <ScatterChartDoc showAnchors />;
  } else if (selectedPage === "tree") {
    pageContent = <TreeDoc showAnchors />;
  } else if (selectedPage === "tree-select") {
    pageContent = <TreeSelectDoc showAnchors />;
  } else if (selectedPage === "transfer") {
    pageContent = <TransferDoc showAnchors />;
  } else if (selectedPage === "steps") {
    pageContent = <StepsDoc showAnchors />;
  } else if (selectedPage === "tabs") {
    pageContent = <TabsDoc showAnchors />;
  } else if (selectedPage === "tag") {
    pageContent = <TagDoc />;
  } else if (selectedPage === "table") {
    pageContent = <TableDoc />;
  } else if (selectedPage === "timeline") {
    pageContent = <TimelineDoc showAnchors />;
  } else if (selectedPage === "switch") {
    pageContent = <SwitchDoc showAnchors />;
  } else if (selectedPage === "slider") {
    pageContent = <SliderDoc />;
  } else if (selectedPage === "splitter") {
    pageContent = <SplitterDoc />;
  } else if (selectedPage === "statistic") {
    pageContent = <StatisticDoc showAnchors />;
  } else if (selectedPage === "textarea") {
    pageContent = <TextareaDoc />;
  } else if (selectedPage === "time-picker") {
    pageContent = <TimePickerDoc showAnchors />;
  } else if (selectedPage === "toolbar") {
    pageContent = <ToolbarDoc showAnchors />;
  } else if (selectedPage === "watermark") {
    pageContent = <WatermarkDoc showAnchors />;
  } else if (selectedPage === "tour") {
    pageContent = <TourDoc showAnchors />;
  } else if (selectedPage === "util") {
    pageContent = <UtilDoc showAnchors />;
  } else if (selectedPage === "upload") {
    pageContent = <UploadDoc showAnchors />;
  } else if (selectedPage === "skeleton") {
    pageContent = <SkeletonDoc showAnchors />;
  } else if (selectedPage === "spin") {
    pageContent = <SpinDoc showAnchors />;
  } else if (selectedPage === "progress") {
    pageContent = <ProgressDoc showAnchors />;
  } else if (selectedPage === "tooltip") {
    pageContent = <TooltipDoc showAnchors />;
  } else if (selectedPage === "popover") {
    pageContent = <PopoverDoc showAnchors />;
  } else if (selectedPage === "modal") {
    pageContent = <ModalDoc showAnchors />;
  } else if (selectedPage === "drawer") {
    pageContent = <DrawerDoc showAnchors />;
  } else if (selectedPage === "funnel-chart") {
    pageContent = <FunnelChartDoc showAnchors />;
  } else if (selectedPage === "gauge-chart") {
    pageContent = <GaugeChartDoc showAnchors />;
  } else if (selectedPage === "heatmap") {
    pageContent = <HeatmapDoc showAnchors />;
  } else if (selectedPage === "treemap") {
    pageContent = <TreemapDoc showAnchors />;
  } else if (selectedPage === "sankey-chart") {
    pageContent = <SankeyChartDoc showAnchors />;
  } else if (selectedPage === "organization-chart") {
    pageContent = <OrganizationChartDoc showAnchors />;
  } else if (selectedPage === "mind-map") {
    pageContent = <MindMapDoc showAnchors />;
  } else if (selectedPage === "word-cloud") {
    pageContent = <WordCloudDoc showAnchors />;
  } else if (selectedPage === "line-chart") {
    pageContent = <LineChartDoc showAnchors />;
  } else if (selectedPage === "area-chart") {
    pageContent = <AreaChartDoc showAnchors />;
  } else if (selectedPage === "bar-chart") {
    pageContent = <BarChartDoc showAnchors />;
  } else if (selectedPage === "pie-chart") {
    pageContent = <PieChartDoc showAnchors />;
  } else if (selectedPage === "sparkline") {
    pageContent = <SparklineDoc showAnchors />;
  } else if (selectedPage === "metric-card") {
    pageContent = <MetricCardDoc showAnchors />;
  } else if (selectedPage === "data-toolbar") {
    pageContent = <DataToolbarDoc showAnchors />;
  } else if (selectedPage === "filter-panel") {
    pageContent = <FilterPanelDoc showAnchors />;
  } else if (selectedPage === "property-list") {
    pageContent = <PropertyListDoc showAnchors />;
  } else if (selectedPage === "status-timeline") {
    pageContent = <StatusTimelineDoc showAnchors />;
  } else if (isComponentPage(selectedPage)) {
    pageContent = <ComponentDetailDoc item={getDocsComponentItem(selectedPage)} />;
  }

  return (
    <DocsShell selectedPage={selectedPage} onNavigate={handleNavigate}>
      {pageContent}
    </DocsShell>
  );
}

export default App;
