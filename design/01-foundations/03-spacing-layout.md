# Foundations · 03 间距与布局

> 落地位置：`src/styles.css` `--ct-space-*`、`--ct-control-height*`、`--ct-shell-sidebar-width`、`--ct-content-max-width`。

## 1. 4px 栅格

基础步进 `--spacing: 4px`（Codex `--spacing: .25rem`）。全部间距取 4 的倍数：

| 令牌 | px | 典型用途 |
| --- | --- | --- |
| `--ct-space-1` | 4 | 图标与文字间隙、行内元素微距 |
| `--ct-space-2` | 8 | 控件内水平 padding、紧凑列表项间距 |
| `--ct-space-3` | 12 | 面板 padding（Codex `--padding-panel`）、卡片内小节距 |
| `--ct-space-4` | 16 | 卡片 padding、工具栏 padding（Codex `--padding-toolbar`）、模块间距 |
| `--ct-space-5` | 20 | 表单项纵向节奏 |
| `--ct-space-6` | 24 | 区块间距、Modal padding |
| `--ct-space-8` | 32 | 页面级分段 |

节奏心法（Codex 观感的来源）：**外松内紧**——模块之间 16/24/32 大留白，元素内部 4/8/12 紧凑。

## 2. 控件高度（结构性尺寸）

| 令牌 | px | 出处与用途 |
| --- | --- | --- |
| `--ct-control-height-sm` | 30 | Codex 导航行/紧凑控件（nav-row ≈ 29–30px） |
| `--ct-control-height` | 36 | 默认按钮/输入框/选择器（Codex toolbar-sm=36） |
| `--ct-control-height-lg` | 44 | 大号控件 = 移动端最小可点面积 |

同一水平排列的控件必须同高；高度由令牌给出，禁止用 padding 撑出偶数差。

## 3. 关键结构尺寸

| 令牌 | 值 | 出处 |
| --- | --- | --- |
| `--ct-shell-sidebar-width` | 252px | Codex 侧栏 `clamp(240px, 300px, …)` 区间内取定值 |
| `--ct-content-max-width` | 1120px | 正文容器上限（Codex markdown 宽块 64rem≈1024 + 边距） |
| 工具栏高 | 46px（页级）/ 36px（面板级） | Codex `--height-toolbar` / `-sm` |
| 列表行高 | 30px（药丸行）/ 36px（含副标题行 44+） | Codex nav-row |

## 4. 页面布局模型

```
┌────────────────────────────────────────┐
│ Topbar 46px（标题 + 全局动作）           │
├──────────┬─────────────────────────────┤
│ Sidebar  │ Content（max 1120px 居中）    │
│ 252px    │  padding: 24px 32px          │
│          │  模块间 gap: 24px             │
└──────────┴─────────────────────────────┘
```

- 画布 `--ct-bg`，内容面 `--ct-surface` 卡片化；卡片间距 16、区块间距 24。
- 栅格组件（Grid/Flex/Space）的 gap 档位 = 间距令牌，不提供任意数值档。
- 嵌套容器 padding 递减：页 32 → 卡 16 → 组 12 → 行内 8。

## 5. 密度策略

Tessera 不做全局 compact 主题（Codex 也没有）。密度由组件 `size` 属性局部调整：
`sm` 高度 30 / 字号 12；`md` 高度 36 / 字号 14。表格额外提供行高 40/48 两档。

## 6. 使用守则

- 视觉对齐优先于数学对齐：图标类元素允许 ±1px 光学补偿，但要以注释说明。
- 禁止 margin 上下双向叠加——统一"下方留白"或容器 gap 单向节奏。
- 任何"内部不大于外部"违例（子元素溢出父容器）视为 bug（README 验收标准已含）。
