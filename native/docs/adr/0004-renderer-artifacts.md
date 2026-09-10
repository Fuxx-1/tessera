# ADR-0004: wgpu 主构建与 tiny-skia 独立兼容构建

- 状态：Accepted at G0; renderer spike/macOS compile complete; remaining G0 runtime spikes `BLOCKED`
- 日期：2026-08-17
- Owner：release/renderer owner
- 关联：[architecture](../architecture.md)、[complexity ledger](../complexity-ledger.md)

## Context

iced 0.14 的默认 feature 同时启用 `wgpu` 和 `tiny-skia`。官方 `iced_renderer` 在两者同时存在时将默认 `Renderer` 定义为 `fallback::Renderer<iced_wgpu::Renderer, iced_tiny_skia::Renderer>`；这会把两条 renderer 路径和相关依赖放入同一编译图。计划要求 wgpu 作为主构建，tiny-skia 作为独立兼容构建。

## Decision

- 所有 iced 依赖使用 `default-features = false`；
- 主构建启用 `wgpu-bare`，通过同版本直接 `wgpu` 依赖按 target 选择 `metal`、`dx12` 或 `vulkan`；
- 兼容构建只启用 `tiny-skia`，Linux 再选择 `x11` 或 `wayland`；
- 单个发布产物只含一个 renderer。双 renderer fallback 仅可作为未来独立 ADR，必须先测包体、RSS 和切换可靠性；
- Release 关闭 `crisp`、`web-colors`、debug/time-travel/hot/unconditional-rendering。hairline 物理像素策略在 Tessera Theme 侧实现。

建议的 feature 形状：

```text
common = thread-pool + advanced-shaping + advanced
renderer-wgpu = iced/wgpu-bare + direct wgpu backend
renderer-tiny-skia = iced/tiny-skia
```

## Evidence caveat

本机 iced 清单确认了 feature 关系和 renderer alias；renderer feature/分包 spike 与 macOS compile-only 已完成。Windows/Linux 编译、包体、真实窗口启动、截图、idle/wakeup、设备丢失和低配资源结论仍为 `UNVERIFIED/BLOCKED`。macOS 编译成功只关闭编译子项，不关闭 G0 renderer/runtime、截图或低配前置证据。

## Consequences

获得可独立回滚、可比较的 renderer 产物，代价是需要维护 feature 编译矩阵、两套截图哨兵和兼容构建发布流程。运行时环境变量只能做探针，不能替代编译期 backend 约束。

## Verification and exit criteria

G0 必须先补齐 disposable spike harness 上的真实窗口启动、截图、idle/wakeup、资源与目标平台关键证据，才允许进入 G1。G1 随后提交生产 workspace 的 `cargo tree -e features` 和独立 renderer 编译证据；G5 在集成实现与目标硬件上重复验证包体、RSS、Metal/DX12/Vulkan/tiny-skia 启动和设备丢失。任何产物出现另一 renderer 或默认 backend 聚合即阻断。
