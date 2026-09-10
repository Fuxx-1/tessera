# Base · 导航（7）

导航件的共同气质来自 Codex 侧栏：**药丸行 + 前景水洗 + 当前项不靠大色块**。

## Anchor 锚点

**规格**：右侧竖排目录；行高 28、字号 12、`--ct-text-secondary`；左侧 2px 轨道 `--ct-border-light`，
当前项轨道段变 `--ct-text`（中性，非蓝）且文字升主色；滚动跟随 160ms。

**禁忌**：当前项大蓝底；轨道加粗超过 2px。

## Breadcrumb 面包屑

**规格**：字号 12–14；普通项 `--ct-text-tertiary`，hover 升 secondary + 水洗胶囊（padding 2×6、radius-sm）；
当前项 `--ct-text` 不可点；分隔符 `/` 或 chevron 着 quaternary；超长中间折叠为 `…` Dropdown。

## Dropdown 下拉菜单

**规格**：面板=弹层共性（elevated + hairline+md 影 + radius-lg + padding 4）；
菜单项高 32、radius-sm、图标 16 前导、快捷键提示尾随（12px tertiary mono）；
分组标题 11px tertiary 大写；分隔线 `--ct-border-light` margin 4×(-4)；
danger 项文字 `--ct-danger`，hover 底 `--ct-danger-bg`；子菜单右展 offset 4。

**禁忌**：菜单项高低不一；无 padding 的贴边面板。

## Menu 导航菜单

**规格**：侧栏纵向为主。行高 30（Codex nav-row 原值）、**radius-full 药丸**、padding 0 12、
字号 13–14；默认 `--ct-text-secondary`；hover 水洗；**当前项 `--ct-surface-selected` 底 + 文字升主色 +
weight 500**（中性选中，不用蓝底）；分组标题 11px tertiary、上距 16 下距 4；
折叠态只留 20px 图标 + Tooltip。水平模式：当前项底部 2px `--ct-text` 指示条。

**禁忌**：accent 大底块选中；多级缩进超过 2 层。

## Pagination 分页

**规格**：页码钮 30×30、radius-md、字号 13；默认 ghost；当前页 `--ct-btn-primary-bg` 反相底；
省略号 quaternary；快速跳转输入框 30 高 60 宽；总数文字 12px secondary。

**禁忌**：当前页蓝底（保持反相中性）。

## Steps 步骤条

**规格**：节点 24px 圆（radius-full）：完成=反相底白勾、进行中=`--ct-text` 1.5px 描边 + 中性点、
未来=`--ct-border-heavy` 描边 + tertiary 数字；连接线 1px `--ct-border`，完成段变 `--ct-text`；
标题 14/500，描述 12 secondary。纵向模式线在左轨 12px 处。

**禁忌**：完成态用绿色/蓝色填充（保持墨色系）；节点超过 32px。

## Tabs 标签页

**规格**（线型，默认）：标签高 36、字号 14、间距 20；默认 secondary，hover 升主色；
**当前项文字 `--ct-text` + 底部 2px `--ct-text` 指示条**（中性，非蓝），指示条滑动 160ms；
下方整条 1px `--ct-border-light` 轨道。卡片型备选：当前项 `--ct-surface` 底 + hairline，轨道底 `--ct-surface-muted`。
可关闭标签的 × 钮 14px tertiary，hover 水洗圆底。

**禁忌**：蓝色指示条；标签内塞图标超过 1 个 + 文字。
