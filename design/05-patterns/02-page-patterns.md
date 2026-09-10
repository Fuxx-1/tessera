# Patterns · 02 页面模式

四种高频页面骨架，全部由既有组件拼装，禁止页面级自创视觉。

## 1. 看板页（Dashboard）

```
Topbar
[MetricCard × 4]                    ← auto-fill minmax(220px,1fr) gap 16
[Card: 主图表 (2fr)] [Card: 次图 (1fr)]  ← gap 16
[Card: Table 摘要]
```

- 图表卡头：标题 14/500 + 时间范围 Segmented(sm) 右挂；
- 全页刷新用卡内 Skeleton，不做全屏 Spin；
- 数字与图表色一律走 charts 规范（趋势色只在 delta）。

## 2. 列表页（List/Table）

```
Topbar（标题 + 主动作 solid）
Card:
  DataToolbar（搜索/筛选/列控制）
  Table（行 hover 水洗、选中 accent-soft）
  Pagination 右下
```

- 行动作：尾列 IconButton(ghost) hover 现身 + 更多 Dropdown；
- 批量操作：选中后 DataToolbar 原位切换为批量条（计数 + 动作 + 取消）；
- 空态：表内 Empty + 主动作按钮。

## 3. 详情页（Detail)

```
Topbar（面包屑 + 标题 + 状态 Tag + 动作区）
[Card: PropertyList 基础信息]
[Tabs: 概览 / 日志 / 配置]
  概览 → 卡片组；日志 → StatusTimeline / CodeBlock；配置 → Form
```

- 标题行状态用 Tag 状态三件套；
- 危险动作沉底"危险区" Card（danger-border 描边 + danger ghost 按钮 + Popconfirm）。

## 4. 设置/表单页（Settings/Form）

```
Topbar
Card（max-width 720 居中）:
  H4 分组 × N（Form 纵向布局）
  底部操作条：ghost 取消 + solid 保存
```

- 长表单侧挂 Anchor 目录；
- 即时生效项（Switch）不出现保存钮，行内右对齐开关 + 12px 说明；
- 未保存离开用 Modal 确认（sm 危险确认样式）。

## 通用规则

- 每页 solid 按钮 ≤ 1、accent 元素 ≤ 5、玻璃面 ≤ 2；
- 页面加载顺序：壳先出 → 卡片 Skeleton → 数据填充，无整页白屏 Spin；
- 错误恢复：卡片级 Result 紧凑态 + 重试 ghost，不炸全页。
