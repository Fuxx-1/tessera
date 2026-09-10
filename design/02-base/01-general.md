# Base · 通用（4）

## Button 按钮

触发即时操作的主入口。

**结构**：高 36(md)/30(sm)，水平 padding 12/10，图标-文字间隙 6px，radius md(8)。

**变体**（对齐 Codex 按钮三级制）：

| variant | 底 | 文字 | hover | active |
| --- | --- | --- | --- | --- |
| solid（主） | `--ct-btn-primary-bg`（反相近黑/近白） | `--ct-btn-primary-fg` | bg-hover 令牌 | 再深一档 |
| soft（默认） | `--ct-btn-secondary-bg`（ink 5% 水洗） | `--ct-text` | ink 8% | ink 12% |
| ghost | 透明 | `--ct-text-secondary` | 水洗 ink 4% + 文字升主色 | ink 8% |

- danger 语义：solid 底 `--ct-danger`、soft/ghost 文字与水洗用 danger 三件套。
- 一个视图区块内 solid 最多 1 个；次要动作用 soft/ghost。
- loading：图标位替换 spinner（16px，1s linear），文字保留，宽度不跳变。

**禁忌**：蓝底主按钮；按压 scale 缩放；药丸圆角；渐变底。

## FloatButton 悬浮按钮

页面右下角固定的快捷动作（回顶部、反馈）。

**结构**：48×48 圆形（`radius-full`），底 `--ct-surface-elevated`，影 `hairline + lg`，图标 20px。
右下角 24px 内边距锚定，多个时纵向堆叠 gap 12，可折叠为菜单（展开 200ms enter 曲线）。

**状态**：hover 水洗 + 影升 xl；触屏下常显。主动作可用 solid 反相底。

**禁忌**：超过 2 组悬浮钮；遮挡内容区主操作。

## Icon 图标

线性图标系统的统一出口。

**规格**：1.5px 描边线性风格（匹配系统符号气质）；尺寸档 12/14/16/20/24，默认 16 与 `1em`；
颜色继承 `currentColor`，独立使用时着 text 阶梯令牌。装饰性图标 `aria-hidden`，功能性图标配可达名称。

**禁忌**：实底彩色图标混排；emoji 充当 UI 图标。

## Typography 排版

文章/文案的语义化排版组件（Title/Text/Paragraph/Link）。

**规格**：完整对齐 `../01-foundations/02-typography.md` 刻度表；
Text 变体 `secondary/tertiary/success/warning/danger` 直接映射色彩令牌；
`code` 变体走 mono + sunken 底 + radius-xs；`mark` 高亮底 `--ct-warning-bg`、radius-2xs。
Link：accent 色、hover 下划线（offset 2px）、visited 不变色。
可复制/可编辑等行为件的操作图标 14px、tertiary 色、hover 升 secondary。

**禁忌**：标题用 600+ 字重；正文小于 12px。
