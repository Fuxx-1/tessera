# Tessera Iced G0 需求追溯与证据登记

状态：`G0 traceability frozen; all native execution evidence UNVERIFIED`\
日期：2026-08-17\
写 owner：Tessera Iced 产品专家

本表实施 `product.md` 的产品合同，登记 requirement、来源、最小证据、门禁和当前状态。`FROZEN` 只表示要求冻结；它不表示实现或测试已通过。没有 native revision 和实际证据的 requirement 必须保持 `UNVERIFIED` 或 `BLOCKED`，不得写为 PASS。

## 1. 状态和证据约定

| 状态 | 含义 | 允许结论 |
| --- | --- | --- |
| `FROZEN` | 范围、语义和门禁已冻结 | 可拆任务和写 fixture，不能宣称实现 |
| `UNVERIFIED` | 尚未在声明环境中取得实际证据 | 不得提升 native phase 或发布门禁 |
| `BLOCKED` | 当前缺少直接影响正确性、可用性、安全或发布的必要证据，或存在失败 | 必须 handback 对应 owner；发布不得继续 |
| `PASS` | 同一 native revision 上，有完整可复核证据并通过门槛 | 仅关闭被该 evidence 覆盖的范围 |
| `N/A` | 明确不适用 | 必须附理由、风险 owner、补偿控制、到期和批准人 |

每条执行证据至少包含：`test_id`、组件/能力、`source_revision`、rustc/iced、feature、OS/架构、renderer/driver、窗口 DIP、`ui_scale`、`system_scale_percent`、theme、font hash、fixture hash、seed、命令、指标、截图/热图/trace/profile、真实 RFC3339 执行时间和结论。性能证据另须包含设备型号、RAM、电源模式、分辨率、5 次 measured run、warmup discard、测量时长、`baseline_revision`、原始 samples 和每项 `{mean,p95,p99,unit}`。

## 2. 来源和真实基线

| Source ID | 只读来源 | 冻结事实 |
| --- | --- | --- |
| S-PLAN | `iced-plan.md` | 兄弟 renderer、P0 流程、性能/平台、W0-W5、G0-G6、DoD |
| S-REG | Web `componentRegistry.ts` 与设计文档 | 101 页，Base 75 / Business 11 / Charts 15；Web 状态不等于 native parity |
| S-DESIGN | Web `design/` | token、工作台模式、输入/数据/反馈、可访问性输入 |
| S-PRODUCT | 本输出的 `native/docs/product.md` | 产品范围、P0/P1 requirement、状态和 gate 合同 |
| S-UI | 当前 UI 候选的 `native/docs/ui-spec.md`、`native/docs/visual-acceptance.md` | `VIS-*` 命名空间、缩放分离、对比度、visual/performance sidecar 合同 |
| S-AUDIT | 当前产品/UI 审查报告 `reviews/product-ui-audit.md` | 审查发现、handback 和复核范围 |

已实际复核 source Git revision `b9c797d8dcd8ed044bd6a4f5bc479bfe52296810`，manifest SHA-256 `b4dfd2064e8d30cd24f72f1347ece2ef525c5f0673796035cb4415f1ae866c0a`，487 tracked files，clean。冻结源历史内容不包含 `native/docs/baseline-run.md`；按 G0 mechanical integration runbook，最终 integration overlay 必须引入并校验该记录。该记录的存在与校验通过只证明 Web/design source identity 及可复做合同，不证明 native implementation、平台、低配、GUI/IME/DPI、读屏、renderer、供应链、签名、安装或发布门禁。该项为 `SOURCE-BASELINE = PASS`，但它不是 native implementation revision，不关闭任何 native G0-G6 execution gate。

## 3. ID 和 UI 链接自检

自检规则：工作流产品 requirement 只能使用 `P0-01..P0-10`；视觉场景只能使用 `VIS-*`；测试使用 `E2E-*`；component DoD 使用 `DOC-*`；风险记录使用 `RA-*`；只读设计链接使用 `UI-*`。本表不定义 `P0-WF*`、`PR-G0*` 或 `UI-G0*` 产品 ID。

| 工作流 | canonical requirement_ids | 独立视觉场景 | 自检结果 |
| --- | --- | --- | --- |
| WF-01 | `P0-01, P0-02, P0-03, P0-04` | `VIS-WF1-01` | `FROZEN`: 一对多映射，未重用编号 |
| WF-02 | `P0-05, P0-06, P0-07` | `VIS-WF2-01` | `FROZEN`: 一对多映射，未重用编号 |
| WF-03 | `P0-08, P0-09, P0-10` | `VIS-WF3-01` | `FROZEN`: 一对多映射，未重用编号 |
| W4 P1 | `requirement_ids=[P1-W4-01]`；`milestone_ids=[G4,G6]` | `VIS-CHART-01` | `FROZEN`: 不污染 P0 结果 |

`P0-STATE` 和 `P0-ACC` 是独立跨工作流 requirement，只有适用的视觉/交互 evidence 才能在 `requirement_ids` 附加它们；它们不是任意 `P0-01..P0-10` 的同义词或视觉场景别名。

## 4. P0 requirement 追溯

| ID | 唯一语义 | required_by_gate | first_checked_at | Source/UI anchor | 最低 evidence | 当前 |
| --- | --- | --- | --- | --- | --- | --- |
| `P0-01` | 查询 Loading -> Ready，查询/筛选/排序正确 | G2 | `G2.entry/P0-01` | S-PLAN §4/§5；`UI-LIST-PAGE` | `E2E-MIN-WF1`、provider fixture、结果快照 | `FROZEN/UNVERIFIED` |
| `P0-02` | 筛选、零结果、清除、计数同源 | G2 | `G2.entry/P0-02` | S-DESIGN；`UI-BUSINESS-TOOLBAR` | Filter fixture、`VIS-WF1-01` | `FROZEN/UNVERIFIED` |
| `P0-03` | 稳定 ID、详情、单项/批量动作 | G3 | `G3.entry/P0-03` | S-PLAN §7.4；`UI-BUSINESS-DETAIL` | selection state、部分失败 log | `FROZEN/UNVERIFIED` |
| `P0-04` | 乱序、失败、重试和焦点恢复不丢上下文 | G3 | `G3.entry/P0-04` | S-PLAN §5/§8；`UI-LIST-PAGE` | generation/retry trace | `FROZEN/UNVERIFIED` |
| `P0-05` | 受控表单与校验状态闭环 | G2 | `G2.entry/P0-05` | S-PLAN §5；`UI-FORM-PAGE` | `E2E-MIN-WF2`、IME form fixture | `FROZEN/UNVERIFIED` |
| `P0-06` | 异步提交防重复、幂等和反馈 | G3 | `G3.entry/P0-06` | S-PLAN §5/§12；`UI-FORM-PAGE` | idempotency trace、双击 fixture | `FROZEN/UNVERIFIED` |
| `P0-07` | 错误/冲突/超时保留值且可恢复 | G3 | `G3.entry/P0-07` | S-DESIGN；`UI-FORM-PAGE` | fault injection、recovery E2E | `FROZEN/UNVERIFIED` |
| `P0-08` | Cmd/Ctrl+K 打开、检索、无结果、键盘高亮 | G2 | `G2.entry/P0-08` | S-PLAN §4；`UI-APP-SHELL` | `E2E-MIN-WF3`、macOS/Windows key flow | `FROZEN/UNVERIFIED` |
| `P0-09` | Enter 只执行高亮命令；权限/异常可见 | G3 | `G3.entry/P0-09` | S-PLAN External Action Broker；`UI-BUSINESS-COMMAND` | command audit、fault fixture | `FROZEN/UNVERIFIED` |
| `P0-10` | Esc/遮罩/完成后回焦，异步结果不夺焦点 | G2 | `G2.entry/P0-10` | S-PLAN Overlay；`UI-A11Y` | focus-return trace | `FROZEN/UNVERIFIED` |

| Cross-cutting ID | 唯一语义 | required_by_gate | first_checked_at | 最低 evidence | 当前 |
| --- | --- | --- | --- | --- | --- |
| `P0-STATE` | 三流程成功/空/错/边界/恢复和完整 24 E2E | G3 | `G3.entry/P0-STATE` | `E2E-P0-01..24`、状态矩阵 | `FROZEN/UNVERIFIED` |
| `P0-ACC` | 键盘、焦点、IME、对比度、reduced motion、独立缩放字段 | G2 | `G2.entry/P0-ACC` | `SCALE-MATRIX-4x3`、父场景 `VIS-SCALE-01` 的 case `VIS-SCALE-01-A..F`、人工记录 | `FROZEN/UNVERIFIED` |
| `P0-PERF` | G0-G6 的性能/资源 aggregate：空壳安全性、数据/虚拟化、图表、P0 工作台和 RC/soak 分阶段通过 | G6 | `G0.entry/P0-PERF` | 分阶段 checkpoint evidence；G6 全量性能报告 | `FROZEN/BLOCKED` |
| `P0-PLAT` | G0-G6 的平台 aggregate：能力 spike、三平台/读屏/IME 矩阵、安装/签名/回滚分阶段通过 | G6 | `G0.entry/P0-PLAT` | 分阶段 checkpoint evidence；G6 分发/回滚报告 | `FROZEN/BLOCKED` |

## 5. E2E、缩放和视觉追溯

| 执行层级 | 固定测试/场景 | 首次门禁 | 规则 | 当前 |
| --- | --- | --- | --- | --- |
| 最小 vertical slice | `E2E-MIN-WF1`, `E2E-MIN-WF2`, `E2E-MIN-WF3` | G2 | 各一条 happy-path；不计入完整 24 条 | `UNVERIFIED` |
| 完整 P0 suite | `E2E-P0-01..24` | G3，G6 复核 | `01..08` WF-01，`09..16` WF-02，`17..24` WF-03；覆盖成功、空、错、边界、恢复、乱序、Escape、回焦、主题、IME、缩放 | `UNVERIFIED` |
| 视觉工作流 | `VIS-WF1-01`, `VIS-WF2-01`, `VIS-WF3-01` | G2/G3/G6 | metadata 的 `requirement_ids` 与 §3 完全一致 | `UNVERIFIED` |
| 缩放 | `SCALE-MATRIX-4x3`；父场景 `VIS-SCALE-01` 的 case `VIS-SCALE-01-A..F`；`VIS-DPI-01` | G2/G6 | 两个独立字段；父场景不可单独作为 evidence ID；不使用合成 scale 或未注册 case | `UNVERIFIED` |
| W4 图表 | `VIS-CHART-01`, `CHART-VALUE-*` | G4/G6 | P1 独立路径，metadata 列 `P1-W4-01` 和 milestone ID，不创建 P0 requirement | `UNVERIFIED` |

`SCALE-MATRIX-4x3` 的行键为 `system_scale_percent = 100/125/150/200`，列键为 `ui_scale = 1.0/1.25/1.5`。它描述缩放维度，不是产品侧增建 12 个视觉 case 的授权。最终 UI 注册表仅允许参数化父场景 `VIS-SCALE-01` 下的 `VIS-SCALE-01-A..F` 作为 scale evidence；父场景本身不可单独作为 evidence ID，未注册 case 不能从相邻组合或二者乘积推断 PASS。

## 6. P1 追溯和 DoD manifest

| ID | 冻结要求 | required_by_gate | first_checked_at | 最低 evidence | 当前 |
| --- | --- | --- | --- | --- | --- |
| `P1-REG-01` | 101 项独立 `webStatus`/`icedStatus` | G1 | `G1.entry/P1-REG-01` | registry schema、三类计数 | `FROZEN/UNVERIFIED` |
| `P1-REG-02` | Web production 不继承 native production；延期有原因 | G1 | `G1.entry/P1-REG-02` | no-inherit check、延期表 | `FROZEN/UNVERIFIED` |
| `P1-W0-01` | token/Theme/Overlay/Task/Gallery/testkit 单一真源 | G1 | `G1.entry/P1-W0-01` | ADR、基础 benchmark、截图链路 | `FROZEN/UNVERIFIED` |
| `P1-W1-01` | W1 状态、键盘、长文本、性能 | G2 | `G2.entry/P1-W1-01` | component docs、fixture、visual evidence | `FROZEN/UNVERIFIED` |
| `P1-W2-01` | 弹层翻转、焦点、IME 和边缘 | G2 | `G2.entry/P1-W2-01` | overlay/focus trace | `FROZEN/UNVERIFIED` |
| `P1-W3-01` | virtual data、可取消 provider 和预算 | G3 | `G3.entry/P1-W3-01` | 1M x 50、10 万节点、取消 trace | `FROZEN/UNVERIFIED` |
| `P1-W4-01` | W4 Canvas、数值、命中、采样、空/错/超限 | G4 | `G4.entry/P1-W4-01` | values、golden、资源报告 | `FROZEN/UNVERIFIED` |
| `P1-W5-01` | 高风险输入的安全/资源/平台 spike | G5 | `G5.entry/P1-W5-01` | threat/resource/platform report | `FROZEN/UNVERIFIED` |
| `P1-DOC-01` | 每个 native production 组件 manifest v1.0 | G6 | `G6.entry/P1-DOC-01` | `DOC-v1.0-M01..M11` | `FROZEN/BLOCKED` |

`P1-DOC-01 manifest v1.0` 必须对每个 production 组件逐项登记以下 11 项。当前没有 native implementation revision，所以全部 `BLOCKED`：

| 项 | DoD 条目 | status | evidence ID | same revision |
| ---: | --- | --- | --- | --- |
| 1 | API、状态机、错误和边界冻结 | `BLOCKED` | `DOC-v1.0-M01` | `UNSET-NATIVE-REVISION` |
| 2 | 独立 Gallery 文档和示例 | `BLOCKED` | `DOC-v1.0-M02` | `UNSET-NATIVE-REVISION` |
| 3 | 独立 `icedStatus`、范围、限制 | `BLOCKED` | `DOC-v1.0-M03` | `UNSET-NATIVE-REVISION` |
| 4 | 主题、两种缩放、长文本、双语、状态 | `BLOCKED` | `DOC-v1.0-M04` | `UNSET-NATIVE-REVISION` |
| 5 | 键盘、指针、焦点、IME、disabled/read-only、Overlay | `BLOCKED` | `DOC-v1.0-M05` | `UNSET-NATIVE-REVISION` |
| 6 | 正常、空、加载、错误、超限、乱序、资源失败 | `BLOCKED` | `DOC-v1.0-M06` | `UNSET-NATIVE-REVISION` |
| 7 | 无裁切、重叠、不可见焦点或文本遮挡 | `BLOCKED` | `DOC-v1.0-M07` | `UNSET-NATIVE-REVISION` |
| 8 | 单测、交互、视觉、性能、内存、安全、平台 | `BLOCKED` | `DOC-v1.0-M08` | `UNSET-NATIVE-REVISION` |
| 9 | 无 P0/P1；P2 风险可治理 | `BLOCKED` | `DOC-v1.0-M09` | `UNSET-NATIVE-REVISION` |
| 10 | docs/fixture/changelog 与实现同 revision | `BLOCKED` | `DOC-v1.0-M10` | `UNSET-NATIVE-REVISION` |
| 11 | CI 和低配硬件门禁 | `BLOCKED` | `DOC-v1.0-M11` | `UNSET-NATIVE-REVISION` |

## 7. P0-PERF 阶段 checkpoint

`P0-PERF.required_by_gate = G6` 是 aggregate 的唯一最终 PASS 门禁；下列 `Gx.entry/P0-PERF` 是 stable checkpoint key，不是新增产品 requirement ID。失败阻断该 stage 和后续 stage，但不得倒灌重写 G0 的已检查范围。

| checkpoint | 必测范围 | 当前 | 失败语义 |
| --- | --- | --- | --- |
| `G0.entry/P0-PERF` | 空窗口/renderer/低配 spike；空壳 CPU/RSS/启动；空壳热路径同步 I/O 与持续 redraw 可控性 | `UNVERIFIED` | 阻断 G1 |
| `G1.entry/P0-PERF` | Foundation 不引入同步 I/O、永久 tick 或持续 redraw | `UNVERIFIED` | 阻断 G2 |
| `G2.entry/P0-PERF` | W1 与三条最小 slice 的输入/布局基线；不含数据/图表/RC 工作负载 | `UNVERIFIED` | 阻断 G3 |
| `G3.entry/P0-PERF` | W2/W3 的 P0 工作台、输入呈现、虚拟滚动、1M/100K、缓存/可取消任务 | `UNVERIFIED` | 阻断 G4 |
| `G4.entry/P0-PERF` | W4 图表 CPU/RSS/GPU/帧预算和超限降级 | `UNVERIFIED` | 阻断 G5/G6 |
| `G5.entry/P0-PERF` | 目标平台/renderer 的低配性能哨兵 | `UNVERIFIED` | 阻断 G6 |
| `G6.entry/P0-PERF` | release/strip 全量预算、相对回退、8 小时增长、24h soak、RC 资源证据 | `UNVERIFIED` | `P0-PERF` 不得 PASS |

## 8. P0-PLAT 阶段 checkpoint

`P0-PLAT.required_by_gate = G6` 是 aggregate 的唯一最终 PASS 门禁；下列 `Gx.entry/P0-PLAT` 是 stable checkpoint key，不是新增产品 requirement ID。它们都不可被后续 checkpoint、一次演示或风险登记抵消。

| checkpoint | 必测范围 | 当前 | 失败语义 |
| --- | --- | --- | --- |
| `G0.entry/P0-PLAT` | macOS ARM64、Windows x64、Ubuntu X11 的 renderer/DPI/字体/CJK IME/AccessKit/基础窗口 spike；只证明能力可探测 | `UNVERIFIED` | 阻断 G1 |
| `G5.entry/P0-PLAT` | 三平台 renderer、输入、拖放、剪贴板矩阵；VoiceOver、Narrator/NVDA、Orca 核心流程人工记录；GA/Beta/Preview 降级结论 | `UNVERIFIED` | 阻断 G6；失败平台不得标 GA |
| `G6.entry/P0-PLAT` | release 安装、升级、卸载、签名/校验、SBOM、回滚演练和平台分发证据 | `UNVERIFIED` | `P0-PLAT` 不得 PASS |

## 9. 性能例外和门禁防绕过

`iced-plan.md` 的性能硬门槛是发布约束，不是可由行政记录放宽的目标。任一已到期性能 checkpoint 的阈值超限、相对基线 p95 超 5%、p99 超 10%、热路径同步 I/O 非零或空闲持续 redraw，都保持 `BLOCKED`。

`RA-<id>` 只是一份风险登记，必须包含影响、owner、补偿控制、到期、批准人和公开限制。它不能修改 measurement、不能把 P0-PERF 或 P0-PLAT 从 BLOCKED 改为 PASS、不能让 G0-G6 前进。只有 G0 冻结前的实测 ADR 可以校准尚未冻结的性能数值；零同步 I/O 和无空闲持续 redraw 没有例外路径。

## 10. Gate 追溯

| Gate | required evidence | 当前状态 |
| --- | --- | --- |
| G0 | source baseline；`G0.entry/P0-PLAT` 的 renderer/IME/DPI/AccessKit/字体 spike；`G0.entry/P0-PERF` 的低配空壳 CPU/RSS/启动和空闲/热路径可控性 | `BLOCKED`: 仅 source baseline PASS |
| G1 | token 真源、三 crate、Theme/Focus/Overlay、Gallery/testkit、无同步 I/O | `UNVERIFIED` |
| G2 | W1、三个 `E2E-MIN-*`、macOS/Windows 基础交互、主题/IME/缩放/视觉 | `UNVERIFIED` |
| G3 | W2/W3、缓存恢复、完整 `E2E-P0-01..24` | `UNVERIFIED` |
| G4 | `P1-W4-01`、Canvas/数值/资源证据 | `UNVERIFIED`; 缺失阻断 G6 |
| G5 | `G5.entry/P0-PLAT` 的三平台/读屏/IME/降级、兼容 renderer、供应链与 fuzz | `UNVERIFIED` |
| G6 | 全 P0 PASS、24 E2E 复核、W4 PASS、11 项 DoD、`G6.entry/P0-PERF` 的 24h soak、`G6.entry/P0-PLAT` 的安装/升级/卸载、SBOM、签名、回滚演练 | `BLOCKED` |

## 11. 产品/UI 审查 handback 复核

| 审查项 | 产品侧处理 | 合同状态 | 执行状态 |
| --- | --- | --- | --- |
| P0-01 ID 复用 | `P0-01..10` 与 `VIS-*` 命名空间分离，metadata 显式映射 | `CLOSED` | `UNVERIFIED` |
| P0-02 W4 范围矛盾 | P0 slice 与完整 G6 RC 分开定义；W4 是 P1/G4/G6 强制分支 | `CLOSED` | `UNVERIFIED` |
| P1-01 门禁时点不唯一 | 每个 P0 和跨工作流 requirement 有唯一 `required_by_gate` 与 `first_checked_at` | `CLOSED` | `UNVERIFIED` |
| P1-02 两类缩放 | `system_scale_percent` 与 `ui_scale` 独立字段和矩阵 | `CLOSED` | `UNVERIFIED` |
| P1-03 普通文本对比度 | 产品链接采用 UI 候选的 `accent_text/link_text`，不使用 `accent` 承载普通文本 | `LINKED` | `UNVERIFIED` |
| P1-04 性能 evidence schema | 视觉 PASS 绑定同 revision 的性能 sidecar 和完整环境/统计字段 | `CLOSED` | `UNVERIFIED` |
| P1-05 性能绕过 | RA 不可改变硬门槛或 PASS；仅 G0 冻结前实测 ADR 可校准 | `CLOSED` | `UNVERIFIED` |
| P1-06 DoD 证据不足 | `P1-DOC-01 manifest v1.0` 固定 11 项 | `CLOSED` | `BLOCKED` |
| P2-01 token 混色 | 链接 UI 候选的 deterministic algorithm；生成链路未实测 | `LINKED` | `UNVERIFIED` |
| B-01 aggregate 门禁范围 | `P0-PERF` 和 `P0-PLAT` 的唯一最终 gate 为 G6；既有 `Gx.entry/...` stage checkpoint 前向阻断且不可抵消 | `CLOSED` | `UNVERIFIED` |

`CLOSED` 只代表本次产品合同的文字、ID、链接和门禁 handback 已消除；它绝不表示 native 实现、真实平台、性能或读屏通过。

## 12. 剩余真实阻断和责任

| 阻断 | 最小下一步 | owner 阶段 | 关闭条件 |
| --- | --- | --- | --- |
| 无 native implementation revision | 建立 native workspace/revision 并绑定所有 evidence | 架构/研发，G0-G1 | 可定位 native revision |
| 无真实低配/renderer 测量 | 在两台低配参考机按固定环境运行 5 次性能样本 | 性能/测试，G0/G6 | 全部硬门槛 PASS |
| 无 GUI/交互/视觉证据 | 建立 Gallery/testkit 与带 metadata 的可重放 runner | 研发/UI/测试，G1-G3 | 对应 P0/P1 evidence PASS |
| 无读屏人工验收 | VoiceOver、Narrator/NVDA、Orca 进行核心流程人工 spike | 平台/无障碍，G5 | 通过或降级平台承诺 |
| 无 24h soak、安装、SBOM、签名、回滚 | RC 环境完成并归档证据 | 发布/测试，G6 | 全部 G6 条件 PASS |

这些阻断不能由 source baseline、Web 状态、一次演示、单机截图或风险记录关闭。
