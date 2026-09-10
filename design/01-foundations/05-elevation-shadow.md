# Foundations · 05 层级与阴影

> 落地位置：`src/styles.css` `--ct-shadow-*`、`--ct-overlay*`、`--ct-surface-glass`。

## 1. 层级哲学：发丝描边优先，阴影是辅助

Codex 的"深度"主要靠三件事，按代价从低到高：

1. **面层电梯**（暗色亮度递增 / 亮色白纸叠灰底）——零成本；
2. **hairline 描边**：`0 0 0 0.5px` 前景 12–20% 混合（`--ct-shadow-hairline` / elevation-stroke）；
3. **低透明度软阴影栈**——只给真正悬浮的东西。

静止的卡片**不配阴影**（最多 hairline/1px 边框）；影子只属于会"浮起来"的对象。

## 2. 阴影刻度（Codex 原值）

| 令牌 | 值（Light） | 用途 |
| --- | --- | --- |
| `--ct-shadow-hairline` | `0 0 0 0.5px #0000001a` | 悬浮面的"物理边界" |
| `--ct-shadow-sm` | `0 1px 2px -1px #00000014` | 输入框 hover、轻浮起 |
| `--ct-shadow-md` | `0 2px 4px -1px #00000014` | Dropdown、Tooltip |
| `--ct-shadow-lg` | `0 4px 8px -2px #0000001a` | Popover、DatePicker 面板 |
| `--ct-shadow-xl` | `0 8px 16px -4px #0000001f` | 命令面板、大型浮层 |
| `--ct-shadow-2xl` | `0 16px 32px -8px #00000030` | 特大浮层 |
| `--ct-shadow-floating` | `0 12px 28px -8px #00000024` | Toast/Notification |
| `--ct-shadow-modal` | `0 18px 48px -12px #00000038` | Modal/Drawer |

注意所有 alpha ≤ 0.22（亮色）——**看不出影子形状，只感到"离纸了"**。暗色主题整体加深
（alpha 0.4–0.76，已在 dark 令牌覆写），因为暗底吃阴影。

悬浮层的完整配方 = `hairline + 对应档阴影`，例如 Dropdown：

```css
box-shadow: var(--ct-shadow-hairline), var(--ct-shadow-md);
```

## 3. 玻璃面（backdrop-blur）

Codex 悬浮面板常用"半透明面 + 背景模糊"：

- 面：`--ct-surface-glass`（亮 = bg 94% / 暗 = `#212121` 92%）；
- 模糊：`backdrop-filter: blur(12px)`（刻度 4/8/12/16/24，默认 12）；
- 适用：命令面板、固定 topbar、移动端底部浮条。**上限 ~5 处**，普通菜单用不透明 elevated 即可。

## 4. z-index 阶梯

| 层 | z | 内容 |
| --- | --- | --- |
| base | 0 | 页面内容 |
| sticky | 100 | Affix、粘性表头、topbar |
| dropdown | 1000 | Dropdown/Select/Popover/Tooltip |
| overlay | 1300 | Modal/Drawer 遮罩与本体 |
| toast | 1500 | Message/Notification |
| tour | 1700 | 引导高亮层 |

遮罩：`--ct-overlay`（黑 28%/暗 46%），Modal 内再嵌 Modal 不加深遮罩。

## 5. 使用守则

- 阴影只向下投（正 y），无环形 spread；禁止彩色阴影与内阴影（`--ct-shadow-ring` 语义环除外）。
- hover 不通过"加大阴影"表达（会闪）；用底色水洗或描边加深。
- 暗色主题禁止提高面层饱和度充当层级——只允许亮度电梯 + 描边。
