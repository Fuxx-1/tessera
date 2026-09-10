# Base · 其他（5）

## Affix 固钉

吸附时为元素追加"浮起"反馈：底转 `--ct-surface-glass` + backdrop-blur(12) + 底衬 border-light
（或 hairline 影）；进入/退出吸附 120ms 淡变；z-index 取 sticky(100) 档。
禁忌：吸附后加大阴影。

## App 应用包裹

无视觉输出；提供 Message/Notification/Modal 的上下文挂载点与全局配置读取；
保证弹层容器继承 `data-theme` 令牌作用域（Portal 场景防主题丢失）。

## ConfigProvider 全局配置

主题切换入口：切换 `data-theme="dark"`、注入 `--ct-corner-radius-scale` 等少量全局旋钮；
局部主题岛（如暗色 sidebar 嵌亮色页）通过容器级 `data-theme` 实现；
提供组件默认 props（size、locale）下发。设计约束：**可配置面收窄**——只开放 token 级旋钮，
不开放任意色值覆写（防跑出 Codex 体系）。

## Util 基础工具

文档型页面（非视觉组件）：cx、Portal、focus-trap、scroll-lock 等基建的行为契约说明。
设计相关约定：Portal 容器必须复制主题作用域；scroll-lock 补偿滚动条宽度防跳动。

## Watermark 水印

文字水印：12px、`--ct-text` 6–8% 透明度（比 quaternary 更弱）、-22° 旋转、平铺 gap 100×100；
不遮挡交互；暗色主题自动换白系墨。防篡改（MutationObserver 重建）为行为要求。
禁忌：水印透明度高于 10%（喧宾夺主）。
