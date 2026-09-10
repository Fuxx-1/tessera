# Base · 数据录入（18）

## 0. 输入面共性（Input 族全员）

| 属性 | 值 |
| --- | --- |
| 高度 | 36(md)/30(sm)，水平 padding 12/10 |
| 面/边 | 底 `--ct-surface`、1px `--ct-border`、radius md(8) |
| hover | 描边升 `--ct-border-heavy` |
| focus | 描边 `--ct-accent` + 焦点环（见 foundations 07） |
| placeholder | `--ct-text-tertiary` |
| 前后缀 | 图标 16px tertiary；清除钮 hover 才现身 |
| error | 描边 `--ct-danger-border`、focus 环 danger 化、下方 12px danger 文字 |
| disabled | 底 `--ct-surface-muted`、字 disabled、边 border-light |

选择类（Select/Cascader/TreeSelect/AutoComplete/Mentions/DatePicker/TimePicker）的弹层遵循
`../README.md` 弹层共性；选项行高 32、选中 `--ct-accent-soft` 底 + 右侧 14px 勾。

## Input 输入框

上表即全部。附加：字数统计 11px tertiary 右下；`addonBefore/After` 用 `--ct-surface-muted` 底分节。

## Textarea 见 `08-extensions.md`（自有扩展）

## InputNumber 数字输入框

步进钮纵向叠于右缘（宽 24，hover 才显形），图标 12px tertiary；数字右对齐 tabular-nums。
禁忌：步进钮常显粗边框。

## AutoComplete 自动完成

= Input + 建议弹层；匹配片段以 500 字重强调（不换色）；无结果时展示 Empty 紧凑态（padding 16）。

## Select 选择器

触发器=输入面 + 尾随 chevron（16px tertiary，开启时旋转 180° 160ms）；
多选 Tag 于内部堆叠（Tag 高 22、radius-sm、gap 4，超出 +N 计数）；搜索态光标直接进触发器。

## Cascader 级联选择

多列面板并排，每列宽 160–200、独立滚动；列间 1px border-light 分隔；
已选路径行持续 selected 底；末级带勾。移动端退化为逐级下钻单列。

## TreeSelect 树选择

弹层内嵌 Tree（规格见数据展示组）；复选模式父子联动，半选态用中性半选杠（`--ct-text` 底 2px 杠）。

## Mentions 提及

文本域内 `@` 触发人员弹层；候选行 32px：Avatar 20 + 名字 13 + 账号 12 tertiary；
已插入的提及文字着 `--ct-accent`（罕见的行内 accent 合法场景）。

## Checkbox 复选框

盒 16×16、radius-xs(4)、1.5px `--ct-border-heavy` 描边；选中：`--ct-accent` 底白勾（勾划入 160ms）；
半选：accent 底白色 8×2 杠；label 间距 8；组内纵向 gap 8 / 横向 16。
禁忌：盒放大超过 18px；选中用中性黑底（复选/单选是 accent 的法定场景）。

## Radio 单选框

圈 16×16 圆、1.5px border-heavy；选中：accent 描边 + 内点 6px accent（缩放入场 160ms）；
按钮组变体=Segmented 视觉（见数据展示组），不重复造型。

## Switch 开关

轨 36×20 radius-full；关=`--ct-border-heavy` 底，开=`--ct-accent` 底；
滑块 16px 白圆 + shadow-sm，滑动 160ms 通用曲线；loading 时滑块内 10px spinner；
sm 档 28×16/滑块 12。

## Slider 滑块

轨 4px radius-full `--ct-border`；已选段 `--ct-text`（中性，非蓝）；
手柄 14px 白圆 + 1.5px `--ct-text` 描边 + shadow-sm，hover/拖动放大至 16 并出 Tooltip 数值；
刻度点 4px、标签 11px tertiary。范围模式两手柄同规格。
禁忌：蓝色轨道（Codex 的进度语义用中性墨）。

## Rate 评分

星 18px；未选 `--ct-border-heavy` 线性星，已选 `--ct-warning`（暖琥珀）实星；
hover 预览即时点亮；半星支持；只读态无 hover。数字辅注 12 secondary。

## ColorPicker 颜色选择器

触发器 36 高：24px 色样（radius-sm、hairline 内描边）+ hex 文字 mono 13；
面板：饱和度面（radius-md）+ 色相/alpha 条（高 10、radius-full、滑块白圈）+
预设色格 20×20 radius-sm gap 4 + hex/rgb 输入切换。全部控件走令牌，无自带彩色 UI。

## DatePicker 日期选择器

触发器=输入面 + 日历图标尾随；面板 radius-xl、padding 12：
头部（月年切换 chevron 钮 28×28 ghost + 标题 14/500）+ 星期行 11 tertiary +
日格 **32×32 radius-full**：今天=1px accent 描边、选中=**反相 `--ct-btn-primary-bg` 底**、
范围中段=`--ct-surface-selected` 连底、跨月日 quaternary；
底部快捷区（今天/此刻）ghost 小钮。范围选择双月面板并排，间隔 16。
禁忌：选中日用蓝底（Codex 日历选中是反相中性）。

## TimePicker 时间选择器

面板三列滚轮（时/分/秒），列宽 64、行高 32 radius-sm、选中行 selected 底 + 500 字重；
列间 border-light；底部"此刻/确定"条。

## Form 表单

纵向布局默认：label 13/500 在上、间距 6、控件下方留 4 给错误文字；表单项纵向 gap 20；
必填 `*` 着 danger 前置；说明文字 12 tertiary；
分组用 H4(18/500) + 24 上距；操作区（solid+ghost）与表单体间距 24。
错误汇总滚动定位到首个错误项。水平布局仅在密集设置页使用（label 宽 160 右对齐）。

## Transfer 穿梭框

双列卡片各 240×320：头部（全选 Checkbox + 计数 12 secondary）+ 搜索 Input(sm) +
选项行 32（Checkbox+文字）+ 底部计数条；中间穿梭钮 IconButton(soft) 28×28 纵向两枚；
空列显示 Empty 紧凑态。

## Upload 上传

拖拽区：2px **虚线** `--ct-border-heavy`、radius-xl、padding 32、内容居中
（上传图标 24 tertiary + 主文案 14 + 辅注 12 tertiary）；拖入悬停：描边变 accent、底 `--ct-accent-soft`；
文件列表行 36：类型图标 + 名称 13（ellipsis）+ 大小 12 tertiary + 进度条(2px) + 操作钮 hover 现身；
图片卡模式 96×96 radius-md 网格 gap 8。失败行文字与图标 danger 化 + 重试钮。
