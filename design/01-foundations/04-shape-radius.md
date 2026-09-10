# Foundations · 04 形状与圆角

> 落地位置：`src/styles.css` `--ct-radius-*` 与 `--ct-corner-radius-scale`。

## 1. 刻度（Codex 原值 × 全局缩放）

所有圆角 = base × `--ct-corner-radius-scale`（默认 1）：

| 令牌 | base px | 典型用途 |
| --- | --- | --- |
| `--ct-radius-2xs` | 2 | 文本高亮 mark、进度条内条 |
| `--ct-radius-xs` | 4 | 行内代码、Checkbox 方框、小 Tag |
| `--ct-radius-sm` | 6 | 菜单项、紧凑按钮、图例项 |
| `--ct-radius-md` | 8 | **默认控件档**：按钮、输入框、Select、Tooltip |
| `--ct-radius-lg` | 10 | 大按钮、弹出面板 |
| `--ct-radius-xl` | 12 | 卡片、Modal、Popover |
| `--ct-radius-2xl` | 16 | 大卡片、Drawer 顶角、命令面板 |
| `--ct-radius-3xl` | 20 | 移动端浮层 |
| `--ct-radius-4xl` | 24 | 特大容器（MobilePreviewFrame 外框） |
| `--ct-radius-full` | 9999 | 药丸：导航行、Badge、Tag(胶囊)、Avatar、Switch |

## 2. Squircle（超椭圆）渐进增强

Codex 在支持的引擎上启用苹果式超椭圆：

```css
@supports (corner-shape: superellipse(1.5)) {
  :root { --ct-corner-radius-scale: 1.25; }
  /* md 及以上刻度的容器附加 */
  .rounded-md-and-up { corner-shape: superellipse(1.5); }
}
```

含义：支持超椭圆时圆角数值放大 25%，同时角曲线变"方肩"，观感更柔和但不臃肿。
不支持时静默回退 scale=1 普通圆角。文档标注一律按 base 值书写。

## 3. 分配原则

- **海拔越高圆角越大**：行内元素 2–4 → 控件 6–8 → 卡片/弹层 12–16 → 全屏级 20–24。
- **药丸是身份标记**：`radius-full` 专属于"可点的行/胶囊状态物"（导航行、Badge、Tag、Switch、Avatar），
  普通按钮与输入框**不得**用药丸（区别于 ChatGPT 消费端的圆润取向，Codex 工具端控件是 8px 方正档）。
- 嵌套时内圆角 = 外圆角 − 内边距（近似），避免"内方外圆"错位；如 Card(12) 内媒体块取 8。
- 同一组件族圆角一致：输入框、Select、DatePicker 输入面全部 md(8)。

## 4. 描边配合

- 默认控件：1px `--ct-border`；hover 升 `--ct-border-heavy`。
- 悬浮层：`--ct-shadow-hairline`（0.5px 描边感）+ 软阴影，见 05-elevation。
- 禁止 2px 及以上装饰性粗描边（焦点环除外）。
