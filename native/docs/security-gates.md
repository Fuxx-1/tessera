# Tessera Iced 安全门禁

> 文档状态：G0 白帽门禁收口稿（source identity 已解析；native 证据阻断）<br>
> 审查日期：2026-08-17（Asia/Shanghai）<br>
> 目标相对路径：`native/docs/security-gates.md`<br>
> 关联模型：`native/docs/threat-model.md`<br>
> 当前裁决：**G0 阻断；下游门禁未执行；无 native 漏洞发现**

## 1. 当前裁决

Tessera source baseline 已建立为 clean Git revision `b9c797d8dcd8ed044bd6a4f5bc479bfe52296810`，tracked-file manifest SHA-256 为 `b4dfd2064e8d30cd24f72f1347ece2ef525c5f0673796035cb4415f1ae866c0a`，共 `487` 个 tracked files。冻结源的历史内容不包含 `native/docs/baseline-run.md`；按 G0 mechanical integration runbook，最终 integration overlay 必须引入该路径，并由 manifest、sidecar digest 与文件校验建立基线运行记录。该文件的存在与校验通过只证明 Web/design source identity 及可复做合同，不证明 native implementation、平台、低配、GUI/IME/DPI、读屏、renderer、供应链、签名、安装或发布门禁。source tree 的 `native/` 下仍只有 baseline 文档/脚本，没有 Cargo 清单、`rust-toolchain.toml`、`build.rs`、可执行 native spike 或 native implementation revision。因此本文件仍是 native 交付门禁，不是对不存在程序的安全认证。

| 门禁 | 当前状态 | 裁决 |
|---|---|---|
| G0 基线与 spike | `BLOCKED` | `SG-G0-01 / G0-B01 / SEC-B0(source identity)` 已 `RESOLVED`；`SG-G0-02`、`SG-G0-03` 因无 native harness/toolchain/platform/低配证据继续阻断 |
| G1 Foundation | `NOT RUN` | 依赖 G0；不得以设计文档代替实现证据 |
| G2 原子垂直切片 | `NOT RUN` | 依赖 G1；P0 交互和授权路径不存在 |
| G3 数据与缓存 | `NOT RUN / UNVERIFIED` | 依赖 G2；cache 资源上限、原子恢复和 fuzz 未执行 |
| G4 图表与业务 | `NOT RUN / UNVERIFIED` | 依赖 G3；没有真实 renderer/GUI/GPU/device-loss 证据 |
| G5 平台与安全 | `NOT RUN / UNVERIFIED` | 依赖 G4；没有真实平台、IME、AccessKit/读屏、供应链或 fuzz 证据 |
| G6 RC/发布 | `BLOCKED / UNVERIFIED` | 任一前置门禁未通过都禁止发布；没有同一 native RC revision 的 24h soak 或回滚证据 |

“`BLOCKED`”是交付门禁状态，不是漏洞严重性。“`NOT RUN`”表示前置对象或执行条件不存在。“`UNVERIFIED`”用于显式标注没有真实设备、GUI、读屏、低配、供应链、cache 故障或 soak 证据；它不能被 source baseline 消除。

### 1.1 稳定门禁 ID 统计

统计口径以 §3.1 的 15 个稳定 ID 为准，`UNVERIFIED` 是证据限定词，不单独重复计数：

| 主状态 | 数量 | ID |
|---|---:|---|
| `RESOLVED` | 1 | `SG-G0-01` |
| `BLOCKED` | 3 | `SG-G0-02`、`SG-G0-03`、`SG-G6-01` |
| `NOT RUN` | 11 | `SG-G0-04`、全部 G1-G5 稳定 ID |
| **合计** | **15** | 无重复、无遗漏 |

其中 `SG-G0-03`、`SG-G4-01`、`SG-G5-01`、`SG-G5-02` 和 `SG-G6-01` 因缺少真实设备/GUI/读屏/供应链/24h soak 证据明确为 `UNVERIFIED`；`SG-G3-02` 的 cache 故障与恢复证据同样 `UNVERIFIED`。

## 2. 门禁语义与停止规则

### 2.1 结果标签

- `PASS`：固定 revision 下证据完整、可复做且通过阈值。
- `RESOLVED`：一个有明确范围的既有阻断已经由可复核证据关闭；不代表父门禁或其他子项通过。
- `BLOCKED`：缺少必要对象/证据，或出现直接影响安全、数据完整性、资源可用性、合规或发布的失败。
- `RISK-POOL`：当前不阻断，但有 owner、最小后续动作、截止门禁和公开限制。
- `NOT RUN`：前置条件未满足，不能推断通过或失败。
- `UNVERIFIED`：没有与目标对象和环境匹配的实测证据；作为 `BLOCKED` 或 `NOT RUN` 的限定词使用。
- `SEC-U01`：预期控制尚未实现/不可验证；不是漏洞，到达对应门禁仍缺证据时才转换为 `SEC-B*` 阻断。

### 2.2 通用阻断代码

| 代码 | 含义 | 典型例子 |
|---|---|---|
| `SEC-B0` | 身份/基线/证据不可定位 | 无 source/native revision、无归档/manifest、命令和环境不全 |
| `SEC-B1` | 不可信数据越过边界 | raw bytes/HTML/SVG/脚本/命令字符串进入主进程或 renderer |
| `SEC-B2` | 资源无界或热路径阻塞 | 无界队列、同步 I/O、解码炸弹、GPU 超预算 |
| `SEC-B3` | 能力/外部动作越权 | 无用户手势、路径越根、shell 或任意协议 |
| `SEC-B4` | 敏感数据留存或泄露 | 原文、令牌、绝对路径进入 cache/log/crash report |
| `SEC-B5` | 供应链不可审计 | 未锁版本、未审 build.rs/native/unsafe、构建期下载 |
| `SEC-B6` | 失败不可恢复 | worker 崩溃拖垮主进程、损坏 cache 覆盖有效对象、设备丢失无降级 |

`SEC-B0` 是可按对象分域复用的阻断代码：其 source identity 实例 `G0-B01` 已 `RESOLVED`；native spike identity/evidence 实例 `G0-B02` 仍 `BLOCKED`。不得因同一代码的一处关闭而宣称其他对象已通过。

### 2.3 复测与收口

- 每个阻断只做一次针对性复测；仍失败则 handback 实现 owner，不扩大当前写集。
- 只有攻击面或控制合同改变时才登记新的安全预算。
- 冻结范围覆盖、阻断复核完毕、无新的同级证据且风险池已登记后收口；不追求“零未知”。
- 任何例外必须有风险承担人、补偿控制、失效日期和复核门禁；例外不改变原始门禁。

## 3. G0-G6 门禁总表

| 门禁 | 必须交付 | 最低证据 | 直接阻断条件 | owner/复核 |
|---|---|---|---|---|
| **G0 基线与 spike** | source revision/manifest；独立 native spike revision；Rust/MSRV；精确 iced/renderer/features；平台、字体、IME、DPI、AccessKit、截图和低配基准；本威胁模型 | Git revision/manifest/file count/clean check、`native/docs/environment.md` 与 bootstrap validation；`cargo metadata --locked`；空窗口 profile；平台探针与记录 | native spike identity/对象不可定位；任一目标平台关键能力无证据；空窗口启动/CPU/RSS 失败；`SEC-B0` | 架构 owner + 白帽；Sol 终审 |
| **G1 Foundation** | 三 crate 边界；`forbid(unsafe_code)`；token 单一真源；单 Overlay Host；任务/取消/generation；Broker/Worker/Action API；无同步 I/O | 接口/ADR；静态扫描；状态机/属性测试；热路径 trace | token 双写；组件直达 OS；raw 输入/命令进入主进程；静态持续 redraw；同步 I/O；`SEC-B1/B2/B3` | 研发 owner；白帽复核 |
| **G2 原子垂直切片** | 三条 P0 流程的 typed state/message/effect；键盘、焦点、IME、错误恢复；授权动作和重复/乱序语义 | `E2E-MIN-WF1`、`E2E-MIN-WF2`、`E2E-MIN-WF3` 的交互与安全 trace；generation/幂等测试；完整 `E2E-P0-01..24` 固定在 G3 首验、G6 复核 | 未授权动作；过期结果覆盖新状态；错误路径泄露或无法恢复；`SEC-B3/B6` | 研发/测试；白帽抽查 |
| **G3 数据与缓存** | VirtualList/DataGrid/Tree 的有界 provider；SSD cache v1、配额、原子写、损坏恢复；输入 parser/worker；fuzz | 资源 profile；磁盘/权限/截断/旧 schema 注入；fuzz seed/corpus；cache 重建证据 | 热路径 `O(N)` 或同步 I/O；无界任务/cache；超限未拒绝；损坏破坏有效 cache；`SEC-B2/B4/B6` | 数据/缓存 owner；白帽复测 |
| **G4 图表与业务** | Canvas/路径缓存、采样、命中测试；GPU 预算和 device-loss 恢复；Safe IR | 低配帧/RSS/GPU profile；device-loss trace；视觉/数值 golden | 超限无降级；GPU 超过硬限；renderer 设备丢失导致数据错乱；`SEC-B2/B6` | renderer owner；白帽复核 |
| **G5 平台与安全** | macOS/Windows GA、Linux X11 Beta/Wayland Preview 证据；无障碍 spike；依赖/build.rs/unsafe/许可证/fuzz/SBOM/签名 | 三平台 sentinel；VoiceOver/Narrator/NVDA/Orca；`cargo deny/audit`；SBOM/签名；fuzz 报告 | Must-fix 未闭环；GA 平台核心读屏/IME/拖放失败；未审 native/build 下载；`SEC-B1/B3/B5` | 白帽 + 平台 owner；Sol 终审 |
| **G6 RC/发布** | 全量 P0 文档/证据；24h soak；安装/升级/卸载；回滚演练；发布包和 SBOM | RC runbook；观察窗口指标；回滚日志；产物 hash | 任一 P0/P1、证据缺失、预算回退或回滚不可执行；任一前置 `BLOCKED` | 规划者发布裁决 |

门禁顺序固定为 `G0 -> G1 -> G2 -> G3 -> G4 -> G5 -> G6`。W5 高风险能力可在 G3 后做独立 spike，但未通过 G3/G5 前不得进入公开 API。

### 3.1 稳定门禁 ID

| ID | 到期门禁 | 可判定要求 | 缺失时 | 当前状态 |
|---|---|---|---|---|
| `SG-G0-01` | G0 | Web/design source revision、tracked-file manifest、file count、clean 状态和可复做 validation contract | `SEC-B0` | `RESOLVED`；仅 source identity |
| `SG-G0-02` | G0 | 独立 native spike revision/harness、Rust/MSRV、精确 iced、renderer/feature 和 lockfile 基线 | `SEC-B0/B5` | `BLOCKED / UNVERIFIED` |
| `SG-G0-03` | G0 | 平台/IME/DPI/AccessKit/截图/低配资源 spike | `SEC-B0/B2/B6` | `BLOCKED / UNVERIFIED` |
| `SG-G0-04` | G0 | TB-01..TB-09、RES-*、测试计划和 owner 冻结 | `SEC-B0` | `NOT RUN`；未完成独立签署 |
| `SG-G1-01` | G1 | 三 crate 边界、主进程无同步 I/O/原始内容/直接 OS 调用 | `SEC-B1/B2/B3` | `NOT RUN / UNVERIFIED` |
| `SG-G1-02` | G1 | Capability Broker/External Action API 默认拒绝、手势和重放控制 | `SEC-B3` | `NOT RUN / UNVERIFIED` |
| `SG-G1-03` | G1 | Worker/Safe IR/task 取消、deadline、generation 和错误合同 | `SEC-B1/B2/B6` | `NOT RUN / UNVERIFIED` |
| `SG-G2-01` | G2 | 三条 P0 流程的授权、乱序、幂等和恢复证据 | `SEC-B3/B6` | `NOT RUN / UNVERIFIED` |
| `SG-G3-01` | G3 | `RES-IMG-01`、`RES-SVG-01`、`RES-MERMAID-01`、`RES-CLIP-01`、`RES-DROP-01`、`RES-URL-01` 与 worker fuzz/故障证据 | `SEC-B1/B2/B6` | `NOT RUN / UNVERIFIED` |
| `SG-G3-02` | G3 | SSD cache 配额、原子发布、隐私和损坏恢复 | `SEC-B2/B4/B6` | `NOT RUN / UNVERIFIED` |
| `SG-G4-01` | G4 | GPU 96/160 MiB、device-loss 和独立 renderer 恢复 | `SEC-B2/B6` | `NOT RUN / UNVERIFIED` |
| `SG-G5-01` | G5 | 目标平台、读屏、IME 和拖放声明边界 | `SEC-B0/B3/B6` | `NOT RUN / UNVERIFIED` |
| `SG-G5-02` | G5 | build.rs/native/unsafe/下载审查、deny/audit/SBOM/签名 | `SEC-B5` | `NOT RUN / UNVERIFIED` |
| `SG-G5-03` | G5 | 高风险 parser fuzz、沙箱与默认关闭能力 | `SEC-B1/B2/B3` | `NOT RUN / UNVERIFIED` |
| `SG-G6-01` | G6 | 同一 native RC revision、24h soak、回滚、产物 hash 和观察窗口 | `SEC-B0/B6` | `BLOCKED / UNVERIFIED` |

## 4. 门禁执行细则

### 4.1 G0：基线与 spike

适用 ID：`SG-G0-01`、`SG-G0-02`、`SG-G0-03`、`SG-G0-04`。

**必须先有的对象**：

1. 可唯一定位的 Web/design source revision、tracked-file manifest 和 clean 状态。该项已由 Git revision/manifest/file count/clean check、`native/docs/environment.md`、`native/scripts/bootstrap-baseline.sh` 解析为 `RESOLVED`；冻结源历史内容不包含 `native/docs/baseline-run.md`，而 G0 final integration overlay 必须引入该路径并完成 manifest、sidecar digest 与文件校验。该记录的存在与校验通过只证明 Web/design source identity 及可复做合同，不证明 native implementation、平台、低配、GUI/IME/DPI、读屏、renderer、供应链、签名、安装或发布门禁。
2. 可复做的 native spike harness/构建清单及其独立 native revision；当前缺失并触发 `G0-B02 / SEC-B0`。最小三 crate production workspace 属于 G1，不提前把 spike 结构固化成生产架构。
3. `rust-toolchain.toml`、MSRV 1.88 候选、精确 `iced = 0.14.0` spike 结果、renderer feature 矩阵和 Cargo.lock。
4. macOS ARM64、Windows x64、Linux X11/Wayland 的窗口/renderer/IME/DPI/AccessKit 探针；移动端/WASM 不得借用桌面结论。
5. 空窗口冷/热启动、空闲 CPU/RSS、软件 renderer 截图和低配基准。

**G0 安全检查**：

- 清点第一方 `unsafe`、FFI、native library、`build.rs`、下载脚本和运行时动态库；每项都有 owner、ADR 和源码定位。
- 验证 release feature 不携带未选择 renderer、debug/time-travel、永久动画或开发 tracing。
- 对 G0 已实现的 spike 验证热路径无同步磁盘/网络 I/O、解码、SVG 解析或全量排序；其余生产控制只冻结合同并标 `NOT RUN`。
- 提交本模型中的 TB-01..TB-09 边界表和 RES-* 资源合同。

**G0 直接阻断**：source identity 已不再阻断；其余任一必需 native 对象缺失、不可从干净环境复做，或只有“计划/截图/口头说明”而无独立 native revision 绑定证据，仍直接阻断 G0。

### 4.2 G1：Foundation 与能力边界

适用 ID：`SG-G1-01`、`SG-G1-02`、`SG-G1-03`。

- 主进程只接收 typed `Message`、Safe IR 和受控句柄；组件不得直接使用 OS、文件、网络、剪贴板、拖放或进程 API。
- Broker API 明确 capability 类型、scope、audience、过期、次数、用户手势/动作 ID；默认拒绝，拒绝不泄露敏感路径。
- Worker API 明确 input schema、最大字节、deadline、取消、generation、输出 schema 和错误类型；高风险解析器不能只靠线程隔离冒充安全沙箱。
- 外部动作首发只允许用户手势触发的 `http/https` URL/必要文件动作；命令执行关闭，不接受 shell 或字符串拼接。
- 自有 crate 默认 `#![forbid(unsafe_code)]`；任何例外必须独立模块、ADR、测试和白帽复核。
- 单一 Overlay Host、单一异步执行体系、单一 cache 实现和单一 token 生成链路；不得增加等价状态真源。

**G1 证据**：接口/状态图、静态扫描结果、热路径 trace、拒绝路径单测、capability token 重放测试、`cargo clippy -D warnings` 输出。

### 4.3 G2：原子垂直切片

适用 ID：`SG-G2-01`。

对三条 P0 流程逐条记录正向、异常、权限和状态边界：

1. 数据检索 -> 筛选 -> DataGrid -> 详情 -> 单项/批量操作。
2. 表单编辑 -> 校验 -> 异步提交 -> 错误恢复 -> 成功反馈。
3. `Cmd/Ctrl+K` -> 命令检索 -> 键盘选择 -> 执行 -> 焦点归还。

安全相关必须额外证明：

- action 必须绑定最新用户手势和一次性 id；重复点击、取消、超时和重试幂等。
- provider/worker 结果携带 generation；乱序和过期结果不会覆盖选择、筛选或授权状态。
- 拒绝/失败反馈不回显未经脱敏的绝对路径、令牌或原始恶意内容。
- disabled/read-only/loading/empty/error 状态不会绕过 Broker 或焦点圈闭。

### 4.4 G3：数据、输入与 SSD 缓存

适用 ID：`SG-G3-01`、`SG-G3-02`。

**输入上限必须机器可测**：

| ID | 合同 | 必须验证 |
|---|---|---|
| `RES-IMG-01` | 图片输入 `<= 32 MiB`、`<= 16 MP`、单边 `<= 8192`、解码后 `<= 64 MiB` | 边界值、压缩炸弹、超时/取消、worker 重启 |
| `RES-SVG-01` | SVG `<= 2 MiB`、节点 `<= 1,200`、路径指令 `<= 50,000`、嵌套 `<= 64`；禁脚本/事件/动画/`foreignObject`/外部引用/嵌入图/高成本 filter | parser fuzz、外部引用和恶意 CSS corpus、Safe IR schema 拒绝 |
| `RES-MERMAID-01` | Mermaid 最多 8 block；每 block `<= 12,000` 字符；`<= 260` statements；未来 worker `<= 256 MiB`、单次 `<= 3.5 s`、并发 1 | 超限拒绝、超时、沙箱/辅助进程隔离；Markdown/Mermaid 首发不进 P0 |
| `RES-CLIP-01` | 剪贴板文本 `<= 1 MiB`，仅用户手势读取，禁止轮询 | 无手势、轮询、边界长度和清空测试 |
| `RES-DROP-01` | 拖放最多 32 项、总声明大小 `<= 128 MiB`；目录不递归、不跟随符号链接 | 恶意路径、符号链接替换、目录和超限 corpus |
| `RES-URL-01` | URL `<= 8 KiB`，首发仅 `http/https`；命令关闭 | 协议混淆、控制字符、重放和用户手势测试 |

**缓存合同**：

- 目录布局固定为 `cache/v1/index.sqlite3`、内容寻址 `objects/`、受控 `derived/` 和 `tmp/`；对象名只能是固定长度 hash。
- 默认 512 MiB，可配 128 MiB..2 GiB；probation/protected 为 25%/75%；90% 开始回收，75% 停止；可用空间低于 5 GiB 或磁盘 10% 禁止增长。
- 内存索引硬限 8 MiB；启动不遍历整个目录；每 30 秒或 256 次命中批量落库。
- `RES-CACHE-OBJ-01`：文本布局 `<= 16 MiB / 8,000` 项且不落盘；解码图片 48/64 MiB 软/硬限，只落原始编码和受控缩略图；SVG 16/24 MiB 软/硬限，只落已验证源和派生位图；数据窗口 16/32 MiB 软/硬限，只可选保存可再生页。
- 写入顺序为同目录临时文件 -> 校验 -> `fdatasync` -> 原子 rename -> 目录同步 -> SQLite WAL 事务发布。
- 缺失、损坏、旧 schema、权限拒绝、磁盘满和短写都按 miss/错误处理，旧有效对象不得被破坏；敏感原文、令牌、剪贴板、GPU 纹理和 iced/wgpu 布局默认不落盘。

**任务/cache 资源 ID**：`RES-WORKER-01`（阻塞 I/O/CPU worker 默认 2/2，CPU 上限 4）、`RES-DECODE-01`（图片解码和 SVG 派生各并发 2）、`RES-DISK-01`（读 4/写 1）、`RES-CACHE-01`（默认 512 MiB、可配 128 MiB..2 GiB）、`RES-CACHE-IDX-01`（8 MiB）、`RES-CACHE-OBJ-01`（逐类对象内存/落盘合同）、`RES-UIIO-01`（同步 I/O 0 次/0 字节）、`RES-IOLAT-01`（注入 100 ms 时 UI 调度 p95 `<= 2 ms`）。

**G3 直接阻断**：任何输入超限仍进入解析/renderer、cache 写入可部分发布、热路径等待磁盘、队列/worker 无界，或损坏注入后状态真源不可恢复。

### 4.5 G4：GPU 与 renderer

适用 ID：`SG-G4-01`。

- `RES-GPU-01`：GPU 管理资源软限 96 MiB、硬限 160 MiB；纹理/图集只在当前 renderer 生命周期驻留，不能通过 SSD 持久化。
- 每次纹理、路径、图表采样和 Canvas 几何提交都计量；超限依次暂停装饰动画、降帧、减少 overscan/采样、关闭 blur/大阴影，不能降低文字/焦点/错误语义。
- 注入 device lost、驱动错误、上下文重建和 tiny-skia fallback；验证不会重复提交过期 Safe IR 或越权读取输入。
- wgpu 主构建与 tiny-skia 兼容构建分包；不得由 Cargo default features 意外携带两个 renderer。

### 4.6 G5：平台、供应链与高风险能力

适用 ID：`SG-G5-01`、`SG-G5-02`、`SG-G5-03`。

- macOS 14+ ARM64、Windows 11 x64 为 GA；Ubuntu X11 为 Beta；Wayland 只有分数缩放、IME 候选窗和 MIME 拖放全通过才升级。读屏树无法覆盖核心控件时，阻断对应 GA 平台或降级预览。
- `Cargo.lock`、精确 iced/features、Rust/MSRV 固定；每次升级独立 PR，附 changelog、性能和视觉证据。
- 对新增 `build.rs`、native library、FFI、`unsafe` 或网络下载依赖执行人工审查；CI 运行 format、clippy、测试、MSRV、`cargo deny`、`cargo audit`、许可证和重复依赖检查。
- 发布生成 SBOM、依赖清单、许可证归档、签名/校验和、可重现构建信息；fuzz 覆盖 SVG、图片元数据、缓存索引、拖放路径和 Markdown/Mermaid 边界。
- 首发关闭远程资源、用户字体、目录递归导入和运行时 `.dylib/.so/.dll` 插件；插件另立威胁模型，不能以“以后再限制”通过。

### 4.7 G6：RC 与发布

适用 ID：`SG-G6-01`。

- 全量 P0 文档和证据与同一 revision 绑定；所有 P0/P1 已知缺陷关闭。
- release/strip 产物完成低配性能、24 小时 soak、安装/升级/卸载和回滚演练；观察窗口、阈值、告警 owner、止损开关预先登记。
- 回滚单位是 crate/组件波次和 renderer 产物；token/cache schema 升级可向前忽略或删除重建，不读取未知新 schema。
- 任一前置门禁 `BLOCKED`、证据缺失、预算回退或回滚不可执行，G6 继续阻断。

## 5. 计划追溯矩阵

| 门禁 ID | `iced-plan.md` 追溯 | 模型边界/资源 ID | 证据类型 |
|---|---|---|---|
| `SG-G0-01` | §2、§13 G0、§19 | source identity | Git revision/manifest/file count/clean check、`native/docs/environment.md`、`native/scripts/bootstrap-baseline.sh`；G0 final integration overlay 必须引入并校验 `native/docs/baseline-run.md`。该记录只证明 Web/design source identity 与可复做合同，不证明 native implementation、平台、低配、GUI/IME/DPI、读屏、renderer、供应链、签名、安装或发布门禁 |
| `SG-G0-02`..`SG-G0-04` | §5.5、§7、§10、§13 G0、§16 ADR、§19 | TB-01..TB-09、全部 RES-* 合同 | 独立 native revision、Cargo/toolchain/feature、spike profile、合同/owner |
| `SG-G1-01` | §5.1-5.3、§13 G1、§16.2 | TB-01、T-08/T-10、`RES-UIIO-01`、`RES-IOLAT-01` | Rust 单测、热路径 trace、乱序属性测试 |
| `SG-G1-02` | §5.3、ADR 清单第 8 项 | TB-02/TB-06、T-01/T-06、`RES-URL-01` | API/拒绝路径/用户手势 e2e |
| `SG-G1-03` | §5.3、§8.4、§11.1 | TB-03/TB-05、`RES-WORKER-01`、`RES-DECODE-01` | Safe IR schema、取消/超时/崩溃注入 |
| `SG-G2-01` | §4.1、§5.3、§12.2、§13 G2 | T-10、TB-01/TB-02 | G2 三条 `E2E-MIN-*` 的安全 trace；完整 `E2E-P0-01..24` 在 G3 首验、G6 复核 |
| `SG-G3-01` | §11.1、§9 W5 | TB-03/TB-05、T-02/T-05、`RES-IMG-01`、`RES-SVG-01`、`RES-MERMAID-01`、`RES-CLIP-01`、`RES-DROP-01` | corpus、fuzz、超时/崩溃注入 |
| `SG-G3-02` | §8.1-8.4、ADR 第 6 项 | TB-04、T-07/T-13、`RES-DISK-01`、`RES-CACHE-01`、`RES-CACHE-IDX-01`、`RES-CACHE-OBJ-01` | 磁盘故障注入、WAL/重建日志、对象资源 profile |
| `SG-G4-01` | §5.5、§7.2、§14 | TB-07、T-09、`RES-GPU-01` | device-loss、GPU/RSS/frame profile |
| `SG-G5-01` | §10、§13 G5/G6 | TB-01/TB-06 | 三平台 sentinel、读屏/IME/拖放人工验收 |
| `SG-G5-02` | §11.2、§14、§16.1 ADR 11 | TB-08、T-12 | lockfile、deny/audit、SBOM、签名 |
| `SG-G5-03` | §9 W5、§11.1-11.2、§12 | TB-03/TB-05、T-02/T-04/T-05 | parser fuzz、沙箱和默认关闭证明 |
| `SG-G6-01` | §13 G6、§14、§18 | 全部已到期 TB/RES | RC 证据、24h soak、回滚日志、产物 hash |
| 全部门禁 | §12.3 | 全部 TB/RES | `test_id` 至 `结论` 完整记录 |

## 6. 推荐执行命令（native 建立后才可运行）

以下是门禁命令模板，不代表本轮已执行；命令输出必须保存到 revision 绑定的证据目录：

```bash
cargo metadata --locked --format-version 1
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked --no-default-features --features <audited-feature-set> -- -D warnings
cargo test --workspace --locked --no-default-features --features <audited-feature-set>
cargo deny check
cargo audit
```

`<audited-feature-set>` 必须由 feature 矩阵逐项替换；`wgpu` 与 `tiny-skia` 分别运行，禁止用 `--all-features` 合并两个发布 renderer。

专项命令由实现 owner 固定：

- parser/cache/path fuzz：固定 corpus、seed、超时和内存上限，输出 crash-free/拒绝计数与 artifact hash。
- 低配 profile：release、strip、固定分辨率/缩放，至少 5 次舍弃首轮；记录 CPU/RSS/GPU、帧时间、启动、8 小时增长。
- 故障注入：100 ms 磁盘延迟、磁盘满、权限拒绝、截断/乱码/旧 schema、worker kill/OOM、device lost、网络/URL 拒绝。
- 平台 sentinel：Metal、DX12、Linux X11/Wayland renderer，CJK IME、DPI、剪贴板、拖放、VoiceOver/Narrator/NVDA/Orca。

## 7. 证据记录格式

每条证据必须包含：

`test_id、组件/能力、source_revision、native_revision、rustc/iced 版本、feature、OS/架构、renderer/driver、DPI、theme、字体 hash、fixture hash、seed、命令、指标、截图/热图/trace/profile、结论`

`source_revision` 与 `native_revision` 必须分列；当前 `native_revision` 为空，严禁用 `b9c797...` 代填。缺少任一适用字段时只能标 `NOT RUN` 或 `BLOCKED`，不得写 `PASS`。安全报告还应记录：输入 hash/大小、capability scope、用户手势/动作 id、worker generation、cache schema/key（脱敏）、错误码和清理结果。

## 8. 本轮已执行的只读检查

| 检查 | 结果 | 说明 |
|---|---|---|
| 读取 `soul/skill.md`、`Data/team/SKILL.md`、`feature-mode.md`、`iced-plan.md` | 完成 | 按功能模式和白帽有界审查规则执行 |
| 读取 source baseline 证据 | 完成 | Git revision/manifest/file count/clean check、`native/docs/environment.md`、`native/scripts/bootstrap-baseline.sh` 已核对；冻结源历史内容不包含 `native/docs/baseline-run.md`，G0 final integration overlay 必须引入并校验该记录；其存在与校验通过只覆盖 Web/design source identity 与可复做合同，不覆盖 native implementation、平台、低配、GUI/IME/DPI、读屏、renderer、供应链、签名、安装或发布门禁 |
| validation-only bootstrap 复做 | `RESOLVED` | 对真实 source 运行脚本返回 `verified-existing-git`，revision `b9c797...`、manifest `b4dfd2...`、487 files |
| source clean 状态与 manifest 独立核验 | `RESOLVED` | `git status --porcelain` 为空；`git ls-files -s -z \| shasum -a 256` 与记录一致 |
| 第一方 native/Cargo/build.rs 清点 | `BLOCKED` | `native/` 仅有 baseline 文档/脚本；无 Cargo、toolchain、build.rs、harness 或 native revision |
| native runtime、renderer/GPU、cache、供应链与 fuzz | `NOT RUN / UNVERIFIED` | 当前无 native 对象；不得虚构结果 |
| 真实设备/GUI、IME、AccessKit/读屏、低配、24h soak | `BLOCKED / UNVERIFIED` | 未执行；不得从 M4 开发机、Web 验收或 source baseline 外推 |
| 文档 ID、统计与引用自检 | `PASS` | 15 个稳定 SG ID = 1 `RESOLVED` + 3 `BLOCKED` + 11 `NOT RUN`；TB-01..09、T-01..13 无缺号；冻结源历史边界与 G0 final integration overlay 对 `baseline-run.md` 的引入、校验和证据范围已标明；旧基线阻断表述无残留 |

## 9. 交付与 handback

当前交付状态：

- source baseline record：`G0-B01 / SG-G0-01 / SEC-B0(source identity)` 已 `RESOLVED`；证据固定引用 Git revision/manifest/file count/clean check、`native/docs/environment.md`、`native/scripts/bootstrap-baseline.sh`；冻结源历史内容不包含 `native/docs/baseline-run.md`，G0 final integration overlay 必须引入并校验该记录。其存在与校验通过只证明 Web/design source identity 与可复做合同，不证明 native implementation、平台、低配、GUI/IME/DPI、读屏、renderer、供应链、签名、安装或发布门禁。
- 架构/native spike owner：接收 `G0-B02 / SG-G0-02 / SEC-B0(native spike evidence)`，建立可复做 harness、独立 native revision、Rust/MSRV、Cargo.lock 和 iced/renderer feature 矩阵。
- platform/accessibility owner：接收 `SG-G0-03` 与 `SG-G5-01`，在真实目标设备完成 GUI、renderer、DPI、CJK IME、AccessKit 和 VoiceOver/Narrator/NVDA/Orca；当前 `BLOCKED / UNVERIFIED`。
- cache/supply-chain owner：在 G3/G5 提交 cache 故障恢复、fuzz、build.rs/native/unsafe/download 审查、deny/audit、SBOM 和签名；当前 `NOT RUN / UNVERIFIED`。
- release owner：`SG-G6-01` 保持 `BLOCKED / UNVERIFIED`，直到同一 native RC revision 的 24h soak、安装/升级/卸载、回滚和观察窗口证据齐全。
- `SEC-U01`：当前 native runtime 控制统一为 `NOT RUN`，不是漏洞；白帽 owner 不修改源项目、不创建 native 代码，只在对象、revision、构建产物和证据目录可定位后做一次针对性复核。

完成 G0 后，按本文件顺序逐门禁推进；任何门禁失败只修复对应 owner 的控制并做一次针对性复测。未满足 G5/G6 前，不得发布 GA、不得宣称 WCAG/平台安全等价，也不得把 Web 端 sanitizer、浏览器验收或文档状态继承给 Iced。
