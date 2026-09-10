# Tessera Makepad Security Input Contract

状态：`CONTRACT / BLOCKED_RUNTIME_UNVERIFIED`。本文记录 Makepad 安全与输入边界的可执行合同；本轮没有修改生产 crate、Cargo manifest、M0 contract 或 Makepad 运行路径，也不宣称 runtime 安全已通过。

## 写集与依据

- 唯一写集：`native/testkit/makepad-security/**` 与本文。
- 只读依据：`makepad-plan.md` 的安全边界、已发布 `69d94d980e14a20085a0855512e6f127e6204a68:native/docs/makepad-security-report.md`、当前 Web Markdown parser `src/utils/markdown.ts`、历史 native Iced `content.rs` / Markdown / Mermaid viewer、M0 Makepad spike 的 `security.rs` 与 `Cargo.lock`。
- Makepad upstream 依赖边界：M0 历史记录锁定 `makepad-widgets` at `152b11f20a8cf8e81bfd0086210cb9b0269c51e9`；当前发布锁定为其直接后继 `8b5caf41e1de9b93d396bedc379e16f601509503`，只修复 Intel macOS 的 CoreMedia Boolean binding。对 `tessera-gallery` 执行 `cargo tree --locked -p tessera-gallery` 得到的精确实现依赖链为 `makepad-network 1.0.0 -> makepad-script 1.0.0 -> makepad-html 1.0.0`，并另含 `makepad-script-std 1.0.0`、`makepad-svg 1.0.0` 和 `makepad-live-reload-core 1.0.0`。这些只能作为 pinned upstream implementation dependency allowlist 存在；用户、远程文档、插件、剪贴板、拖放、文件和网络字节不得到达这些能力。机械 hard-cut 可通过，但 M1 runtime security 仍为 `NO-GO`，直到显式 allowlist、reviewed call graph 和 runtime negative probes 全部闭环。

## 合同

新增 `native/testkit/makepad-security/policy-v1.json`，冻结 `untrusted input -> bounded parser -> Safe IR -> typed broker` 的边界：

- Markdown/Mermaid 输入只能输出 `markdown_document`、`mermaid_diagram`、`plain_text` 或 `none` Safe IR。
- HTML、DOM、JavaScript、Makepad Live、Makepad Script、`runsplash`、`Splash::set_text`、`ScriptVm`、`eval_with_append_source`、raw SVG、`foreignObject` 和 shader 字段或文本一律阻断。
- 链接先做 HTML entity decode，再做 percent decode、控制字符/空白/反斜杠检查和结构化 URL 解析；只允许 `http`/`https`，拒绝空 host、凭据、相对 URL、protocol-relative URL、`file:`、`data:`、`javascript:`、`blob:`、`vbscript:`、`ftp:`、`mailto:`、`tel:` 等 scheme。
- 资源预算机器可测：Markdown 80,000 bytes，Mermaid 12,000 bytes、8 blocks、260 statements，Safe IR depth 64，SVG 2 MiB/1,200 nodes/50,000 path commands/depth 64，worker RSS 256 MiB，parser deadline 3,500 ms。
- Mermaid edge 只允许 `line` 或受控 `cubic_bezier`，cubic curve 必须有且只能有两个 control points，坐标有限并限制在绝对值 4,096 内；raw path data 被拒绝。
- 取消、超时、generation 过期、UI 线程同步 I/O、broker 外部动作和任何 parser 资源路径穿越都 fail-closed。

## Typed Broker Boundary

外部动作只允许通过 `tessera.makepad.external-action-broker` 的 typed request。当前合同唯一允许 action 为 `open_url`，且目标 URL 必须再次通过同一 URL policy。每个 broker request 必须绑定明确用户手势、目标 audience、一次性 capability、TTL `<= 30,000 ms`、不可预测 nonce 和 replay history；`open_file`、读写文件、进程、shell、动态库、任意网络请求、剪贴板轮询、Live reload 和 remote control 都是禁止动作。

## 可执行交付

目录 `native/testkit/makepad-security/` 包含：

- `policy-v1.json`：冻结的 JSON policy。
- `lib/policy.py`：标准库 Python validator，默认 fail-closed。
- `bin/validate-makepad-security`：CLI，可对单个 fixture 或 fixture 目录验证。
- `fixtures/*.json`：正向安全 Markdown/Mermaid 与负向 HTML/DOM/JS/Live/Script/SVG/shader、entity scheme、资源超限、超时取消、generation 过期、broker 越权、路径穿越 fixture。
- `tests/test_policy.py`：正向、拒绝路径、路径穿越、symlink fixture path 和 deterministic fuzz-like corpus 测试。

命令：

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -B -m unittest discover -s native/testkit/makepad-security/tests -v
PYTHONDONTWRITEBYTECODE=1 python3 -B native/testkit/makepad-security/bin/validate-makepad-security --policy native/testkit/makepad-security/policy-v1.json --fixtures-dir native/testkit/makepad-security/fixtures --check-expectations
```

这些命令只证明合同 validator 与 fixture 逻辑；它们不证明 Makepad runtime 没有把用户字节路由到 Script VM、Live reload、HTML/SVG renderer、网络、文件系统或平台外部动作。

## 当前阻断

- 未把合同接入 `tessera-core` / future `tessera-makepad`，因此生产入口仍未验证。
- 未运行真实 GUI、AX、IME、mobile、DPI、performance sidecar、syscall/network/file probe、fuzz harness 或 soak。
- 未关闭已发布安全报告中的 `B-01`/`B-02`/`B-03`；本轮只是提供后续 owner 可接入和复测的可执行前置合同。

## Static Allowlist Audit

`policy-v1.json` carries `tessera.makepad.static-source-allowlist/v1`, and `validate-makepad-security --source-root .` enforces it. The audited production matches are `native/crates/tessera-gallery/src/app.rs` (`script_mod!`, one compile-time App UI registration, and `ScriptVm` in the registration hook plus its theme helper), `native/crates/tessera-gallery/src/component_catalog.rs` and `component_detail.rs` (one compile-time host registration each), `native/crates/tessera-gallery/src/main.rs` (`app_main!(App)`, one sole production application entry), `native/crates/tessera-makepad/src/components/shell.rs` (one reusable shell registration), and the 61 concrete modules under `native/crates/tessera-makepad/src/components/surfaces/` (one registration each). The validator strips Rust string literals and comments for symbol counts, supports exact paths and explicit path globs, scans the production code set for forbidden process-creation/filesystem/network calls, and separately applies `negative_literal_allowlist` to explicit rejection literals.

`javascript:` is allowed only as the explicit reject-scheme literal in `tessera-makepad/src/security.rs` and in the declared security negative corpus. It is absent from Gallery startup input, parser allow values, and broker requests. `eval_with_append_source`, `runsplash`, `Splash::set_text`, WebView/HTML/SVG renderer calls, Iced symbols, `run_pending`, and unbrokered network/process/filesystem calls remain forbidden in production source.

This gate proves path-scoped static placement and negative-contract behavior only; it does not prove runtime reachability. Runtime security remains `NO-GO` until trusted runtime probes and an attested call graph prove untrusted bytes cannot reach the allowed registration hooks or the pinned upstream `makepad-network -> makepad-script -> makepad-html` / `makepad-script-std` closure.
