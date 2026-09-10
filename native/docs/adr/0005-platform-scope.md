# ADR-0005: macOS/Windows GA 目标、Linux X11 Beta、Wayland Preview

- 状态：Accepted target tiers; required G0 platform/low-end spikes `BLOCKED`
- 日期：2026-08-17
- Owner：platform owner
- 关联：[architecture](../architecture.md)、[ADR-0009](0009-font-ime-accessibility.md)

## Context

总体计划要求 macOS ARM64 与 Windows x64 首发、Linux X11 Beta、Wayland Preview。iced/winit 0.14 提供窗口、IME、scale factor、X11/Wayland feature，但当前没有本机跨平台硬件验证，且 iced 0.14 没有 AccessKit 集成。

## Decision

冻结以下目标等级：

| 平台 | 目标 | 晋级前必须证明 |
|---|---|---|
| macOS 14+ ARM64 | GA | Metal、Retina、CJK IME、拖放、键盘、VoiceOver/等价语义桥、低配预算 |
| Windows 11 x64 | GA | DX12、Per-Monitor DPI v2、TSF IME、拖放、Narrator/NVDA、低配预算 |
| Ubuntu 22.04+ X11 x64 | Beta | Vulkan、IBus/Fcitx、Orca、剪贴板、字体和兼容构建 |
| Wayland | Preview | 分数缩放、IME 候选窗、MIME 拖放和 renderer 证据 |
| iOS/Android/WASM | 本期不做 | 另立产品和技术 spike |

“GA”在这里是产品目标，不是当前发布声明。任一关键能力无证据时，平台必须保持 Preview/开发预览或从发布矩阵移除；不得用 Web 浏览器证据替代 native 证据。当前承诺未缩小，因此 M1 8 GiB、Windows 低配、截图、idle/wakeup、IME/DPI 与 AccessKit/读屏缺口直接阻断 G0 进入 G1；不能延期到 G5。

## Consequences

测试矩阵和发布成本集中在桌面平台，移动/WASM 不会稀释 G0 资源。由于目标平台的 G0 spike 与读屏桥尚未完成，当前既不能进入 G1，也不能宣称 macOS/Windows GA 可发布。

## Verification and rollback

平台等级由证据驱动，可单独回退某个平台产物，不回退 core 语义。每个平台要记录 OS、架构、renderer/driver、DPI、字体 hash、fixture、命令和结论。当前 macOS renderer compile-only 已完成；真实 GUI、M1/Windows 低配与跨平台硬件结果为 `UNVERIFIED/BLOCKED`，读屏为 `BLOCKED`。G5 必须在集成实现上复验，不能补交 G0 前置证据。
