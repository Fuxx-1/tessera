# ADR-0006: SSD 内容寻址缓存、配额、隐私与损坏恢复

- 状态：Accepted as deferred optional capability
- 日期：2026-08-17
- Owner：data/cache owner
- 关联：[architecture](../architecture.md)、[complexity ledger](../complexity-ledger.md)

## Context

桌面工作台需要低内存和热启动，但磁盘不能进入 iced 的 `view`、`update`、layout 或 hit-test 热路径。缓存删除、损坏、旧 schema 或权限失败后必须可重建。缓存不是业务状态真源。

## Decision

`disk-cache` 是可选 feature；Gallery 默认开启，基础组件不依赖它才能工作。结构固定为：

```text
cache/v1/
  index.sqlite3
  objects/ab/cd/<sha256>
  derived/<kind>/<sha256>-<variant>
  tmp/
```

- SQLite 只存索引/元数据，对象文件使用 hash 内容寻址；
- 默认 quota 512 MiB，可配置 128 MiB-2 GiB；probation/protected SLRU 为 25%/75%，90% 回收到 75%；
- 内存索引硬限 8 MiB；访问时间按 30 秒或 256 次命中批量落库；启动不遍历全目录；
- 默认 2 个 I/O worker、2 个 CPU worker，所有 queue 有界、可取消；
- 写入为同目录临时文件 -> 校验 -> `fdatasync` -> 原子 rename -> 目录同步 -> SQLite WAL 事务；
- 缺失、截断、乱码、旧 schema、拒绝访问、磁盘满和短写都按 miss/可恢复错误处理，不破坏旧有效对象；
- 默认不落盘剪贴板、密码、令牌、敏感原文、GPU 纹理和 iced/wgpu 布局对象。

## Consequences

增加 schema、淘汰和恢复测试，但把可再生数据从 RSS 中移出。缓存不可用不影响核心流程；应用状态仍在内存和 provider 中。

## Verification and exit criteria

G3 必须证明 100ms 磁盘延迟下 UI task dispatch p95 <= 2ms、故障注入可恢复、配额和隐私规则有效。当前没有 native cache 实现，全部为 `UNVERIFIED`，不能在 G0 宣称已启用。
