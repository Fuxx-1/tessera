# Codex.app 风格提取报告

> 本报告记录 Tessera 设计规范的**证据来源**：从 `/Applications/Codex.app` 中提取了什么、怎么提取、
> 哪些结论是原值照搬、哪些是 Tessera 的适配决策。机读原始值见同目录 `codex-tokens.raw.json`。

## 1. 提取对象与方法

| 项 | 值 |
| --- | --- |
| 目标 | `/Applications/Codex.app`（OpenAI Codex 桌面端，Electron，Bundle 更新于 2026-06-30） |
| 主证据 | `Contents/Resources/app.asar` 内 `webview/assets/app-jOJotR-N.css`（546KB，Tailwind v4 编译产物 + 自定义主题层） |
| 辅证据 | `webview/assets/page-rpvbY0vV.css`（图表 Chart_* 组件样式）及若干页面级 CSS |
| 方法 | 直接解析 asar 头部 JSON 索引提取文件（未改动原包），对压缩 CSS 做括号重排后逐段人工审读 |

Codex webview 的主题结构分三层，Tessera 的分层照抄了这个思路：

1. **原始调色板**（`--gray-*`、`--blue-*`、`--green-*` 等 hex 常量）；
2. **语义令牌**（`--color-background-*`、`--color-text-*`、`--color-border*`、`--color-icon-*`），按 `.electron-light` / `.electron-dark` 两套作用域整体覆写；
3. **组件消费层**（Tailwind utilities + `--color-token-*` 别名，兼容 VS Code 主题变量注入）。

## 2. 原始调色板（原值照搬）

### 2.1 中性灰阶（暖灰，无色偏蓝）

| Token | 值 | 用途示例 |
| --- | --- | --- |
| `gray-0` / `white` | `#ffffff` | 亮色面层 |
| `gray-50` | `#f9f9f9` | 亮色画布/表面下层 |
| `gray-100` | `#ededed` | 亮色编辑器底、暗色主文字 |
| `gray-300` | `#afafaf` | 禁用文字 |
| `gray-500` | `#5d5d5d` | 三级按钮文字 |
| `gray-550` | `#4f4f4f` | — |
| `gray-600` | `#414141` | 暗色 decoration-unchanged |
| `gray-700` | `#303030` | 暗色顶层面 |
| `gray-750` | `#282828` | 暗色 elevated-primary-opaque |
| `gray-800` | `#212121` | 暗色编辑器底/elevated |
| `gray-900` | `#181818` | 暗色 surface |
| `gray-1000` | `#0d0d0d` | 亮色主按钮底、暗色 surface-under 近黑 |

### 2.2 彩色（状态/强调）

| 族 | 关键值 |
| --- | --- |
| blue | `50 #e5f3ff` · `100 #99ceff` · `300 #339cff` · `400 #0285ff` · `900 #00284d` |
| green | `50 #d9f4e4` · `300 #40c977` · `400 #04b84c` · `500 #00a240` · `700 #00692a` · `800 #004f1f` |
| red | `50 #ffd9d9` · `300 #ff6764` · `400 #fa423e` · `500 #e02e2a` · `600 #ba2623` · `900 #4d100e` |
| orange | `50 #ffe7d9` · `300 #ff8549` · `400 #fb6a22` · `500 #e25507` · `700 #923b0f` · `900 #4a2206` |
| yellow | `300 #ffd240` · `400 #ffc300` |
| purple | `300 #ad7bf9` · `400 #924ff7` |
| pink | `400 #ff66ad` |

## 3. 语义令牌两主题对照（核心节选）

`fg` = `--color-text-foreground`。`mix(x%)` = `color-mix(in oklab, <base> x%, transparent)`。

### 3.1 面层（background）

| 语义 | Light (`.electron-light`) | Dark (`.electron-dark`) |
| --- | --- | --- |
| surface | `gray-0` | `gray-900` |
| surface-under | `gray-50` | `black` |
| editor-opaque | `gray-100` mix(40%) | `gray-800` |
| elevated-primary | `gray-0` mix(70%)（配 blur 玻璃） | `gray-800` mix(96%) |
| elevated-primary-opaque | `gray-0` | `gray-750` |
| elevated-secondary | fg mix(2%) | `gray-0` mix(3%) |
| accent | `blue-50` | `blue-900` |
| status-success | `green-500` mix(7%) | `green-400` mix(16%) |
| status-warning | `orange-50` | `orange-900` |
| status-error | `red-50` | `red-900` |
| danger-active | `red-500` mix(90%) | `red-400` mix(36%) |

### 3.2 按钮（background-button / text-button）

| 语义 | Light | Dark |
| --- | --- | --- |
| primary 底 | fg（近黑 `#1a1c1f`） | `gray-1000` 底、文字 `gray-1000`→底实际为白系（反相） |
| primary hover/active/inactive | fg mix(8%/16%/24%) | `gray-1000` mix(6%/10%/3%) |
| secondary 底 | fg mix(5%) | `gray-0` mix(5%) |
| secondary hover/active | fg mix(5%/4%) | `gray-0` mix(8%/12%) |
| tertiary 底 | fg mix(0%)（透明） | `gray-0` mix(3%) |
| tertiary hover/active | fg mix(10%/20%) | `gray-0` mix(7%/10%) |
| 文字 primary | `gray-0` | `gray-1000` |
| 文字 secondary | fg | `gray-300` |
| 文字 tertiary | `gray-500` | `gray-500` |

**结论**：主按钮是"反相中性"，蓝色从不做按钮底色；secondary/tertiary 是前景低透明水洗。

### 3.3 文字 / 图标

| 语义 | Light | Dark |
| --- | --- | --- |
| foreground | `#1a1c1f`（唯一非灰阶常量的墨色） | `gray-0` |
| secondary | fg mix(70%) | `gray-0` mix(70%) |
| tertiary | fg mix(50%) | `gray-0` mix(50%) |
| icon primary/secondary/tertiary | fg 100/70/50% | white 90/70/50% |
| text-accent | `blue-300` | `blue-100` |
| success / warning / error | `green-500` / `orange-500` / `red-500` | `green-300` / `orange-300` / `red-300` |

（另有 conversation 场景的 30/60/40% 档，Tessera 归并为 quaternary=18% 一档补充。）

### 3.4 边框

| 语义 | Light | Dark |
| --- | --- | --- |
| border-light | fg mix(5%) | white mix(4%) |
| border | fg mix(8%) | white mix(8%) |
| border-heavy | fg mix(12%) | white mix(16%) |
| border-elevation | fg mix(12%) | fg mix(20%)（配 0.5px stroke） |
| border-focus | `blue-300` | `blue-300` mix(70%) |
| border-warning / error | orange/red-500 mix(15%) | orange-300/red-400 mix(40%) |

### 3.5 差异装饰（diff/编辑器）

added `green-500/300`、modified `orange-700/300`、deleted `red-600/400`、unchanged `gray-300/600`；
editor-added/deleted 为对应色 mix(15%/23%) 底。图表色别名 charts-red/blue/yellow/orange/green/purple 直连 VS Code 主题。

## 4. 非颜色系统（原值照搬）

### 4.1 字体

- sans 栈：`-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`（品牌字 "OpenAI Sans" 仅登录页）；
- mono 栈：`ui-monospace, "SFMono-Regular", "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`；
- 字号刻度（覆盖 Tailwind 默认）：`xs 11 / sm 12 / base 14 / lg 16 / heading-sm 18 / heading-md 20 / heading-lg 24 / xl 28 / 2xl 36 / 3xl 48 / 4xl 72`；
- 字重：标题统一 `medium(500)`（`.heading-*` 全系列）；`semibold 600` 仅强调文字；
- 特例：`.heading-dialog` = 20px / 500 / `letter-spacing:-0.36px` / line-height 28px。

### 4.2 间距 / 尺寸

- 栅格 `--spacing: 0.25rem`（4px）；
- 行高体系：导航行高 = `text-base × 1.5 + 2 × row-padding(4px)` ≈ 29–30px，行圆角 `9999px`（药丸）；
- 面板 padding 12px、工具栏 padding 16px；工具栏高 46px（sm 36px、pane 40px）；
- 侧栏宽 `clamp(240px, 300px, min(520px, 100vw - 320px))`。

### 4.3 圆角（Squircle 体系）

- base 刻度：`2xs 2 / xs 4 / sm 6 / md 8 / lg 10 / xl 12 / 2xl 16 / 3xl 20 / 4xl 24 (px)` + `full 9999px`；
- 全部乘 `--corner-radius-scale`（默认 1）；
- `@supports (corner-shape: superellipse(1.5))` 时：scale 升至 **1.25** 且 md+ 应用 `corner-shape: superellipse(1.5)`（苹果式超椭圆）。

### 4.4 阴影 / 层级

- 刻度：`hairline 0 0 0 0.5px #0000001a` / `sm 0 1 2 -1 #00000014` / `md 0 2 4 -1 #00000014` / `lg 0 4 8 -2 #0000001a` / `xl 0 8 16 -4 #0000001f` / `2xl 0 16 32 -8 #00000030`；
- 主窗体 elevation：`--elevation-stroke: 0 0 0 .5px <fg mix 12–20%>`，prominent 追加 `0 3px 7.5px #0000000a, 0 0 20px #0000000d`；
- 悬浮面板（菜单/弹层）：半透明 elevated 底 + `backdrop-blur`（blur 刻度 4/8/12/16/24px）+ hairline 描边；
- 滚动条：`scrollbar-color` 三态（默认/hover/active）跟随主题。

### 4.5 动效

- 时长：`basic 0.15s` / `relaxed 0.3s`；Tailwind 默认 transition `0.15s cubic-bezier(.4,0,.2,1)`；
- 专用缓动：入场 `--cubic-enter: cubic-bezier(.19,1,.22,1)`（大过冲慢收尾）、出场 `--cubic-exit-snappy: cubic-bezier(.65,0,.4,1)`；
- 骨架/加载：`loading-shimmer` 文字渐变扫光 2s `steps(48)`；占位脉冲 2.4–3s ease-in-out；
- 全部动画均带 `@media (prefers-reduced-motion: reduce)` 降级为静止。

### 4.6 焦点与强制对比

- `:focus-visible`：2px 实线焦点边（`--color-token-focus-border`，蓝系），`outline-offset: 2px`；
- `forced-colors: active` 下 outline-hidden 元素回退 `2px solid transparent`（保持系统高对比描边位）。

## 5. Tessera 适配决策（非照搬项）

| # | 决策 | 理由 |
| --- | --- | --- |
| 1 | 墨色统一 `#1a1c1f`，暗色主文字取 `#ededed` | 与 Codex light fg 完全一致；暗色 Codex 用纯白，Tessera 降半档减刺眼 |
| 2 | 文字层级取 100/55/35/18%（Codex 为 100/70/50/…） | Tessera 文档密度更高，次级文字需要更明显的退后 |
| 3 | 状态色亮色用"暖化"自有值（如 success `#2f6d4a`） | Codex 状态绿 `#00a240` 饱和偏高，与 Tessera 暖灰纸感冲突；暗色则贴近 Codex 提亮逻辑 |
| 4 | 字距全部为 0（Codex 标题有 -0.36px） | 中英混排下负字距伤中文可读性 |
| 5 | 中文字体栈补 `PingFang SC / Microsoft YaHei` | Codex 无中文场景 |
| 6 | 控件高度定 30/36/44 | Codex 无表单控件族；取其 nav-row(30) 与 toolbar(36/46) 推导，44 为移动可点下限 |
| 7 | 补 floating/modal 两档大阴影 | Codex 弹层多靠 blur+hairline；Tessera 文档站需要独立阴影档 |
| 8 | `corner-shape` 视为渐进增强，文档按 scale=1 标注 | 与 Codex 行为一致，仅书写口径不同 |

## 6. 证据完整性声明

- 所有第 2–4 节数值均出自 app-jOJotR-N.css 的 `@layer theme` `:root`、`.electron-light`、`.electron-dark` 与文件尾自定义块，未做二次加工（`color-mix` 的 `@supports` 双写取现代分支）。
- Codex 的 `--color-token-*` 层大量桥接 VS Code 主题变量（用于 IDE 扩展形态），对独立组件库无意义，Tessera 不引入该层。
- 未提取内容：Codex 的 React 组件实现、图标字体、品牌字体文件（版权资产，不复制）。
