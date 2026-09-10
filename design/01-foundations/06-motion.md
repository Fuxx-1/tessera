# Foundations · 06 动效系统

> 落地位置：`src/styles.css` `--ct-motion-*`。

## 1. 原则：功能性、瞬时、可关闭

Codex 动效只做三件事——**状态确认**（hover/按压）、**空间连续**（弹层出入）、**进程感**（加载）。
没有装饰性动画，没有弹跳，没有视差。

## 2. 时长与缓动

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| `--ct-motion-fast` | 120ms | 颜色/透明度切换（hover、focus） |
| `--ct-motion-base` | 160ms | 控件形变（switch 滑块、checkbox 勾） |
| `--ct-motion-panel` | 200ms | 弹层出入、折叠展开 |

对应 Codex `basic 150ms / relaxed 300ms` 两档（Tessera 细分为三档，均在其区间内）。

缓动：

| 场景 | 曲线 | 出处 |
| --- | --- | --- |
| 通用过渡 | `cubic-bezier(.4, 0, .2, 1)` | Codex 默认 transition |
| 入场（弹层、面板） | `cubic-bezier(.19, 1, .22, 1)` | Codex `--cubic-enter`，快出缓收 |
| 出场 | `cubic-bezier(.65, 0, .4, 1)` | Codex `--cubic-exit-snappy`，果断收走 |

**出场永远比入场快**（出 ≈ 入 × 0.7）；出场不做复杂动画，淡出 + 轻微位移即可。

## 3. 标准配方

| 交互 | 配方 |
| --- | --- |
| hover/active 底色 | `background-color var(--ct-motion-fast)` |
| Tooltip | 进：opacity 0→1 + 4px 位移，120ms；出：opacity 淡出 80ms |
| Dropdown/Popover | 进：opacity + scale(0.98→1) + 原点在触发侧，200ms enter 曲线 |
| Modal | 遮罩 opacity 160ms；本体 opacity + translateY(8px→0)，200ms |
| Drawer | translateX/Y 100%→0，200ms enter；出 160ms exit |
| Collapse/Tree 展开 | height + opacity，200ms；大量节点时直接跳变 |
| Message/Notification | 进：translateY(-8px)+opacity；出：透明度收起并让位（列表位移 160ms） |
| Switch/Checkbox | 滑块/勾形变 160ms 通用曲线 |
| Skeleton | shimmer 扫光 2s `steps(48)` 循环（Codex loading-shimmer 的阶梯质感） |
| Spin | 旋转 1s linear 循环 |
| 占位脉冲 | opacity 呼吸 2.4s ease-in-out |

## 4. 无障碍与性能

- 每个动画必须配 `@media (prefers-reduced-motion: reduce)`：装饰循环（shimmer/pulse）停止，
  过渡缩到 0ms 或仅保留 opacity。
- 只动 `transform` 与 `opacity`（Collapse 的 height 是唯一例外，注意 `will-change` 慎用）。
- 禁止无限循环的注意力动画（badge 抖动、按钮呼吸灯）。
