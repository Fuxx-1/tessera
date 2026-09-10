# ADR-0001: Web 与 Iced 采用兄弟 renderer

- 状态：Accepted at G0
- 日期：2026-08-17
- Owner：架构 owner
- 关联：[architecture](../architecture.md)、[complexity ledger](../complexity-ledger.md)

## Context

Tessera 当前是 React/TypeScript 浏览器组件系统。native 目标是低负载桌面工作台，而不是把 DOM、CSS 或 WebView 搬到桌面。iced 0.14 提供自己的 `Element`、widget tree、runtime 和 renderer；它不是 DOM 兼容层。

## Decision

Tessera Web 与 Tessera Iced 是同一设计系统下的两个兄弟实现：

- 共享 `design/tokens.toml` 生成结果、语义模型、组件状态图、数据 schema、文案/错误码、测试 fixture 和验收预算；
- 不共享 DOM/SVG 节点树、CSS cascade、ReactNode、Portal、事件对象、renderer cache、组件实例或运行时状态；
- native 组件按 `native-direct`、`native-recompose`、`deferred`、`not-applicable` 登记，Web registry 的 `production` 不自动成为 iced 的实现状态；
- 共享协议只通过 `tessera-core` 的稳定语义类型和 fixture，不建立跨端虚拟 DOM、通用 props 字典或双向状态同步。

## Consequences

正向：两端可以分别利用浏览器和 iced 的布局/输入/渲染能力，native 不承受 WebView、Chromium 和 DOM 兼容成本。

代价：需要维护语义契约、两套 renderer 适配和独立验收；像素级一致不属于目标，必须以 token、行为、尺寸和可读性一致为准。

## Rejected alternatives

- WebView/Chromium 包装：引入高内存、输入法、权限和安全边界，不符合 native 目标。
- 共享跨端虚拟 DOM：增加第三条状态/渲染路径，且无法表达 iced 的 typed `Element` 和 `Task`。
- 让 Web registry 直接驱动 native 发布：会把 `partial` 能力误报为 parity。

## Verification and exit criteria

G1 创建 workspace 后，`cargo metadata` 必须只显示三个 native 生产 crate；native 依赖图不得反向依赖 JS/DOM。Gallery 必须为每个 native 组件填写独立 `icedStatus`、限制和证据。当前 G0 pre-workspace spike 门禁仍 `BLOCKED`，因此 G1 为 `NOT STARTED`；三个 crate 的机器检查不是 G0 证据，但只有其余 G0 spike 全部通过后才允许创建 workspace。
