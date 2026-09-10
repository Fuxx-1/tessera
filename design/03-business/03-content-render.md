# Business · 内容渲染（4）

## CodeBlock 代码块

- 容器：`--ct-surface-sunken` 底 + 1px border-light + radius-lg(10)；
- 头部条 36：语言标 11 tertiary mono + 文件名 12 secondary + 复制/换行 IconButton(ghost sm)
  （hover 现身，复制成功瞬时换 success 勾 1.5s）；
- 代码区：mono 13 / 行高 1.6 / padding 12 16；行号列 tertiary 右对齐 + 12px 间隔；
- 语法高亮色板（中性化，两主题各一套）：关键字用墨色加重(500)、字符串 success 系、
  注释 tertiary 斜体、数字/常量 warning 系、函数 accent 系——饱和度全部压至状态色档，禁用彩虹主题；
- diff 行：added/deleted 用 Codex editor 令牌逻辑（成对 15%/23% 浅底 + decoration 色小三角）；
- 超高折叠：max-height 480 + 底部渐隐 + 展开 ghost 钮。

## MarkdownEditor Markdown 编辑器

双栏或切换式编辑器：

- 工具栏 = Toolbar 基座（格式 IconButton 群 + 分组 Divider + 右侧 编辑/预览 Segmented）；
- 编辑面：mono 13 无边框内嵌（容器统一描边），行高 1.7，当前行不高亮（保持安静）；
- 预览面：正文 14 / 行高 1.625（relaxed）/ max-width 64rem（Codex markdown 宽块）；
  标题按排版刻度、代码块内嵌 CodeBlock、表格按 Table 轻量版（行线 border-light）、
  引用块左 2px `--ct-border-heavy` 竖线 + secondary 文字；
- 双栏分隔 = Splitter 规格；同步滚动；
- 安全：渲染经 markdown-it + DOMPurify（现状保持），任何 HTML 注入面收敛在 utils。

## MermaidSvgViewer Mermaid 查看器

- 容器：Card 基座 + 居中画布，图底透明继承 surface；
- Mermaid 主题变量映射到 `--ct-*`（节点底 surface-muted、描边 border-heavy、文字 text、
  连线 text-secondary），禁止默认紫蓝主题；
- 工具条（右上悬浮胶囊，玻璃面）：缩放 ±、适配、导出 IconButton；
- 渲染失败：danger Alert 条 + 源码回退显示（CodeBlock）；
- SVG 经 `utils/svg.ts` 清洗后注入（安全边界保持现状）。

## MobilePreviewFrame 移动预览框

- 设备壳：360×740 视口 + 12px 壳边（`--ct-gray-900` 系）+ radius-4xl(24) 外 / 16 内 +
  hairline+xl 影；顶部刘海示意条 quaternary；
- 缩放档 100%/75%/50%（Segmented 控制），画布过窄时自动降档；
- 内容 iframe/portal 隔离主题作用域（可独立 light/dark 预览，ConfigProvider 主题岛）；
- 底部状态条：当前视口尺寸 mono 11 tertiary。
