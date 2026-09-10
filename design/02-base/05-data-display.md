# Base · 数据展示（20）

## Avatar 头像

尺寸档 20/24/32/40；圆形 radius-full（方形变体 radius-md）；
文字头像：`--ct-surface-muted` 底 + secondary 文字（不随机彩色底，保持中性）；
组合堆叠 -8px 交叠 + 2px `--ct-surface` 描边圈，溢出 `+N` 计数样式同文字头像。

## Badge 徽标

数字徽标：高 16、min-width 16、radius-full、`--ct-danger` 底白字 11px、超 99 显示 `99+`；
点状 6px；中性计数变体 `--ct-surface-muted` 底 secondary 文字（列表计数用）；
状态点语义色直接取状态令牌。附着位右上角偏移 (-2,-2)。
禁忌：徽标抖动动画。

## Calendar 日历（全页）

月视图格子：日期数字 13 右上、事件条 18px 高 radius-sm 中性/状态浅底 + 深字；
今天格 accent 1px 描边；选中格 selected 底；头部同 DatePicker 面板头放大版（标题 16/500）。

## Card 卡片

底 `--ct-surface`、1px `--ct-border`、radius-xl(12)、padding 16；**无阴影**（可悬浮列表卡允许 hover 升 hairline+sm 影）；
头部：标题 14–16/500 + extra 动作区，下衬 border-light 分隔（可无）；
cover 图顶部通栏 radius 内切（12-1=11 视觉上取 8）；底部动作条 border-light 上衬、ghost 钮排布。
禁忌：默认投影；双层描边。

## Carousel 走马灯

指示点 6px radius-full quaternary，当前点拉长为 16×6 药丸 `--ct-text`；切换 300ms relaxed；
箭头钮 32 圆、玻璃面 elevated + hairline，悬停区域内才现身；自动播放 hover 暂停。

## Collapse 折叠面板

面板项：头部行高 44、padding 0 16、标题 14/500、前导 chevron 16 tertiary（展开旋转 90°）；
项间 border-light 分隔；内容区 padding 12 16 16、正文 secondary；
幽灵变体无外框（仅行分隔）。展开 200ms。

## Descriptions 描述列表

label 12–13 tertiary、value 13–14 主色；纵向模式 label 在上 gap 4、项间 16；
表格模式 label 列 `--ct-surface-muted` 底、单元格 padding 8 12、1px border-light 网格；
标题 14/500 + extra 区。

## Empty 空状态

线性插画 64px（简笔、`--ct-border-heavy` 单色勾线，不做彩色插画）+ 主文案 14 secondary +
辅注 12 tertiary + 可选 soft 按钮；紧凑态（弹层内）仅 32px 图标 + 12px 文案、padding 16。

## Image 图片

radius-md 裁切；加载中 `--ct-surface-muted` 底 + 脉冲；失败态中性碎图占位 + 12 tertiary 文案；
预览层：`--ct-overlay-strong` 遮罩 + 顶部工具条（玻璃面胶囊，缩放/旋转/关闭 IconButton）+ 
底部页码 12px 白字。

## List 列表

行高 ≥48（含副标题 56）、padding 12 16、行间 border-light；
行结构：Avatar/图标 + 主文字 14 + 副文字 12 secondary + 尾随动作（hover 现身）；
可点行 hover 水洗；加载更多用底部 ghost 按钮居中。

## Popover 气泡卡片

弹层共性 + radius-lg、padding 12、max-width 320；标题 13/500 + 正文 12–13 secondary；
箭头 8px 与面同色带 hairline。触发 hover 延迟 100ms / click 立即。

## QRCode 二维码

容器 `--ct-surface` + border + radius-md + padding 12；码色 `--ct-text` 于白底（暗色主题码区保持白底，
保证扫描）；过期遮罩：玻璃面 + 刷新 soft 钮；中心 logo ≤ 20%。

## Segmented 分段控制器

轨道 `--ct-surface-muted` 底 radius-md(8) padding 2；
段项高 28 radius-sm(6) 字 13 secondary；**选中段 `--ct-surface` 白底 + hairline + sm 影 + 文字主色**
（Codex 分段=浮起的白片），滑动 160ms；禁用段 disabled 文字。
禁忌：选中段用 accent 底。

## Statistic 统计数值

label 12 secondary 在上，数值 24–28/600 tabular-nums；前后缀（单位/图标）14 secondary；
趋势色仅作用于小箭头+百分比（success/danger），主数值保持中性墨色。
倒计时同规格 mono 可选。

## Table 表格

表头：`--ct-surface-muted` 底、11–12px/500 secondary 大写可选、高 40、底衬 border；
行高 48（紧凑 40）、行分隔 border-light、hover 整行水洗、选中行 `--ct-accent-soft` 底；
数字列右对齐 tabular-nums；排序/筛选图标 12 tertiary（激活升 accent）；
固定列以 hairline 阴影提示滚动遮挡；分页器右下。空态内嵌 Empty。
禁忌：斑马纹（Codex 用行线不用斑马）；表头粗黑底。

## Tag 标签

高 22、padding 0 8、radius-sm(6)、字 12；默认 `--ct-surface-muted` 底 secondary 字 + border-light；
状态变体 = 状态三件套浅底+深字+描边；胶囊变体 radius-full 仅用于筛选条场景；
可关闭 × 14 tertiary hover 水洗。**同视图彩色 Tag 种类 ≤ 4**。

## Timeline 时间轴

节点 8px 圆 `--ct-border-heavy`（状态节点用状态色实心），轨道 1px border-light；
时间 12 tertiary、标题 13–14、内容 13 secondary；节点与首行文字光学对齐（+3px 补偿）。

## Tooltip 文字提示

**反相面**：`--ct-tooltip-bg/fg`（亮色近黑底白字、暗色白底黑字）、radius-md(8)、padding 6 10、
字 12、max-width 260、影 hairline+md、箭头 6px 同色；延迟 300ms 入 / 立即出；
触屏长按触发。仅承载单句说明——复杂内容升级 Popover。

## Tour 漫游引导

高亮：目标周围 `--ct-overlay` 挖洞遮罩 + 4px radius 外扩光圈（focus-ring 色 30%）；
卡片：elevated 面 radius-xl padding 16 + 标题 14/500 + 正文 13 secondary + 步数 12 tertiary +
上一步(ghost)/下一步(solid 反相) + 跳过 ghost；步间迁移 300ms relaxed。

## Tree 树形控件

行高 30 radius-sm；缩进 20/层，chevron 14 tertiary（展开旋转 90° 160ms）；
选中行 selected 底 + 主色文字；复选模式同 Checkbox 规格；拖拽指示线 2px accent + 落点圈；
连接线可选 border-light 虚线。虚拟滚动下行高恒定。
