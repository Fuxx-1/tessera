# Tessera Iced 全量组件详情页 UI/UX 规格

> 状态：设计合同，未实现，不得据此将任一组件标记为 `Ready` 或发布通过。
>
> 范围：`tessera-gallery` 中从 101 项组件目录进入的独立原生详情页。每一页必须同时提供可运行的 Iced 效果、Rust/Iced 集成代码、状态矩阵和能力边界。本文只定义 Gallery 文档体验，不改变业务宿主的页面结构。
>
> 设计依据：`iced-plan.md`、`native/docs/ui-spec.md`、`native/docs/visual-acceptance.md`、`native/crates/tessera-iced/src/{tokens,style,components}.rs`、`native/crates/tessera-gallery/src/main.rs` 与 `src/docs/componentRegistry.ts`。

## 1. 目标和完成定义

目录不是“101 条映射”的终点。全量交付的终点是：每个注册 ID 都有一个可进入的详情路由，路由中的演示是该 ID 的原生 Iced 实现本身，用户可以以鼠标和键盘操作它，并能在同页看到最小集成代码、适用状态、错误/资源边界和恢复路径。

以下规则为硬约束：

- `COMPONENTS.len() == 101` 中的每个 ID 都必须可点击进入自己的详情页；没有“仅目录”、空白页、静态截图或共享万能演示页。
- 效果区只允许 Iced widget、Iced Canvas/路径、Iced 原生图片/文本和受控原生平台能力。禁止 WebView、HTML、DOM、SVG DOM、React runtime 或把 Web 页面截图后嵌入。
- `Deferred`、`Recompose`、Web 的 `production`、展示占位文案和“planned”都不是完成状态。详情页只能把它们显示为当前交付风险，不能作为已经原生实现的证据。
- 每项完成所需的效果必须来自该组件或其有界原生组合；例如图表使用 Iced Canvas/路径和受控缓存，目录/树/表格使用 Iced 原生状态与虚拟化，不得退化为不可交互的位图。
- 每项都必须有独立示例状态。Gallery 可以为测试提供 fixture，但 Gallery 的示例状态不得成为组件库的业务状态真源。
- 所有外部 URL、文件选择、剪贴板和系统动作仍经 External Action Broker；详情页的 Copy、Open 或 Upload 示例不能绕过此边界。

当前 `catalog.rs` 中的 `Ready/Recompose/Deferred` 是迁移盘点，不能替代此规格的完成语义。此规格要求最终 101 项逐项达到“原生可运行详情页”标准；任何尚未达到的项应在其详情页显示 `Blocked` 或 `In progress`，连同具体缺口和下一验证门禁。

## 2. 目录到详情的导航合同

### 2.1 信息架构

```text
App shell
  Components directory
    category / group / query filters
    component tile (101)
      Component detail /<category>/<id>
        context and route controls
        identity and capability summary
        live native effect + integration code
        state matrix
        boundaries, recovery and evidence requirements
```

目录保留现有 Base / Business / Charts 筛选和名称、ID、分组检索。每张 Tile 是一个完整的按钮而不是纯 `Container`：点击、`Enter` 或 `Space` 都进入该条目的独立详情页。Tile 显示名称、中文名（有时）、分类/分组和当前原生交付状态；Tile 的状态徽标不能吞掉点击或抢占 Tab 焦点。

目录上下文必须被保存为 `CatalogContext`：

| 字段 | 必须保存的原因 |
| --- | --- |
| category、group、query | 返回后仍是用户刚才筛出的集合 |
| canonical visible ID sequence | 上一项/下一项在同一工作集内稳定移动 |
| directory scroll offset | 返回后不使用户从 101 项首项重新开始 |
| opener ID 与焦点来源 | 详情页 Back 后恢复到同一 Tile |
| theme、ui_scale、system_scale、locale、motion | 详情页切换不得重置环境或制造不可复现的清样 |

详情页可由三种入口打开：目录 Tile、上一个/下一个控制、可深链的组件路由。前两种必须带 `CatalogContext`；深链没有来源时，使用注册表固定顺序作为上下文，Back 回到默认目录的该组件位置。

### 2.2 返回、上一项和下一项

详情页顶部固定在内容滚动区上方，使用以下顺序和语义：

1. 左侧为带箭头图标和可达名称的 `Back to components`。点击或 `Alt+Left` 回到目录；它不是浏览器历史的替代品。
2. 中间为精简 breadcrumb：`Components / <Category> / <Group>`。末级组件名是普通文本，避免同页的重复可点击目标。
3. 右侧是 `Previous` 和 `Next` 两个 36 DIP 图标按钮，每个都有 Tooltip 和可读名称，之间显示 `n / N`。N 是已保存可见集合的长度；深链则为 101。

上一项/下一项按打开详情时冻结的 `CatalogContext.visible_ids` 顺序移动，不会因为后续异步状态、主题切换或实现状态变化而跳项。首项 Previous、末项 Next 显示禁用状态但保留 36 DIP 轨道；键盘焦点不能落在禁用项。切换目标后，主滚动位置归零、焦点进入新的 `H2`，顶部路由控制和环境偏好不变。

Back 必须恢复目录的筛选、分组、滚动位置和 opener Tile 的键盘焦点。若 opener 不再存在（注册表版本改变或筛选值失效），焦点落到目录标题；不得丢到窗口或不可见元素。`Escape` 只在没有已打开 Overlay、没有 IME preedit 时执行 Back；IME 的 Escape 首先取消组合文本。

### 2.3 详情页 Tab 顺序

默认 Tab 顺序与视觉/阅读顺序相同：Back -> Previous -> Next -> 效果区中的互动控件 -> 代码工具（复制/折行/语言） -> 状态矩阵中的控件 -> 边界区链接或恢复动作。纯文本、静态代码和状态说明不制造多余 Tab stop。复合展示（图表、表格、树、日历）遵循其组件自身的 roving focus 规则，详情页外层只提供一个入口。

## 3. 详情页结构和视觉层级

详情页是任务型文档面，不是营销 Hero。页面标题最大为 24pt / 500，支持说明为 14pt，控制标签为 12pt，代码为 13pt monospace。文字字距固定为 0，不随窗口宽度改变字号。页面用完整布局带组织；只有“可运行效果”和“代码”这两种实际工具面，以及必要的状态表，使用有边界的 surface，且禁止 Card 内再嵌 Card。

### 3.1 从上到下的内容

| 区域 | 内容 | 视觉和行为要求 |
| --- | --- | --- |
| Route bar | Back、breadcrumb、Previous/Next、位置计数 | 46 DIP 轨道；内容滚动时保持可用；hairline 分隔，无独立大卡片 |
| Identity | `Name`、中文名、分类/分组、短用途、原生交付状态 | H2 + 14pt 描述；状态使用语义三件套及文本，不能只用颜色；不使用巨型标题或蓝色 banner |
| Capability strip | `Native Iced`、交互模式、数据/资源边界、主题与键盘覆盖 | 12pt 紧凑信息带；长值可换行，不把路径或 URL 挤进单行 |
| First-workbench | 左/上：运行效果；右/下：集成代码 | 同一视口能看到二者的首行；两个面各自有标题和可聚焦操作，不出现“预览图片”替代真实效果 |
| State matrix | 状态、触发、可见输出、键盘、恢复、边界 | 组件的真实状态机；矩阵支持纵向滚动但固定表头，不能只列 happy path |
| Boundary and recovery | 限制、空/错/超限、异步乱序、资源拒绝、可访问性范围 | 说明必须可读、可复制；若有恢复动作，动作真实改变示例状态 |
| Evidence footer | 需要的视觉/交互/性能 case 与当前结论 | 显示 `Blocked` 直到具备同 revision 证据；不伪造 PASS |

### 3.2 原生效果区

效果区标题是 `Live native effect`，右侧仅放该演示实际需要的重置/模拟状态操作。默认高度和边界如下：

- 基础控件、反馈、短列表：最小 240 DIP，高度由内容增加，最大 520 DIP 后内部纵向滚动。
- 表格、树、Transfer、图表、编辑器和 Canvas：首屏 360 DIP，最大 560 DIP；超过后只在效果区内部滚动或平移。
- 代码、图表或长 ID 不得迫使整个应用出现横向滚动。图表画布允许在明显标注的 viewport 内横向/双向平移；所有 Iced Canvas 缩放和平移的值受有限范围约束，并有 Reset。
- 为每一项提供与该组件相关的可运行起始数据，不用空白“Demo”。例如 Select 能选择，Input 可输入和校验，DataGrid 可选择/筛选，CommandPalette 可检索/执行受控命令，图表可显示数据摘要、键盘命中或表格 fallback。
- 含异步内容的效果区只用 `Loading | Refreshing | Ready(T) | Empty | Failed(E)` 五态。失败要保留输入/筛选和重试入口；过期 generation 的完成消息不得改变当前效果。

### 3.3 集成代码区

代码区只展示可复制、可编译取向的 Rust/Iced 集成片段，目标是 18--36 行的最小路径：必要 `use`、受控输入/状态、`view` 调用、事件映射和一个边界配置。它不展示 HTML、JSX、CSS 或伪 Rust。

- 代码行号从 1 开始，使用 13pt system monospace、`surface_sunken`、`border_light` 和 8 DIP 圆角。代码容器和它的水平滚动轨道是稳定尺寸，切换长短代码时不引发页面 reflow。
- 默认保留原始代码行，不断词、不插入隐藏换行。窄屏可切换 `Wrap visual lines`；打开后只是视觉软换行，复制仍返回原始文本，行号显示第一视觉行所属逻辑行。
- 不可断的标识符、路径、URL 和泛型超过可见宽度时只在代码区横向滚动。水平滚动可由 Shift+Wheel、触控板和键盘（代码区获得焦点后 `Home/End` 与左右键）访问，滚动条可见且不依赖 hover。
- `Copy` 为 30/36 DIP 原生动作；复制失败显示同区非阻断错误和可选文本选择路径。不得假定剪贴板一定可用。
- 长代码要采用窗口化渲染或行窗口，不能在详情打开时同步解析整个源文件。代码高亮为受控、可取消的后台工作；未完成时展示无高亮的原文本，不能阻塞输入或 layout。

### 3.4 状态矩阵

每项的矩阵由该组件的真实状态契约生成，至少包含下列适用行；不适用时写 `N/A` 和具体理由，不能删去整列。矩阵中的操作要驱动同页效果区，保证文档和真实实现不能漂移。

| 状态 | 触发或输入 | 可见/可听觉替代 | 键盘与焦点 | 恢复或退出 |
| --- | --- | --- | --- | --- |
| Resting | 初始 fixture | 默认值、label、帮助文本 | Tab 到入口 | 正常操作 |
| Hover / Press | 指针进入、按下 | 仅 token 色/描边变化，不改变几何 | 键盘路径不依赖 hover | 指针离开/释放 |
| Focus-visible | 键盘进入 | `focus_gap + focus_ring` | Enter/Space 或组件协议 | 焦点移走 |
| Selected / Open | 选择、展开或 Overlay 打开 | 选中标记、值或层面 | roving focus / focus trap（适用时） | 再次选择、Escape 或关闭 |
| Disabled / Read-only | fixture 控制 | 高对比 disabled/read-only 表达 | disabled 不执行；readonly 可读可选中 | 恢复为可用 |
| Loading / Refreshing | 受控延迟任务 | 静态 loading 或可终止短动效；旧数据语义明确 | 不夺焦点 | 成功、失败、取消 |
| Empty | 合法零结果 | 空态文案和保留的操作入口 | 焦点不陷入空容器 | 清筛选/新增/重试 |
| Failed | 注入错误/资源失败 | 错误文本、非纯色图标、保留上下文 | Retry 可 Tab/Enter | Retry、修正输入或取消 |
| Limit / Long content | 最大行、长 CJK/URL/ID、配额 | 截断、换行或局部滚动策略 | 完整值可到达、复制或展开 | Reset / 缩小数据 |

输入、选择、命令、树、表格和弹层还必须展示 IME preedit、箭头导航、Escape、Enter、焦点归还和异步乱序；图表还必须展示无数据、单值、负/零值（适用时）、超采样、命中/摘要 fallback 与资源上限。状态矩阵不能以“组件无状态”作为省略 Loading、Empty、Failed 或 Limit 的理由：若这些状态属于宿主而非组件，须明确宿主边界及示例怎么呈现它们。

## 4. 响应式、窗口和滚动规则

布局以 `ui-spec.md` 的 base DIP 和 `ui_scale` 规则为准。`ui_scale` 与 `system_scale` 必须分开保存和测试；断点用 `effective_width_base_dip` 判断，字体不随窗口宽度缩放。所有数值均为 base DIP，hairline 仍是一个物理像素。

| 窗口 / 有效宽度 | Gallery 壳层 | 详情首屏布局 | 关键规则 |
| --- | --- | --- | --- |
| `>= 1280` | 252 Sidebar + 46 Topbar | 最大 1120 宽的内容带；效果 7 份、代码 5 份并列 | 24 x 32 页面 padding；状态矩阵全列展示；正文不比 1120 更宽 |
| `1040--1279`，含 `1240 x 800` | 64 icon rail + 46 Topbar | 效果 7 / 代码 5 并列；窄时以 6 / 6 平分 | rail 图标有非 hover 可达名称；内容 padding 24；1240 清样必须同时看见效果与代码的标题和首行 |
| `840--1039`，含 `840 x 600` | Drawer 默认关闭 + Topbar Menu | 单列：Identity -> Effect -> Code -> State -> Boundary | 页面 padding 20；Route controls 分两行但不遮标题；效果最小 280；全局无横向滚动 |
| `< 840` | 不支持 | 不产生移动版或压扁版 | 窗口最小值拦截为 `840 x 600`，不以缩字、叠字或横向页面滚动补偿 |

在 `1240 x 800`，可滚动内容高度不足时只滚动正文，Topbar/Route bar 不会滚走；第一屏至少要显示 identity、效果区标题和代码区标题。若系统或 UI 缩放使该并列布局的任一工具面低于 360 DIP，必须转为单列，不能以压缩代码字、控件高度或状态表列宽维持两列。

在 `840 x 600`，顶部从左至右为 Menu、紧缩 breadcrumb、主题/环境入口；Back 和 Previous/Next 在 Route bar 的第二行。无论标题或中英文名称多长，控制轨道不缩小到小于 30/36 DIP；标题可在两行内换行，超过两行以局部展开获取全文。状态矩阵改为每行一个纵向 Definition Row：状态/触发在首行，输出、键盘和恢复依次换行；不使用 5 列被挤压的表格。

### 4.1 长文本和溢出

- 标题、中文名和说明采用 Unicode 换行机会；CJK 正常按字形换行，英文自然按词换行。长 URL、hash、crate path、测试 ID 和代码符号不被字符级强拆。
- 目录 Tile 的名称最多两行；第三行之后显示省略，并通过键盘可达 Tooltip 或详情页提供完整名称。Tile 的状态、分类和组别不能被名称覆盖。
- 普通说明最多自然换行，不做容器外溢。上下文中的长值优先换行；若语义必须保持一行，则提供 `Copy full value` 或局部可访问横向滚动。
- 代码、表格、DataGrid、树与图表各自拥有局部 scroll viewport。只有这些明示的二维/单行数据工具允许横向滚动；页面、Sidebar、Drawer、Route bar、Identity 和状态文字不允许横向滚动。
- 纵向嵌套滚动必须明确滚轮归属：指针在 Effect/Code/Matrix viewport 内时先滚该 viewport，到首/尾再交给页面；键盘焦点在该 viewport 内时 Home/End 作用于它，`Cmd/Ctrl+Home/End` 才作用于页面。
- 任何 TextInput、Textarea、Markdown 或代码示例显示的长文本均用 CJK、emoji、长 URL、无空格长词、混合数字和 Mono 进行清样；不得出现 tofu、重叠、基线跳动或选择区域错位。

### 4.2 可测的“不得变形 / 内部不得大于外部”合同

这里的“内部”指参与正常布局和命中的子节点，不包括经过下述明确许可的 `focus_visual`、Overlay 阴影或受控的局部滚动内容。每个详情场景在 Light/Dark、1240/840、所有声明 scale 下都必须导出布局树和屏幕像素断言。

1. 对每个非滚动父容器 `P`，内容子节点 `C` 的 layout rect 必须满足：

   ```text
   C.left   >= P.content_left
   C.top    >= P.content_top
   C.right  <= P.content_right
   C.bottom <= P.content_bottom
   C.width  <= P.content_width
   C.height <= P.content_height
   ```

   允许误差为 `<= 1 resolved DIP`，只用于浮点/物理像素取整；任何正向超界大于此值为阻断。父容器的 content rect 必须已扣除 padding、border 和保留的 scrollbar gutter。

2. 固定轨道元素（Topbar 46、Button/Input 30/36/44、IconButton 36、Tile 轨道、Sidebar/rail、代码/效果 viewport）都要断言其 resolved 宽高等于 token 或在声明的 `[min, max]` 内。Hover、Press、Selected、Focus 和加载开始/结束不得改变 track 的 layout rect、命中 rect 或相邻元素位置。

3. 文字的 ink bounds 必须位于其可见内容 clip 内，或由合法的换行/省略/局部 scroll 保证可到达。长文本不得通过负 margin、负 translation、缩放或 `clip` 把可读内容藏到容器外。基线相邻文本不重叠，任意两段不相属文字 ink bounds 的交集面积必须为 0。

4. 每个可交互元素的 hit rect 必须完整位于它声明的交互 surface 内，且最小为 24 x 24 DIP（标准控件按 30/36/44）。图标可以小于命中区，命中区不能扩出其所属 Surface 而遮挡邻项。Overlay trigger 的 hit rect 和 overlay 内容 rect 必须分别测量。

5. Focus ring 允许在目标 layout rect 外扩 2 DIP，并由内外各一个物理像素 `focus_gap` 包裹；这是唯一常规越界视觉例外。其 visual bounds 必须完整位于未被父容器裁剪的可见安全区；ring/gap 不改变 layout、hit rect 或 scroll extent。若空间不足，Overlay Host 或页面必须留出 ring bleed，不能裁切焦点。

6. 代码、DataGrid、Tree 和 Canvas 的滚动内容可大于 viewport，但必须被 viewport clip，且有真实 scroll extent、可见滚动条和可达完整值。滚动内容的超界不能推大页面内容宽高、遮盖 Route bar 或相邻工具面。

7. Overlay 的 outer rect（含 shadow 不含透明 shadow blur）必须在窗口安全区内；若首选位置放不下，依次 flip、shift、限制最大尺寸并内部滚动。Overlay 的内容 rect 不得大于 outer content rect，四角和边缘截图都要断言。

8. 图标、图形与 Canvas 只能保持等比例缩放；它们的 `scale_x == scale_y`，且不得把文字作为 Canvas 位图缩放。图表可改变可视数据域，但坐标、marker、Tooltip 和 fallback 表不失真。

测试 runner 需要对每个可见 Surface 输出 `outer_rect`、`content_rect`、child layout/hit/ink/visual rect、clip rect、scroll extent 与 `exception_kind`。只有 `focus_visual`、`overlay_shadow` 和 `scroll_content` 可有 exception；其余越界、重叠、负尺寸、NaN、0 命中面积或被裁切的 focus 直接标记 `BLOCKED`。像素清样必须再检查文本裁切、遮挡和全局横向滚动条，不能只信布局树。

## 5. 主题、交互状态和动效

### 5.1 主题

详情页只读取 `Tokens` 的语义角色，遵守 Light/Dark/System 的整表原子切换。当前 Codex 风格保持：canvas 和结构面为中性灰，surface 为明晰白/深灰，正文用 `text`，链接用 `link_text/accent_text`，焦点/选择用 accent，主动作仍为反相中性色，状态使用 success/warning/danger/info 三件套。不得新增详情页私有 palette、渐变、玻璃效果、发光边、背景插画或大面积蓝色主按钮。

主题切换时保持当前 Detail ID、目录上下文、效果示例状态、输入值、IME preedit、打开 Overlay、代码滚动与焦点。颜色、边框、阴影不做补间；切换后必须立即重新验证文本对比、focus gap/ring、状态可辨识性和 Canvas 颜色映射。

### 5.2 hover、press、selected 和 focus

| 状态 | 视觉合同 | 几何合同 |
| --- | --- | --- |
| Hover | `surface_hover` 或 `border_heavy`；文字和状态对比保持 | 不改变宽高、padding、gap、半径、hit rect 或相邻位置 |
| Press | 主动作使用已定义的 pressed surface；不得靠整体 opacity 变灰 | 不缩放、不下沉、不使用负 translation |
| Selected/Open | `surface_selected`、选中标记和真实值/面层 | 不让内容区域扩过父面；若需展开，内容按 160ms 后的最终可测布局 |
| Focus-visible | 2 DIP `focus_ring` + 内外 1 physical-pixel `focus_gap` | 外扩 2 DIP 是独立 visual rect，不影响 layout/hit/scroll extent |
| Disabled | 语义 disabled token、可读标签和无交互 cursor/行为 | 轨道与正常态等大，不能靠压缩或低对比 opacity |

鼠标点击不显示 focus-visible 风格；从键盘开始的焦点必须可见。状态不能只由颜色表达：例如 Selected 要有位置/标记，错误要有文字和图形，Disabled 要有不可执行行为与可读值。

### 5.3 仅活动期动效

动画只服务已发生的用户动作或有限任务生命周期。静态窗口、隐藏窗口、最小化窗口、未聚焦窗口、没有输入和没有异步结果时，详情页不得订阅 frame/tick、轮询或持续 redraw。

| 用途 | 时长 | 允许属性 | 完成条件 |
| --- | ---: | --- | --- |
| Hover / Press 色、边框反馈 | 120ms | color、border color、非布局 alpha | 指针离开/释放或 120ms 后停止 |
| 展开状态、局部面切换、代码折行切换 | 160ms | alpha；高度只从最终布局测量后裁切过渡 | 到达最终状态立即取消 frame subscription |
| Drawer、Modal、Popover 进入/退出；图表一次性数据进入 | 200ms | opacity、最多 8 DIP translate；图表路径只可一次 reveal | 关闭、任务取消、失焦、最小化或 200ms 完成即停止 |

不得使用常驻 shimmer、spin、pulse、自动轮播、无限 Canvas 重绘、定时刷新或 "呼吸" 装饰。Spin 组件的加载动效只在真实可见 Loading 期间运行，任务完成、取消、失焦、最小化或 reduced motion 后停止；静态 Skeleton 不请求帧。

`Reduced motion` 下以上三类时长都解析为 0ms（允许一个原子显示帧），禁止 translate、缩放、转圈、shimmer 和路径描画。状态仍要立即可辨、Overlay 仍需要焦点圈闭/归还、加载/错误/成功仍要有文本和图形反馈。动画控制的状态机必须能证明：每次动画拥有 deadline，deadline 后 `Subscription::none()`；同一组件不得另启第二个计时源。

## 6. Iced 实现边界（面向后续 owner）

本规格不要求重建 Web 路由系统。推荐以应用状态中的 `Page::Components` 与 `Detail { component_id, context }` 表达目录和详情，`responsive` 根据已解析的有效宽度选 shell；目录 Tile 使用 `button`/可聚焦 Iced Element，代码和长内容使用 `scrollable`，图表使用 `Canvas`，Overlay 统一从既有 Host 出口创建。每一个 native component 通过类型化 `Message` 和受控 value 进入详情页的 `Message`，不共享 React state 或通用 `props` 字典。

以下实现界限不可突破：

- 详情页 routing、筛选上下文、示例 fixture、短动效状态和 scroll/focus restoration 属于 Gallery；组件库只接收并发出自身类型化状态与事件。
- `view`、`update`、layout、命中测试、目录过滤和滚动热路径中没有同步磁盘/网络 I/O、图片解码、SVG 解析、全量图表布局或全量代码高亮。异步结果带 generation，取消后到达的结果被丢弃。
- 代码复制、上传、外链、保存和系统命令经过 Action Broker。详情页状态矩阵中的“模拟失败”只注入受控 fixture，不实际发网络、写文件或启动进程。
- Gallery 不承诺未实测的 AccessKit/读屏等价；可见焦点、稳定 Tab 顺序、键盘路径、文字标签、对比度和 reduced motion 是现在必须交付的原生行为。

## 7. 全 101 项视觉验收分组

下表是完整清单，括号内数量相加必须为 101。每个分组通过的意思是该行列出的每一个 ID 都有独立详情页和该组规定的原生效果/状态清样，不允许挑出一个代表项替代其他成员。

| 分组（数量） | 必须有独立详情页的组件 | 分组特有视觉和交互验收 |
| --- | --- | --- |
| Base / 通用（4） | Button、FloatButton、Icon、Typography | 主/次/幽灵/危险动作，图标标签与 24x24 命中区，段落/链接/Mono/CJK/emoji/两行省略；按钮的 Enter/Space、disabled、focus-visible、长标签与反相主按钮。 |
| Base / 布局（7） | Divider、Flex、Grid、Layout、Masonry、Space、Splitter | 4 DIP gap、对齐、收缩/换行、边界不越界；Splitter 拖动和键盘调整有 min/max、焦点和 reset；Masonry 在长短卡片、缩放和空项下不重叠。 |
| Base / 导航（7） | Anchor、Breadcrumb、Dropdown、Menu、Pagination、Steps、Tabs | 活动项、禁用项、长路径、省略和恢复；Menu/Dropdown 的 roving focus、类型搜索、Overlay flip、Escape 与焦点归还；Tabs/Steps/Pagination 的箭头、Home/End、首末边界。 |
| Base / 数据录入（18） | AutoComplete、Cascader、Checkbox、ColorPicker、DatePicker、Form、Input、InputNumber、Mentions、Radio、Rate、Select、Slider、Switch、TimePicker、Transfer、TreeSelect、Upload | label/帮助/错误、read-only/disabled、CJK IME、dead key、emoji、最值和非法输入；所有选择 Overlay 的边缘翻转与键盘协议；Transfer/TreeSelect 的长列表、选择恢复和局部滚动；Upload 的文件类型/大小拒绝、取消和失败恢复。 |
| Base / 数据展示（20） | Avatar、Badge、Calendar、Card、Carousel、Collapse、Descriptions、Empty、Image、List、Popover、QRCode、Segmented、Statistic、Table、Tag、Timeline、Tooltip、Tour、Tree | 空/加载/错、长标签和缺失媒体 fallback；Table/List/Tree 的局部滚动、选中、键盘和大数据边界；Calendar/Segmented/Collapse 的方向键和展开；Image/QRCode 的受控资源失败；Popover/Tooltip/Tour 的四边/四角 Overlay、Escape 与焦点归还。Carousel 只在用户活动时动，不自动轮播。 |
| Base / 反馈（11） | Alert、Drawer、Message、Modal、Notification、Popconfirm、Progress、Result、Skeleton、Spin、Watermark | success/warning/danger/info 不只靠色；Drawer/Modal/Popconfirm 焦点圈闭、遮罩、关闭和 opener 回焦；Message/Notification 不遮关键动作且有队列/关闭边界；Progress 0/中间/100/超限；Skeleton 静态；Spin 仅真实 Loading 期间动。 |
| Base / 其他（5） | Util、Affix、App、BorderBeam、ConfigProvider | App/ConfigProvider 的主题、locale、density 和 Overlay 边界；Affix 安全区与不遮挡；Util 的失败/空值；BorderBeam 必须有静态等价和 reduced-motion 版本，不能以永久装饰动画作为完成。 |
| Base / 自有扩展（3） | Textarea、IconButton、Toolbar | Textarea 多行/CJK/选择/最大长度/局部滚动；IconButton 可达名称、Tooltip 和 36 DIP 轨道；Toolbar 在 840 下换行或溢出菜单，不压缩命中区或遮挡动作。 |
| Business（11） | MetricCard、MiniChartCard、DataToolbar、FilterPanel、PropertyList、StatusTimeline、CommandPalette、CodeBlock、MarkdownEditor、MermaidSvgViewer、MobilePreviewFrame | 指标的数值/趋势/空错；查询筛选和批量动作恢复；属性复制失败；时间线长条目；CommandPalette 的 Cmd/Ctrl+K、搜索、权限/失败、Escape/回焦；CodeBlock 长代码；编辑器长文/IME/预览边界；Mermaid 的受控解析、超限和 Canvas/SVG 资源失败；预览框不嵌第三方 Web 内容。 |
| Charts / 基础图表（5） | LineChart、BarChart、PieChart、AreaChart、RadarChart | 真实 Iced Canvas/路径、浅深色、0/负值（适用时）、单值/多系列、图例、采样上限、长标签/局部 viewport、精确值的键盘或表格摘要；不得把 Web SVG 或截图作为图表。 |
| Charts / 指标与分析（6） | Sparkline、ScatterChart、Heatmap、Treemap、FunnelChart、GaugeChart | 微型趋势仍有文本摘要；散点/热力矩阵/矩形树/漏斗/仪表的空错、阈值、最大点/格/节点、取样/聚合和资源边界；Heatmap 等不得只凭颜色表达数值。 |
| Charts / 关系与文本（4） | SankeyChart、OrganizationChart、MindMap、WordCloud | 有界的原生图布局、折叠/平移/缩放/Reset、超节点或超词聚合、空错/资源失败、键盘可达摘要和表格/树 fallback；缩放必须保持等比例，禁止无限布局迭代或常驻动画。 |

分组计数校验：`4 + 7 + 7 + 18 + 20 + 11 + 5 + 3 + 11 + 5 + 6 + 4 = 101`，并与 Base 75、Business 11、Charts 15 的注册表合同一致。

## 8. 每项必须执行的清样与交互矩阵

对每个 `<id>` 都必须登记下列最低 case，不能以某个分组的一张截图替代。所有 case 同时记录 `ui_scale` 和 `system_scale_percent`，与 `visual-acceptance.md` 的元数据、性能 sidecar、fixture、seed 和同一 native revision 对齐。

| Case ID 模板 | 必测条件 | 通过条件 |
| --- | --- | --- |
| `DET-<id>-L-1240` | Light、`1240 x 800`、`ui_scale=1.0` | 桌面/rail 布局、效果与代码并列、无裁切/重叠/全局横溢出 |
| `DET-<id>-D-1240` | Dark、`1240 x 800`、`ui_scale=1.0` | 同上，含 token、对比和 Canvas 深色映射 |
| `DET-<id>-L-840` | Light、`840 x 600`、`ui_scale=1.0` | Drawer 壳、单列、Route controls、局部滚动与完整值可达 |
| `DET-<id>-D-840` | Dark、`840 x 600`、`ui_scale=1.0` | 同上，含焦点 ring/gap 和禁用/错误可辨性 |
| `DET-<id>-LONG` | CJK、emoji、长 URL、无空格长词、长代码/数据 | 按第 4.1 节换行、省略或局部滚动；完整值可键盘到达/复制/展开 |
| `DET-<id>-KEY` | Tab、Shift+Tab、Enter、Space、Arrow、Home/End、Escape；适用项再测 IME | 顺序稳定、可见焦点、组件协议成立、Overlay 回焦、IME Escape 优先取消 preedit |
| `DET-<id>-STATE` | 第 3.4 节全部适用状态和真实恢复动作 | 状态矩阵与效果一致；空错限不丢上下文；乱序结果不覆盖新状态 |
| `DET-<id>-MOTION` | normal 与 reduced-motion；打开/关闭/加载/失焦/最小化 | 120/160/200ms 只在活动期；静态为零持续 redraw；reduced-motion 无循环或位移 |
| `DET-<id>-GEOMETRY` | 上述四个主题/窗口场景的布局树与截图 | 第 4.2 节所有 rect、clip、hit、focus exception 和无变形断言通过 |

针对图表、数据量和 Overlay 的详情页还必须补充适用的性能和四角/四边场景。每项若有 `N/A`，需写出无法适用的技术理由、风险 owner、补偿控制、到期和复核门禁；不能因为 Iced 能力尚未被验证而把项目本身写成完成。

## 9. 阻断条件和交付前检查

以下任一项使该组件详情页和全量目标为 `BLOCKED`：

- Tile 不能点击、键盘不能进入、详情路由复用另一个 ID 的效果，或 Back/Previous/Next 丢失目录上下文和焦点。
- 效果区是 Web/HTML/WebView/截图/非交互占位，或代码片段不是 Rust/Iced 集成路径。
- Light/Dark、1240x800、840x600、长文本、局部溢出、键盘、状态矩阵、减少动效、活动期动效任一缺少实际证据。
- 出现文字/图标裁切、互相重叠、global horizontal overflow、child 内容/命中区大于外层、被裁切焦点、非等比 Canvas 缩放，或第 4.2 节无例外的几何断言失败。
- 静止界面仍有 timer、poll、无限动画或持续 redraw；任何 `view/update/layout/hit-test/scroll` 热路径同步 I/O、解析或全量重排。
- `Deferred`/`Recompose`/Web production 被呈现为全量原生完成，或用未验证的 AccessKit/平台能力声称 PASS。

完成前由 UI owner 对照本文件与 `native/docs/visual-acceptance.md` 进行一次有界复核：冻结 101 项、每项九类 case、Light/Dark、两种窗口、代码和效果的同 revision 关系、所有几何例外。发现阻断后只对受影响组件和场景做一次针对性复测；仍失败则交回实现 owner，并保持该项 `Blocked`。
