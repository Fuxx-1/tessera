# Tessera Iced 101 组件全原生架构方案

> 状态：可直接派发的实现方案；本文件不包含生产代码
>
> 日期：2026-08-19
>
> 写范围：仅 `native/docs/full-native/architecture-plan.md`
>
> 目标：101 个登记组件全部使用 Iced 原生实现；每项都可从目录键盘或指针打开独立详情页，详情页同时展示可运行效果、与效果同源的集成代码、状态和边界说明。`Deferred`、`Recompose`、WebView、HTML 包装和“目录已映射”均不是完成。

## 1. 架构结论

保持现有三个 crate，不增加第四个生产 crate：

```text
tessera-core <- tessera-iced <- tessera-gallery
```

- `tessera-core` 只保存 renderer 无关的组件身份、纯状态机、稳定业务语义和不变量。
- `tessera-iced` 保存 101 个真正可复用的 Iced 组件、主题、Overlay、动画和 Canvas 基础设施。
- `tessera-gallery` 保存 Gallery 壳、目录、详情路由、101 个独立可运行示例、同源代码片段和验收宿主。
- 不建立通用 renderer、动态插件、JSON props、trait-object 组件树或 React/Iced 双状态同步。
- 101 个组件各有一个库模块和一个 Gallery 示例模块。异构示例由编译期穷举 enum 分派，不使用运行时反射或类型擦除。
- 应用只挂载当前详情页的示例状态；离开详情页即释放。主题、路由、目录筛选和当前示例状态都只在一个 `AppState` 中有唯一真源。

## 2. 当前基线审计

### 2.1 三 crate 与源码

| crate | 当前事实 | 结论 |
|---|---|---|
| `tessera-core` | `catalog.rs` 静态登记 101 项；`lib.rs` 混入 Gallery 的 `Page/Workspace/WorkItem` 示例状态 | 组件身份可保留并强类型化；Gallery 专属状态必须移出 core |
| `tessera-iced` | 只有 token/style 与 `action_button/nav_button/card/status_badge` 四类帮助函数 | 不是 101 个组件库；需要按组件拆分公开模块 |
| `tessera-gallery` | `main.rs` 1,516 行；`App/Message/update/view`、壳、目录和多组演示全部耦合 | 拆为壳、路由、页面、示例分派；`main.rs` 只保留启动配置 |

当前 native 共 7 个 Rust 源文件、约 3.2k 行。`catalog.rs` 的 101 项数量为 Base 75、Business 11、Charts 15，与 Web registry 的 ID 和分类一致，但当前 native 状态只有：

- `Ready`: 10
- `Recompose`: 32
- `Deferred`: 59

目录 tile 只是不可点击的 `Container`，没有 `ComponentId` 详情路由、独立示例状态、集成代码或边界说明。当前 `Ready` 只代表若干控件被汇总展示，不能证明对应组件已经独立完成。

### 2.2 Iced 0.14 能力边界

当前 workspace 精确锁定 `iced = 0.14.0`，只启用 `wgpu-bare` 与 `thread-pool`。本机锁定源码和 Cargo feature 表明：

| 能力 | Iced 0.14 现状 | 本方案使用方式 |
|---|---|---|
| 标准 widget | 已有 button、checkbox、container、pick-list、progress、radio、responsive、row/column、rule、scrollable、slider、text/text-input、toggler、tooltip 等 | 作为原子组件的 renderer 适配，不把 Iced 默认样式当 Tessera API |
| `Task` / `Subscription` | 可用；当前应用所有 update 都返回 `Task::none()`，没有 subscription | 异步结果经 generation 回写；subscription 只在当前详情存在活动动画时非空 |
| Canvas | `canvas` feature 存在，提供 `Canvas/Program/Frame/Path/Stroke/Fill/Text/Cache/Geometry`；当前未启用 | 图表、Watermark、BorderBeam 和复杂图形的唯一绘制基础，不生成 DOM/SVG 树 |
| Markdown | `markdown` feature 存在；当前未启用 | 使用 Iced 原生文本/代码/链接 widget 输出，raw HTML 不执行、不嵌入 |
| 图片/SVG | `image`、`svg` feature 存在；当前未启用 | 仅经过输入上限和内容校验后进入 renderer；SVG 不作为 Mermaid 运行时后端 |
| 自定义 widget/overlay | 需要 `advanced` 能力及项目自己的单一 Overlay Host | Dropdown、Popover、Modal、Drawer、Select、Tour 等共享同一定位、焦点和关闭协议 |
| 高阶组件与图表 | Iced 不直接提供 DatePicker、Tree、Table、Transfer、Tour、图表或 Mermaid renderer | 由 Tessera 状态机、组合 widget、Overlay 和 Canvas 原生实现 |

实现开始时允许在现有 `iced` 依赖上按批次增加 `advanced/canvas/image/svg/markdown` feature；禁止启用 `unconditional-rendering`、默认双 renderer 或第二个 async runtime。feature 增加必须由实际组件调用方触发，并在相应批次完成包体、RSS 和空闲唤醒复测。

## 3. 目标目录与模块边界

```text
native/crates/
  tessera-core/src/
    lib.rs
    catalog.rs                 # 唯一组件身份/元数据真源，101 项
    async_state.rs             # generation、异步状态与纯不变量
    selection.rs               # 稳定 ID、单选/多选/范围选择
    validation.rs              # 表单/输入验证语义

  tessera-iced/src/
    lib.rs
    tokens.rs
    style.rs
    animation.rs               # 活动期动画状态与条件 subscription
    overlay.rs                 # 全应用唯一 OverlayHost 协议
    focus.rs                   # focus scope、归还 token、键盘遍历
    content.rs                 # 图片/Markdown/Mermaid 的有界 Safe IR
    canvas/
      mod.rs
      chart.rs                 # 坐标、轴、图例、命中测试、几何缓存
      graph.rs                 # 图/树布局结果的 Canvas 绘制
    components/
      mod.rs
      general/*.rs
      layout/*.rs
      navigation/*.rs
      data_entry/*.rs
      data_display/*.rs
      feedback/*.rs
      other/*.rs
      extensions/*.rs
      business/*.rs
      charts/*.rs              # 每个登记 ID 恰好一个文件

  tessera-gallery/src/
    main.rs                    # 启动参数和 iced::application，目标 <= 80 行
    app.rs                     # AppState/AppMessage/update/subscription
    route.rs                   # Route 与返回导航
    shell.rs                   # 1240/840 响应式壳
    pages/
      catalog.rs               # 可点击目录与筛选
      detail.rs                # 同时承载效果/代码/边界的详情布局
    examples/
      mod.rs                   # 编译期穷举 ExampleState/ExampleMessage
      <group>/<component>/
        mod.rs                 # 示例 State/Message/update/状态说明
        integration.rs         # 被编译并被 include_str! 展示的同一份代码
```

目录分组只服务代码 ownership，不改变 Web registry 的 101 个 ID。组件文件不得依赖 `tessera-gallery`；Gallery 示例不得承载组件唯一实现。

## 4. 固定模块 API

以下是实现时必须保持的边界形状。具体字段可在组件批次内扩充，但不得引入第二套身份、路由或状态协议。

### 4.1 组件身份与元数据

`tessera-core::catalog` 使用一个私有声明表生成强类型 ID、元数据切片和字符串解析，避免 101 个 ID 在多个 match 中手工复制：

```rust
pub enum ComponentId { /* 101 个穷举 variant */ }

pub struct ComponentSpec {
    pub id: ComponentId,
    pub slug: &'static str,
    pub name: &'static str,
    pub category: ComponentCategory,
    pub group: ComponentGroup,
    pub summary: &'static str,
}

pub const COMPONENTS: &[ComponentSpec; 101];
```

约束：

- `ComponentId` 是目录、详情路由、示例状态和测试证据的共同 key。
- 元数据只在 `catalog.rs` 声明一次；`as_str/TryFrom<&str>/COMPONENTS` 由同一私有宏生成。
- `ComponentSpec` 不保存 `Ready/Recompose/Deferred`。实现进度放在构建期 evidence manifest，不进入运行时 UI 真源。
- CI 静态断言总数 `101`、分类 `75/11/15`、slug 唯一，且与冻结的 Web ID 清单逐项一致。

### 4.2 组件公开 API 约定

不定义一个强迫所有组件同构的 `Component` trait。每个组件模块只采用以下两种形状之一：

```rust
// 受控组件
pub struct Props<'a, Value, Message> { /* value + on_change + semantic options */ }
pub fn view<'a, Message>(props: Props<'a, ..., Message>) -> Element<'a, Message>;

// 有纯状态机的复杂组件
pub struct State { /* 选择、展开、编辑等唯一语义状态 */ }
pub enum Event { /* 对宿主有意义的类型化事件 */ }
pub fn reduce(state: &mut State, event: Event) -> Effect;
pub fn view<'a, Message>(state: &'a State, props: Props<'a, Message>) -> Element<'a, Message>;
```

- 值、选择、展开、排序和校验由宿主或 core 纯状态拥有；组件不复制一份 `default_value`。
- 焦点、光标、滚动位置、测量和短时动画可以是 widget tree 的内部状态，不得成为第二个业务值。
- `Event` 表达业务意图，不泄漏 DOM 事件、renderer、窗口句柄或 Gallery 的 `AppMessage`。
- 异步组件返回描述性 effect 或由宿主创建 `Task`；结果必须携带逻辑 key 与 generation。
- 每个公开模块有模块级契约测试；复杂状态机的 reducer 测试位于 core 或组件模块内。

### 4.3 Gallery 路由、状态与消息

```rust
pub enum Route {
    Catalog,
    Component(ComponentId),
    Settings,
}

pub struct AppState {
    pub shell: ShellState,        // 主题、窗口/focus/可见性、reduced motion
    pub catalog: CatalogState,    // query/category，离开详情后保留
    pub route: Route,
    pub detail: Option<DetailState>,
}

pub enum AppMessage {
    Shell(ShellMessage),
    Catalog(CatalogMessage),
    Navigate(Route),
    Detail(DetailMessage),
    Frame(Instant),
    Window(WindowMessage),
}
```

必须保持的状态不变量：

1. `route == Route::Component(id)` 当且仅当 `detail.id() == id`。
2. 点击或键盘激活目录项时，通过 `DetailState::new(id)` 创建唯一活动示例。
3. 切换组件先丢弃旧 `DetailState` 再创建新状态；不缓存 101 份示例状态。
4. 返回目录会释放详情状态，但保留目录 query/category。
5. theme、reduced motion、窗口可见性只存于 `ShellState`，示例通过只读 `DemoContext` 获取。

消息调用链固定为：

```text
Iced event -> AppMessage -> domain update -> optional Task -> generation-checked result
           -> AppState -> view
```

不增加事件总线、全局 mutable singleton、channel 驱动 UI 或组件直达 OS 的旁路。

### 4.4 示例分派与代码同源

每个 `examples/<group>/<component>/mod.rs` 必须导出：

```rust
pub const ID: ComponentId;
pub struct State;
pub enum Message;
pub fn new() -> State;
pub fn update(state: &mut State, message: Message) -> Task<Message>;
pub fn view<'a>(state: &'a State, context: DemoContext) -> Element<'a, Message>;
pub const STATES: &[StateNote];
pub const BOUNDARIES: &[BoundaryNote];
pub const CODE: &str = include_str!("integration.rs");
```

`examples/mod.rs` 用一个私有 `example_registry!` 声明生成 `DetailState`、`DetailMessage`、`new/update/view/code/states/boundaries` 的穷举分派。该宏只消除 101 份机械 match，不生成业务逻辑，也不对外公开。

`integration.rs` 同时满足两件事：

1. 作为 Rust 模块被当前示例实际调用和编译。
2. 通过 `include_str!` 原样显示在详情页代码区。

因此运行效果与展示代码不会出现两份手工维护实现。CI 对 101 个示例逐项验证 ID、可构造状态、非空代码、非空边界说明和路由可达性。

## 5. 详情页合同

每个目录项必须是有焦点样式的 `Button`/可激活 widget，而非不可点击 `Container`。Enter/Space 打开；返回按钮、平台返回快捷键和明确的 Gallery 导航返回目录。焦点从目录项进入详情标题，返回时恢复到原目录项。

详情页固定同时包含以下区域，不用互斥 tab 隐藏必需内容：

1. 标题区：名称、分类、原生实现说明、返回按钮。
2. `Live preview`：真实组件实例和适用的状态控制。
3. `Integration code`：`integration.rs` 原文，等宽字体，局部横向滚动，支持键盘选择/复制。
4. `States & behavior`：默认、hover、active、focus、disabled，以及适用的 loading/empty/error/selected/read-only。
5. `Boundaries`：数据上限、文本策略、平台差异、错误/资源失败和明确不支持行为。

布局规则：

- `1240x800`：预览和代码可为双列，下方状态/边界通栏；首屏仍能看见下一段的开始。
- `840x600`：全部单列，详情页只有一个主滚动容器；代码区独立横向滚动，不扩大页面宽度。
- 任意长单词、URL、CJK、emoji 和多行错误文案不得遮挡相邻控件。正文换行；不可断 token 进入局部滚动；按钮文字不能被裁切。
- Overlay 始终在窗口边缘翻转/约束，Escape 关闭并归还焦点；详情页滚动和 overlay 滚动不争抢同一事件。

## 6. 101 组件分组、owner 与批次

每个批次 owner 同时拥有对应 `tessera-iced/src/components/<group>/**` 和 `tessera-gallery/src/examples/<group>/**`；这是一个可运行垂直切片。任何中央文件由集成 owner 单独修改，组件 owner 不抢写。

| 批次 | 唯一 owner | 组件（数量） | 前置/退出条件 |
|---|---|---|---|
| F0 合同与宿主 | core-contract owner + gallery-shell owner，各自独占写集 | 非组件批次 | 强类型 101 registry、详情路由、同源示例分派、OverlayHost/Focus、测试 harness 可运行 |
| F1 General/Layout/Extensions | foundation owner | Button、FloatButton、Icon、Typography；Divider、Flex、Grid、Layout、Masonry、Space、Splitter；Textarea、IconButton、Toolbar（14） | 亮暗主题、尺寸、长文本、基础键盘和焦点门禁全绿 |
| F2 Navigation/Feedback | interaction owner | Anchor、Breadcrumb、Dropdown、Menu、Pagination、Steps、Tabs；Alert、Drawer、Message、Modal、Notification、Popconfirm、Progress、Result、Skeleton、Spin、Watermark（18） | 单 OverlayHost、焦点圈闭/归还、Escape、边缘翻转、仅活动动画通过 |
| F3 Data Entry | data-entry owner | AutoComplete、Cascader、Checkbox、ColorPicker、DatePicker、Form、Input、InputNumber、Mentions、Radio、Rate、Select、Slider、Switch、TimePicker、Transfer、TreeSelect、Upload（18） | 受控值、IME、校验、禁用/只读、键盘 combobox、文件边界通过 |
| F4 Data Display | data-display owner | Avatar、Badge、Calendar、Card、Carousel、Collapse、Descriptions、Empty、Image、List、Popover、QRCode、Segmented、Statistic、Table、Tag、Timeline、Tooltip、Tour、Tree（20） | 长列表/树稳定 ID、图片限额、表格溢出、Tour/Popover overlay 通过 |
| F5 Other | platform-scope owner | Util、Affix、App、BorderBeam、ConfigProvider（5） | 原生语义明确；无 DOM/CSS 兼容壳；BorderBeam 静止时零订阅 |
| F6 Business | business owner | MetricCard、MiniChartCard、DataToolbar、FilterPanel、PropertyList、StatusTimeline、CommandPalette、CodeBlock、MarkdownEditor、MermaidSvgViewer、MobilePreviewFrame（11） | 组合只调用已完成基础组件；Markdown/Mermaid Safe IR、命令焦点和代码溢出通过 |
| F7 Charts | charts owner | LineChart、BarChart、PieChart、AreaChart、Sparkline、ScatterChart、RadarChart、Heatmap、Treemap、FunnelChart、GaugeChart、SankeyChart、OrganizationChart、MindMap、WordCloud（15） | Canvas 数值、布局、采样、命中测试、空/错/超限与缓存预算通过 |

总数：`14 + 18 + 18 + 20 + 5 + 11 + 15 = 101`。

### 6.1 中央文件 ownership

| owner | 独占文件 |
|---|---|
| core-contract owner | `tessera-core/src/catalog.rs`、`async_state.rs`、`selection.rs`、`validation.rs`、`lib.rs` |
| iced-foundation owner | `tessera-iced/src/{lib,tokens,style,animation,overlay,focus,content}.rs`、`canvas/**`、`components/mod.rs` |
| gallery-shell owner | `tessera-gallery/src/{main,app,route,shell}.rs`、`pages/**` |
| integration owner | 三个 `Cargo.toml`、`Cargo.lock`、`examples/mod.rs`、批次登记与删除旧路径；不写组件正文 |
| component batch owner | 上表指定的组件目录和镜像 examples 目录；不写中央 registry/dispatcher |
| test owner | `native/testkit/**`、Gallery 集成测试和证据脚本；生产模块内单元测试仍由组件 owner 负责 |

### 6.2 并行与合并顺序

固定合并序列如下：

1. `F0a catalog/route`：先合强类型 ID、路由和空详情壳。
2. `F0b foundation`：再合 token、Focus、Overlay、animation、Canvas/content 边界与测试 harness。
3. `F1`：建立所有后续组件依赖的控件、布局和扩展基础。
4. `F2/F3/F4/F7` 可在 F1 后并行开发；各 owner 只写独占目录。集成 owner 按 `F2 -> F3 -> F4 -> F7` 串行登记 dispatcher，避免中央文件冲突。
5. `F5` 在 F2 的窗口/overlay 行为稳定后合入。
6. `F6` 在 F2-F4 与 Canvas 基础稳定后合入；Markdown/Mermaid 子项可与其他 Business 子项并行，但最后合并。
7. `F8 cleanup`：全量证据通过后删除旧单体演示和状态分类；此批次不能与组件批次并行。

每个批次只在以下条件齐备时交给集成 owner：组件库模块、独立示例、同源集成代码、状态/边界说明、单元/交互测试和四个基础视觉场景全部在同一 revision 通过。

## 7. 原生等价策略

### 7.1 Overlay 和浏览器语义组件

- Dropdown、Popover、Tooltip、Popconfirm、Modal、Drawer、Select、Cascader、TreeSelect、Tour、Message、Notification 全部提交 typed `OverlayDescriptor` 给单一 `OverlayHost`。
- Anchor/Affix/FloatButton 使用 Gallery 或宿主的逻辑 viewport/scroll offset，不模拟 `window/document`。
- `App` 是 provider/overlay/message scope；`ConfigProvider` 是类型化 theme/density/locale scope；二者都不是空包装页面。
- `MobilePreviewFrame` 是固定逻辑尺寸、可缩放的 Iced 内容容器，仅预览 Tessera widget，不嵌入浏览器或 HTML。
- `Util` 只暴露有当前调用方的 focus、ID、文本和测量辅助；不成为杂项 dumping ground。

### 7.2 Canvas 图表

所有 15 个 chart 共享私有的坐标、轴、图例、采样、命中测试和几何缓存基础，但每个 chart 仍有独立公开模块、状态、示例和边界。

```text
typed series -> validate -> scale/layout -> bounded geometry -> Canvas::Cache -> draw
pointer/key   -> hit index -> typed ChartEvent -> host state
```

- 数据值、空值、domain、stack 和排序在纯函数层计算；Canvas 只绘制最终几何。
- 缓存 key 至少包含数据 revision、逻辑尺寸、DPI、主题和交互状态；任一变化时清理对应 cache。
- 单详情可见图元硬限 20,000；更大输入在后台按图表语义采样，过期 generation 丢弃。
- Canvas 几何缓存每个活动详情软限 4 MiB、硬限 8 MiB；离开详情立即释放。
- 命中测试不得每次指针移动全量扫描；线/散点使用区间或网格索引，树/关系图使用布局生成的边界索引。
- OrganizationChart/MindMap/Sankey 先生成有界布局 IR，再交 Canvas；布局失败、环、超限或取消必须显示确定错误态。

### 7.3 Markdown 原生策略

`MarkdownEditor` 是 Iced `text_editor` + 原生预览的受控组件：

```text
source -> bounded Markdown parse -> MarkdownIr -> Iced text/code/link widgets
```

- 使用 Iced `markdown` 能力或其锁定解析依赖生成结构化节点；禁止 HTML renderer。
- raw HTML 丢弃或按纯文本显示；链接只生成 `ExternalAction::OpenUrl`，必须用户手势和 `http/https` 白名单。
- fenced code 使用原生等宽文本和横向滚动；Mermaid code fence 走下述 Mermaid pipeline。
- 80,000 字符以上进入明确超限态；解析在有界 Task 中执行并带 generation，update/view 不同步解析大文本。

### 7.4 Mermaid 原生策略

保留 registry ID `mermaid-svg-viewer`，但 native 实现不以 SVG 或浏览器为后端。公开语义是“Mermaid source viewer”，内部链路为：

```text
Mermaid source -> 限额/语法解析 -> DiagramIr -> native layout -> Canvas
```

- 第一版明确支持 flowchart、sequence 和 state 三类；其他语法进入 `UnsupportedKind` 边界态，不伪装已渲染。
- 输入硬限 12,000 字符、260 statement、8 个 block；解析并发 1，单次 3.5s 超时，结果带 generation。
- parser 是 `content::mermaid` 的私有实现依赖，不进入公开 API；选型必须在 F6 开始前以恶意输入、包体、unsafe/build.rs 和语法覆盖 spike 锁定。
- IR 只含受控文本、节点、边和样式枚举；不接收脚本、HTML、URL 资源、事件、`foreignObject` 或任意 SVG。
- 布局和 Canvas 渲染与 OrganizationChart/MindMap 复用私有 graph 基础，不复用业务状态或公开 API。

### 7.5 仅活动期动效

```rust
pub enum AnimationPhase {
    Idle,
    Running { started_at: Instant, duration: Duration },
}
```

- `AppState::subscription()` 只有在窗口可见且聚焦、当前 `DetailState` 报告 `Running`、且未启用 reduced motion 时才订阅 Iced frame stream；其他情况返回 `Subscription::none()`。
- 每个 frame 只发送一个顶层 `AppMessage::Frame`，再分派给当前详情；不存在每组件 timer。
- 动画到达 duration 必须原子转为 `Idle`。切路由、失焦、最小化或 reduced motion 会立即停止请求帧。
- Spin/Skeleton/Carousel/BorderBeam/Progress/图表过渡只在用户明确触发的 demo 活动期播放；默认静态预览不永久循环。
- 低帧率降级只减少装饰动画/采样，不降低文字、焦点环、热区或错误反馈。

## 8. 性能与内存预算

沿用 `iced-plan.md` 的发布硬门槛，并增加全组件 Gallery 的局部预算：

| 指标 | 目标 | 阻断阈值 |
|---|---:|---:|
| 聚焦静态窗口 CPU | 10 分钟均值 `<= 0.2%` 单核 | p99 `> 1%` 或存在持续 redraw |
| 失焦/最小化 CPU | 均值 `<= 0.1%` | p99 `> 0.3%` 或唤醒 `> 1/s` |
| update + view + layout | p95 `<= 6ms` | p99 `> 12ms` |
| 输入到呈现 | p95 `<= 33.3ms` | p99 `> 50ms` |
| 60Hz 滚动/Canvas 交互 | p95 `<= 16.7ms` | p99 `> 33.3ms` |
| 空壳热态 RSS | `<= 100 MiB` | `> 140 MiB` |
| 普通详情额外常驻内存 | `<= 2 MiB` | `> 4 MiB` |
| Canvas/图片/Markdown 详情额外常驻内存 | `<= 12 MiB` | `> 24 MiB`，另受图片解码 64 MiB 硬限 |
| 最大 Gallery 场景 RSS | `<= 220 MiB` | `> 260 MiB` |
| 8 小时增长 | `<= 20 MiB` 且 `<= 1 MiB/h` | 任一超限 |
| UI 热路径同步文件/网络 I/O | 0 次、0 字节 | 任意一次 |

实现约束：

- 101 项 catalog 可做一次 `O(101)` 筛选；view 内不得重复分配小写字符串，query 改变时预计算或使用静态搜索字段。
- 只创建当前详情的 `State`、Canvas cache、解析结果和图片资源；catalog metadata 为静态只读数据。
- Table/List/Tree/Transfer 的大数据视图必须按可见项 + overscan 工作；固定行高版本先完成，动态行高不隐式混入。
- Markdown/Mermaid/图表采样、图布局和图片解码均不在 update/view/layout 同步执行。
- 任何缓存、队列和 Task batch 必须有硬上限、取消或 generation 丢弃规则。

## 9. 测试与验收门禁

### 9.1 编译期覆盖门禁

- `COMPONENTS.len() == 101`，Base/Business/Charts 为 `75/11/15`。
- 101 个 `ComponentId` 各有且仅有一个 `tessera-iced` 模块、一个 example module 和一个详情路由分支。
- 每个 example 的 `CODE/STATES/BOUNDARIES` 非空；`integration.rs` 被实际编译。
- 禁止 `NativeStatus::Deferred/Recompose`、`native_status()`、WebView/HTML renderer 依赖和永久 `time::every`。
- `cargo metadata` 仍只有三个生产 package；`cargo tree -e features` 不得出现双 renderer 或未登记开发 feature。

### 9.2 每组件最小矩阵

每个组件必须完成：

1. 纯状态/边界单测：默认、输入上限、非法状态、错误恢复。
2. Gallery 路由测试：目录指针点击、Tab 聚焦、Enter/Space 打开、返回后焦点恢复。
3. 适用交互测试：hover、active、focus、disabled、read-only、Escape、方向键、Home/End、PageUp/PageDown、IME。
4. 状态矩阵：适用的 loading、empty、error、selected、partial、overflow、异步乱序和资源失败。
5. 视觉与几何：无裁切、重叠、负尺寸、不可见焦点、文字遮挡和 overlay 出界。

### 9.3 全量视觉/尺寸矩阵

- Nightly 对 101 个详情逐项渲染 `1240x800 light/dark` 与 `840x600 light/dark`，共 404 个基础场景；检查非空像素、文本边界、重叠、焦点和主滚动范围。
- 每项另跑 `840x600` 长文本/长 URL/CJK/emoji/错误文案场景，共 101 个 overflow 场景；代码区必须只横向滚动自身。
- 只为 18 个跨能力视觉哨兵提交稳定 golden，控制仓库体积；404 + 101 全量 PNG、geometry manifest、字体/DPI/hash 作为 Nightly/RC 证据 artifact 保留并可复做。
- PR 对受影响组件跑四个基础场景、长文本场景和相邻共享基础的哨兵；RC 重跑全部 505 个场景并人工复核所有异常清单。

### 9.4 动画与性能门禁

- 任意静态详情、目录、后台详情和最小化窗口的 `subscription()` 必须为 none。
- 动画测试使用可控时钟，验证开始、进行、结束、切路由、失焦、reduced motion 六条路径；结束后不得再请求 frame。
- Canvas 组件测试数值/布局确定性、缓存失效、超限降级和命中测试，不以“截图看起来正常”替代数值断言。
- 每批次记录 release 构建的 CPU/RSS/包体/唤醒基线；相同参考机 p95 恶化 `> 5%` 或 p99 恶化 `> 10%` 阻断合并。

### 9.5 交付命令

每批至少执行并保存完整命令、revision、环境与结果：

```sh
cd native
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked --offline
cargo build --release --locked --offline -p tessera-gallery
```

GUI、视觉、IME、DPI、低配和平台门禁由 testkit 的显式场景命令补充，不能用以上四条命令代替。

## 10. 删除 `Deferred/Recompose` 的完成路径

1. F0 引入强类型 `ComponentId/ComponentSpec` 与详情路由；旧 `COMPONENTS` 内容只迁移一次，不复制第二张表。
2. 立即把 `Recompose/Deferred` 从“完成语义”移除。迁移期若 UI 必须显示进度，只允许使用构建期 `NotStarted/InReview/Production` evidence，不在 `ComponentSpec` 写死状态。
3. 每批组件完成时，集成 owner 添加穷举示例分派和 evidence；没有独立详情、同源代码、边界与测试的项不能进入 `Production`。
4. 101 项全部通过后删除：
   - `NativeStatus` enum、`native_status()` 大 match 和三类状态统计 UI；
   - `main.rs` 中共享 `demo_*` 字段、消息和 Action/Input/Display/Feedback 汇总演示；
   - core 中 Gallery 专属的 `Page/Workspace/WorkItem/WorkStatus`；
   - 不可点击的 `component_tile(Container)` 路径；
   - 所有 WebView、HTML/SVG Mermaid 包装 spike 或临时兼容层。
5. 最终 catalog 只表达组件事实和导航，不表达“有待实现”。CI 从 101 个模块、101 个 example、101 个 evidence 记录的集合相等性判断完整性。

最终完成判定不是状态数字归零，而是：

```text
catalog IDs == library module IDs == example IDs == reachable detail IDs == passing evidence IDs
             == 101 unique IDs
```

## 11. 复杂度净变化账本

| 维度 | 当前 | 目标上限/净变化 | 收敛与删除收益 |
|---|---:|---:|---|
| 生产 crate | 3 | 3，净 `0` | 禁止第四 crate |
| async runtime | iced thread-pool 1 套 | 1 套，净 `0` | 禁止 Tokio/smol 旁路 |
| renderer/产物 | 每产物 1 个 wgpu backend | 每产物 1，净 `0` | 禁止默认双 renderer |
| 应用状态真源 | 单体 `App`，含无关 workspace 与共享 demo 字段 | 1 个 `AppState` + 只挂载 1 个 `DetailState` | 删除共享 `demo_*` 镜像与 101 状态常驻可能 |
| 路由协议 | `Page` 4 项，无组件详情 | `Route` 3 类 + 强类型 `ComponentId` | 删除 core 的 Gallery `Page`，目录与详情不再旁路 |
| 组件进度协议 | `NativeStatus` + 101 项大 match | 运行时 0 个进度协议 | 删除 `Ready/Recompose/Deferred` 和统计 UI |
| Rust 源结构 | 7 文件，约 3.2k 行；`main.rs` 1,516 行 | 101 库模块 + 101 示例模块 + 约 15 个基础/壳模块；非测试 Rust 预算 `<= 42k` 行 | 模块增长与 101 个独立交付物一一对应；删除单体页面和汇总 demo，禁止额外转发层 |
| 公共 API | 4 个帮助函数，未形成组件库 | 每组件恰好 1 个公开模块；公共 foundation 类型 `<= 12` 类 | 不公开 Gallery、renderer、parser、Canvas cache 或 dispatcher 类型 |
| 长期宏 | 0 | 最多 2 个私有声明宏 | 只消除 catalog/示例的 101 份机械 match；无业务代码生成 |
| Overlay Host | 0 | 1，净 `+1` | 删除每个 overlay 组件自建定位/焦点/关闭逻辑 |
| 动画调度 | 0 | 1 个条件 subscription，净 `+1` | 删除组件 timer 和永久 tick 的可能 |
| Canvas 基础 | 0 | chart/graph 两个私有基础模块，净 `+2` | 15 图表和 Mermaid/关系图不各建绘制/命中/缓存协议 |
| iced feature | `wgpu-bare/thread-pool` | 按调用方增加至多 `advanced/canvas/image/svg/markdown` 5 项 | 每项有 owner、包体/RSS证据；未使用 feature 删除 |
| 新直接运行依赖 | 当前无组件领域依赖 | F3/F4/F6 合计最多 `4` 个，经 spike 审核 | QR、日期、Markdown/Mermaid 解析优先成熟库；禁止多个等价 parser/layout 依赖 |
| 调用链 | 单体 event -> match -> view | event -> domain update -> optional Task -> checked result -> view，最多 5 跳 | 不增加 bus/manager/facade 转发层 |

非测试 Rust 代码从约 3.2k 增到最多 42k 是实现 101 个独立组件和同源示例的必要净增，约束为平均每项总预算约 360 行，并允许复杂数据/图表从简单布局组件借用预算。批次实际账本若超出总上限，必须删除重复 helper、缩小 API 或给出测得收益；不能用新增 crate 或通用框架隐藏增长。

## 12. 阻断与风险裁决

### 当前实现前阻断

1. 当前 Cargo feature 未启用 `advanced/canvas/image/svg/markdown`；F0/F7/F6 对应代码不能在 feature 变更与离线构建通过前合入。
2. iced 0.14 没有现成的全量 Mermaid 原生 renderer。F6 开始前必须锁定受限 parser 依赖和三类语法的 corpus；失败时阻断 Mermaid 组件完成，不能改用 WebView/Chromium。
3. 当前没有 101 详情的 GUI capture/键盘 harness。F0 必须先让一个样板组件跑通四尺寸主题、长文本和路由测试，后续批次才可并行。

### 不阻断本地实现、但阻断发布声明

- iced 0.14 的完整读屏树能力仍缺真实平台证据；VoiceOver/Narrator/Orca 不通过时阻断对应平台 GA，不得用键盘可用替代读屏声明。
- Windows/Linux、低配设备、IME、DPI、字体和 8/24 小时资源证据尚未由本方案生成；保持 `UNVERIFIED`，在 G5/RC 阻断对应发布等级。
- Mermaid 第一版是明确声明边界的原生子集，不宣称与浏览器 Mermaid 全语法等价；新增语法必须扩展 parser corpus、IR、Canvas 和安全测试，不得静默透传 HTML/SVG。

除上述有证据的门禁外，三 crate 内按本文件拆分 101 个原生组件没有架构级阻断。实现阶段必须以 F0 样板垂直切片开始，而不是继续扩充 catalog 状态映射。
