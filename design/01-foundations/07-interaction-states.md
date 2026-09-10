# Foundations · 07 交互状态矩阵

> 所有基础组件的状态表达统一从本文取值；各组件文档只写差异，不复述通则。

## 1. 八态定义

每个可交互组件必须明确以下状态的视觉（不适用的标注 N/A）：

`default → hover → active(按压) → focus-visible → selected/checked → disabled → loading → error`

## 2. 通用取值

| 状态 | 表达 | 令牌 |
| --- | --- | --- |
| hover | 底色水洗 **或** 描边加深，二选一；文字色可由 secondary 升 primary | `--ct-surface-hover` / `--ct-border-heavy` |
| active | 水洗加深一档；**无位移、无缩放**（Codex 按压不做 scale） | `--ct-surface-active` |
| focus-visible | 2px 焦点环，offset 2px，全组件唯一样式 | `outline: 2px solid var(--ct-focus-ring); outline-offset: 2px` |
| selected | accent 语义：选中描边/浅底/勾选；非 accent 场景用 `--ct-surface-selected` | `--ct-accent` / `--ct-accent-soft` |
| disabled | 文字 `--ct-text-disabled`、底 `--ct-surface-muted`、描边 `--ct-border-light`、`cursor: not-allowed`；**不用 opacity 整体减淡** | — |
| loading | 控件内 spinner 替换图标位 + `aria-busy`；容器级用 Skeleton/Spin | — |
| error | 描边换 `--ct-danger-border`，focus 环换 danger 色，下方 12px 错误文字 | `--ct-danger*` |

## 3. 焦点管理

- 只响应 `:focus-visible`（键盘）；鼠标点击不出环。
- 焦点环颜色全局唯一 `--ct-focus-ring`（危险控件内允许 danger 变体）。
- 弹层打开焦点移入（Modal 聚焦第一个可交互元素或本体）、关闭归还触发器；Tab 循环锁定在弹层内。
- 复合控件（Select、DatePicker）：环画在可视输入面上，不画在内部隐藏 input 上。

## 4. 指针与触达

- 可点元素 `cursor: pointer`；文本输入 `cursor: text`；禁用 `not-allowed`。
- 桌面最小可点面积 24×24（视觉可更小但热区补足）；触屏（`pointer: coarse`）≥ 40×40，
  已有全局 `@media (pointer: coarse)` 放大规则。
- 图标按钮必须有 `aria-label`；Tooltip 不能作为唯一可达的说明（触屏无 hover）。

## 5. 键盘协议（组件继承）

| 模式 | 键位 |
| --- | --- |
| 按钮类 | Enter/Space 触发 |
| 菜单/列表弹层 | ↑↓ 移动、Enter 选择、Esc 关闭、类型前缀跳转 |
| Tabs/Segmented | ←→ 切换（roving tabindex，组内单 Tab 位） |
| 表格/树 | ↑↓ 行移动、←→ 展开收起（树）|
| Modal/Drawer | Esc 关闭（可禁用）、Tab 循环 |
| 命令面板 | Cmd+K 开、Esc 关、↑↓+Enter |

## 6. 状态叠加优先级

`disabled > loading > error > selected > active > hover > default`。
高优状态出现时低优状态的视觉全部失效（disabled 的元素没有 hover）。
