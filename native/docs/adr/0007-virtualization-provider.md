# ADR-0007: 固定行高虚拟化与异步 provider 合同

- 状态：Accepted for G2/G3
- 日期：2026-08-17
- Owner：data interaction owner
- 关联：[architecture](../architecture.md)、[complexity ledger](../complexity-ledger.md)

## Context

Web 基线目前多用渲染上限，并不等于 native 虚拟化。桌面 P0 需要大表格和树，但动态行高、固定列和复杂合并会显著增加 layout、scroll 和编辑状态复杂度。

## Decision

- `VirtualList`、`DataGrid`、`VirtualTree` 是独立能力，不让普通 List/Table/Tree 永久背负复杂状态机；
- P0 只承诺固定行高；动态行高、固定左右列、复杂合并单元格延期；
- 每帧复杂度必须是 `O(visible + overscan)`，默认 overscan 一屏，行 8-64，列 2；
- DataGrid 基准为 1,000,000 logical rows x 50 columns，provider 以 256 行页异步提供，约 60 x 12 可见单元格；
- Tree 使用稳定 `NodeId`、arena 和增量可见序列，展开/折叠只修改连续子树；
- 可变数据禁止使用数组下标身份；滚动、选择、展开和编辑状态各只有一个真源；
- 100,000 行以内本地排序/筛选放后台、可取消，目标 p95 <= 150ms、p99 <= 300ms；
- provider 返回带 query/version/generation 的 typed page，乱序结果不得覆盖新 query。

## Consequences

固定行高让布局和性能可预测，牺牲了早期复杂表格的表现力。业务层必须提供稳定 ID、schema 和分页错误语义，不得把全量数据复制进 widget tree。

## Verification and exit criteria

G3 需要 1M 行、10 万节点、滚动/选择/展开/编辑和 provider 故障注入证据。若出现随总数据量线性增长、同步 I/O 或无界 page/cache，立即阻断。当前未实现，状态 `UNVERIFIED`。
