# Tessera Iced G0 Complexity Ledger

> 状态：G0 合同与预算已冻结；G0 -> G1 `BLOCKED`，G1/G5/G6 `NOT STARTED`
>
> 规则：任何新增 crate、feature、公共类型、状态源、队列或长期抽象都必须先登记 owner、调用方、上限和删除条件。没有对应能力证据的净复杂度增加不得合入。

## 1. 账本口径

本账本只计算首期 native 生产路径，不把当前 Web 的 101 个文档页当作 native 已存在的实现。`planned` 表示允许在后续里程碑加入；`blocked` 表示对应能力不得启用、宣称或发布，除非所属阶段明确把它列为前置，否则不自动阻断无关工程实现；`delete` 表示迁移完成后必须删除的路径或重复物。

源项目冻结基线为 revision `b9c797d8dcd8ed044bd6a4f5bc479bfe52296810`、manifest SHA-256 `b4dfd2064e8d30cd24f72f1347ece2ef525c5f0673796035cb4415f1ae866c0a`、487 files、worktree clean，且该冻结源历史内容不包含 `native/docs/baseline-run.md`。按 G0 mechanical integration runbook，最终 integration overlay 必须引入该路径并完成 manifest、sidecar digest 与文件校验；该记录的存在与校验通过只证明 Web/design source identity 及可复做合同，不证明 native implementation、平台、低配、GUI/IME/DPI、读屏、renderer、供应链、签名、安装或发布门禁。因此本账本仍是可审计的架构预算，不是实现后的实际 diff。

## 2. 硬上限

| 维度 | 冻结上限 | 当前计划增量 | owner | 超限处置 |
|---|---:|---:|---|---|
| 生产 crate | 3 | +3：`tessera-core`、`tessera-iced`、`tessera-gallery` | 架构 owner | 阻断；不得拆第四个长期 crate |
| 异步执行体系 | 1 | +1：iced `thread-pool` 体系 | iced owner | 阻断；Tokio/smol 不能并存 |
| Overlay Host | 1 | +1：native `OverlayHost` | interaction owner | 阻断；组件只提交 descriptor |
| SSD cache 实现 | 1 | +1：内容寻址 cache（可选 feature） | data owner | 阻断；不得保留第二套索引/淘汰算法 |
| token 生成链路 | 1 | +1：`design/tokens.toml` -> CSS/TS/Rust | design-system owner | 阻断；删除手工双写 |
| renderer 生产路径 | 每个产物 1 | +2 个独立产物：wgpu、tiny-skia | release owner | 阻断；默认不合并 fallback |
| 应用状态真源 | 1 / 应用 | +1：`AppState` | workflow owner | 阻断；组件不得复制业务值 |
| Message 入口 | 1 / 应用 | +1：`AppMessage` | workflow owner | 阻断；不得另建事件总线 |
| provider DTO | 1 / 语义 | +1：core typed provider contract | core owner | 阻断；禁止等价 DTO 双轨 |
| stable core public API | 仅语义类型 | 约 8 类首期边界类型 | core owner | 0.x 内评审；不暴露 renderer/platform 类型 |
| 任务队列 | 每类有界 | rows 4、CPU 2、I/O 2（目标） | runtime owner | 未有压测前标 `UNVERIFIED`，不许无界化 |
| 缓存内存索引 | 8 MiB | 1 个索引 | cache owner | 超限即阻断并回收 |

“+”是架构预算，不代表已经写入源项目。所有实现必须在相同 revision 更新“实际值”列。

## 3. 新增与删除配对

| 新增项 | 必须带来的真实删除/收敛 | 删除时点 | 验证 |
|---|---|---|---|
| 三个 native crate | 未来不得再有 native prototype crate、临时 demo crate | G1 workspace 建立时 | `cargo metadata` 只显示 3 个生产 package |
| token generator | 删除手工维护的 CSS 变量块、TS token 镜像和 Rust 手写 token；CSS/TS/Rust 只保留生成输出 | G1 | 生成后重复运行无 diff；无第二 token 源 |
| `Effect` interpreter | 删除组件内部网络/磁盘/OS callback 和各自 task runner | G2 | `rg` 热路径 I/O；调用图只有一个 interpreter |
| `OverlayHost` | 删除每个 Modal/Popover/Dropdown 的独立 portal/focus-loop/scroll-lock 实现 | W2 | overlay/focus 测试只命中 Host |
| `AsyncState` + generation | 删除 `loading/error/empty` 并列布尔字段、过期结果回写分支 | G2 | 状态机属性测试和乱序 fixture |
| Virtual provider | 删除按总数据量创建 widget、每帧全量 clone/sort/filter | G3 | 1M 行基准每帧只处理可见项+overscan |
| SSD cache | 删除同步命中写 SQLite、启动全目录扫描和无界内存 cache | G3 | 100ms 磁盘注入仍不阻塞 update |
| renderer 分包 | 删除默认 feature 聚合、双 renderer 单包和开发 feature 进入 release | G1 workspace/feature matrix | `cargo tree -e features` / 包体检查 |
| external action broker | 删除组件直达 shell、任意 URL、路径拼接和剪贴板轮询 | W2/W5 | broker 威胁模型与拒绝用例 |

若新增项不能完成对应删除，必须退回架构 owner；“未来可能需要”不是保留理由。

## 4. 依赖与 feature 预算

### 4.1 iced 直接边界

`iced` 固定为 `=0.14.0`、`default-features = false`。G0 冻结的 G1 初始公共集合只允许：

```text
thread-pool
advanced-shaping
advanced
```

每个发布目标再选择一个 renderer 和一个 Unix display backend：

```text
macOS:  wgpu-bare + direct wgpu(metal)
Windows: wgpu-bare + direct wgpu(dx12)
Linux X11: wgpu-bare + x11 + direct wgpu(vulkan)
Linux X11 compatibility: tiny-skia + x11
Wayland preview: wayland + one renderer
```

renderer feature/分包 spike 与 macOS compile-only 已完成；Windows/Linux 编译矩阵仍为 `UNVERIFIED`。不得用 `iced` 默认 `wgpu` feature 代替，因为它会通过 `iced_wgpu/default` 带入所有默认 backend。macOS 编译成功不证明 GUI、截图、idle/wakeup、IME/DPI、AccessKit 或低配资源门禁。

### 4.2 明确关闭

以下 feature 不得出现在 G1 初始依赖配置或后续 release：

`crisp`、`web-colors`、`debug`、`time-travel`、`hot`、`unconditional-rendering`、`tester`、`image`、`svg`、`markdown`、`highlighter`、`lazy`、`selector`、`sipper`、`webgl`、另一 renderer、未登记的 X11/Wayland backend。

`canvas` 只在 G4 作为独立能力打开；`disk-cache` 只在 Gallery 或明确需要缓存的宿主打开。新 feature 必须说明二进制成本、调用方、测试和删除条件。

## 5. 状态与调用链预算

冻结的单向调用链：

```text
iced event
  -> widget/component event
  -> Element::map
  -> AppMessage
  -> core state machine
  -> Effect
  -> one interpreter
  -> iced::Task<AppMessage>
  -> EffectFinished(generation checked)
```

允许的长期状态源只有：

1. `AppState`：业务和流程状态。
2. iced widget tree transient state：焦点、滚动、光标、测量、短时动画。
3. bounded cache metadata：可重建优化，不是业务真源。

禁止添加：React-style `value/defaultValue` 双轨、组件业务副本、跨端序列化组件树、全局事件 bus、每组件 task executor、第二个 cache index、第二个 overlay stack。

### 5.1 Message 预算

`AppMessage` 首期 canonical shape 固定如下；`Data`、`Form`、`Command` 只属于 `UiMessage`，不是 `AppMessage` 顶层 variant：

```rust
pub enum AppMessage {
    Ui(UiMessage),
    EffectFinished(EffectResult),
    Window(WindowMessage),
}

pub enum UiMessage {
    Data(DataMessage),
    Form(FormMessage),
    Command(CommandMessage),
}
```

内部组件消息通过 `Element::map` 映射；没有业务含义的 pointer/DOM event 不进入 core API。新增 Message variant 必须绑定一个 P0 流程或可复做 fixture。

## 6. 并发、缓存和资源预算

| 资源 | 目标上限 | 失败策略 | 状态 |
|---|---:|---|---|
| I/O worker | 2 | 队列满则拒绝/合并，UI 显示可恢复错误 | `UNVERIFIED` |
| CPU worker | 2，绝对上限 4 | 可取消、丢弃过期 generation | `UNVERIFIED` |
| 图片解码并发 | 2 | back-pressure | W5 `BLOCKED` |
| SVG 派生并发 | 2 | back-pressure | W5 `BLOCKED` |
| 磁盘读/写 | 4 / 1 | 写失败不破坏旧对象 | G3 `UNVERIFIED` |
| cache quota | 默认 512 MiB，128 MiB-2 GiB | SLRU 回收到 75% | G3 `UNVERIFIED` |
| GPU managed resource | 96 MiB soft / 160 MiB hard | 降级或 renderer 重建 | G4 `UNVERIFIED` |
| image input | 32 MiB、16 MP、单边 8192 | 拒绝并反馈 | W5 `BLOCKED` |
| SVG input | 2 MiB、1200 节点、50000 path 指令、嵌套 64 | 拒绝并反馈 | W5 `BLOCKED` |
| clipboard text | 1 MiB | 截断/拒绝 | W5 `BLOCKED` |
| drag-and-drop | 32 项、总声明 128 MiB | 拒绝超限 | W5 `BLOCKED` |

## 7. 性能预算

来自 `iced-plan.md` 的发布硬门槛，当前没有 native binary，全部为 `UNVERIFIED`：

| 指标 | 目标 | p99/阻断 |
|---|---:|---:|
| static focused CPU | mean <= 0.2% core, p95 <= 0.3% | p99 <= 1% |
| idle/minimized CPU | mean <= 0.1% | p99 <= 0.3%, no continuous redraw |
| update | p95 <= 2 ms | p99 <= 4 ms |
| update+view+layout | p95 <= 6 ms | p99 <= 12 ms |
| input-to-present | p95 <= 33.3 ms | p99 <= 50 ms |
| empty shell RSS | <= 100 MiB | <= 140 MiB |
| P0 workbench RSS | <= 160 MiB | <= 200 MiB |
| 8h growth | <= 20 MiB, slope <= 1 MiB/h | exceed = block |
| sync file I/O in UI path | 0 | any byte = block |

相对冻结 baseline 的 p95 恶化 >5% 或 p99 恶化 >10% 即阻断，即使绝对值未超门槛。

## 8. 里程碑账本

| 里程碑 | 允许新增 | 必须删除/证明 | 退出条件 |
|---|---|---|---|
| G0 | baseline、ADR、官方源码/清单、renderer/平台/字体/AccessKit/IME/DPI/截图/低配 spike 和冻结预算 | baseline、ADR、renderer feature/分包与 macOS compile-only 已完成；真实 screenshot、idle/wakeup、IME/DPI、AccessKit/读屏、M1 8 GiB 与 Windows 低配仍 `BLOCKED` | `G0 -> G1 BLOCKED`；合同冻结/工程准备完成不等于允许创建 workspace |
| G1 | G0 全部通过后创建三 crate workspace、token generator、Theme、FocusFrame、OverlayHost、Gallery/testkit | `cargo metadata` 仅 3 个生产 package；Rust 1.88 build、fmt、clippy、lock/tree/API/依赖检查通过；删除手工 token 双写和临时 native demo | `NOT STARTED`；不得用 G1 结果补交 G0 pre-workspace spike |
| G2 | W1 原子组件和三条 P0 最小切片 | 删除组件 task runner、布尔 async 状态、双值控件 | 在集成切片上复验状态契约、键盘、IME、亮暗/DPI；不替代 G0 或 G5 平台证据 |
| G3 | W2/W3、provider、Virtual*、disk-cache | 删除 O(N) 热路径、同步 I/O、无界 queue/cache | 1M 行/10万节点和故障注入通过 |
| G4 | Canvas 图表和业务卡片 | 删除 SVG DOM 运行时复制、无界采样/纹理 | 数值、命中、采样、GPU/RSS 通过 |
| G5 | 在集成实现上重复/扩展平台、低配、idle-wakeup、IME/DPI、字体、安全、fuzz、辅助技术证据 | 不得把 G5 当作 G0 spike 的延期点；删除未证实平台承诺和不受控输入路径 | `NOT STARTED`；Must-fix 关闭并据集成实机证据确认平台等级 |
| G6 | 发布包、SBOM、24h soak、回滚演练 | 删除 P0/P1 已知缺陷和不可回滚 schema；汇总 G0-G5 全部证据 | `NOT STARTED`；只有相应平台全部门禁通过才可发布 |

当前只有合同冻结与工程准备结论；G0 的必要 spike 尚未通过，因此 G1 不得启动。G1、G5、G6 的后续证据均不能反向替代 G0 pre-workspace spike。

## 9. 删除清单

以下条目必须在相应里程碑被删除或保持零结果：

- 手工维护的 TS/CSS/Rust token 副本；
- 跨端虚拟 DOM、通用 props 字典、React/iced 双状态同步；
- 永久 tick、`Poll`、`unconditional-rendering`、无界 channel/spawn/cache；
- 每帧全量 clone/sort/filter，按数组下标作为可变数据身份；
- 启动扫描整个 cache 目录、每次命中同步写 SQLite；
- 原始/解码/GPU 资源无界三份常驻；
- 为不可见数据创建 widget；
- Markdown/Mermaid 的 Chromium/WebView 兼容层；
- 默认双 renderer、默认同时启用 X11/Wayland、开发 feature 进入 release；
- 组件直达 shell、任意 URL、路径拼接、目录递归和剪贴板轮询；
- `src/theme/tokens.ts` 与 CSS token block 在 generator 接管后继续作为独立真源（目标源项目迁移时删除，当前未改源项目）。

## 10. 账本更新规则

每个实现 PR 必须更新本文件：

1. 写明 crate/feature/依赖/线程/缓存/公共类型的实际增量。
2. 为每个新增项写对应删除项、owner、调用方和删除 revision。
3. 附 `cargo metadata`、`cargo tree -e features`、测试/性能证据和 revision。
4. 若实际值超过上限，PR 自动阻断；不能用平均值、未运行的计划或 Web 证据覆盖。
5. 只有在迁移完成并删除旧路径后，才可把 `planned` 改为 `complete`。
