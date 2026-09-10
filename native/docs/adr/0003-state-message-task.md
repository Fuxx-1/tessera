# ADR-0003: 应用状态、组件临时状态与异步 Effect 的所有权

- 状态：Accepted at G0
- 日期：2026-08-17
- Owner：workflow/runtime owner
- 关联：[architecture](../architecture.md)、[complexity ledger](../complexity-ledger.md)

## Context

iced 0.14 的应用 builder 要求 `boot`、`update`、`view`；`update` 返回 `Task<Message>`，`view` 返回 `Element`，`subscription` 返回声明式 `Subscription<Message>`。Web 端存在 controllable-state 和 overlay hook 的概念，但 native 不能复制 DOM 状态或使用 `value/defaultValue` 双轨。

## Decision

### State

- `AppState` 是每个应用唯一的业务真源，持有查询、选择、表单值、`AsyncState`、错误和 generation；
- 组件只保存焦点、滚动、光标、测量和短时动画等 transient state；受控值由宿主传入，变更通过 typed event 返回；
- core 状态机是纯 Rust，可在无 iced 环境测试和重放。

### Message

应用只有一个入口 `AppMessage`。`Data`、`Form`、`Command` 是 `UiMessage` 的子域，不得同时成为 `AppMessage` 顶层 variant：

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

组件内部消息使用 `Element::map` 汇入对应 `UiMessage` 子域；pointer event、DOM event 和 renderer 内部对象不进入 core API。

### Effect and Task

core 的 `Effect` 是描述值，不包含 future、线程或 OS handle。唯一 interpreter 位于应用宿主：

```text
AppMessage -> core update -> Effect -> one interpreter -> iced::Task<AppMessage>
```

允许 `Task::none/perform/map/then/batch/abortable`，但所有队列有界、可取消，结果携带 `generation` 和逻辑 key。过期结果无条件丢弃；取消只优化资源，不承担正确性。

表单状态固定为 `Pristine | Checking | Valid | Invalid(Vec<FieldError>)`；远程内容固定为 `Loading | Refreshing | Ready(T) | Empty | Failed(E)`，禁止并列布尔字段。

### Subscription and redraw

`Subscription` 只表达真实窗口/输入/后台事件或活动动画。静态窗口返回 `none`，不使用永久 tick、轮询或 `unconditional-rendering`。

## Consequences

状态机和异步乱序可以纯 Rust 属性测试；组件 API 更明确，但宿主必须显式映射消息和解释 effect。不能为了“方便”在组件内启动第二个 executor 或写入业务状态。

## Verification and exit criteria

需要状态不变量、generation 乱序、重复提交、取消和恢复 fixture；需要 `cargo tree` 证明只有一个 async runtime。当前 G0 pre-workspace spike 门禁 `BLOCKED`，native 工程与这些 G1/G2 测试均为 `NOT STARTED`。
