# Patterns · 04 无障碍

> 目标 WCAG 2.1 AA。Codex 自身的可达性实践（focus-visible 体系、forced-colors 适配、
> reduced-motion 全覆盖）是底线而非上限。

## 1. 对比度

- 正文/控件文字 ≥ 4.5:1；大字（≥18.5px 或 14px/500+）≥ 3:1；
- tertiary(35%) 仅用于可推断信息；quaternary(18%) 仅装饰；
- 状态不允许只靠色相：Alert/Result/Tag 均带图标，图表系列可开线型差异；
- accent `#0285ff` 在白底 3.9:1：小字场景加粗或改用图形表达（01-color 已约定）。

## 2. 键盘

- 全组件按 foundations 07 键盘协议；焦点顺序 = 视觉顺序；
- 焦点环唯一样式（2px focus-ring / offset 2），任何组件不得 `outline: none` 裸奔；
- 弹层焦点圈闭：入焦、Tab 循环、Esc 退、归还触发器；
- 跳转链接（skip to content）在壳层 Topbar 前提供（视觉隐藏、聚焦现身）。

## 3. 语义与 ARIA

| 组件族 | 要求 |
| --- | --- |
| 弹层 | `role="dialog"` + `aria-modal` + `aria-labelledby` |
| 菜单/列表 | `role="menu/listbox"` + `aria-activedescendant` 或 roving tabindex |
| Tabs | `role="tablist/tab/tabpanel"` + `aria-selected` |
| 开关/复选 | 原生 input 优先；自绘必须 `role="switch/checkbox"` + `aria-checked` |
| 反馈 | Message/Notification 挂 `role="status"`（普通）/`role="alert"`（错误） |
| 图表 | `role="img"` + `aria-label` 摘要 + sr-only 数据表 |
| 图标按钮 | 必填 `aria-label`（IconButton 已强制） |
| 加载 | `aria-busy` + Skeleton 容器 `aria-hidden` |

## 4. 动效与系统适配

- `prefers-reduced-motion: reduce`：装饰动画停止、过渡仅保留 opacity（foundations 06）；
- `forced-colors: active`：自绘控件补 `2px solid transparent` 占位描边（Codex 做法），
  确保高对比模式下系统描边有落点；
- 暗色模式 `color-scheme: dark` 声明（已落地），原生控件/滚动条跟随。

## 5. 验收挂钩

- 每组件 Doc 页 demo 需通过键盘完整操作路径；
- acceptance 脚本的 console-error / 焦点检查保持既有门槛；
- 新增组件 PR 附本文件第 3 节对应行的自查勾选。
