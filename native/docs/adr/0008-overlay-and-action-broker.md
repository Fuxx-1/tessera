# ADR-0008: 单 Overlay Host、焦点模型与外部动作 broker

- 状态：Accepted at G0
- 日期：2026-08-17
- Owner：interaction/platform owner
- 关联：[architecture](../architecture.md)、[complexity ledger](../complexity-ledger.md)

## Context

Web 端已有 overlay focus-loop、Escape 和 focus return 的实现经验，但 native 没有 DOM Portal。iced 的 overlay 是 widget tree/runtime 的能力，若每个 Modal、Dropdown、Popover 自己管理测量和焦点，会形成多套不可证明的边缘行为。

## Decision

整个应用只有一个 `OverlayHost`，负责：

- anchor 测量、窗口边缘翻转和遮挡排序；
- focus scope、Tab 圈闭、Escape、关闭原因和 focus return token；
- modal scroll lock 等价语义、背景交互屏蔽和 reduced-motion；
- overlay 的 typed descriptor 到 iced `Element` 的映射。

组件只能提交 descriptor 和语义事件，不创建独立 host、portal 或 focus-loop。

`ExternalActionBroker` 是唯一外部动作出口：URL、文件打开、剪贴板写入、拖放路径、系统命令（首发关闭）都先变成 `ExternalAction`，经过用户手势、协议/路径授权和资源限制后才由平台适配执行。组件不得直接启动进程、shell、网络或扩大根目录。

## Consequences

焦点和安全审计集中，组件实现更轻；Host 成为关键基础设施，必须有跨窗口、嵌套 overlay、IME、Esc 和失败恢复测试。

## Verification and exit criteria

W2 需要自动翻转、焦点圈闭/归还、窗口边缘、重复关闭和外部动作拒绝证据。发现第二个生产 OverlayHost 或组件直达 OS 即阻断。当前仅有架构合同，状态 `UNVERIFIED`。
