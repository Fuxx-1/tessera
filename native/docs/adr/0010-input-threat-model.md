# ADR-0010: 文件、媒体、文本和外部动作的输入威胁模型

- 状态：Accepted at G0; high-risk capabilities deferred
- 日期：2026-08-17
- Owner：security owner
- 关联：[architecture](../architecture.md)、[complexity ledger](../complexity-ledger.md)

## Context

文件、SVG、图片、字体、Markdown、Mermaid、剪贴板和拖放内容均是不可信输入。Web 端的 DOMPurify/SVG 清洗结果不能直接成为 native 安全结论；native renderer、GPU driver、路径解析和缓存也属于边界。

## Decision

安全路径固定为：

```text
iced UI -> Capability Broker -> bounded Content Worker -> Safe IR/controlled cache -> Renderer
```

首发规则：

- 图片输入 <= 32 MiB、<= 16 MP、单边 <= 8192、解码后 <= 64 MiB；
- SVG <= 2 MiB、<= 1,200 nodes、<= 50,000 path instructions、嵌套 <= 64；拒绝脚本、事件、`foreignObject`、动画、外部引用、嵌入图片和高成本 filter；
- Markdown 丢弃 raw HTML，链接只生成待授权 action；Markdown/Mermaid 不进入 P0；未来 Mermaid 单 worker <= 256 MiB、单次 <= 3.5s、并发 1，最多 8 block/12,000 字符/260 statements；
- 路径规范化后授权，处理 `..`、符号链接、UNC、设备路径、大小写和 TOCTOU；不跟随目录和符号链接递归；
- 剪贴板只在用户手势读取，文本 <= 1 MiB，禁止轮询；拖放最多 32 项、总声明大小 <= 128 MiB；
- URL 只允许显式 `http/https`、单 URL <= 8 KiB；命令执行首发关闭，未来也禁止 shell 和内容字符串直达 OS；
- cache key 不接受路径拼接，敏感内容默认不落盘；GPU 资源有上限，设备丢失可恢复；
- 首发关闭远程资源、用户字体、运行时 `.dylib/.so/.dll` 插件。

## Consequences

高风险内容需要 worker、fixture、fuzz 和资源故障测试，首发能力范围更小但主进程边界清晰。可信内置资产可走进程内快路径，但必须显式标注来源。

## Verification and exit criteria

G5 前必须有边界解析器 fuzz、拒绝用例、路径授权和缓存故障证据；任一高危/严重问题未关闭不得发布。当前没有 native worker/broker，状态 `BLOCKED`（设计已冻结，代码未实现）。
