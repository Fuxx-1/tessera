# Base · 自有扩展（4）

Tessera 超出参照物清单的自有基础件。设计上必须与同族组件严格同规格。

## Textarea 文本域

= Input 输入面共性的多行版：min-height 72（3 行）、padding 10 12、行高 1.5；
右下角拖拽手柄（仅纵向 resize，图标 quaternary）；autoSize 模式按内容 1–N 行伸缩 160ms；
字数统计 11 tertiary 右下（超限转 danger）。
禁忌：横向 resize；与 Input 描边/圆角不一致。

## IconButton 图标按钮

方形按钮族补充：尺寸 28(sm)/32(md)/36(lg) 正方、radius-md、图标 16；
变体同 Button（solid/soft/ghost），默认 ghost；**必填 `aria-label`**，桌面配 Tooltip 补名。
工具栏内成组时 gap 2、共享 hover 水洗。
禁忌：无可达名称；圆形化（圆形专属 FloatButton/Avatar）。

## Toolbar 工具栏

面板级操作条：高 40（Codex toolbar-pane）、padding 0 8、底衬 border-light（或无边贴卡头）；
内容 = IconButton(ghost) 群 + Divider(垂直, 高16) 分组 + 右侧弹性区；
溢出折叠进"更多" Dropdown；粘性模式转玻璃面（同 Affix）。
禁忌：工具栏内混用 solid 大按钮。

## BorderBeam 边缘光束

**唯一的装饰性组件**，用于 AI 生成中/焦点卡片的边缘流光：
1px 渐变光束沿 radius 轨道巡回（accent → 透明），周期 3s linear；
底层描边保持 `--ct-border` 不变；`prefers-reduced-motion` 时退化为静态 accent 30% 描边；
subtle 变体光束透明度减半。**全应用同屏 ≤ 1 处**——这是稀缺资源纪律的极端案例。
禁忌：常驻使用；叠加发光阴影。
