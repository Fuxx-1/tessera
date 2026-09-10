# ADR-0011: Rust/iced 升级、MSRV、feature 与公共 API 策略

- 状态：Accepted at G0; G1 toolchain/build gate `NOT STARTED` while G0 is blocked
- 日期：2026-08-17
- Owner：架构/release owner
- 关联：[architecture](../architecture.md)、[complexity ledger](../complexity-ledger.md)

## Context

iced 0.14.0 官方清单声明 edition 2024、`rust-version = 1.88`，且默认 feature 会聚合多个 renderer、平台 backend 和 executor。计划要求在 P0 API 稳定前保持 0.x，并锁定 Cargo.lock、精确 iced 版本和 feature。

## Decision

### Toolchain and dependencies

- workspace `edition = "2024"`，package MSRV 固定为 Rust 1.88；CI/developer 的精确 rust-toolchain revision 在 G1 创建 workspace 时写入，当前本机 Rust 1.93.1 仅为候选，不能当作 MSRV 证据；
- `iced = "=0.14.0"`，`default-features = false`；上游锁文件显示 wgpu 解析为 27.0.1，目标 workspace 必须生成并提交自己的 Cargo.lock；
- 默认 executor 只选 `thread-pool`；不得同时启用 tokio/smol；
- 每次 iced/Rust/renderer/重大依赖升级单独 PR，附 changelog、feature tree、性能、视觉、供应链和回滚证据；
- CI 至少运行 fmt、clippy `-D warnings`、单测/属性测试、MSRV、`cargo deny`、`cargo audit`、许可证和重复依赖检查；发布生成 SBOM、校验和和可重现构建信息。

### Public API

- P0 API 和三条流程稳定前保持 `0.x`；1.0 后再遵循 SemVer；
- `tessera-core` 只暴露跨端稳定语义类型、错误和 provider 合同；不暴露 iced `Element`、`Task`、renderer、window handle、testkit 或平台句柄；
- `tessera-iced` 可暴露 typed builder、枚举和 `Message` 映射，但不模拟 React Props 大对象；平台/renderer 细节留在 feature-gated/private 模块；
- 破坏性变更先写迁移文档，弃用至少保留两个 minor；安全例外必须有 ADR；
- Web 与 iced 独立发布版本，token schema 和 fixture 带显式版本号。

## Consequences

精确锁定提高复现性和回滚能力，代价是升级流程更重。公共 API 不承诺跨端签名同构，也不把 iced 的实验性 runtime 细节扩散到 core。

## Verification and exit criteria

只有 G0 pre-workspace spike 全部通过后，G1 才能建立 workspace，并在 Rust 1.88 从零构建三 crate、运行 fmt/clippy、提交 `Cargo.lock`、`cargo tree -e features`、依赖方向和 API 文档检查。当前 G0 `BLOCKED`，因此 G1 机器门禁为 `NOT STARTED`；G1 构建结果不能替代 G0 的 GUI、截图、IME/DPI、AccessKit 和低配证据，也不能替代 G5/G6 集成平台与发布证据。
