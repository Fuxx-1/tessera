# Base 层 · 基础组件设计通则

> 覆盖 `src/components/base` 全部 75 个组件页（含文档型 `Util`）。
> 本 README 定义所有 Base 组件共享的解剖、尺寸、令牌与验收约定；分组文件只写各组件的**差异规格**。

## 分组索引

| 文件 | 组 | 组件 |
| --- | --- | --- |
| `01-general.md` | 通用 (4) | Button, FloatButton, Icon, Typography |
| `02-layout.md` | 布局 (7) | Divider, Flex, Grid, Layout, Space, Splitter, Masonry |
| `03-navigation.md` | 导航 (7) | Anchor, Breadcrumb, Dropdown, Menu, Pagination, Steps, Tabs |
| `04-data-entry.md` | 数据录入 (18) | AutoComplete, Cascader, Checkbox, ColorPicker, DatePicker, Form, Input, InputNumber, Mentions, Radio, Rate, Select, Slider, Switch, TimePicker, Transfer, TreeSelect, Upload |
| `05-data-display.md` | 数据展示 (20) | Avatar, Badge, Calendar, Card, Carousel, Collapse, Descriptions, Empty, Image, List, Popover, QRCode, Segmented, Statistic, Table, Tag, Timeline, Tooltip, Tour, Tree |
| `06-feedback.md` | 反馈 (10) | Alert, Drawer, Message, Modal, Notification, Popconfirm, Progress, Result, Skeleton, Spin |
| `07-other.md` | 其他 (5) | Affix, App, ConfigProvider, Util, Watermark |
| `08-extensions.md` | 自有扩展 (4) | Textarea, IconButton, Toolbar, BorderBeam |

## 1. 共享解剖

```
[容器 container] 1px --ct-border · radius 按海拔 · 底 --ct-surface
  [前导 leading]   图标 16px / Avatar / 状态点
  [主体 body]      文字 14px --ct-text（次级 12px secondary）
  [尾随 trailing]  快捷键提示 / 箭头 / 计数 / 清除钮
```

- 图标默认 16×16（`1em` 随文字），触发器箭头/关闭等辅助图标着 `--ct-text-tertiary`。
- 文字溢出一律 ellipsis + Tooltip 补全；不允许中断布局。

## 2. 尺寸规范（全组件对齐）

| size | 控件高 | 字号 | 水平 padding | radius |
| --- | --- | --- | --- | --- |
| sm | 30 | 12 | 10px | `--ct-radius-md` (8) |
| md（默认） | 36 | 14 | 12px | `--ct-radius-md` (8) |
| lg（少数组件） | 44 | 14 | 16px | `--ct-radius-lg` (10) |

## 3. 状态

统一继承 `../01-foundations/07-interaction-states.md` 八态矩阵；分组文件只标注该组件的特殊态
（如 Input 的 error、Switch 的 checked）。

## 4. 弹层类共性（Dropdown/Select/Popover/Tooltip/DatePicker…）

- 面：`--ct-surface-elevated`；影：`hairline + md~lg` 档；radius `--ct-radius-lg~xl`；
- 与触发器间隙 4px；自动翻转防溢出；宽度 ≥ 触发器宽（列表类）；
- 内部选项行：高 32px、radius `--ct-radius-sm`、hover 水洗、选中 `--ct-accent-soft` 底 +（可选）勾标；
- 出入动效按 `../01-foundations/06-motion.md` Dropdown 配方。

## 5. 令牌纪律

- 组件 CSS 只允许消费 `--ct-*` 语义令牌；出现 hex/rgb 即验收不通过（图表色板文件除外）。
- 遗留 `--codex-*` 引用（Button/Modal/Dropdown 等 style.css）属于历史欠账，见 `../06-adoption/README.md`。
- class 命名沿用现状 BEM：`c-<组件>`、`c-<组件>__<部位>`、`c-<组件>--<变体>`。

## 6. 每组件文档结构约定

分组文件中每个组件按以下压缩格式书写：

```
### ComponentName 中文名
用途一句话。
结构：关键部位与measurements。
规格：变体/尺寸/关键令牌。
状态：仅写特殊态。
禁忌：本组件最易破坏 Codex 风格的错误用法。
```
