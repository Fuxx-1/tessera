# Tessera Iced 视觉清样与验收合同

> 状态：G0 冻结候选；本文件定义验收方法，不表示当前尚未建立的 native runner 已通过。
>
> 适用对象：`native/` Foundation、Gallery、P0 工作流和所有标记 `production` 的 iced 组件。
>
> 配套规范：`native/docs/ui-spec.md`。设计输入：`iced-plan.md` 第 6、7、10、12、13、18 节及现有 `design/` foundations/patterns。

视觉清样是“固定输入 -> 固定窗口/缩放/主题 -> 稳定帧 -> 截图、热图和元数据”的可复核证据。截图漂亮不等于通过：缺失焦点、IME、长文本、Overlay 关闭路径、DPI 或状态证据，均不得标记为绿色。

## 1. 冻结范围与结论口径

### 1.1 本轮冻结

| 维度 | 必测值 | 备注 |
| --- | --- | --- |
| 平台 | macOS 14+ ARM64 / Metal；Windows 11 x64 / DX12；Ubuntu 22.04+ X11 / 软件 renderer 或硬件哨兵 | macOS、Windows 是 GA 目标；Linux X11 为 Beta |
| renderer | Linux 软件 renderer golden；目标平台硬件 renderer 哨兵；`wgpu` 与 `tiny-skia` 分包时分别记录 | 不把两个 renderer 混入一个清样结论 |
| 窗口 | `1280x800`、`1024x720`、`840x600` logical DIP | 分别覆盖完整 Sidebar、rail、Drawer 和最小窗口 |
| 宽度边界 | `1279`、`1280`、`1023`、`1024`、`839`、`840` DIP | 边界要截“切换前/切换后”两帧，不能只测中间尺寸 |
| 高度边界 | `600`、`599` DIP（后者应被窗口最小值拦截） | 不以内容裁切代替最小窗口策略 |
| app `ui_scale` | `1.0`、`1.25`、`1.5` | 应用逻辑缩放；默认 `1.0`，不等同于系统 DPI |
| system scale | 100%、125%、150%、200% | 系统/显示器缩放；与 app `ui_scale` 分开记录 |
| 主题 | Light、Dark、System（System 在 Light OS 与 Dark OS 各一次） | System 是解析模式，不是第三套 palette |
| locale | `zh-CN`、`en-US` | CJK、Latin、数字和混排均需覆盖 |
| 输入 | 精细指针、键盘、CJK IME、dead key、emoji | hover 不可作为唯一可达说明 |
| 动效 | normal、`reduced motion` | 动效场景按稳定终态清样；不截中间帧 |

不在本轮承诺：iOS/Android/WASM、Wayland GA、完整 VoiceOver/Narrator/NVDA/Orca 读屏等价、Markdown/Mermaid 生产能力。它们可以有 spike 证据，但必须单独标记，不得混入桌面 GA 绿灯。

### 1.2 结论口径

- `PASS`：范围内所有阻断项有截图/热图/人工记录和完整元数据，且数值门槛通过。
- `BLOCKED`：存在直接影响正确性、可用性、焦点、输入、布局、对比度或交付门禁的问题；只执行一次针对性复测，仍失败就 handback owner。
- `RISK`：不阻断当前冻结范围，但有 owner、最小后续动作、截止条件和公开限制；不能写成“已兼容”。
- `N/A`：确实不适用，并写明边界；“没有时间/没有设备”不是 N/A。

## 2. 需求 ID 与视觉场景 ID

视觉场景和产品需求是两个命名空间。`VIS-*` 只表示“如何截取/验证视觉与交互证据”，不得拿来替代产品 requirement；metadata 的 `requirement_ids` 必须显式映射到既有 canonical P0 或 P1 语义 ID。

工作流场景 MUST 直接列出产品已冻结的 canonical requirement：WF1 使用 `P0-01, P0-02, P0-03, P0-04`，WF2 使用 `P0-05, P0-06, P0-07`，WF3 使用 `P0-08, P0-09, P0-10`；涉及状态和可达性时才附 `P0-STATE`、`P0-ACC`。W4 图表使用既有 `P1-W4-01`。壳层、token、DPI、IME、长文本等非产品工作流 sentinel 仍必须有 `requirement_ids` 字段，但值为 `[]`；用非产品的 `milestone_ids`（例如 `G0/G1`）和 `coverage_tags` 表达其验收范围，不能为了填字段伪造 product requirement。

| requirement_id | 语义范围 | 视觉场景映射 |
| --- | --- | --- |
| `P0-01, P0-02, P0-03, P0-04` + 适用的 `P0-STATE`/`P0-ACC` | 数据检索 -> 筛选 -> DataGrid -> 详情 -> 单项/批量操作 | `VIS-WF1-01` |
| `P0-05, P0-06, P0-07` + 适用的 `P0-STATE`/`P0-ACC` | 表单编辑 -> 校验 -> 异步提交 -> 错误恢复 -> 成功反馈 | `VIS-WF2-01` |
| `P0-08, P0-09, P0-10` + 适用的 `P0-STATE`/`P0-ACC` | `Cmd/Ctrl+K` -> 命令检索 -> 键盘选择 -> 执行 -> 焦点归还 | `VIS-WF3-01` |
| `P1-W4-01`；`milestone_ids=[G4,G6]` | W4 P1 图表与卡片：Canvas、数值、命中测试、空/错/超限与采样 | `VIS-CHART-01` |

WF1/WF2/WF3 是 G2 的三条 P0 vertical slice，且只使用上表 canonical IDs；W4 是 P1 波次，`VIS-CHART-01` 的 metadata 必须为 `requirement_ids=["P1-W4-01"]`、`milestone_ids=["G4","G6"]`，不得把图表清样写进 P0 需求结果，也不得为它创建第二个 product requirement 别名。完整 iced-plan 的 G4/G6 仍需 `VIS-CHART-*` 及其性能、资源和真实 renderer 证据。

`VIS-CHART-01` metadata 的最小 requirement/evidence schema 如下；它证明 `requirement_ids` 可且必须包含既有 canonical P1，不能将 W4 的 product mapping 置空：

```json
{
  "test_id": "VIS-CHART-01",
  "requirement_ids": ["P1-W4-01"],
  "milestone_ids": ["G4", "G6"],
  "evidence_scope": "scene-local",
  "required_by_gate": ["G4", "G6"],
  "shared_evidence_ids": ["PERF-NIGHTLY-GPU-RESOURCE", "PERF-NIGHTLY-SOAK-8H", "PERF-RC-SOAK-24H", "PERF-RC-PACKAGE-SIZE", "PERF-RC-INSTALL"]
}
```

## 3. 清样场景矩阵

场景 ID 是稳定的；新增视觉类别才新增 ID，普通文案或修复应更新原清样，不复制一套截图。每一行至少有一个 Light 和一个 Dark 证据，带 `System` 的场景另存 OS 解析结果。

| ID | 场景 | 固定输入与动作 | 必须看见的结果 | 阻断条件 |
| --- | --- | --- | --- | --- |
| `VIS-SHELL-01` | 默认工作台 | `1280x800`，完整 Sidebar，Light/Dark；启动后等待稳定帧 | 46 DIP Topbar、252 DIP Sidebar、主面层级、内容未裁切 | 侧栏/主面错层、标题或主动作缺失、任何溢出 |
| `VIS-SHELL-02` | rail 断点 | 宽度 1279 -> 1024 -> 1023，保持选中路由 | 1279/1024 为 64 DIP rail；1023 转 Drawer；焦点与路由保留 | 断点抖动、图标无可达名称、Drawer 打开后下层仍可操作 |
| `VIS-SHELL-03` | 最小窗口 | `840x600`，滚动长页面并打开底部动作 | 内容区可滚动，动作可见，窗口无横溢出 | 强行小于 840、文本/动作被遮、出现“移动营销页”布局 |
| `VIS-TOKEN-01` | Light/Dark/System | 同一 fixture 连续切 Light -> Dark -> System；保留输入、选中和 overlay | 所有面、文字、状态、主按钮和 shadow 原子换表；焦点和滚动不丢 | 中间混色帧、局部旧主题、输入或 Overlay 状态消失 |
| `VIS-TOKEN-02` | 状态色三件套 | success/warning/danger/info 各一份，含文本和图标 | fg/border/bg 成组且可读，状态不只靠色相 | 状态色拼接错误、对比度不足、只显示颜色无语义 |
| `VIS-TYPE-01` | 排版与混排 | `zh-CN/en-US` 标题、CJK、数字、Mono、长 URL、emoji | 字号/字重/行高稳定，数字对齐，0 tracking，无 tofu | 基线漂移、字距负值、缺字方框、文案遮挡 |
| `VIS-DENS-01` | 30/36/44 DIP | 同一控件组切 `sm/md/lg`，含 icon+text 与长 label | 高度分别为 30/36/44 DIP，同一行控件对齐 | 高度随文案漂移、图标挤出、热区小于规范 |
| `VIS-SCALE-01` | app/system scale sentinel 父场景 | 运行第 4 节注册的有界 `case_id`，覆盖三流程、Overlay、IME 和长文本 | 每个 case 记录 `ui_scale` 与 system scale；物理 hairline、文本、焦点和热区稳定 | 只测乘积、遗漏 case、scale 切换丢状态或裁切 |
| `VIS-STATE-01` | 交互状态 | Button/Input/Select/Checkbox/Switch/Tab 键盘和指针操作 | default/hover/active/focus/selected/disabled/loading/error 视觉可区分 | hover 覆盖 disabled、focus 不可见、active 缩放、loading 改变轨道 |
| `VIS-FOCUS-01` | 焦点序列与隔离层 | 仅键盘 Tab/Shift+Tab；在 canvas/surface/hover/active/selected/accent/status/primary/媒体底色上打开复合控件并 Escape | 每个 focus-visible 均为 2 DIP ring + 2 DIP offset，ring 内外各有 1 physical-pixel 不透明 `focus_gap`；像素邻接断言通过且顺序等于视觉顺序 | `outline:none` 无替代、焦点跳出、任一边缺 gap、ring 直接邻接 underlying、或对比度 <3:1 |
| `VIS-OVERLAY-01` | 锚定和翻转 | Dropdown/Select/Popover 置于四边和角落，滚动触发器 | 8 DIP gap，翻转/shift/clamp，面板可滚动 | 画出窗口、遮住关闭入口、主题丢失、重复 host |
| `VIS-OVERLAY-02` | Modal/Drawer | 打开、Tab 循环、Escape、遮罩点击、取消/确认、关闭 | 遮罩、焦点圈闭、滚动锁定、触发器焦点归还 | 下层可点击、Escape 错序、关闭后焦点丢失、嵌套遮罩变深 |
| `VIS-DPI-01` | 物理像素 | system scale 100/125/150/200% 截 Topbar、控件、hairline、文字 | 1 physical-pixel hairline 清晰，关键尺寸 <=1 resolved DIP 误差 | 发丝模糊/双线、文字裁切、scale 变化状态丢失 |
| `VIS-IME-01` | CJK composition | 输入 preedit、候选选择、提交、Escape 取消、滚动和打开 overlay | 候选窗跟随光标；preedit 不触发提交/校验；Escape 先取消 | 候选窗错位/被遮、preedit 丢失、Enter 提前提交 |
| `VIS-TEXT-01` | 长文本 | 长中文、长英文、长 URL、不可断 ID、emoji、数字列、代码块 | 换行/省略/局部滚动按规则工作，完整值可达 | 宽度撑爆窗口、重要值不可复制、Tooltip 是唯一说明 |
| `VIS-DATA-01` | 数据状态 | Loading -> Ready -> Refreshing -> Empty/Failed，乱序结果 | 旧数据保留、错误可恢复、布局稳定、过期结果丢弃 | 空白闪屏、错误无动作、过期结果覆盖新结果 |
| `VIS-MOTION-01` | 动效与静止 | 正常打开/关闭 Overlay、Skeleton；切 reduced motion | 120/160/200ms 常规；reduced motion 立即终态且无循环 | 永久 tick、最小化仍动、减动后等待或闪烁 |
| `VIS-WF1-01` | 检索到操作 | fixture 过滤 -> DataGrid 选中 -> 详情 -> 单项/批量操作 | 选中、异步、错误恢复和焦点路径完整 | 业务结果错、表格滚动裁切、批量条不可达 |
| `VIS-WF2-01` | 表单提交 | 编辑 -> 校验 -> 提交 -> 注入失败 -> 重试成功 | `Pristine/Checking/Valid/Invalid` 与成功/失败文案稳定 | 重复提交、错误丢失、输入/IME 被清空 |
| `VIS-WF3-01` | 命令面板 | `Cmd/Ctrl+K` -> 输入 -> ↑↓ -> Enter -> 焦点归还 | 搜索、键选、Escape 和触发器回焦完整 | 键盘不可用、面板出界、执行后焦点落到窗口外 |
| `VIS-CHART-01` | W4 P1 图表 | Line/Bar/Gauge 的 Canvas、采样、hover/keyboard、empty/error/overflow | P1 图表证据独立、数值和命中测试正确，资源有界 | G4/G6 证据缺失、图表数据错、超限无降级或 GPU/RSS 越线 |

## 4. app/system scale 有界覆盖

app `ui_scale` 和 system scale 是正交维度。完整 3 x 4 组合为 12 种，但清样采用固定的有界 sentinel，不要求每个场景在全部 12 种组合下重复截取。`VIS-SCALE-01` 是参数化父场景，不可单独作为证据 ID；每一份 scale 证据 MUST 引用下列 catalog 中唯一、不可变且机器可枚举的 `case_id`。除 `VIS-SHELL-03` 外 case 使用 `1280x800` DIP；壳层断点按 `window_client_dip / ui_scale` 判定，`ui_scale=1.5` 时该窗口的有效宽度约为 853 DIP，应进入 Drawer 形态且不允许横向溢出。

以下 JSON 是 scale case 的唯一注册表。每个对象都必须被 runner、`metadata.json`、证据目录和 coverage ledger 原样引用；不得以未注册的自由文本或仅以字母标签登记证据。`requirement_ids` 是直接的 canonical product requirement 映射，非新增 requirement 命名空间。

```json
{
  "catalog_id": "VIS-SCALE-01",
  "case_schema_version": 1,
  "cases": [
    {
      "case_id": "VIS-SCALE-01-A",
      "ui_scale": 1.0,
      "system_scale_percent": 100,
      "window_dip": "1280x800",
      "linked_scenario_id": "VIS-WF1-01",
      "requirement_ids": ["P0-01", "P0-02", "P0-03", "P0-04", "P0-STATE", "P0-ACC"],
      "milestone_ids": ["G2"],
      "coverage_tags": ["scale", "workflow-1", "overlay"]
    },
    {
      "case_id": "VIS-SCALE-01-B",
      "ui_scale": 1.0,
      "system_scale_percent": 200,
      "window_dip": "1280x800",
      "linked_scenario_id": "VIS-WF2-01",
      "requirement_ids": ["P0-05", "P0-06", "P0-07", "P0-STATE", "P0-ACC"],
      "milestone_ids": ["G2"],
      "coverage_tags": ["scale", "workflow-2", "ime"]
    },
    {
      "case_id": "VIS-SCALE-01-C",
      "ui_scale": 1.25,
      "system_scale_percent": 125,
      "window_dip": "1280x800",
      "linked_scenario_id": "VIS-WF3-01",
      "requirement_ids": ["P0-08", "P0-09", "P0-10", "P0-STATE", "P0-ACC"],
      "milestone_ids": ["G2"],
      "coverage_tags": ["scale", "workflow-3", "long-text"]
    },
    {
      "case_id": "VIS-SCALE-01-D",
      "ui_scale": 1.25,
      "system_scale_percent": 150,
      "window_dip": "1280x800",
      "linked_scenario_id": "VIS-WF1-01",
      "requirement_ids": ["P0-01", "P0-02", "P0-03", "P0-04", "P0-STATE", "P0-ACC"],
      "milestone_ids": ["G2"],
      "coverage_tags": ["scale", "workflow-1", "ime"]
    },
    {
      "case_id": "VIS-SCALE-01-E",
      "ui_scale": 1.5,
      "system_scale_percent": 100,
      "window_dip": "1280x800",
      "linked_scenario_id": "VIS-WF2-01",
      "requirement_ids": ["P0-05", "P0-06", "P0-07", "P0-STATE", "P0-ACC"],
      "milestone_ids": ["G2"],
      "coverage_tags": ["scale", "workflow-2", "overlay"]
    },
    {
      "case_id": "VIS-SCALE-01-F",
      "ui_scale": 1.5,
      "system_scale_percent": 200,
      "window_dip": "1280x800",
      "linked_scenario_id": "VIS-WF3-01",
      "requirement_ids": ["P0-08", "P0-09", "P0-10", "P0-STATE", "P0-ACC"],
      "milestone_ids": ["G2"],
      "coverage_tags": ["scale", "workflow-3", "long-text"]
    }
  ]
}
```

每个 case 必须在 Light 和 Dark 至少各有一份；`System` 额外在 Light OS 和 Dark OS 各复跑一个已注册 case。metadata 同时写入父场景 `test_id`、`case_id`、`ui_scale`、`system_scale_percent` 和 `system_scale_factor`，不得只写二者乘积。控件的 30/36/44 是 base DIP，resolved DIP 为 `base * ui_scale`，普通几何物理像素按 `round_half_up(resolved_dip * system_scale_factor)` 回读；hairline 是例外，base 厚度为 `1 / (ui_scale * system_scale_factor)`，固定为 1 个物理像素。

## 5. 状态覆盖矩阵

下表是清样最小覆盖；组件不适用的列在证据中写 `N/A` 和原因。状态顺序与 `ui-spec.md` 一致。

| 组件族 | default | hover | active | focus | selected | disabled | loading | error/failed | empty | read-only |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Button / IconButton | 必测 | 必测 | 必测 | 必测 | N/A 或切换 | 必测 | 必测 | danger 变体 | N/A | N/A |
| Input / Textarea / InputNumber | 必测 | 必测 | 必测 | 必测 | 文本选区 | 必测 | checking | 必测 | N/A | 必测 |
| Checkbox / Radio / Switch | 必测 | 必测 | 必测 | 必测 | checked | 必测 | N/A | N/A | N/A | N/A |
| Select / DateRange / CommandPalette | 必测 | 必测 | 必测 | 必测 | option selected | 必测 | searching | empty/failed | 必测 | 必测 |
| Tabs / Menu / Toolbar | 必测 | 必测 | 必测 | 必测 | current | 必测 | N/A | N/A | N/A | N/A |
| List / DataGrid / VirtualTree | 必测 | 行 hover | 行 active | 行/单元格 | 行/单元格 | 行 disabled | provider loading | provider failed | 必测 | 必测 |
| Card / Metric / Property / Timeline | 必测 | 适用时 | 适用时 | actions | selected item | N/A | skeleton | compact retry | 必测 | N/A |
| Alert / Message / Notification / Result | 必测 | action hover | action active | action focus | N/A | N/A | N/A | 必测 | 必测 | N/A |
| Overlay (Tooltip/Popover/Modal/Drawer) | 必测 | trigger | action | trap | selected option | disabled action | opening/closing | failed content | empty content | N/A |
| Chart / Canvas | baseline | point hover | point active | keyboard equivalent | legend selected | N/A | sampling | no-data/error | 必测 | N/A |

## 6. 清样生成流程

### 6.1 固定执行顺序

1. 在可定位的源码 revision 上构建 release；记录 `rustc`、`iced`、feature、renderer 和字体来源。当前源项目没有 Git revision 时，G0 只能登记为“基线待建立”，不能把截图宣称为发布证据。
2. 选择场景 ID、平台、窗口 DIP、scale factor、theme、locale、motion 和固定 fixture/seed。禁用网络、系统通知、随机数据和动态时钟。
3. 启动 Gallery/testkit，等待应用初始化、字体加载和异步 fixture 完成；连续两帧 layout tree、焦点和可视 bounds 不变后才截图。
4. 隐藏鼠标指针和系统 caret；对 caret、Spinner、shimmer 等动态区域使用稳定终态或明确 mask。不得通过模糊整张图掩盖布局差异。
5. 保存 full screenshot、关键区域裁剪、changed-pixel/SSIM 热图和 sidecar JSON。人工检查遮挡、可达性、文字和平台行为，再填写结论。
6. 失败只针对受影响场景复测一次；仍失败则输出 `BLOCKED` handback，不扩大本轮范围。

### 6.2 建议的 runner 合同

native runner 尚未存在时，后续实现应提供等价的稳定命令（命令名可调整，但字段和语义不可省略）：

```text
cargo run -p tessera-gallery -- visual-snapshot \
  --scenario VIS-SCALE-01 --case-id VIS-SCALE-01-B \
  --requirement-ids P0-05,P0-06,P0-07,P0-STATE,P0-ACC \
  --platform macos-arm64 --renderer wgpu-metal \
  --window 1280x800 --ui-scale 1.0 --system-scale-percent 200 \
  --assert-focus-contract VIS-FOCUS-01 \
  --theme system --system-appearance light \
  --locale zh-CN --motion normal \
  --fixture native/fixtures/gallery/workflow-2-v1.json \
  --seed 20260817 \
  --source-revision <revision-or-archive-sha256> \
  --baseline-revision <frozen-baseline> \
  --out native/evidence/visual/VIS-SCALE-01/VIS-SCALE-01-B/macos-arm64/wgpu-metal/ui-1.0/system-200/system-light/zh-CN/
```

`VIS-SCALE-01` 的 `--case-id`、`--ui-scale` 和 `--system-scale-percent` 都是必填；runner MUST 查询实际 system scale，并拒绝 argv、catalog、实际值和 `metadata.json` 任一不一致的运行。它还必须拒绝缺少 fixture、seed、theme、scale、case 或 revision 的清样，而不是生成不可追溯的“默认截图”。非参数化场景不传 `--case-id`；已注册 scale case 不得脱离父场景单独运行。

### 6.3 文件布局和命名

建议相对路径：

```text
native/evidence/visual/<scenario>/<case-id>/<platform>/<renderer>/ui-<ui-scale>/system-<system-scale-percent>/<resolved-theme>/<locale>/
  full.png
  crop-<region>.png
  diff.png
  metadata.json
  review.md
```

`full.png` 是唯一完整窗口清样；`crop-*` 只能辅助定位，不能替代完整窗口。文件名不包含当前时间，时间写入 metadata，保证同一 fixture 可比较。

### 6.4 焦点隔离层与机器断言

`VIS-FOCUS-01` 的以下 catalog 穷举 token 系统内所有可作为 focus-visible underlying 的合法底色。它不是按状态选择不同焦点色的例外表：每个对象都要求先以不透明 `focus_gap` 完整覆盖 ring 的内、外相邻物理像素，因此实际对比始终是 `focus_ring` 对 `focus_gap`。图像或任意媒体同样适用该像素覆盖断言，不可跳过或以背景本身的对比度替代。

```json
{
  "focus_contract_id": "VIS-FOCUS-01",
  "schema_version": 1,
  "stack": {
    "ring_thickness_dip": 2,
    "ring_offset_dip": 2,
    "isolation_token": "focus_gap",
    "isolation_thickness_physical_px": 1,
    "isolation_sides": ["inner", "outer"],
    "required_for_all_focus_visible_states": true,
    "changes_layout_or_hit_target": false
  },
  "underlying_backgrounds": {
    "Light": {
      "canvas": "#f9f9f9", "surface_sunken": "#f0f0ee", "surface_muted": "#f5f5f4", "surface": "#ffffff",
      "surface_hover": "#fbfbfb", "surface_active": "#f6f6f6", "surface_selected": "#f9f9f9",
      "accent": "#0285ff", "accent_hover": "#339cff", "accent_soft": "#e5f3ff",
      "primary": "#0d0d0d", "primary_hover": "#2c2c2a",
      "success_bg": "#e9f4ec", "warning_bg": "#fbf8ef", "danger_bg": "#fbf5f5", "info_bg": "#f4f7fa"
    },
    "Dark": {
      "canvas": "#181818", "surface_sunken": "#0d0d0d", "surface_muted": "#212121", "surface": "#303030",
      "surface_hover": "#535353", "surface_active": "#646464", "surface_selected": "#5b5b5b",
      "accent": "#0a8bff", "accent_hover": "#4aa8ff", "accent_soft": "#2b5087",
      "primary": "#ededed", "primary_hover": "#ffffff",
      "success_bg": "#3d5946", "warning_bg": "#665433", "danger_bg": "#6b403e", "info_bg": "#465461"
    }
  },
  "actual_neighbor_assertion": {
    "sample_set": "all_rasterized_ring_boundary_neighbors",
    "required_token": "focus_gap",
    "required_alpha": 255,
    "required_min_contrast": 3.0,
    "required_mismatch_count": 0
  },
  "computed_ring_to_gap": {
    "Light": {"focus_ring": "#006dba", "focus_gap": "#ffffff", "ratio": 5.389},
    "Dark": {"focus_ring": "#66b5f0", "focus_gap": "#303030", "ratio": 5.928}
  }
}
```

## 7. 数值门禁

### 7.1 视觉差异

- Linux 软件 renderer golden：changed-pixel `<= 0.05%`。抗锯齿、光标和系统装饰必须在同一 renderer 下比较；动态区域只能使用最小显式 mask。
- 同 OS 硬件 renderer：SSIM `>= 0.995` 且差异面积 `<= 0.2%`；任意文字裁切、重叠、不可见焦点或布局错位均直接阻断，不被 SSIM 平均掉。
- 固体颜色的 `DeltaE2000 <= 3`；语义 token、主按钮、状态色和焦点环单独抽样，不能只比较整体平均色。
- 关键尺寸、边距、行高、控件高、Sidebar/rail/Drawer 断点容差 `<= 1 DIP`。DPI 转换后仍以 logical DIP 回读。
- 对比度按 `ui-spec.md` 的角色表检查；`VIS-FOCUS-01` 必须运行第 6.4 节所有 underlying，验证 ring 的所有内外边界邻居均为不透明 `focus_gap`，`mismatch_count=0` 且实际 ring-to-gap `>=3:1`。状态、focus ring 和 disabled 不得因暗色或 scale 失去可辨识性。

### 7.2 性能证据与视觉 PASS 绑定

视觉清样不能脱离资源和事件证据。每个 `metadata.json` MUST 绑定同一 `source_revision`、平台、renderer、app `ui_scale`、system scale、fixture 和 power mode 的 scene-local `performance.json` sidecar；sidecar 的 SHA-256 必须写入 metadata。只看截图或只填一组标量不能关闭性能门禁，视觉 `PASS` 必须同时满足视觉门槛、适用的 scene-local 性能门槛，以及 `required_by_gate` 所列同 revision 共享 evidence 的门槛。

性能 evidence 的 scope 和门禁绑定固定如下。`evidence_scope`、`required_by_gate`、`metric_ids` 和 `shared_evidence_ids` 是 metadata/sidecar 的必填 schema 字段；不得以单一清样 sidecar 虚假覆盖所有长期或发布指标。

| `evidence_scope` | `required_by_gate` | 本 evidence 必须携带 | 引用规则 |
| --- | --- | --- | --- |
| `scene-local` | 本场景实际阻塞的门禁，例如 `G1`、`G2`、`G4`、`G6` | 与场景直接相关的即时指标：focused/visible idle、input/update、该场景 RSS、热路径 I/O；每项均为 `{mean,p95,p99,unit}` | 必须同 revision/platform/renderer/ui scale/system scale/fixture/power mode；场景 metadata 的 `performance_evidence` 直接引用 |
| `shared-gate` | `G0`、`G4`、`G6` 中实际消费它的门禁 | 8h/24h soak、全局 GPU、strip 后包体、压缩包、安装/升级/卸载等跨场景指标 | 以稳定 `evidence_id` 写入场景 metadata 的 `shared_evidence_ids`，并由 Nightly/RC 汇总；同 revision 和目标平台/产物必须匹配 |

`scene-local` 不要求携带下表全部指标。`metric_ids` 只列本场景适用的即时指标；若某即时指标确实不适用，必须在 `not_applicable_metrics` 给出具体场景理由。`N/A` 仅能取消该 case 的重复采样，不能取消总门禁：G0/G4/G6 汇总仍必须解析相应 `shared-gate` evidence，缺失、revision 不同或理由为空均为 `BLOCKED`。

metadata 和 sidecar 强制记录以下环境与采样字段：

| 字段 | 要求 |
| --- | --- |
| `device_model` | 具体设备型号，不得只写 macOS/Windows |
| `ram_gib` | 物理内存；G0/G6 硬门禁使用 8 GiB 参考机 |
| `power_mode` | 固定电源/性能模式，例如 `fixed-ac` |
| `resolution` | 固定物理分辨率和刷新率，例如 `2560x1600@60` |
| `run_count` | 至少 5 次独立 measured run |
| `warmup_discard` | 首轮至少丢弃 1 次，并明确写出 |
| `duration` | 此 evidence 的测量窗口；scene-local CPU/唤醒默认 600s，8h/24h 仅由 shared-gate soak evidence 记录 |
| `baseline_revision` | 与比较基线的源码 revision；不得留空 |
| `samples` | 每次 measured run 的原始样本引用或内嵌数组 |

下表是全项目性能门禁目录，不是每个 scene-local sidecar 的逐项必填列表。任何 evidence 实际携带的性能指标必须是 `{mean, p95, p99, unit}` 对象；即使是确定性的 0，也不能只写单值：

| 指标 | 目标 | 硬门槛 | unit |
| --- | ---: | ---: | --- |
| focused idle CPU（10 min） | mean `<= 0.2`，p95 `<= 0.3` | p99 `<= 1` | `% single core` |
| unfocused/minimized CPU | mean `<= 0.1` | p99 `<= 0.3`，零持续重绘 | `% single core` |
| visible/minimized idle wakeups | visible `<= 5`；minimized `<= 1` | p99 同目标 | `wakeups/s` |
| pure state update | p95 `<= 2` | p99 `<= 4` | `ms` |
| update + view + diff + layout | p95 `<= 6` | p99 `<= 12` | `ms` |
| input to present | p95 `<= 33.3` | p99 `<= 50` | `ms` |
| virtualized scroll frame | p95 `<= 16.7` | p99 `<= 33.3` | `ms/frame` |
| shell hot RSS | mean `<= 100` | p99 `<= 140` | `MiB` |
| P0 workspace RSS | mean `<= 160` | p99 `<= 200` | `MiB` |
| max benchmark RSS | mean `<= 220` | p99 `<= 260` | `MiB` |
| 8-hour growth | mean `<= 20`，slope `<= 1` | p99 超出即阻断 | `MiB` |
| GPU managed resources | mean `<= 96` | p99 `<= 160` | `MiB` |
| cold start interactive | p95 `<= 1.0` | p99 `<= 1.5` | `s` |
| hot start interactive | p95 `<= 350` | p99 `<= 600` | `ms` |
| single-renderer stripped binary | mean `<= 30` | p99 `<= 40` | `MiB` |
| compressed distribution package | mean `<= 20` | p99 `<= 28` | `MiB` |
| UI hot-path sync file I/O | mean `= 0` | p95/p99 `= 0` | `operations` |
| UI hot-path sync bytes | mean `= 0` | p95/p99 `= 0` | `bytes` |

同一参考机相对冻结基线 p95 恶化超过 5% 或 p99 恶化超过 10%，即使绝对值尚未越线也阻断合入。清样期间不得用性能降级换取隐藏视觉差异。G6 必须汇总全部 scene-local evidence 和以下稳定 shared evidence IDs：`PERF-NIGHTLY-GPU-RESOURCE`、`PERF-NIGHTLY-SOAK-8H`、`PERF-RC-SOAK-24H`、`PERF-RC-PACKAGE-SIZE`、`PERF-RC-INSTALL`；这些 ID 的适用平台/renderer/工件在各自 evidence 内显式声明。

sidecar 最小结构如下；`samples` 必须是实际 run 数据，不得用占位文本交付：

```json
{
  "evidence_id": "PERF-SCENE-VIS-SCALE-01-B",
  "evidence_scope": "scene-local",
  "required_by_gate": ["G2", "G6"],
  "metric_ids": ["focused_idle_cpu", "visible_idle_wakeups", "input_to_present", "p0_workspace_rss", "ui_hot_path_sync_io", "ui_hot_path_sync_bytes"],
  "not_applicable_metrics": [],
  "source_revision": "<same as metadata.source_revision>",
  "baseline_revision": "<frozen comparison revision>",
  "device_model": "MacBookAir10,1",
  "ram_gib": 8,
  "power_mode": "fixed-ac",
  "resolution": "2560x1600@60",
  "run_count": 5,
  "warmup_discard": 1,
  "duration": {"value": 600, "unit": "s"},
  "samples": [
    {"run": 1, "phase": "measured", "sample_file": "sample-01.json"},
    {"run": 2, "phase": "measured", "sample_file": "sample-02.json"}
  ],
  "metrics": {
    "focused_idle_cpu": {"mean": 0.1, "p95": 0.2, "p99": 0.3, "unit": "% single core"},
    "visible_idle_wakeups": {"mean": 2.0, "p95": 3.0, "p99": 4.0, "unit": "wakeups/s"},
    "input_to_present": {"mean": 18.0, "p95": 27.0, "p99": 39.0, "unit": "ms"},
    "p0_workspace_rss": {"mean": 120.0, "p95": 128.0, "p99": 132.0, "unit": "MiB"},
    "ui_hot_path_sync_io": {"mean": 0, "p95": 0, "p99": 0, "unit": "operations"},
    "ui_hot_path_sync_bytes": {"mean": 0, "p95": 0, "p99": 0, "unit": "bytes"}
  }
}
```

示例只展示字段形状；生产 scene-local sidecar 的 `metrics` 必须恰好覆盖 `metric_ids` 减去有理由的 `not_applicable_metrics`，不要求覆盖上表全部指标。shared-gate evidence 必须覆盖其 `required_by_gate` 所需的长期/工件指标；metadata 的 `performance_evidence.evidence_id`、`source_revision`、`renderer`、`ui_scale`、`system_scale_percent` 与 scene-local sidecar 一致。

## 8. 人工复核清单

自动差异通过后，由非实现者按以下顺序复核，并在 `review.md` 勾选：

### 8.1 结构和布局

- [ ] 首屏直接是工作台任务，不是 Hero、宣传语或装饰性空态。
- [ ] Sidebar、rail、Drawer、Topbar、主面和滚动容器符合当前断点；无横向溢出、裁切或 Card 套 Card。
- [ ] 30/36/44 DIP 控件轨道稳定，同组控件对齐；图标和文本不互相遮挡。
- [ ] 物理 hairline 只有一个像素；普通 border 没有因 scale 变成模糊双线。
- [ ] Overlay 在四边/四角均能翻转或 clamp，内容不离开窗口，滚动不锁死。

### 8.2 主题、对比度和状态

- [ ] Light、Dark、System 的面层电梯、文字层级、主按钮反相和状态三件套一致。
- [ ] `accent` 只出现在焦点、边框、选中、进度和有限的非文本图形；链接/普通强调文本使用 `link_text`/`accent_text`，没有蓝色大面积主按钮或 banner。
- [ ] default/hover/active/focus/selected/disabled/loading/error/empty/refreshing/read-only 每一项按组件矩阵可辨识。
- [ ] disabled 不靠整体 opacity；错误不只靠红色；焦点 ring 的内外邻接均为不透明 `focus_gap`，且 `VIS-FOCUS-01` 的 mismatch count 为 0。
- [ ] `reduced motion` 下没有 shimmer、pulse、旋转或等待中的位移动画。

### 8.3 文本、键盘和 IME

- [ ] `zh-CN`、`en-US`、数字、Mono、emoji、长 URL、长 ID 无 tofu、重叠或基线跳动。
- [ ] 长文本按规则换行/省略/局部滚动，完整值能以键盘、复制或详情路径取得。
- [ ] Tab 顺序等于视觉顺序，Escape/Enter/箭头/Space 路径可复跑；打开 Overlay 后焦点圈闭、关闭后归还。
- [ ] CJK preedit、候选窗、dead key 和 emoji 不会提前提交、清空、错位或被遮罩；IME 中 Escape 先取消组合。
- [ ] WF1 (`P0-01..P0-04`)、WF2 (`P0-05..P0-07`)、WF3 (`P0-08..P0-10`) 在正常、失败恢复、异步乱序和主题/app-system scale 切换后仍能完成；适用场景附 `P0-STATE`/`P0-ACC`。

## 9. 证据元数据

每个 `metadata.json` MUST 至少包含以下字段；值缺失时结论只能是 `BLOCKED` 或 `N/A`（并附理由）：

`requirement_ids` 只能列既有 canonical product requirement，可以是 P0 或 P1；`VIS-CHART-01` 必须列 `P1-W4-01`，并保留 `milestone_ids=["G4","G6"]`。`evidence_scope` 决定本 metadata 要携带的 performance 集合，`required_by_gate` 决定何时阻断，`shared_evidence_ids` 是 G0/G4/G6 汇总必须解析的稳定 ID 列表。

```json
{
  "test_id": "VIS-SCALE-01",
  "case_id": "VIS-SCALE-01-B",
  "linked_scenario_id": "VIS-WF2-01",
  "requirement_ids": ["P0-05", "P0-06", "P0-07", "P0-STATE", "P0-ACC"],
  "milestone_ids": ["G2"],
  "coverage_tags": ["scale", "workflow-2", "ime"],
  "evidence_scope": "scene-local",
  "required_by_gate": ["G2", "G6"],
  "shared_evidence_ids": ["PERF-NIGHTLY-GPU-RESOURCE", "PERF-NIGHTLY-SOAK-8H", "PERF-RC-SOAK-24H", "PERF-RC-PACKAGE-SIZE", "PERF-RC-INSTALL"],
  "component_or_flow": "form-submit-workflow",
  "source_revision": "<git revision or declared source archive sha256>",
  "rustc": "1.88.0-or-fixed-g0-version",
  "iced": "0.14.0",
  "features": ["wgpu", "metal"],
  "os": "macOS 14.x",
  "architecture": "arm64",
  "renderer": "wgpu-metal",
  "driver": "<driver/build>",
  "window_dip": "1280x800",
  "ui_scale": 1.0,
  "system_scale_percent": 200,
  "system_scale_factor": 2.0,
  "device_model": "MacBookAir10,1",
  "ram_gib": 8,
  "power_mode": "fixed-ac",
  "resolution": "2560x1600@60",
  "run_count": 5,
  "warmup_discard": 1,
  "duration": {"value": 600, "unit": "s"},
  "baseline_revision": "<frozen comparison revision>",
  "samples": "performance.json#samples",
  "theme_mode": "System",
  "resolved_theme": "Light",
  "locale": "zh-CN",
  "font_hash": "<font inventory hash>",
  "fixture_hash": "<workflow-2 fixture sha256>",
  "seed": 20260817,
  "motion": "normal",
  "command": "<exact command>",
  "focus_contrast": {
    "contract_id": "VIS-FOCUS-01",
    "schema_version": 1,
    "underlying_background_key": "Light.surface_active",
    "underlying_background_color": "#f6f6f6",
    "actual_neighbor_token": "focus_gap",
    "actual_neighbor_color": "#ffffff",
    "actual_neighbor_alpha": 255,
    "ring_to_neighbor_ratio": 5.389,
    "required_min_ratio": 3.0,
    "boundary_neighbor_sample_count": "<all sampled ring boundary neighbors>",
    "boundary_neighbor_mismatch_count": 0
  },
  "performance_evidence": {
    "evidence_id": "PERF-SCENE-VIS-SCALE-01-B",
    "evidence_scope": "scene-local",
    "required_by_gate": ["G2", "G6"],
    "metric_ids": ["focused_idle_cpu", "visible_idle_wakeups", "input_to_present", "p0_workspace_rss", "ui_hot_path_sync_io", "ui_hot_path_sync_bytes"],
    "path": "performance.json",
    "sha256": "<performance sidecar sha256>",
    "source_revision": "<must equal source_revision>",
    "renderer": "wgpu-metal",
    "ui_scale": 1.0,
    "system_scale_percent": 200,
    "case_id": "VIS-SCALE-01-B"
  },
  "visual_metrics": {
    "changed_pixel_percent": {"mean": 0.0, "p95": 0.0, "p99": 0.0, "unit": "percent"},
    "ssim": {"mean": 1.0, "p95": 1.0, "p99": 1.0, "unit": "ratio"},
    "diff_area_percent": {"mean": 0.0, "p95": 0.0, "p99": 0.0, "unit": "percent"}
  },
  "artifacts": ["full.png", "diff.png", "review.md"],
  "conclusion": "PASS",
  "executed_at": "<RFC3339>"
}
```

`source_revision` 在源目录无 Git 时必须是完整源码归档 SHA-256；不能填“当前代码”“latest”或截图文件自身的 hash。`font_hash` 应反映实际参与渲染的字体集合，避免换机后字体变化被误判为 UI 差异。

## 10. 阻断、风险和复测记录

### 10.1 直接阻断

任一项即 `BLOCKED`：

- 关键路径无截图或元数据；清样无法重放。
- workflow 场景缺少 `requirement_ids`、把 `VIS-*` 当成 requirement，`VIS-CHART-01` 未列 `P1-W4-01`，或所需 scene-local/shared 性能 evidence 缺失、哈希不匹配、scope/gate 不匹配或源码 revision 不一致。
- 文字裁切、重叠、不可见焦点、焦点逃逸、IME 候选窗错位或 Overlay 出界。
- 30/36/44 DIP、窗口断点、app/system scale、主题 token、状态优先级或主按钮语义错误。
- 横向溢出导致关键动作不可见；长文本完整值不可达；错误/空态不可恢复。
- changed-pixel、SSIM、DeltaE、尺寸或性能硬门槛失败；`VIS-FOCUS-01` 邻接断言失败；UI 热路径发生同步 I/O 或静态持续 redraw。
- 在承诺为 GA 的平台上，关键键盘、DPI、主题或输入场景没有证据。

### 10.2 风险池格式

不阻断项写入 `review.md`：

```text
RISK: <简短标题>
范围: <平台/组件/场景>
不阻断理由: <为什么不影响当前冻结门禁>
最小后续动作: <一个可执行动作>
owner: <角色或模块>
截止条件: <可测结果>
复核阶段: <G1/G2/G5/...>
公开限制: <当前不承诺什么>
```

### 10.3 针对性复测规则

每个阻断只复测一次对应场景和受影响主题/DPI/平台组合；若仍失败，交还实现 owner，不通过扩大截图数量来“稀释”问题。只有攻击面、布局边界或状态类别确实改变，才登记新的场景预算。

## 11. G0 退出条件

UI owner 只有在以下材料齐备后才能把设计门禁写为通过：

1. `ui-spec.md` 的数值和例外已被实现 owner、架构 owner、测试 owner 引用，且不存在第二套 token/焦点/Overlay 规则。
2. `VIS-SHELL-*`、`VIS-TOKEN-*`、`VIS-TYPE-*`、`VIS-DENS-*`、`VIS-SCALE-*`、`VIS-FOCUS-*`、`VIS-OVERLAY-*`、`VIS-DPI-*`、`VIS-IME-*`、`VIS-TEXT-*`、`VIS-MOTION-*`、`VIS-WF1/2/3-01` 和 `VIS-CHART-*` 的冻结范围已登记；尚未实现的 runner 或平台以 `BLOCKED`/`RISK` 明示。
3. Linux 软件 golden 与目标硬件哨兵各有可定位 revision、fixture、字体、seed、截图、热图和人工 review。
4. 所有阻断已关闭或按一次针对性复测后 handback；剩余风险有 owner、截止条件和公开限制。视觉 `PASS` 引用同一源码 revision、设备配置、renderer 和 scale 组合的 scene-local 性能 sidecar，并在 G0/G4/G6 聚合所需 shared evidence IDs；单 case 的 `N/A` 不得消除对应总门禁。
5. 证据结论只覆盖实际测试的平台、renderer、scale、theme、locale 和窗口，不把 Web acceptance 或单机截图扩大为 native GA 兼容声明。
