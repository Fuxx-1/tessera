# Adoption · 落地审计与迁移

> 本层回答"设计规范与仓库现状的差距在哪、按什么顺序收敛"。

## 1. 现状盘点（2026-07-04）

| 资产 | 状态 | 结论 |
| --- | --- | --- |
| `src/styles.css` 顶部 `--ct-*` 令牌 | **与本规范一致**（同源 Codex 提取，Tessera 适配决策一致） | 保持，作为实现层单一真相 |
| `src/theme/tokens.ts` | 与 styles.css 同步的 TS 镜像 + `cssTokenAliases` | 保持 |
| `src/theme/codex-variables.css` | **遗留草稿**：Tailwind 蓝灰系（`#3b82f6`、`#111827`、gray-blue 边框），与 Codex 暖灰体系冲突 | **清退对象** |
| 部分组件 `style.css`（Button/Modal/Dropdown/Card/Tabs/Breadcrumb/Pagination/Layout/Anchor 等 ~10 个） | 仍消费 `--codex-*` 变量 | 迁移到 `--ct-*` |
| 根目录 `design.md` | 摘要版，方向一致 | 保留为入口摘要，指向本目录 |
| `src/components/charts/palette.ts` | 低饱和土色板 | 与 `04-charts` 规范一致，保持 |

## 2. 差距清单（按风险排序）

1. **双令牌体系并存**：`--codex-*`（蓝灰）与 `--ct-*`（暖灰）同时生效，同一页面可能出现两种灰、
   两种蓝。这是当前最大的"非 Codex 感"来源。
2. Button 遗留样式：`--codex-accent-primary` 蓝色 solid 底，违反"反相中性主按钮"（本规范 §2-base/01）。
3. 局部阴影/圆角硬编码残留（个别组件 0.2s 过渡、`transition: all`）。
4. 文档站 demo 中的选中/高亮仍有蓝底倾向，需按"中性选中"逐页核对。

## 3. 迁移顺序（Todo）

- [ ] 建立 `--codex-*` → `--ct-*` 映射表并在 `codex-variables.css` 顶部标注 deprecated
- [ ] 迁移 Button/IconButton（反相中性主按钮落地，影响面最大、示范价值最高）
- [ ] 迁移弹层族（Dropdown/Modal/Popover/Tooltip）到 elevated + hairline 配方
- [ ] 迁移导航族（Tabs/Menu/Breadcrumb/Pagination/Anchor）到中性选中
- [ ] 迁移容器族（Card/Layout/Collapse）
- [ ] 删除 `codex-variables.css`，`scan:deps` 追加禁用 `--codex-` 前缀的静态检查
- [ ] 逐组件核对状态八态矩阵（foundations 07）与文档页 demo
- [ ] acceptance 增加"硬编码 hex 出现在组件 CSS"扫描（palette.ts 白名单）
- [ ] 双主题截图基线（1280/390 × light/dark）入 `.tessera-evidence`

## 4. 完成定义（DoD）

- `rg -- '--codex-' src/` 零结果；组件 CSS 零硬编码色值（白名单外）；
- `rtk bun run verify` 全绿（build + scan:deps + acceptance 三视口）；
- 任一组件页在 light/dark 下与 `01-foundations` 令牌表逐项对得上；
- 每视图 solid ≤1 / accent ≤5 / 玻璃 ≤2 的稀缺资源审计通过。
