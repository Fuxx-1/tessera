# Business · 工具栏与筛选（3）

## DataToolbar 数据工具栏

列表/表格页头部操作条：

```
[搜索 Input(sm, 240px)] [筛选 Tag 群…]     [分隔]     [次要 IconButton 群] [主动作 solid(sm)]
```

- 高 40（Toolbar 基座）、左右两簇、中间弹性；
- 已激活筛选以可关闭胶囊 Tag 呈现（radius-full 合法场景），全部清除钮 ghost 12px；
- 列设置/密度/导出等收进 IconButton+Dropdown；
- 窄屏（<640）：搜索保留、筛选收进"筛选" soft 钮徽标计数、主动作转 IconButton。

禁忌：工具栏双行化（宁可折叠）；多个 solid。

## FilterPanel 筛选面板

复杂条件的侧挂/下拉面板：

- 容器：Popover(360) 或 Drawer(378) 承载；
- 条件组：字段 Select(sm) + 操作符 Select(sm) + 值控件（按字段类型切 Input/Select/DatePicker）
  三件横排 gap 8，行间 12；组间 AND/OR Segmented(sm)；
- 添加条件 ghost + 图标钮；删除行 IconButton hover 现身；
- 底部条：重置 ghost + 应用 solid(sm)，上衬 border-light；
- 已应用状态回显到 DataToolbar 的 Tag 群（同一数据源）。

## CommandPalette 命令面板

Cmd+K 全局命令入口，Codex 味最浓的业务件：

- 居中浮层：宽 560、**玻璃面**（`--ct-surface-glass` + backdrop-blur 16）+ hairline + xl 影 +
  radius-2xl；顶部输入行高 52：搜索图标 20 tertiary + 无边框输入 16px + Esc 提示 kbd；
- 结果区 max-height 400 内滚：分组标题 11 tertiary 大写、
  选项行 40 radius-md：图标 16 + 主文字 14 + 路径/描述 12 tertiary + 快捷键 kbd 尾随；
- 高亮行（键盘导航）= `--ct-surface-selected` 水洗（**不用蓝底**）；匹配字符 500 字重；
- kbd 徽记：mono 11、padding 1 5、border + border-light、radius-xs、底 surface-muted；
- 无结果：紧凑 Empty；入场 scale(0.98→1)+opacity 200ms enter、遮罩 overlay 40%。

禁忌：结果行蓝底高亮；面板不透明纯白（丢玻璃感）。
