# Tessera Iced 原生 UI 规范

> 状态：G0 冻结候选
>
> 适用范围：`native/` 的 Foundation、Gallery 以及 P0 桌面工作台；macOS ARM64 与 Windows x64 为 GA 目标，Linux X11 为 Beta。Wayland、移动端、WASM、Markdown/Mermaid 和完整读屏承诺不在本规范的发布承诺内。
>
> 设计输入：`iced-plan.md` 第 4、6、10、12、13、18 节；`design/README.md` 与 `design/01-foundations/*`、`design/05-patterns/*`；现有 `src/styles.css`、`src/theme/tokens.ts`。

本文件是 native 实现的视觉和交互合同。`MUST`、`不得` 表示发布门禁；`SHOULD` 表示默认实现，例外须在组件文档和视觉证据中说明。它只冻结原生产品 UI，不要求 iced 复刻 DOM、CSS、React 状态或浏览器 Portal。

## 1. Design Read

### 1.1 产品读法

Tessera Iced 是高频键盘操作的原生工作台，不是营销站或组件宣传页。首屏必须直接进入可完成的任务：检索、筛选、表格审阅、详情、表单或命令。视觉优先级从高到低为：任务内容、当前状态、下一步动作、导航、装饰。

冻结的设计取向：

- 中性暖灰为结构；链接使用可访问的 `link_text`，焦点、边框、选中和非文本图形使用 `accent`；主按钮始终是反相中性色，不能改成大面积品牌蓝。
- 信息密度靠 4 DIP 栅格、14pt 正文、细描边和稳定对齐建立；不靠大标题、彩色横幅、渐变、玻璃卡片堆叠或装饰插画。
- 页面是完整布局带，不把每个区块都包进卡片；Card 只用于独立、可重复或需要明确边界的内容单元，Card 内不再嵌 Card。
- 深度按“面层差异 -> hairline -> 单层软阴影”递进。静态 Card 无阴影；P0 禁用 backdrop blur，避免 renderer 差异和资源浪费。
- 原生窗口优先遵循系统字体、系统 IME、系统缩放和窗口行为。不能为了像 Web 一样而破坏输入、焦点、候选窗或物理像素对齐。

### 1.2 设计真源和变更顺序

`design/tokens.toml` 落地后是跨端唯一 token 真源，生成 Rust 和 TypeScript 产物。G0 前的可读依据按以下优先级处理：

1. 本文件中明确的 native 约束和数值。
2. `iced-plan.md` 的范围、性能、平台和验收门禁。
3. `design/01-foundations/*` 的语义 token、排版、形状、层级、动效和交互状态。
4. `design/05-patterns/*` 的壳层和工作台页面模式。
5. 现有 Web 实现仅作为视觉证据，不能反向产生 native API 或状态真源。

新增 token、改变已冻结数值或例外化本规范，必须同时修改 token schema、组件状态契约、Gallery 示例和 `visual-acceptance.md` 中对应场景；不允许手写一套 Rust token 覆盖生成链路。

### 1.3 非目标

- 不承诺 Web 与 native 像素逐点一致，也不复刻 CSS `corner-shape`、Portal 或浏览器 hover/touch 语义。
- 不为窄于最小窗口的移动布局提供生产支持；业务宿主可另建产品目标，不能把 Web mobile 样式作为 native 默认。
- 不使用 Hero、营销性大字、渐变背景、装饰性 orb、连续轮播、常驻动画或无任务价值的空白首屏。
- 不引入第二个 Overlay Host、第二套主题、第二套焦点模型或局部裸色/任意间距系统。

## 2. 主题与语义 token

### 2.1 Light、Dark、System

原生主题模式固定为 `Light | Dark | System`：

| 模式 | 解析规则 | 切换行为 |
| --- | --- | --- |
| `Light` | 使用 Light token 表 | 忽略 OS 配色变化 |
| `Dark` | 使用 Dark token 表 | 忽略 OS 配色变化 |
| `System` | 跟随当前 OS 深浅色偏好；无法读取时回退 Light | OS 改变后在下一次应用事件循环原子换表，不保留中间混色帧 |

`System` 不是第三套颜色。组件只读取语义 token，绝不依据平台名、窗口颜色或局部 bool 自行推导颜色。主题切换期间：

- MUST 在同一帧更换整个 token 表，取消颜色/阴影/边框的补间，防止闪烁和错误的中间对比度。
- MUST 保持当前焦点、滚动、选中、输入 preedit 和已打开 overlay；只有颜色、阴影和资源变体改变。
- SHOULD 让图库支持局部主题岛作为测试宿主，但产品页面默认只拥有一个应用主题；Overlay 必须继承其触发器的解析主题。

### 2.2 核心颜色 token

下表为 native 生成器必须暴露的语义值。`mix` 表示以感知色彩空间混合；Rust renderer 可以预计算等价的不透明 RGBA，不能因缺乏 CSS `color-mix` 而改用任意灰色。

| 角色 | Light | Dark | 使用边界 |
| --- | --- | --- | --- |
| `canvas` | `#f9f9f9` | `#181818` | 窗口画布 |
| `surface_sunken` | `#f0f0ee` | `#0d0d0d` | 代码、内嵌凹面 |
| `surface_muted` | `#f5f5f4` | `#212121` | 表头、弱面、禁用底 |
| `surface` / `surface_elevated` | `#ffffff` | `#303030` | 内容面与 P0 悬浮面 |
| `ink` / `text` | `#1a1c1f` | `#ededed` | 正文、标题、主要图标 |
| `text_secondary` | `#5d5d5d` | `#b6b6b6` | 次级正文、表头；对 surface/canvas/muted 最低 6.04:1 |
| `text_tertiary` | `#6b6d6f` | `#a3a3a3` | placeholder、时间和可读辅注；对 surface/canvas/muted 最低 4.76:1 |
| `text_quaternary` | `#6e7072` | `#9f9f9f` | 最弱但仍可读的文字层级；对 surface/canvas/muted 最低 4.56:1 |
| `text_disabled` | `#6b6d6f` | `#999999` | 禁用控件的标签和值；对 disabled surface 最低 4.76:1 |
| `border_light` / `border` / `border_heavy` | ink 5% / 8% / 14% | white 6% / 10% / 18% | 分隔 / 默认描边 / hover 强调 |
| `surface_hover` / `surface_active` / `surface_selected` | ink 4% / 8% / 5% | white 6% / 10% / 8% | 非 accent 交互水洗 |
| `accent` / `accent_hover` / `accent_soft` | `#0285ff` / `#339cff` / `#e5f3ff` | `#0a8bff` / `#4aa8ff` / accent 22% | 焦点、边框、选中与非文本图形；不得承载普通文本 |
| `accent_text` | `#005ea8` | `#66b5f0` | 强调性普通文本；Light 对 `surface/canvas` 为 6.63/6.30:1，Dark 对 `surface/canvas` 为 5.93/7.98:1 |
| `link_text` | `#005ea8` | `#66b5f0` | 交互链接正文；数值与 `accent_text` 一致但语义独立，支持链接特有行为 |
| `focus_gap` | `#ffffff` | `#303030` | 所有 `focus-visible` 的不透明隔离层；在 ring 内外各为 1 physical pixel，不参与布局或命中面积 |
| `focus_ring` | `#006dba` | `#66b5f0` | 2 DIP 实色键盘焦点环；只与 `focus_gap` 直接相邻，机器计算最低 5.389:1 |
| `overlay` / `overlay_strong` | black 28% / 42% | black 46% / 58% | Modal/Drawer 遮罩 / 全屏引导 |
| `tooltip_bg` / `tooltip_fg` | `#1f1f1d` / `#ffffff` | `#ededed` / `#0d0d0d` | 反相 Tooltip |

状态 token 只能成组三件套使用，不得把某状态的前景和另一状态的底色拼接：

| 状态 | Light `fg / border / bg` | Dark `fg / border / bg` |
| --- | --- | --- |
| success | `#2f6d4a` / `#9fc1ac` / `#e9f4ec` | `#6cc08b` / fg 40% / fg 14% |
| warning | `#8a6724` / `#ddc891` / `#fbf8ef` | `#e3b341` / fg 40% / fg 14% |
| danger | `#9f2424` / `#ddc1c1` / `#fbf5f5` | `#f0786f` / `#f0786fb3` / `#f0786f08` |
| info | `#4d5f77` / `#b8cfde` / `#f4f7fa` | `#8ab3d6` / fg 40% / fg 14% |

主按钮：Light 为 `#0d0d0d` 背景配白字，Dark 为 `#ededed` 背景配 `#0d0d0d` 字；hover 分别为 `#2c2c2a` 与 `#ffffff`。蓝色不能作为主按钮填充色。

### 2.3 对比度与颜色约束

- 所有会显示文字的 token，包括 `text_secondary`、`text_tertiary`、`text_quaternary` 和 `text_disabled`，对其实际不透明 surface/canvas/muted 背景 MUST 达到 4.5:1；“辅助”“占位”或“禁用”不是对比度豁免。
- 正文使用 `text`，不以次级 token 替代内容；placeholder 使用 `text_tertiary`，但永远不是字段 label、唯一说明或错误反馈；disabled 使用 `text_disabled`，其不可交互性由状态、surface 与边框共同表达，不能以降低文字对比度表达。
- Light 实测 `text/text_secondary/text_tertiary/text_quaternary/text_disabled` 对最不利的 `surface/canvas/muted` 分别为 `15.65/6.04/4.76/4.56/4.76:1`；Dark 分别为 `11.27/6.51/5.23/4.99/4.63:1`。计算使用合成后的 sRGB relative luminance，见第 2.4 节。
- `accent` 在 Light surface 上不满足普通文字对比度，MUST 不用于任何普通文本。链接和强调文本一律使用 `link_text` 或 `accent_text`；不得通过加粗、图标、下划线或邻近文案规避 4.5:1 的普通文本门槛。
- `accent_text` 与 `link_text` 对 Light `surface`/`canvas` 和 Dark `surface`/`canvas` 的机器计算结果均不低于 4.5:1；测试按 WCAG sRGB relative-luminance 公式计算，比较实际不透明背景后的颜色，而不是靠视觉判断。
- Dark danger 保留克制的 `#f0786f` 前景；`#f0786f08` soft bg 在 `#303030` surface 上实际合成为 `#363232`，前景对 soft/surface/canvas 分别为 `4.581/4.790/6.444:1`。`#f0786fb3` border 在同一 surface 上实际合成为 `#b7635c`，对相邻 surface 为 `3.099:1`。这些是强制测试向量，不得以 expected failure、skip 或降低阈值绕过。
- 所有 `focus-visible` 状态无例外使用同一不透明焦点堆叠：先在 2 DIP ring 的内、外边界各绘制 1 physical-pixel 的 `focus_gap`，再绘制 2 DIP `focus_ring`，其外扩仍为 2 DIP。`focus_gap` 的 Light/Dark 值固定为 `#ffffff/#303030`，不得按 selected、active、error、图像或组件局部颜色替换；它不改变布局、圆角轨道或命中面积。ring 的每一个直接相邻像素必须是 alpha=255 的 `focus_gap`，对比度只按实际的 ring-to-gap 合成结果机器计算，必须 `>= 3:1`。所有合法底色及像素断言见 `visual-acceptance.md` 的 `VIS-FOCUS-01` catalog。
- 状态不能只靠色相表达；状态反馈同时有文本、图标、形状或位置线索。
- 每个可视产品面中的 accent 事件 SHOULD 不超过约五处。图表系列使用独立图表调色板，不借用 UI 状态色表达数据类别。

### 2.4 派生 token 算法

跨端派生 token 在 G1 前按以下算法冻结；生成器、Gallery 和 testkit 必须使用同一实现。没有通过下列测试向量的派生 token 不能作为跨 renderer 或跨平台 `PASS` 的依据。

1. 不透明源色使用 IEC 61966-2-1 sRGB 的 8-bit `#RRGGBB` 表示。`mix(base, p%, transparent)` 保留 `base` 的 sRGB 三通道，alpha 为 `round_half_up(255 * p / 100) / 255`。
2. 两个不透明颜色的混色先将 sRGB 解码到 linear-sRGB，再按 CSS Color 4 的 OKLab 变换和归一化权重插值；结果转回 sRGB。透明参与者不改变源色的 OKLab 分量，只按第 1 条产生 alpha。
3. 绘制时采用预乘 alpha 的 linear-sRGB source-over 合成。用于视觉/对比度比较的扁平颜色以不透明目标背景合成后再编码 sRGB。
4. linear-sRGB 转 sRGB 后夹紧到 `[0, 1]`，每个 8-bit 通道使用 `floor(value * 255 + 0.5)`；0.5 一律向上取整。不得由 renderer 的隐式色彩空间或浮点舍入决定 token 值。

最小测试向量：`ink 8% = #1a1c1f14`、`ink 55% = #1a1c1f8c`、`white 10% = #ffffff1a`、`accent 22% = #0285ff38`、`black 28% = #00000047`。阴影 alpha、overlay、surface water-wash 和状态 Dark 背景均复用此算法。

半透明派生仅用于非文本水洗、遮罩和阴影；`text_*`、`accent_text`、`link_text`、`focus_ring` 与 `focus_gap` MUST 是不透明 token。`focus_ring` 与 `focus_gap` 都不使用上段的 alpha 派生。无论 underlying 为 canvas、surface、hover/active/selected、状态底或任意媒体，ring 的实际相邻色固定为 `focus_gap`：Light `#006dba` 对 `#ffffff` 为 `5.389:1`，Dark `#66b5f0` 对 `#303030` 为 `5.928:1`；二者均高于 3:1。

## 3. 排版、间距与形状

### 3.1 字体与排版

| 角色 | 规格 | 用途 |
| --- | --- | --- |
| Sans | macOS: SF/PingFang；Windows: Segoe UI/微软雅黑；Linux: Noto 系列 | 全部产品文本 |
| Mono | SF Mono / Menlo / Consolas / Liberation Mono 等系统等宽回退 | 代码、快捷键、不可断 token |
| 正文 | 14pt / 400 / 1.5 | 默认正文、输入值 |
| 密集 UI | 12pt / 400 / 1.4-1.5 | 表格、侧栏、Tag、辅助说明 |
| Caption | 11-12pt / 400 / 1.4 | 可选说明、时间戳；不低于 11pt |
| 强标签 | 12-14pt / 500 / 1.4 | 字段 label、表头、按钮 |
| H4 / H3 / H2 / Display | 18 / 20 / 24 / 28pt，均为 500；行高 1.33 / 1.33 / 1.2 / 1.2 | 小节、区块、页面、少量主标题 |

字体字距固定为 `0`，不使用负 tracking。数字列和指标使用 tabular figures；它们不必切换成等宽字体。代码块使用 13pt Mono、1.6 行高、sunken 底和 `border_light`。缺字、tofu 或 fallback 跳变是阻断缺陷，不能静默接受。

### 3.2 4 DIP 栅格和控件高度

所有空间和几何值以 logical DIP 表达；除一个物理像素 hairline 外，禁止出现非 token 的任意间距。

| token | DIP | 典型用途 |
| --- | ---: | --- |
| `space_1` | 4 | 图标与字、行内微距 |
| `space_2` | 8 | 控件水平内边距、紧凑项 |
| `space_3` | 12 | 面板内边距、小节间距 |
| `space_4` | 16 | Card/工具栏内边距、卡间距 |
| `space_5` | 20 | 表单纵向节奏 |
| `space_6` | 24 | 区块间距、Modal 内容 padding |
| `space_8` | 32 | 页面分段、宽屏内容 padding |

| 尺寸 | 数值 | 规范 |
| --- | ---: | --- |
| `control_sm` | 30 DIP | 紧凑按钮、导航行、密集筛选 |
| `control_md` | 36 DIP | 默认 Button/Input/Select/Toolbar 控件 |
| `control_lg` | 44 DIP | 大号主动作、粗指针环境的最小完整控件 |
| 桌面热区 | 最少 24 x 24 DIP | 视觉图标可更小，命中区域补足 |
| coarse-pointer 热区 | 最少 40 x 40 DIP | 仅适用于另行支持的粗指针宿主 |
| 顶部工具栏 | 46 DIP | 页面级 Topbar |
| 面板工具栏 | 36 DIP | Card 内或数据面板 |
| 侧栏 | 252 DIP | 完整 Gallery 导航 |
| 导航 rail | 64 DIP | 1024-1279 DIP 窗口 |
| 正文最大宽度 | 1120 DIP | 只限制阅读内容，不强迫业务画布居中 |

同一水平操作组必须同高。高度由固定轨道控制，不能靠随文案变化的纵向 padding 撑开；需要多行文案时改为单独的多行任务卡或换行布局。

### 3.3 形状和层级

| token | DIP | 使用 |
| --- | ---: | --- |
| `radius_2xs/xs/sm` | 2 / 4 / 6 | 进度内条、代码、复选框、紧凑菜单项 |
| `radius_md/lg` | 8 / 10 | 默认控件 / 较大按钮和面板 |
| `radius_xl/2xl` | 12 / 16 | Card、Popover、Modal、命令面板 |
| `radius_3xl/4xl` | 20 / 24 | 仅全屏级或专门移动面板 |
| `radius_full` | 9999 | Tag、Switch、Avatar、明确的导航行 |

普通按钮和输入框不得使用 pill。实现可以在平台支持时采用 superellipse 作为纯渲染增强，但布局和视觉验收以 scale `1.0` 的 2/4/6/8/10/12/16/20/24 DIP 口径为准，禁止因此改变 hit target 或内容尺寸。

静态 Card 使用 `surface + border`，不加阴影。真正浮起的面使用 hairline 加单层阴影：Tooltip/Dropdown 为 `md`，Popover 为 `lg`，Command Palette 为 `xl`，Modal/Drawer 为 `modal`。不使用彩色阴影、内阴影或 hover 阴影膨胀。

## 4. 窗口、布局和 DPI

### 4.1 Gallery 壳层断点

这是 Gallery 壳层规则，不强加给业务宿主；业务宿主仍必须保证键盘路径、内容可见性和最小命中面积。

| 窗口宽度（logical DIP） | 壳层 | 内容规则 |
| --- | --- | --- |
| `>= 1280` | 252 DIP Sidebar + 主面 | 内容区最大 1120 DIP；页面 padding 24 x 32 DIP |
| `1024-1279` | 64 DIP icon rail + 主面 | rail 中图标有文本可达名称；浮层标签不能仅靠 hover |
| `840-1023` | Sidebar 收为 Drawer，默认关闭 | Topbar 左侧出现 Menu；Drawer 打开后其余内容不可操作 |
| `< 840` | 非支持的 Gallery 窗口 | 宿主 MUST 以最小窗口 `840 x 600` 限制 resize，不产生横向压扁、裁切或第二套“移动营销页” |

Gallery 默认窗口为 `1280 x 800` DIP，最小为 `840 x 600` DIP。页面级结构是 `canvas -> main surface -> topbar/content`，而非全屏 Card 瀑布：Sidebar 坐在 canvas，主面以 hairline 与极轻阴影区分；Topbar 46 DIP，内容侧 padding 24/32 DIP，模块间 gap 24 DIP。

高度不足时内容区独立滚动，Topbar 和必要的底部提交条保持可用；不得通过缩小字体、压缩行高或遮住底部动作来适配。

### 4.2 DIP、app ui_scale 与物理像素

- 设计 token 的 30/36/44、间距、字号和半径是 base DIP。应用设置 `ui_scale ∈ {1.0, 1.25, 1.5}`，解析后的布局 DIP 为 `base_dip * ui_scale`；`ui_scale` 是应用偏好，不等同于 OS 缩放。
- `system_scale ∈ {1.00, 1.25, 1.50, 2.00}`，即 100/125/150/200%，由窗口/显示器报告。物理像素为 `round_half_up(base_dip * ui_scale * system_scale)`；系统 scale 不改变布局断点。
- 壳层断点比较 `effective_width_base_dip = window_client_dip / ui_scale`，因此 app scale 可能使同一窗口从完整 Sidebar 进入 rail/Drawer，但不会产生第四套布局。最小可用窗口为 `840 * ui_scale` x `600 * ui_scale` DIP；宿主必须拦截更小 resize，不用横向溢出补偿。
- `ui_scale` 与 `system_scale` 必须分别记录和测试；不能只记录二者乘积。默认 `ui_scale=1.0`，系统 scale 改变不重置用户的 ui_scale、焦点、滚动、IME 或 overlay 状态。
- 1 physical-pixel hairline 是缩放例外：其 base DIP 厚度为 `1 / (ui_scale * system_scale)`，直接回读为 1 个物理像素，不再二次乘 app UI scale；普通 border 保持 1 base DIP，不把它缩成 hairline。
- 不按窗口宽度缩放字体。换屏、拖到不同 DPI 显示器或系统缩放变化时，保留交互状态并在下一个布局帧重新测量。
- 任何关键尺寸的实测容差不得超过 1 resolved DIP；文本基线、图标居中和清晰度需在 app/system scale 的有界 sentinel 组合中人工复核。

## 5. 焦点、键盘与状态

### 5.1 焦点规则

- 键盘导航焦点 MUST 可见：常规焦点为 2 DIP 不透明 `focus_ring`、外扩 2 DIP，并始终由内外各 1 physical-pixel 的不透明 `focus_gap` 隔离。鼠标按下不显示键盘 focus-visible 样式。
- 错误输入保留 danger border，但仍使用标准 `focus_gap + focus_ring` 堆叠；不得用 danger 变体替换 ring，或因 error 而失焦、隐藏隔离层。
- 焦点顺序等于视觉和阅读顺序。复合组件使用 roving focus 或活动后代模型，外层只留一个 Tab 停靠点。
- 打开 Modal、Drawer、命令面板和需要确认的 Popconfirm 时，焦点进入第一个可用动作（无可用动作则进入可聚焦容器）；关闭后无条件归还仍存在且可用的触发器，否则归还逻辑上最近的上级动作。
- `Cmd/Ctrl+K`、Escape、Enter/Space、箭头键和 Tab 的语义在 Light/Dark/System、所有 DPI 和输入法组合期间一致。IME 组合中 Escape 先取消 preedit，不能直接关闭工作流。

键盘协议固定如下，组件不得为同一交互另定义一套按键：

| 组件/模式 | 键盘合同 |
| --- | --- |
| Button / IconButton / 可执行行 | Enter 或 Space 执行；disabled 不响应 |
| Menu / Listbox / Dropdown | Up/Down 移动，Enter 选择，Escape 关闭，类型前缀跳转 |
| Tabs / Segmented | Left/Right 切换，组内只保留一个 Tab stop；Home/End 可选但必须稳定 |
| DataGrid / List | Up/Down 移动行或单元格，Space 选择；多选和范围选择必须有文档化修饰键 |
| Tree / VirtualTree | Up/Down 移动，Left 收起/回父，Right 展开/入子，Enter 执行动作 |
| Modal / Drawer / Popconfirm | Tab/Shift+Tab 圈闭，Escape 按关闭策略退出；焦点归还触发器 |
| Command Palette | Cmd/Ctrl+K 打开，文本检索，Up/Down 选择，Enter 执行，Escape 关闭并回焦 |

在系统高对比或 forced-colors 环境，组件必须保留 2 DIP 的透明占位描边，让系统焦点描边有落点；不得用 `outline: none`、透明度或主题切换隐藏焦点。AccessKit/读屏树在能力未实测前不宣称等价，但可见焦点、键盘顺序、标签和错误恢复仍是桌面硬门槛。

### 5.2 通用状态矩阵

每个可交互组件必须声明适用项；不适用项标记 `N/A`，不能遗漏。

| 状态 | 视觉 | 行为 |
| --- | --- | --- |
| default | 基础面、默认描边与文字层级 | 可操作 |
| hover | `surface_hover` 或 `border_heavy`，二选一 | 仅精细指针进入时出现 |
| active | `surface_active`，无缩放、无位移 | 指针/键盘按压期间 |
| focus-visible | 2 DIP 蓝环，外扩 2 DIP；ring 内外各 1 physical-pixel `focus_gap` | 键盘可达且焦点唯一可识别 |
| selected/checked | accent 描边、浅底或勾选；非 accent 选择用 `surface_selected` | 状态可由文本/图标辨识 |
| disabled | `text_disabled + surface_muted + border_light`，不整体 opacity | 不接收指针、键盘或异步提交 |
| read-only | 与 disabled 有别：仍可选中/复制/聚焦，但不能修改 | 说明文案和可复制性保留 |
| loading/checking | 固定布局内的 Spinner/Skeleton，保留标签与尺寸 | 禁止重复提交；声明 busy |
| empty | 紧凑 Empty、主恢复动作可达 | 不伪造空白成功页 |
| error/failed | danger 三件套、明确原因和可恢复动作 | 焦点不丢失；错误不只靠红色 |
| refreshing | 保留旧数据，显示轻量进程反馈 | 不闪回空态 |

状态优先级固定为：`disabled > loading > error > selected > active > hover > default`。`read-only` 是能力限制，不覆盖 error 或 focus；`refreshing` 是数据状态，可与已选行并存。异步数据统一建模为 `Loading | Refreshing | Ready(T) | Empty | Failed(E)`，不得以并列布尔值生成非法组合。

## 6. Overlay Host

### 6.1 单一 host 与层级

应用只能有一个 Overlay Host，负责测量、定位、遮挡、关闭、焦点圈闭和归还。组件向 host 声明 overlay 类型、触发器 rect、首选 placement、尺寸上限、关闭策略和主题，不自行创建独立窗口/portal 风格层。

| 层 | 逻辑 z | 内容 |
| --- | ---: | --- |
| base | 0 | 页面内容 |
| sticky | 100 | Topbar、粘性表头 |
| dropdown | 1000 | Dropdown、Select、Popover、Tooltip |
| overlay | 1300 | Modal、Drawer 与遮罩 |
| toast | 1500 | Message、Notification |
| tour | 1700 | 仅后续引导能力 |

P0 不实现 backdrop blur。所有 overlay 使用不透明 `surface_elevated`、hairline 和相应软阴影；不把字体或主题重置为窗口默认值。

### 6.2 定位和关闭合同

- anchor overlay 默认与触发器间隔 8 DIP；可用区是窗口 client rect 减 8 DIP 安全内边距和已显示的系统 inset。
- 先按首选边放置；主轴溢出时翻转，次轴溢出时 shift/clamp；仍放不下则收缩到可用高度并让 overlay 内部滚动。不能把内容画到窗口外、遮住触发器的唯一关闭入口或造成无滚动死区。
- Tooltip 只展示辅助文本，不接管焦点，不是图标按钮的唯一名称；Dropdown/Select 用箭头、Enter、Escape 和类型前缀完整操作。
- Modal/Drawer 可默认支持 Escape 和遮罩点击关闭；危险确认可禁用遮罩点击，且关闭按钮、取消路径和原因必须可达。
- 打开 Modal/Drawer 时隔离下层输入和滚动；嵌套 Modal 不额外叠加遮罩。Toast 不抢焦点，错误 Toast 需要停留足够时间或提供可聚焦详情入口。
- 主题、DPI、窗口大小、触发器滚动或位置变化会使 host 重新测量；触发器消失时 anchor overlay 安全关闭并执行焦点回退。

### 6.3 Overlay 尺寸和动效

| 类型 | 尺寸/形状 | 动效（常规） |
| --- | --- | --- |
| Tooltip | 内容自适应，反相，`radius_md` | opacity + 4 DIP 位移，120ms |
| Dropdown/Popover | 触发器宽或内容宽；`radius_xl` | opacity + 0.98 -> 1，200ms |
| Command Palette | 宽度受窗口限制，`radius_2xl` | opacity + 轻微位移，200ms |
| Modal | 内容宽度显式、最大高度受可用区限制，`radius_xl/2xl` | 遮罩 160ms；本体 8 DIP -> 0，200ms |
| Drawer | 明确边缘、独立滚动 | translate 200ms，退出 160ms |

所有动效只在活动期请求帧；reduced motion 行为见第 8 节。

## 7. 输入法、文本与长内容

### 7.1 IME 和键盘文本输入

P0 需要完整验证 `zh-CN` 和 `en-US`，包括 CJK IME、dead key、emoji、组合字符和快捷键冲突：

- 输入控件在 preedit 阶段显示组合文本和候选位置，但不向业务 value 提交、不触发同步校验、不重排外层布局。
- IME candidate window 以实际编辑光标为锚；滚动、DPI、主题和 Overlay 打开后仍随光标更新，不能被应用 overlay 遮挡。
- Escape 优先取消 IME preedit；若没有 preedit，再执行组件的 Escape 语义。Enter 在 preedit 未提交时不能触发表单提交或命令。
- 已提交文本保持 Unicode 标量顺序和 selection/caret，删除、撤销、复制、粘贴及 Ctrl/Cmd 快捷键不截断 grapheme cluster。
- 主题切换、异步刷新或错误显示期间不得清除 active input、selection、preedit 或候选窗；组件卸载才可明确取消 composition。

### 7.2 长文本规则

- 所有 flex/grid 内容节点默认支持收缩，等价于 `min-width: 0`；任何内部内容不得大于其父容器。
- 正文在词边界和 CJK 字符间自然换行；不可断长 URL、文件名、ID、emoji 序列和长单词优先在允许断点处折行，否则由本地横向滚动承载，不能撑宽窗口。
- 单行字段可省略，但必须通过 tooltip、详情、复制动作或可进入的展开状态提供完整文本；不得只靠 hover 使触屏或键盘用户无法读取。
- 表格列给定 min/max width；长值按列策略 wrap、ellipsis 或局部横滚。数值列保持右对齐和 tabular figures，不能被长标签挤压至不可读。
- Textarea、代码、日志和错误详情允许局部纵横滚动；代码不自动软折行时必须显示可用的横滚和复制路径。
- 空、加载、错误、超限和异步乱序必须有稳定布局的可见反馈；不能因文案、Spinner 或 Skeleton 改变控件轨道尺寸。

## 8. 动效、reduced motion 与空闲行为

| token | 时长 | 用途 |
| --- | ---: | --- |
| `motion_fast` | 120ms | hover、focus、opacity |
| `motion_base` | 160ms | Checkbox/Switch 等控件形变 |
| `motion_panel` | 200ms | Overlay、Drawer、Collapse |

通用缓动为 `cubic-bezier(.4,0,.2,1)`；入场为 `cubic-bezier(.19,1,.22,1)`，出场为 `cubic-bezier(.65,0,.4,1)`。只能动画 opacity 和 transform，Collapse 是可测量高度变化的例外；不得用按压缩放、弹跳、视差或无限注意力动画。

当 OS 宣告 reduced motion：

- MUST 停止 shimmer、pulse、旋转等装饰循环；Loading 用静态占位或一次性状态替换。
- MUST 把位移动画取消；必要的状态确认最多保留即时 opacity 变化。
- MUST 让 Toast、Modal、Drawer、Command Palette 在最终位置立即可交互，不能等待计时器。

窗口失焦、最小化或不可见时，停止非必要动画、预取和缓存维护；无动画、无输入、无后台结果时不得请求帧。光标闪烁最多每秒两次唤醒。连续两秒掉帧超过 5% 时按顺序停装饰动画、降至 30 FPS、减少 overscan/图表采样、关闭大阴影；不得降级文字清晰度、焦点环、热区或错误反馈。

## 9. Gallery 和组件文档要求

每个 production 组件在 Gallery 至少提供：默认示例、Light/Dark/System、app `ui_scale` 和 system scale、`zh-CN/en-US`、长文本、适用状态矩阵、键盘路径、焦点、IME、disabled/read-only、overlay（适用时）、空/加载/错误/超限/异步乱序与性能边界。`icedStatus` 独立登记，不能继承 Web 的 `implementationStatus`。

页面应像真实工作台，而不是展示营销用组件海报：默认示例使用真实表单、筛选、表格、详情或命令工作流；不使用无意义大号样例、彩色背景、装饰图或过量 Card。需求 ID 与视觉场景 ID 分离，三个工作流直接使用产品已冻结的 canonical requirement 集合（以下 `WF1/WF2/WF3` 只是文档标签，不是新 ID）：

1. `P0-01, P0-02, P0-03, P0-04`（适用时加 `P0-STATE, P0-ACC`）：数据检索 -> 筛选 -> DataGrid -> 详情 -> 单项/批量操作。
2. `P0-05, P0-06, P0-07`（适用时加 `P0-STATE, P0-ACC`）：表单编辑 -> 校验 -> 异步提交 -> 错误恢复 -> 成功反馈。
3. `P0-08, P0-09, P0-10`（适用时加 `P0-STATE, P0-ACC`）：`Cmd/Ctrl+K` -> 命令检索 -> 键盘选择 -> 执行 -> 焦点归还。

W4 图表与卡片是 P1 波次，不是 P0 vertical slice，也不阻塞 G2 的三条 P0 工作流；其既有 canonical product requirement 是 `P1-W4-01`。完整 `iced-plan` 的 G4 与 G6 仍必须具有图表 Canvas、数值、命中测试、空/错/超限、采样、资源和视觉清样证据。不得因其为 P1 而在 G4/G6 跳过验收。

## 10. 与视觉验收的关系

`native/docs/visual-acceptance.md` 是本规范的清样执行合同。视觉场景使用独立的 `VIS-*` ID，并在 metadata 的 `requirement_ids` 直接列出既有 canonical P0 或 P1 requirement（不得创建新的工作流 requirement 别名）；任何 native UI 变更至少复测受影响的 token、窗口断点、主题、app/system scale、状态和文本场景。关键尺寸容差 `<= 1 DIP`，固体色 `DeltaE2000 <= 3`，并且零裁切、重叠、不可见焦点或文本遮挡。视觉 `PASS` 还必须引用同一源码 revision、平台、renderer 和 scale 组合的 scene-local 性能 sidecar，并按适用门禁引用共享性能 evidence；没有适用清样、元数据和性能证据，组件不能标记为 production。
