# ADR-0009: 系统字体、CJK/IME 与无障碍声明边界

- 状态：Accepted contract; required G0 IME/DPI/accessibility spikes `BLOCKED`
- 日期：2026-08-17
- Owner：platform/accessibility owner
- 关联：[architecture](../architecture.md)、[ADR-0005](0005-platform-scope.md)

## Context

设计规范要求 `zh-CN/en-US`、CJK IME、emoji、死键、DPI 和长文本。iced/winit 0.14 的源码包含 `Ime::Enabled/Preedit/Commit/Disabled`、scale-factor 事件和窗口 preedit 管理，但 iced 0.14 的清单/锁文件没有 AccessKit 依赖或 feature。Web 的 ARIA 文档不能证明 native 读屏能力。

## Decision

- 系统字体优先：macOS SF/PingFang、Windows Segoe UI/微软雅黑、Linux Noto 系列；
- 不预热全量 CJK glyph；缺字必须产生可观测诊断；是否捆绑 Noto CJK 由包体和排版 spike 决定；
- 通过 iced/winit 原生 IME 事件和 text input 状态处理 preedit/commit，禁止自行轮询输入法或读取剪贴板补偿；
- 验证 100/125/150/200% 系统缩放、UI scale 100/125/150%、Retina 和 Per-Monitor DPI；
- 键盘、焦点环、对比度、reduced motion、可读错误文案是所有平台硬门槛；
- 在 AccessKit 或等价平台语义桥实测通过前，不宣称 WCAG 2.2 AA、ARIA 等价、完整 VoiceOver/Narrator/NVDA/Orca 支持；对应平台保持 `BLOCKED` 或开发预览。

## Consequences

系统字体减小包体和平台违和，但排版会随系统变化，需要字体 hash 和平台 golden。无障碍声明更保守，避免把 Web 语义误报为 native 能力。

## Verification and exit criteria

G0 必须在创建生产 workspace 前，用 disposable spike harness 产生可复做的 native 字体、CJK IME preedit/commit、DPI、截图和 AccessKit/等价语义桥证据。当前字体/IME/DPI 为 `UNVERIFIED`，读屏为 `BLOCKED`，因此 G0 不得进入 G1。G2 在组件切片上复验交互，G5 再在目标平台、低配设备和完整流程上复验 VoiceOver、Narrator/NVDA、Orca；后续复验不能替代 G0 前置 spike。
