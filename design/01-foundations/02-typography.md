# Foundations · 02 排版系统

> 落地位置：`src/styles.css` `--ct-font-*` / `--ct-text-*` / `--ct-weight-*` / `--ct-leading-*`。

## 1. 字体栈

| 令牌 | 值 | 说明 |
| --- | --- | --- |
| `--ct-font-sans` | `ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif` | Codex 系统栈 + 中文补充 |
| `--ct-font-mono` | `ui-monospace, "SF Mono", "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace` | 代码、数字对齐场景 |

- 不引入 Webfont（Codex 的 "OpenAI Sans" 是品牌资产，仅出现在其登录页，不复制）。
- `font-synthesis: none` + 抗锯齿开启（已在 `:root` 落地）。

## 2. 字号刻度（Codex 原值）

| 令牌 | px | 角色 |
| --- | --- | --- |
| `--ct-text-xs` | 11 | 徽标数字、轴刻度、最小辅注 |
| `--ct-text-sm` | 12 | 密集 UI（表格、侧栏、Tag、辅助说明） |
| `--ct-text-base` | 14 | **全局默认正文** |
| `--ct-text-lg` | 16 | 强调正文、列表主标题 |
| `--ct-text-heading-sm` | 18 | 小节标题（h4） |
| `--ct-text-heading-md` | 20 | 区块/对话框标题（h3） |
| `--ct-text-heading-lg` | 24 | 页面标题（h2） |
| `--ct-text-xl` | 28 | 大页头（h1） |
| `--ct-text-2xl` | 36 | 营销/空态大字，组件库内极少用 |

注意 Codex 的刻度**故意比 Tailwind 默认小一号**（xs=11 而非 12，base=14 而非 16）——
桌面工具类产品的信息密度取向，Tessera 完整继承。

## 3. 字重与标题语调

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| `--ct-weight-normal` | 400 | 正文 |
| `--ct-weight-medium` | 500 | **所有标题的默认字重**、按钮文字、导航当前项 |
| `--ct-weight-semibold` | 600 | 表格数字强调、MetricCard 主数值、行内强调 |
| `--ct-weight-bold` | 700 | 保留档，正常界面不出现 |

Codex 全系 `.heading-*` 都是 **medium(500)**——"标题靠字号与留白建立层级，不靠加粗嗓门"。
这是与常见组件库（标题 600/700）最大的气质差异，必须坚持。

## 4. 标题规格表（对齐 Codex `.heading-*`）

| 层级 | 字号 | 字重 | 行高 | 场景 |
| --- | --- | --- | --- | --- |
| Display | 28 | 500 | 1.2 | 首屏页头 |
| H2 页面标题 | 24 | 500 | 1.2 | 文档页 topbar 标题 |
| H3 区块标题 | 20 | 500 | 1.33 | 卡片组标题、Modal 标题 |
| H4 小节标题 | 18 | 500 | 1.33 | 表单分组标题 |
| Label 强标签 | 12–14 | 500 | 1.4 | 表单 label、表头、图例标题 |
| Caption | 11–12 | 400 | 1.4 | 辅注（配 `--ct-text-secondary/tertiary`） |

## 5. 行高与字距

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| `--ct-leading-tight` | 1.25 | 大标题 |
| `--ct-leading-snug` | 1.375 | 卡片标题、多行按钮 |
| `--ct-leading-normal` | 1.5 | 正文默认 |
| `--ct-leading-relaxed` | 1.625 | 长文阅读（Markdown 渲染区） |
| `--ct-tracking-*` | **0** | 全部为 0 |

> 适配决策：Codex 对话框标题带 `-0.36px` 负字距，Tessera 因中英混排一律 0 字距（负字距会让中文黏连）。

## 6. 数字与代码

- 表格、指标、时间等需要对齐的数字：`font-variant-numeric: tabular-nums`（等宽数字），不切换 mono 字体。
- 行内代码：`--ct-font-mono`，字号取上下文的 ~0.93em，底色 `--ct-surface-sunken`，圆角 `--ct-radius-xs`。
- 代码块：mono 13px / 行高 1.6，底 `--ct-surface-sunken`，描边 `--ct-border-light`。

## 7. 使用守则

- 一个视图内标题层级最多出现 3 档；跳级（24 直接配 12）优于挤满每一档。
- 次级信息优先"降色"（text-secondary）而非"缩号"；字号低于 11px 禁止。
- 链接默认 `--ct-accent`、无下划线，hover 加下划线（`text-underline-offset: 2px`）。
- 中文与拉丁字符间不手工加空格，交给渲染；标点悬挂不做要求。
