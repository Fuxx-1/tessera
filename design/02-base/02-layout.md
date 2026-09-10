# Base · 布局（7）

布局件是"看不见的组件"：除 Divider/Splitter 手柄外不产生任何可见像素，只消费间距令牌。

## Divider 分割线

**规格**：1px `--ct-border-light`（区块级可用 `--ct-border`）；水平默认上下 margin 16；
带文字变体：文字 12px `--ct-text-tertiary`，两侧线各留 8px；垂直变体高随行、margin 左右 8。

**禁忌**：连续两条分割线；用 Divider 弥补间距失控。

## Flex 弹性布局

**规格**：gap 档位=间距令牌（4/8/12/16/24/32）；`align`/`justify`/`wrap`/`direction` 直映射 CSS。
优先于手写 margin 的第一布局工具。

## Grid 栅格

**规格**：24 列体系；gutter 档 16（默认）/24；断点 `sm 640 / md 768 / lg 1024 / xl 1280`；
移动端默认单列堆叠。卡片流场景优先 `repeat(auto-fill, minmax(240px, 1fr))` 模式。

## Layout 布局框架

**规格**：Header 高 46px（玻璃面可选）、Sider 宽 252px（收起 64px）、Content 画布 `--ct-bg`、
Footer 48px。区块间只用 1px `--ct-border-light` 分隔，**不加阴影**。
Sider 收起动画 200ms enter 曲线。

## Space 间距

**规格**：行内元素排距快捷件；size 档 `xs 4 / sm 8 / md 12 / lg 16 / xl 24`；
带分隔符变体的分隔符着 `--ct-text-quaternary`。

## Splitter 分割面板

**规格**：分隔条可视 1px `--ct-border`，热区 8px；hover 时条变 `--ct-border-heavy` 并出现
拖拽手柄点（3 点，`--ct-text-quaternary`）；拖动中条着 `--ct-accent`、`cursor: col-resize`。
焦点态可见焦点环，键盘 ←→ 步进 8px。折叠钮 20×20 圆钮浮在条上（hover 才现身）。

**禁忌**：粗分隔条（>2px 可视）；拖动无实时反馈。

## Masonry 瀑布流

**规格**：列宽 `minmax(240px, 1fr)` 自适应，gap 16；进场无动画（避免抖动），
图片未加载时以 Skeleton 占位保持列高稳定。
