# Foundations · 01 色彩系统

> 落地位置：`src/styles.css` `:root` 与 `:root[data-theme="dark"]`；TS 镜像 `src/theme/tokens.ts`。
> Codex 原始出处见 `../00-source/codex-tokens.raw.json`。

## 1. 心智模型：一支墨 + 一叠纸 + 一滴蓝

Codex 的色彩不是"调色板选色"，而是**派生系统**：

- **一支墨（ink）**：亮色 `#1a1c1f`、暗色 `#ededed`。所有文字、边框、悬停水洗、图标全部由
  这支墨按固定透明度阶梯 `color-mix(in oklab, ink X%, transparent)` 派生。
- **一叠纸（surface 电梯）**：暖灰阶从 `#f9f9f9`（亮）到 `#0d0d0d`（暗）逐级堆叠，海拔越高越亮（暗色）或越白（亮色）。
- **一滴蓝（accent）**：`#0285ff` 家族只负责链接、焦点环、选中态与极少数强调，从不做大面积底色或主按钮。

这样做的收益：任何面层上叠加边框/悬停都自动保持相对对比；换主题只需换墨色与纸色。

## 2. 语义令牌总表（组件唯一消费层）

### 2.1 文字（前景阶梯）

| 令牌 | Light | Dark | 用途 |
| --- | --- | --- | --- |
| `--ct-text` | `#1a1c1f` | `#ededed` | 正文、标题、主要交互文字 |
| `--ct-text-secondary` | ink 55% | ink 55% | 次级说明、表头、图例 |
| `--ct-text-tertiary` | ink 35% | ink 35% | 占位符、辅注、时间戳 |
| `--ct-text-quaternary` | ink 18% | ink 18% | 分隔符号、极弱装饰性文字 |
| `--ct-text-disabled` | `#afafaf` | ink 30% | 禁用态文字（不参与阶梯，保证可辨识） |
| `--ct-text-on-accent` | `#ffffff` | `#ffffff` | accent 底上的文字 |

> Codex 原生取 70/50%，Tessera 收紧为 55/35%（文档密度更高，层级要更明显）。禁止用 `opacity`
> 模拟文字层级——透明度会连带削弱子元素。

### 2.2 面层（surface 电梯）

| 令牌 | Light | Dark | 海拔语义 |
| --- | --- | --- | --- |
| `--ct-surface-sunken` | `#f0f0ee` | `#0d0d0d` | 凹陷：代码块底、输入内嵌区 |
| `--ct-bg` | `#f9f9f9` | `#181818` | 画布：页面底色 |
| `--ct-surface-muted` | `#f5f5f4` | `#212121` | 弱面：次级卡片、表头条、hover 前底 |
| `--ct-surface` | `#ffffff` | `#303030` | 主面：卡片、输入框、面板 |
| `--ct-surface-elevated` | `#ffffff` | `#303030` | 悬浮面：菜单、弹层、Toast（暗色与主面同亮度，靠阴影/描边区分） |
| `--ct-surface-glass` | bg 94% 半透明 | `#212121` 92% | 玻璃面：需配 backdrop-blur，见 05-elevation |

规则：**内容永远放在比画布高一级的面上**；亮色靠"白纸 + 边框"分层，暗色靠"亮度电梯"分层（`#0d0d0d → #181818 → #212121 → #282828 → #303030`）。

### 2.3 交互水洗（前景低透明叠加）

| 令牌 | Light | Dark | 用途 |
| --- | --- | --- | --- |
| `--ct-surface-hover` | ink 4% | white 6% | 行/项悬停 |
| `--ct-surface-active` | ink 8% | white 10% | 行/项按压 |
| `--ct-surface-selected` | ink 5% | white 8% | 选中（非 accent 语义时） |

水洗叠加在任何面层上都成立，禁止为悬停硬编码灰色 hex。

### 2.4 边框

| 令牌 | Light | Dark | 用途 |
| --- | --- | --- | --- |
| `--ct-border-light` | ink 5% | white 6% | 卡片内分隔、表格行线 |
| `--ct-border` | ink 8% | white 10% | 默认组件描边（卡片、输入框） |
| `--ct-border-heavy` | ink 14% | white 18% | hover 描边加深、需要强调的分隔 |

Codex 招牌：边框是**前景的影子**而非独立灰色。任何新组件不得引入 `#e5e7eb` 之类硬编码边框。

### 2.5 强调色（蓝，稀缺资源）

| 令牌 | Light | Dark | 允许出现的位置 |
| --- | --- | --- | --- |
| `--ct-accent` | `#0285ff` | `#0a8bff` | 链接、选中描边、单/复选选中底、进度条、开关开启 |
| `--ct-accent-hover` | `#339cff` | `#4aa8ff` | 上述元素 hover |
| `--ct-accent-soft` | `#e5f3ff` | accent 22% | 选中项浅底、信息浅底 |
| `--ct-focus-ring` | accent 70% | `#4aa8ff` 75% | 唯一焦点环颜色 |

**禁令**：accent 不做按钮主底色、不做大面积 banner、不做图表默认系列色。

### 2.6 状态色（三件套 × 4）

每种状态固定三个角色：`fg`（文字/图标）、`border`（描边）、`bg`（浅底），成对使用不得混搭。

| 状态 | Light fg / border / bg | Dark fg / border / bg |
| --- | --- | --- |
| success | `#2f6d4a` / `#9fc1ac` / `#e9f4ec` | `#6cc08b` / fg 40% / fg 14% |
| warning | `#8a6724` / `#ddc891` / `#fbf8ef` | `#e3b341` / fg 40% / fg 14% |
| danger | `#9f2424` / `#ddc1c1` / `#fbf5f5` | `#f0786f` / fg 40% / fg 14% |
| info | `#4d5f77` / `#b8cfde` / `#f4f7fa` | `#8ab3d6` / fg 40% / fg 14% |

> 亮色为 Tessera 暖化值（Codex 原生 `green-500 #00a240` 等饱和度过高，与暖灰纸感冲突）；
> 暗色遵循 Codex 逻辑：前景提亮一档（对应 Codex `*-300`），底/描边由前景低透明派生。

### 2.7 按钮语义（反相中性）

| 令牌 | Light | Dark |
| --- | --- | --- |
| `--ct-btn-primary-bg` | `#0d0d0d` | `#ededed` |
| `--ct-btn-primary-bg-hover` | `#2c2c2a` | `#ffffff` |
| `--ct-btn-primary-fg` | `#ffffff` | `#0d0d0d` |
| `--ct-btn-secondary-bg` | ink 5% | white 8% |
| `--ct-btn-secondary-bg-hover` | ink 8% | white 12% |
| `--ct-btn-secondary-fg` | `#1a1c1f` | `#ededed` |

主按钮 = 主题反相（近黑/近白），这是 Codex 最具识别度的选择之一。danger 按钮用 danger 三件套。

### 2.8 特殊面

| 令牌 | Light | Dark | 说明 |
| --- | --- | --- | --- |
| `--ct-tooltip-bg/fg` | `#1f1f1d` / `#ffffff` | `#ededed` / `#0d0d0d` | Tooltip 永远反相 |
| `--ct-overlay` | black 28% | black 46% | Modal/Drawer 遮罩 |
| `--ct-overlay-strong` | black 42% | black 58% | 全屏引导等更重遮罩 |

## 3. 对比度底线

- 正文 (`--ct-text` on `--ct-surface`)：≥ 12:1（实测亮色 ~15:1）。
- 次级文字：≥ 4.5:1；tertiary 允许降至 3:1 但不得承载必读信息。
- 状态色 fg on bg 浅底：≥ 4.5:1。
- accent on 白：`#0285ff` 约 3.9:1，故 **14px 以下 accent 文字必须加粗（500+）或仅作图形元素**。

## 4. 使用守则（Do / Don't)

- Do：新增颜色需求先问"能否由 ink 阶梯或状态三件套表达"。
- Do：图表用独立的低饱和土色板（见 `../04-charts/README.md`），与 UI 状态色隔离。
- Don't：硬编码 hex 进组件 CSS（唯一例外：本文件定义的令牌源头）。
- Don't：用 `opacity` 调层级、用暗色 gray 阶写亮色主题。
- Don't：同一视图内 accent 元素超过 ~5 处——蓝色一多，焦点即消失。
