# Patterns · 03 响应式与移动端

> 验收基线（沿用 `scripts/acceptance.mjs`）：桌面 1280×900、移动 390×844、窄屏 360×800，
> 全路由零横向溢出。

## 1. 断点

| 断点 | 宽 | 行为 |
| --- | --- | --- |
| xl | ≥1280 | 完整壳层（Sidebar + 主面） |
| lg | ≥1024 | Sidebar 可收起为 64 图标栏 |
| md | ≥768 | Sidebar 转 Drawer；栅格 2 列 |
| sm | ≥640 | 栅格单列；工具栏折叠 |
| xs | <640 / `pointer: coarse` | 移动形态（下述全部生效） |

## 2. 移动形态规则

- **触达**：可点面积 ≥ 40×40（全局 `@media (pointer: coarse)` 放大已落地，保持）；
- **壳层**：Topbar 保留（标题居中化），Sidebar 换汉堡 Drawer；底部 Tab 栏可选（≤5 项，玻璃面）；
- **弹层降级**：
  - Modal(sm/md) → 底部弹层（顶角 radius-2xl、拖拽把手 32×4 quaternary 药丸）；
  - Dropdown/Select 长列表 → 底部弹层列表（行高 44）；
  - Popover → 底部弹层或全宽气泡；Tooltip → 长按短暂显示；
  - DatePicker/TimePicker → 全宽底部面板；
- **表格**：优先卡片化（每行转 PropertyList 卡）；必须保留表格时横滚 + 首列固定 + 滚动阴影提示；
- **工具栏**：DataToolbar 折叠规则见业务层；FloatButton 上移避让底部栏；
- **图表**：图例移至图下横滚；tooltip 改点击触发；Sparkline 保持不变；
- **输入**：聚焦时防缩放（font-size ≥16 于 iOS 输入面）——移动端输入控件字号升 16。

## 3. 内容弹性三原则

1. 任何组件"内部不大于外部"：min-width 0 + ellipsis 兜底；
2. 固定宽度只允许出现在令牌（侧栏/弹层宽），内容区一律流式；
3. 图片/媒体 `max-width: 100%` 全局兜底（已落地）。

## 4. 密度不随断点变化

字号/行高/间距刻度在移动端**不缩小**（只放大触达），保持 Codex 的桌面级信息密度直接换排布。
