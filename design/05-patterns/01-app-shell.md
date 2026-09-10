# Patterns · 01 应用壳层

> Codex 桌面端的壳层构成是本规范中最"成品级"的参照：侧栏会话列表 + 主面浮起 + 玻璃工具条。
> Tessera 文档站（`src/docs/DocsShell.tsx`）与任何使用本组件库的应用均按此模式搭建。

## 1. 壳层结构

```
┌─ window（画布 --ct-bg）─────────────────────────────┐
│ ┌ Sidebar 252px ┐ ┌ Main Surface ────────────────┐ │
│ │ 品牌区 46px    │ │ Topbar 46px（玻璃可选）        │ │
│ │ 导航（药丸行）  │ │ ───────────────────────────  │ │
│ │ …            │ │ Content max 1120 padding 24/32│ │
│ │ 底部账户区     │ │                              │ │
│ └──────────────┘ └──────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

- **主面浮起**（Codex `main-surface`）：内容区是一块浮在画布上的 surface，
  配 `--ct-shadow-hairline`（elevation-stroke 0.5px）+ 极轻双层影
  （`0 3px 7.5px #0000000a, 0 0 20px #0000000d`），radius-2xl 左上（贴边侧零圆角）；
- Sidebar 直接坐在画布上（无边框卡片化），与主面之间靠海拔差分层；
- Topbar 贴主面顶部，滚动后转玻璃面（surface-glass + blur 12）+ 底衬 border-light。

## 2. Sidebar 规格

- 宽 252（收起 64）；padding 8；
- 导航行 = Menu 药丸规格（30 高、radius-full、水洗 hover、selected 中性底）；
- 分组标题 11 tertiary、上 16 下 4；
- 底部账户行：Avatar 24 + 名称 13 + 设置 IconButton，上衬 border-light；
- 一级信息不超过 ~9 行，多余折叠进分组。

## 3. Topbar 规格

- 高 46（Codex `--height-toolbar`）；左：页面标题 14–16/500（+ 面包屑可选）；
  右：全局动作 IconButton(ghost) 群 + 主题切换 + 主动作；
- 搜索/命令入口显示为伪输入框胶囊（240px、`--ct-surface-muted` 底、tertiary 文字 + ⌘K kbd），
  点击唤起 CommandPalette。

## 4. 主题切换

- 亮/暗随 `data-theme` 全局切换，默认跟随系统（`prefers-color-scheme`）；
- 切换瞬间禁用全局 transition（防彩色闪烁），下一帧恢复；
- 主题岛（预览容器）借 ConfigProvider 局部覆写。

## 5. 文档站专属（DocsShell）

- 导航 = 注册表驱动（`componentRegistry.ts`）：分类分组 + 状态徽记（中性 Badge）；
- 组件页骨架：H2 标题(24/500) + 描述(14 secondary) → Demo 卡（demo-container 规格）→
  Props 表（Table 轻量版）→ 规范引用链接回本 design 目录；
- Playground 页保持画布底 + 卡片化控件区。
