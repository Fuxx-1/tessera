# Tessera Iced G0 产品冻结

状态：`G0 product contract frozen; native delivery BLOCKED / UNVERIFIED`\
日期：2026-08-17\
产品 owner：Tessera Iced 产品专家\
范围：`native/` 的产品合同，不修改只读 Web 源项目

## 1. 真实基线和声明边界

本合同的只读 Web/source 基线已复核为 Git revision `b9c797d8dcd8ed044bd6a4f5bc479bfe52296810`，manifest SHA-256 为 `b4dfd2064e8d30cd24f72f1347ece2ef525c5f0673796035cb4415f1ae866c0a`，487 tracked files，工作树 clean。这个基线只定位本轮源材料和 Web 输入，不是 native implementation revision。

因此，native 的 renderer、平台、性能、读屏、安装包、供应链、回滚和发布门禁均为 `BLOCKED` 或 `UNVERIFIED`。没有真实目标设备、GUI/交互 runner、读屏人工验收和 24h soak 的证据时，任何文档不得将它们写成 PASS、GA 或已兼容。

Tessera Iced 是 Tessera Web 的兄弟 renderer：共享设计 token、语义模型、状态契约和 fixture，不共享 DOM、CSS、JSX、Web renderer 缓存或运行时状态。Web 101 页的 `production` 状态不推导任何 native 完成结论。

## 2. 产品范围和两种完成语义

目标用户是使用 Rust/iced 构建运营、审核、数据分析和编辑工具的团队，以及在 8 GiB 级设备上高频执行检索、表格审阅、表单编辑和命令操作的桌面用户。

本合同严格区分以下两种完成语义：

| 名称 | 范围 | 可以得出的结论 | 不能得出的结论 |
| --- | --- | --- | --- |
| P0 vertical slice | W0-W3 中只支撑三条 P0 工作流的最小原生能力 | G2 可验证每条工作流一个可重放 happy-path | 不是 G6 发布候选，不代表 W4/W5、全量 E2E、平台或发布通过 |
| 完整 `iced-plan` 发布候选 | 严格遵循 `G0 -> G1 -> G2 -> G3 -> G4 -> G5 -> G6` | 只有满足所有门禁时才可称完整计划或 G6 RC | 不得以 P0 slice 的完成跳过 G4、G5 或 G6 |

W4 是 `P1`，不属于 P0 vertical slice，也不阻塞 G2 的三个最小切片；但它是 `iced-plan` 的 G4 强制分支，`P1-W4-01` 未 PASS 即阻断完整计划和 G6。这里的“非 P0 slice”只表示优先级与最小切片边界，绝不表示完整 G6 可省略 W4。

W5 是高风险能力的独立 P1 spike。它不进入 P0 slice；任何单项进入公开 API 前必须通过其安全、资源和平台门禁，或有逐项批准的 N/A。移动端、WASM、任意 HTML/WebView、插件、命令执行、远程资源、用户字体、目录递归导入、Markdown/Mermaid 编辑器和复杂关系图不在本期承诺内。

## 3. P0 工作流合同

### WF-01 数据检索、筛选、审阅和操作

路径为：数据源进入 -> 搜索/筛选 -> DataGrid 浏览 -> 详情 -> 单项或批量操作。

- 合法零结果显示 Empty，保留查询和筛选入口；provider 失败显示可重试错误，不把旧数据伪装成新数据。
- DataGrid 使用异步 provider、固定行高、稳定 ID 和单一选择/滚动/展开真源；1,000,000 逻辑行 x 50 列、每页 256 行是数据边界。
- 重复提交、乱序响应和部分成功必须可审计、幂等、可逐项恢复；失败不得清空当前查询、筛选、选择或页面上下文。

### WF-02 表单编辑、校验和异步提交

路径为：打开表单 -> 输入/选择 -> 校验 -> 异步提交 -> 成功反馈，或修复错误后重试。

- 受控值和校验状态只使用 `Pristine | Checking | Valid | Invalid(Vec<FieldError>)`；业务提交任务由宿主拥有。
- CJK IME preedit、emoji、长文本、数值上下界、只读和禁用必须可区分。Escape 不得静默丢弃编辑；错误需保留字段值和错误上下文。
- 提交防重复，重试使用同一幂等键；取消、失焦、慢网络或服务冲突都不能产生重复写入。

### WF-03 命令检索、执行和焦点归还

路径为：`Cmd/Ctrl+K` 或入口按钮 -> 检索 -> 键盘选择 -> 执行 -> 焦点归还。

- macOS 使用 `Cmd+K`，Windows/Linux 使用 `Ctrl+K`。上下键、Home/End、Enter、Escape 的语义在 IME、主题和缩放切换中保持稳定。
- 无结果、无权限、异常和超时都保留面板上下文与可重试动作。Enter 只执行当前高亮项，空结果不得执行任何命令。
- 关闭、取消、失败和成功后都归还仍存在且可用的 opener；没有 opener 时回到逻辑主焦点。异步结果不得夺焦点。

所有异步内容只使用 `Loading | Refreshing | Ready(T) | Empty | Failed(E)`，结果带可取消的 generation，过期结果直接丢弃。`view`、`update`、布局、命中测试和滚动热路径禁止同步磁盘/网络 I/O、解码、SVG 解析或全量排序。Overlay 必须由一个 Overlay Host 管理；外部 URL、文件、命令和剪贴板写入经 External Action Broker。

## 4. 缩放、主题和可访问性边界

系统缩放和应用缩放是两个独立维度，禁止用相乘后的单个 `scale` 字段替代：

| 字段 | 合法值 | 定义 |
| --- | --- | --- |
| `system_scale_percent` | `100 | 125 | 150 | 200` | OS/显示器报告的缩放，影响物理像素 |
| `ui_scale` | `1.0 | 1.25 | 1.5` | 应用级 UI 缩放偏好，影响 base DIP |

`SCALE-MATRIX-4x3` 描述 12 个可能的维度组合，不授权产品侧自行增建视觉 case。最终 UI 注册表的参数化父场景是 `VIS-SCALE-01`，它不可单独作为 evidence ID；唯一可运行和登记的视觉 case 是 `VIS-SCALE-01-A..F`。每条证据单独写入两个字段、窗口 DIP、物理分辨率和 DPI，不得只记录乘积。六个已注册 case 覆盖三个工作流、Overlay、IME 和长文本；若后续需要范围外的视觉组合，必须先由 UI owner 版本化注册表，不能以未注册自由文本或默认缩放推断 PASS。

Light、Dark、System 都是范围内主题。`System` 是 OS Light/Dark 的解析模式，不是第三套 palette。键盘焦点、阅读顺序、可读标签、错误恢复、reduced motion、长文本可达性和 IME 是所有目标平台硬门槛。

AccessKit、VoiceOver、Narrator/NVDA 和 Orca 在对应真实平台核心流程人工验收前均为 `UNVERIFIED`。不得声称 WCAG 2.2 AA 或 Web ARIA 等价；读屏树不能覆盖核心控件时，应阻断该平台 GA 或降级其平台等级。

## 5. Canonical requirement ID 合同

`P0-01` 至 `P0-10` 是唯一的工作流产品 requirement ID。它们的语义在本产品稿、追溯表、测试 metadata、视觉合同和发布记录中全局唯一，不得重用、改义或创建 `P0-WF*` 别名。`VIS-*`、`E2E-*`、`DOC-*`、`RA-*` 和 `UI-*` 分别是场景、测试、manifest、风险接受和只读 UI 交叉引用命名空间，不是产品 requirement ID。不得创建 `PR-G0*` 或 `UI-G0*` 产品 ID。

`required_by_gate` 是该 requirement 的唯一必达门禁；对单阶段 requirement，它也是首次必须通过的门禁。`first_checked_at` 是冻结的首次检查点键，执行时要在同一 evidence record 追加真实 RFC3339 时间。跨阶段 aggregate requirement 以唯一最终 gate 判定 PASS，并用既有 `Gx.entry/<requirement>` 键记录前向 stage checkpoint。任一 checkpoint 失败都阻断该阶段和后续阶段，但后续 checkpoint 的失败不得倒灌为早期 gate 的失败。

| ID | 冻结唯一语义 | required_by_gate | first_checked_at | G6 最低结论 |
| --- | --- | --- | --- | --- |
| `P0-01` | 查询从 Loading 到 Ready，查询、筛选、排序语义正确 | G2 | `G2.entry/P0-01` | provider fixture 与结果快照 PASS |
| `P0-02` | 筛选应用、零结果、清除和结果计数同源 | G2 | `G2.entry/P0-02` | FilterPanel/DataToolbar 空态 PASS |
| `P0-03` | 稳定 ID 选择、详情和单项/批量动作 | G3 | `G3.entry/P0-03` | 重复与部分失败日志 PASS |
| `P0-04` | 乱序、失败、重试和焦点恢复不丢上下文 | G3 | `G3.entry/P0-04` | generation/retry trace PASS |
| `P0-05` | 受控表单编辑和校验状态闭环 | G2 | `G2.entry/P0-05` | CJK IME 录入证据 PASS |
| `P0-06` | 异步提交防重复、幂等和成功反馈 | G3 | `G3.entry/P0-06` | 重复点击 fixture PASS |
| `P0-07` | 服务错误、冲突、超时保留编辑值且可恢复 | G3 | `G3.entry/P0-07` | 故障注入与重试 PASS |
| `P0-08` | Cmd/Ctrl+K 打开、检索、无结果和键盘高亮 | G2 | `G2.entry/P0-08` | macOS/Windows 快捷键流 PASS |
| `P0-09` | Enter 只执行高亮命令，权限和异常语义可见 | G3 | `G3.entry/P0-09` | 动作审计和异常 fixture PASS |
| `P0-10` | Esc、遮罩、完成后的焦点归还，异步结果不夺焦点 | G2 | `G2.entry/P0-10` | focus trace PASS |

以下是独立的跨工作流产品 requirement，不能作为 `P0-01..P0-10` 的别名，也不能替代任一编号 requirement：

| ID | 冻结语义 | required_by_gate | first_checked_at |
| --- | --- | --- | --- |
| `P0-STATE` | 三条流程的成功、空、错、边界、恢复和异步五态；完整 24 条 E2E | G3 | `G3.entry/P0-STATE` |
| `P0-ACC` | 键盘、焦点、IME、标签、对比度、reduced motion 与独立缩放字段 | G2 | `G2.entry/P0-ACC` |
| `P0-PERF` | G0-G6 的性能/资源 aggregate：空闲与热路径安全性、数据/虚拟化、图表、P0 工作台和 RC/soak 分阶段通过 | G6 | `G0.entry/P0-PERF` |
| `P0-PLAT` | G0-G6 的平台 aggregate：G0 能力 spike、G5 三平台/读屏/IME 矩阵、G6 安装/签名/回滚分阶段通过 | G6 | `G0.entry/P0-PLAT` |

G2 只运行 `E2E-MIN-WF1`、`E2E-MIN-WF2`、`E2E-MIN-WF3` 三条最小 happy-path。完整 suite 固定为 `E2E-P0-01..24`：`01..08` 为 WF-01，`09..16` 为 WF-02，`17..24` 为 WF-03；每组包含成功、空、错、边界和恢复，整套覆盖异步乱序、Escape、焦点归还、主题、IME 和缩放。该 suite 在 G3 首次验证，在 G6 复核，不能提前用 G2 的三个最小测试计数或替代。

## 6. UI 和视觉证据链接

当前 UI 候选使用独立的 `VIS-*` 场景命名空间。产品 requirement 与视觉场景的唯一链接如下；visual metadata 的 `requirement_ids` 必须逐项列出这里的 canonical ID。

| 视觉场景 | requirement_ids | 门禁用途 |
| --- | --- | --- |
| `VIS-WF1-01` | `P0-01, P0-02, P0-03, P0-04`，适用时加 `P0-STATE, P0-ACC` | G2 最小 slice；G3/G6 完整流程证据 |
| `VIS-WF2-01` | `P0-05, P0-06, P0-07`，适用时加 `P0-STATE, P0-ACC` | G2 最小 slice；G3/G6 完整流程证据 |
| `VIS-WF3-01` | `P0-08, P0-09, P0-10`，适用时加 `P0-STATE, P0-ACC` | G2 最小 slice；G3/G6 完整流程证据 |
| 父场景 `VIS-SCALE-01` 的 case `VIS-SCALE-01-A..F`，以及 `VIS-DPI-01`、`VIS-IME-01`、`VIS-FOCUS-01` | 适用的 `P0-ACC`，或无产品 requirement 的 `[]` | G2/G6 缩放、输入与焦点证据；父场景不可单独作为 evidence ID |
| `VIS-CHART-01` | `P1-W4-01`; `milestone_ids=[G4,G6]` | W4 P1 独立证据，不得写入 P0 结果 |

只读 UI 交叉引用 `UI-APP-SHELL`、`UI-LIST-PAGE`、`UI-FORM-PAGE`、`UI-A11Y`、`UI-BASE-STATES`、`UI-BUSINESS-TOOLBAR`、`UI-BUSINESS-DETAIL`、`UI-BUSINESS-COMMAND` 指向 Web `design/` 输入。它们是来源链接，不能成为 native PASS 证据。

## 7. 性能、平台和状态规则

`iced-plan.md` §7.2 的全部绝对阈值和相对回退阈值是硬门槛，但只在其所属 stage 检查，不能把后续工作负载倒灌为 G0 前置条件。指标包括空闲 CPU、唤醒率、状态 update、update/view/diff/layout、输入呈现、虚拟滚动、RSS、GPU、启动、产物包体、8 小时增长和 UI 热路径同步 I/O。低配参考机为 MacBook Air M1/8 GiB 与 Windows 11 i5-8250U/8 GiB；某指标进入执行阶段时至少运行 5 次并丢弃首轮。M4 Pro 只能趋势观察，不能替代低配门禁。

`P0-PERF` 是一个 aggregate requirement，唯一 `required_by_gate` 为 G6，只有所有适用 checkpoint PASS 才可在 G6 标记 PASS。下表的键是 stable stage checkpoint，不是新的产品 requirement ID：

| Stage checkpoint | 此阶段必须检查的范围 | 失败语义 |
| --- | --- | --- |
| `G0.entry/P0-PERF` | native workspace 前的空窗口/renderer/低配 spike：可定位 renderer，空壳空闲 CPU/RSS/启动，空壳热路径零同步 I/O 与无持续 redraw 的可控性 | `BLOCKED`，不得进入 G1 |
| `G1.entry/P0-PERF` | Foundation 的 token/Theme/Focus/Overlay/Gallery/testkit 不引入同步 I/O、永久 tick 或持续 redraw | `BLOCKED`，不得进入 G2 |
| `G2.entry/P0-PERF` | W1 和三条最小 happy-path 的输入/布局基线；不把数据虚拟化、图表或 RC 指标计入 G2 | `BLOCKED`，不得进入 G3 |
| `G3.entry/P0-PERF` | W2/W3 数据与缓存：P0 工作台 RSS、输入呈现、虚拟滚动、1M/100K 数据边界、可取消任务和缓存恢复 | `BLOCKED`，不得进入 G4 |
| `G4.entry/P0-PERF` | W4 Canvas 图表：数值/采样下的 CPU、RSS、GPU、帧预算和超限降级 | `BLOCKED`，不得进入 G5 或 G6 |
| `G5.entry/P0-PERF` | 目标平台/renderer 矩阵中的适用性能哨兵，不以高配趋势替代低配结果 | `BLOCKED`，不得进入 G6 |
| `G6.entry/P0-PERF` | release/strip 的全量硬预算、相对回退、8 小时增长、24h soak 和 RC 安装/发布相关资源证据 | `BLOCKED`，`P0-PERF` 不得 PASS |

`P0-PLAT` 同样是 aggregate requirement，唯一 `required_by_gate` 为 G6。下表的键是 stable stage checkpoint，不是新的产品 requirement ID：

| Stage checkpoint | 此阶段必须检查的范围 | 失败语义 |
| --- | --- | --- |
| `G0.entry/P0-PLAT` | macOS ARM64、Windows x64、Ubuntu X11 的 renderer、DPI、字体、CJK IME、AccessKit 和基础窗口能力 spike；结论只限 spike，不等同平台兼容承诺 | `BLOCKED`，不得进入 G1 |
| `G5.entry/P0-PLAT` | macOS/Windows/Linux 三平台的 renderer/输入/拖放/剪贴板矩阵；VoiceOver、Narrator/NVDA、Orca 核心流程人工记录；GA/Beta/Preview 等级与失败降级 | `BLOCKED`，不得进入 G6；读屏失败不得标注对应平台 GA |
| `G6.entry/P0-PLAT` | release 安装、升级、卸载、签名/校验、SBOM、可执行回滚演练和平台分发证据 | `BLOCKED`，`P0-PLAT` 不得 PASS |

冻结后，任一已到期性能或平台 checkpoint 失败均持续为 `BLOCKED`。性能失败包括硬阈值超限、p95 相对冻结基线恶化超过 5%、p99 恶化超过 10%、热路径发生任何同步 I/O 或空闲持续 redraw。`RA-<id>` 可以记录风险、owner、补偿控制、到期、批准人和公开限制，但没有任何权限改变指标结果、将超限 checkpoint、`P0-PERF` 或 `P0-PLAT` 改为 PASS，或绕过 G0-G6。只有 G0 冻结前基于真实测量形成的正式 ADR 才能校准尚未冻结的性能目标；零同步 I/O 和无空闲持续 redraw 永远不能放宽。G0 checkpoint 失败阻断 G1；G3/G4/G5/G6 的失败只阻断其自身和后续 gate，不追溯改写 G0 已检查范围或结论。`P0-PLAT` 的 G5/G6 失败同样不得倒灌为 G0 失败。

所有性能或视觉 PASS 都必须绑定同一 native revision、目标平台、renderer、driver、`ui_scale`、`system_scale_percent`、设备型号、内存、电源模式、分辨率、run count、warmup discard、时长、基线 revision、原始 samples 和 `{mean,p95,p99,unit}` sidecar。当前没有这种 native evidence。

## 8. P1 和生产组件 DoD

| ID | 冻结要求 | required_by_gate | first_checked_at | 当前 |
| --- | --- | --- | --- | --- |
| `P1-REG-01` | 101 个 Web 项维护独立 `webStatus`/`icedStatus` | G1 | `G1.entry/P1-REG-01` | `UNVERIFIED` |
| `P1-REG-02` | Web production 不继承 native production；延期有原因/复核门禁 | G1 | `G1.entry/P1-REG-02` | `UNVERIFIED` |
| `P1-W0-01` | token、Theme、Overlay、Task、Gallery/testkit 单一真源 | G1 | `G1.entry/P1-W0-01` | `UNVERIFIED` |
| `P1-W1-01` | W1 有状态矩阵、键盘、长文本和性能证据 | G2 | `G2.entry/P1-W1-01` | `UNVERIFIED` |
| `P1-W2-01` | 弹层翻转、焦点圈闭/归还、IME 与边缘场景 | G2 | `G2.entry/P1-W2-01` | `UNVERIFIED` |
| `P1-W3-01` | VirtualList/DataGrid/VirtualTree、可取消 provider 和大数据预算 | G3 | `G3.entry/P1-W3-01` | `UNVERIFIED` |
| `P1-W4-01` | W4 Canvas 图表/卡片数值、命中、空/错/超限和采样预算 | G4 | `G4.entry/P1-W4-01` | `UNVERIFIED`; 失败阻断 G6 |
| `P1-W5-01` | 高风险能力的安全/资源/平台 spike | G5 | `G5.entry/P1-W5-01` | `UNVERIFIED` |
| `P1-DOC-01` | 每个 native production 组件的 versioned 11 项 DoD manifest | G6 | `G6.entry/P1-DOC-01` | `BLOCKED` |

任何 native `production` 组件必须有 `P1-DOC-01 manifest v1.0`。11 项为：

1. 公开 API、状态机、错误和边界冻结。
2. 独立 Gallery 文档页和独立示例。
3. 独立的 `icedStatus`、能力范围和限制。
4. Light/Dark/System、独立 app/system scale、长文本、zh-CN/en-US 和状态矩阵。
5. 键盘、指针、焦点、IME、disabled/read-only 和 Overlay。
6. 正常、空、加载、错误、超限、异步乱序和资源失败。
7. 无裁切、重叠、内部大于外部、不可见焦点或文本遮挡。
8. 单测、交互、视觉、性能、内存、安全和平台证据。
9. 无 P0/P1；P2 有 owner、期限、公开限制和复核点。
10. 文档、fixture、变更日志与实现同一 revision。
11. 受影响 CI 和低配硬件门禁通过。

每行必须是 `PASS`、`BLOCKED` 或有书面理由的 `N/A`，并有稳定 evidence ID 和同一 native revision。`N/A` 还必须列出理由、风险 owner、补偿控制、到期和批准人。任何 `BLOCKED`、无理由 N/A 或 revision 不一致都阻断 `P1-DOC-01` 和 G6；docs/fixture/changelog 只满足第 10 项。

## 9. Gate 状态和真实阻断

| Gate | 首次需要的结论 | 当前状态 |
| --- | --- | --- |
| G0 | source baseline 已定位；native toolchain/renderer、`G0.entry/P0-PLAT` 的平台/字体/IME/DPI/AccessKit spike，以及 `G0.entry/P0-PERF` 的低配空壳 CPU/RSS/启动、零同步 I/O/无持续 redraw 可控性 | `BLOCKED`: 仅 source baseline 已验证 |
| G1 | token 单一真源、三 crate、Theme/Focus/Overlay、Gallery/testkit、无同步 I/O | `UNVERIFIED` |
| G2 | W1 与三条最小 E2E slice；macOS/Windows 基础交互、主题、IME、独立缩放字段和视觉 | `UNVERIFIED` |
| G3 | W2/W3、虚拟化、异步 provider、缓存恢复、完整 `E2E-P0-01..24` | `UNVERIFIED` |
| G4 | `P1-W4-01` 与图表 Canvas/资源证据 | `UNVERIFIED`; 失败阻断完整计划/G6 |
| G5 | `G5.entry/P0-PLAT` 的平台矩阵/读屏/IME/降级、兼容构建、供应链和 fuzz | `UNVERIFIED` |
| G6 | 全部 P0 PASS、24 E2E 复核、W4 PASS、DoD manifest、`G6.entry/P0-PERF` 的 24h soak、`G6.entry/P0-PLAT` 的安装/升级/卸载、SBOM、签名和回滚演练 | `BLOCKED` |

剩余真实阻断包括：没有 native implementation revision、没有真实低配设备测量、没有 GUI/交互/视觉 runner 证据、没有 VoiceOver/Narrator/NVDA/Orca 人工记录、没有 24h soak、没有安装包/SBOM/签名/回滚演练。它们不能用 Web baseline、单机截图、模拟数据或书面风险接受替代。
