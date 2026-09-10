# Charts · 关系 / 流 / 文本（4）

## SankeyChart 桑基图

- 节点：8px 宽竖条、radius-2xs、系列色 90%；节点标签 12 主色（外侧放置）；
- 连带：源色→目标色渐变、28% 透明度；hover 连带升 55% 且相关路径外全部降 .25；
- 层间距 ≥ 96；节点纵向 gap 8；
- 数值 tooltip：源 → 目标 + 值。

## OrganizationChart 组织架构图

- 节点卡 = Card 缩微：surface + border + radius-md、padding 8 12、min-width 120；
  主名 13/500 + 职务 11 tertiary（可挂 20px Avatar）；
- 连接线 1px `--ct-border-heavy` 直角走线（radius-xs 拐角圆化）；
- 当前/选中节点 accent 1px 描边；折叠钮 16px 圆钮挂节点底缘；
- 画布可拖移缩放，右下角迷你缩放控件（IconButton 组胶囊）。

## MindMap 思维导图

- 根节点：反相底（btn-primary 规格）13/500；一级节点 surface+border 卡；
  二级及以下退化为纯文字 + 下划线枝（2px 圆角曲线，分支色循环系列板 60%）；
- 节点 hover 水洗、选中 accent 描边；折叠计数徽标 = Badge 中性计数规格；
- 布局左右均衡展开；连线三次贝塞尔。

## WordCloud 词云

- 字重映射频次（400→600），字号 12–48 五档；**颜色只用墨色阶**
 （text 100% / 70% / 45% 三档循环，暗色同理）——不做彩虹词云；
- 旋转仅 0°/90° 两档；hover 词升主色 + 其余降 .4 + tooltip 显示频次；
- 字体沿用 `--ct-font-sans`；最多渲染 100 词，长尾聚合提示。
