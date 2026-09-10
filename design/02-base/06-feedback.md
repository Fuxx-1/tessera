# Base · 反馈（10）

## Alert 警告提示

条状：状态浅底 `--ct-*-bg` + 1px 状态描边 + radius-md、padding 10 12；
前导状态图标 16 状态色、标题 13/500、正文 13（着状态 fg 的 85% 观感——直接用状态 fg）、
关闭 × tertiary；带描述变体 padding 12 16、标题下 4 正文。
禁忌：整条大饱和实底；同屏多条堆叠超过 2。

## Drawer 抽屉

面 `--ct-surface`、影 `--ct-shadow-modal`、靠边零圆角（底部抽屉顶角 radius-2xl）；
宽度档 378/640（右侧）；头部 56：标题 16–20/500 + 关闭钮，底衬 border-light；
body padding 24；底部操作条上衬 border-light、右对齐 ghost+solid；
遮罩 `--ct-overlay`；入 200ms enter / 出 160ms exit。

## Message 全局提示

顶部居中浮出；胶囊面：elevated 底 + hairline + floating 影 + **radius-full**、高 36、padding 0 16；
状态图标 16 + 文字 13；单行不换行（长文用 Notification）；默认 3s 自动关闭；
多条纵向堆叠 gap 8，新条顶部滑入 translateY(-8)。

## Modal 对话框

面 `--ct-surface` radius-2xl(16)、影 modal、宽度档 sm 400 / md 560 / lg 720；
头部 padding 20 24 12：标题 **20/500**（Codex heading-dialog）+ 关闭钮 28 ghost 右上；
body padding 0 24、正文 14 secondary；
底部 padding 16 24 20 右对齐：ghost 取消 + solid 确认（danger 场景 solid 换 danger 底）;
遮罩 overlay + 本体 translateY(8→0) 200ms；Esc/遮罩点击可关（危险确认关闭遮罩点击）。
确认式小 Modal（sm）图标 20 状态色 + 标题同行。

## Notification 通知提醒框

右上角堆叠；卡 360 宽：elevated 底 + hairline + floating 影 + radius-xl、padding 16；
状态图标 20 + 标题 14/500 + 正文 13 secondary + 时间 12 tertiary + 关闭钮；
可挂 ghost 动作钮；4.5s 自动关闭（含动作则不自动）；入场右滑 200ms。

## Popconfirm 气泡确认

Popover 规格 + 头部：warning 图标 16 + 问题文字 13/500；
按钮行右对齐：ghost 取消 + solid(sm, 高 28) 确认（危险动作 danger 底）；max-width 280。

## Progress 进度条

线形：轨 4px（可 6）radius-full `--ct-border`；**进度段 `--ct-text` 中性墨**；
成功态终段变 success、异常段 danger；百分比文字 12 secondary tabular-nums 尾随；
环形：直径 64/96、描边 6、同色规则、中心数值 14–20/600。
不确定态：30% 段左右往返 1.2s。
禁忌：蓝色/渐变进度条。

## Result 结果页

居中布局：状态图标 48（线性圆底：状态浅底圆 + 状态色图标）+ 标题 20/500 + 
副文案 14 secondary + 操作组（solid+ghost）gap 12；上下留白 48。
404/500 变体用中性勾线插画（同 Empty 风格放大）。

## Skeleton 骨架屏

形状：文字行高 14 radius-xs、标题 20 radius-xs、矩形 radius-md、圆形 radius-full；
底 `--ct-surface-muted`；动效 = Codex shimmer：前景 4% 高光带扫过 2s steps(48) 循环
（`prefers-reduced-motion` 时静止）；段落行宽 100/100/60% 节奏。

## Spin 加载中

圆环 spinner：2px 描边、`--ct-text-tertiary` 轨 + `--ct-text` 头部弧，1s linear；
尺寸 14(行内)/20(默认)/32(容器)；容器级：内容 opacity .4 + 中心 spinner + 可选 12px tertiary 文案；
延迟 300ms 显示（防闪烁）。
禁忌：彩色/多色 spinner。
