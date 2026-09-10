# Tessera 视觉设计规范 (Based on Codex.app)

本文档定义了 Tessera 组件库的视觉设计标准，严格参考了 Codex.app 的产品风格。

## Token 真源与生成

`design/tokens.toml` 是跨 Web 与 native 的唯一手写 token 真源。`native/docs/ui-spec.md` 的冻结 Light/Dark 语义值和焦点合同优先于本摘要及旧 Web 实现。

在仓库根目录执行唯一生成命令：

```sh
python3 scripts/generate-tokens.py
```

它确定性生成 `src/styles.css` 的标记 token 区块、`src/theme/tokens.ts` 和 `native/crates/tessera-iced/src/tokens.rs`。不要手改这些生成内容，也不要在组件中建立等价的 token 常量或 fallback 路径。提交或 CI 检查使用：

```sh
python3 scripts/generate-tokens.py --check
PYTHONDONTWRITEBYTECODE=1 python3 scripts/test_generate_tokens.py
```

生成器以结构化 TOML schema 拒绝必填项缺失或未知字段，并把 `design/tokens.toml` 的 SHA-256 写入各产物头。`src/styles.css` 区块外的样式不是生成器所有。

## 1. 核心设计原则
- **冷静与克制**：去掉过度设计的渐变和厚重阴影，以内容为中心。界面不抢戏。
- **一致性**：一切组件的构成基于相同的灰阶和半透明叠加体系。
- **层次分明**：通过字体粗细、大小和颜色的明暗来构建清晰的信息层级，而非增加装饰性元素。

## 2. 颜色体系
### 中性色系统
整个界面通过灰阶的对比来构建。主基调是温暖的白和不同透明度的墨色：
- **背景（Background）**：`--ct-bg` (Light: #f9f9f9, Dark: #181818)
- **面片（Surface）**：`--ct-surface` (Light: #ffffff, Dark: #303030)
- **文字主色**：`--ct-text` (非常深的灰/白，Light: #1a1c1f)
- **文字次级色**：`--ct-text-secondary`, `--ct-text-tertiary`（冻结为不透明值，保证实际面层对比度）。

### 边框系统
边框不再使用硬编码的灰色，而是使用基于前景色的半透明混合，以在任何背景上都能保持正确的对比度：
- `--ct-border-light`: `color-mix(in oklab, var(--ct-ink) 5%, transparent)`
- `--ct-border`: `color-mix(in oklab, var(--ct-ink) 8%, transparent)`

### 品牌/强调色
- **主强调色**：`--ct-accent` (#0285ff)，一种明亮、具有科技感的纯蓝。

### Dark danger
- 冻结三件套为 `#f0786f / #f0786fb3 / #f0786f08`（`fg / border / bg`）。保留前景红避免改变危险文本、状态点和实色危险控件，只收低 soft wash 并增强边界。
- `bg` 在 Dark `surface` `#303030` 上实际合成为 `#363232`；前景对该 soft/surface/canvas 为 `4.581/4.790/6.444:1`。`border` 在 surface 上合成为 `#b7635c`，对相邻 surface 为 `3.099:1`。
- `scripts/test_generate_tokens.py` 将上述真实合成向量作为普通强制测试；不得使用 expected failure、skip 或降低阈值。

## 3. 排版与字体
- **字体栈**：优先使用系统默认无衬线字体。
- **层级**：
  - 页面标题：较大的字号（如 24px/20px），粗体（600/700）。
  - 组件标签、默认正文：标准字号（通常 14px），正常的粗细（400/500）。
  - 辅助说明文本：较小字号（12px/13px），次级颜色。

## 4. 间距与留白 (呼吸感)
- **基准栅格**：4px 基础步进。
- 模块之间保持充足的留白（16px, 24px, 32px），元素内部保持紧凑（4px, 8px, 12px）。

## 5. 组件样式
### 形状与边界
- 默认基准组件（按钮、卡片、输入框）使用 `--ct-radius-sm` (6px) 或 `--ct-radius-md` (8px)。
- **完全圆角**（`--ct-radius-full`）：仅用于徽标（Badge）、胶囊标签（Tag）或特定的开关控件。

### 阴影
- 普通卡片不用阴影，只用 1px 细边框或轻微底色。
- 悬浮层（Popovers、Tooltips、Modals、Dropdowns）使用深邃柔和的阴影。

## 6. 动效与交互
- **Hover 态**：色值微调，而非大范围颜色翻转。
- **Focus 态**：统一的 2 DIP 不透明聚焦环（`--ct-focus-ring`），内外相邻 1 physical-pixel 固定为 `--ct-focus-gap`，外扩 2px。

## 7. 响应式与移动端
- 移动端点击区域（`<= 760px`）增加到 >= 40px。
- 避免横向滚动条，自动转纵向堆叠。
- 保证任何组件“内部不大于外部”。
