import { useEffect, useState, type ReactNode } from "react";
import { Button, Card, Icon, IconButton, Segmented, Tag, Toolbar, ToolbarGroup } from "../components/base";
import {
  docsComponentGroups,
  getDocsComponentItem,
  type DocsComponentId,
  type DocsPageId,
} from "./componentRegistry";

type DocsShellProps = {
  selectedPage: DocsPageId;
  onNavigate: (page: DocsPageId) => void;
  children: ReactNode;
};

function isComponentPage(page: DocsPageId): page is DocsComponentId {
  return page !== "overview" && page !== "playground";
}

function getPageTitle(page: DocsPageId) {
  if (page === "overview") {
    return "组件总览";
  }

  if (page === "playground") {
    return "Specimen Appendix";
  }

  const item = getDocsComponentItem(page);
  return `${item.name} ${item.chineseName}`;
}

function ComponentIntegrityPanel({ page }: { page: DocsComponentId }) {
  const item = getDocsComponentItem(page);

  return (
    <Card
      className="docs-shell__integrity-panel"
      description={
        <>
          {item.name} 独立文档边界：主控件优先单行呈现，窄屏允许自然换行，但不得横向溢出、遮挡或把交互目标压缩到不可点击。
        </>
      }
      title={`${item.name} 文档完整性复核`}
    >
      <div className="docs-shell__integrity-tags" aria-label={`${item.name} 五角色复核项`}>
        <Tag tone="strong">产品: {item.group}</Tag>
        <Tag tone="subtle">UI: neutral minimal</Tag>
        <Tag tone="subtle">研发: API / tokens</Tag>
        <Tag tone="subtle">测试: mobile &gt;= 320</Tag>
        <Tag tone="subtle">白帽: sanitized boundary</Tag>
      </div>
      <dl>
        <div>
          <dt>产品专家</dt>
          <dd>用途、何时使用、何时不用和 registry 风险需与 {item.group} / {item.category} 定位一致。</dd>
        </div>
        <div>
          <dt>UI 专家</dt>
          <dd>样例、状态和密度遵守中性极简视觉，移动端可换行且不依赖外部 UI 套件。</dd>
        </div>
        <div>
          <dt>研发专家</dt>
          <dd>API、Semantic DOM、Design Token 和源码入口需随实现更新，不虚构未落地能力。</dd>
        </div>
        <div>
          <dt>测试专家</dt>
          <dd>至少覆盖桌面与 320px 以上移动宽度、键盘路径、状态层和无未定义文案。</dd>
        </div>
        <div>
          <dt>白帽专家</dt>
          <dd>禁止 antd、antd-mobile、@ant-design/charts；用户文本、URL、Markdown、SVG 或文件名必须转义、净化或明确宿主边界。</dd>
        </div>
      </dl>
    </Card>
  );
}

type ThemeMode = "light" | "dark";

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }
  try {
    const saved = window.localStorage.getItem("tessera-theme");
    if (saved === "light" || saved === "dark") {
      return saved;
    }
  } catch {
    // localStorage 不可用时回退到系统偏好
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function DocsShell({ children, onNavigate, selectedPage }: DocsShellProps) {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const pageTitle = getPageTitle(selectedPage);
  const selectedCategory = isComponentPage(selectedPage)
    ? getDocsComponentItem(selectedPage).category
    : selectedPage === "overview"
      ? "index"
      : "appendix";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem("tessera-theme", theme);
    } catch {
      // 忽略持久化失败
    }
  }, [theme]);

  return (
    <div className="docs-shell" data-shell-owner="docs">
      <aside className="docs-shell__sidebar" aria-label="组件文档站导航">
        <Button
          className="docs-shell__brand"
          type="button"
          variant="ghost"
          onClick={() => onNavigate("overview")}
        >
          <span className="docs-shell__brand-mark">T</span>
          <span>
            <strong>Tessera Components</strong>
            <span>组件文档站</span>
          </span>
        </Button>

        <nav className="docs-shell__nav" aria-label="组件分类导航">
          <div className="docs-shell__nav-section docs-shell__nav-section--utility">
            <Button
              aria-current={selectedPage === "overview" ? "page" : undefined}
              className="docs-shell__nav-link"
              icon={<Icon decorative name="search" />}
              type="button"
              variant="ghost"
              onClick={() => onNavigate("overview")}
            >
              Overview
            </Button>
          </div>

          {docsComponentGroups.map((group) => (
            <section className="docs-shell__nav-section" key={group.id} aria-labelledby={`${group.id}-nav-title`}>
              <h2 id={`${group.id}-nav-title`}>
                <Tag size="sm" tone="subtle">{group.category}</Tag>
                {group.title}
              </h2>
              <div className="docs-shell__nav-list">
                {group.items.map((item) => (
                  <Button
                    aria-current={selectedPage === item.id ? "page" : undefined}
                    className="docs-shell__nav-link"
                    key={item.id}
                    type="button"
                    variant="ghost"
                    onClick={() => onNavigate(item.id)}
                  >
                    <span>{item.name}</span>
                    <span>{item.chineseName}</span>
                  </Button>
                ))}
              </div>
            </section>
          ))}

          <div className="docs-shell__nav-section docs-shell__nav-section--utility">
            <Button
              aria-current={selectedPage === "playground" ? "page" : undefined}
              className="docs-shell__nav-link docs-shell__nav-link--appendix"
              icon={<Icon decorative name="code" />}
              type="button"
              variant="ghost"
              onClick={() => onNavigate("playground")}
            >
              Specimen Appendix
            </Button>
          </div>
        </nav>
      </aside>

      <main className="docs-shell__main" aria-labelledby="docs-shell-page-title">
        <header className="docs-shell__topbar">
          <div>
            <p className="eyebrow">Documentation</p>
            <strong id="docs-shell-page-title" aria-live="polite">{pageTitle}</strong>
          </div>
          <Toolbar className="docs-shell__topbar-actions" compact mobileBehavior="wrap" variant="plain" aria-label="文档视图工具栏">
            <ToolbarGroup grow>
              <Tag className="docs-shell__crumb" tone="subtle">
                Components / {selectedCategory}
              </Tag>
              <Segmented
                aria-label="教程主路由"
                className="docs-shell__route-tabs"
                options={[
                  { label: "Overview", value: "overview" },
                  { label: "Appendix", value: "playground" },
                ]}
                size="sm"
                value={selectedPage === "playground" ? "playground" : "overview"}
                onValueChange={(value) => onNavigate(value as DocsPageId)}
              />
            </ToolbarGroup>
            <ToolbarGroup>
              <IconButton
                aria-pressed={theme === "dark"}
                className="docs-shell__theme-toggle"
                label={theme === "dark" ? "切换到亮色模式" : "切换到暗色模式"}
                tooltip={theme === "dark" ? "切换到亮色模式" : "切换到暗色模式"}
                tooltipPlacement="bottom"
                onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              >
                <Icon decorative name="settings" />
              </IconButton>
            </ToolbarGroup>
          </Toolbar>
        </header>

        <div className="docs-shell__content">
          {children}
          {isComponentPage(selectedPage) ? <ComponentIntegrityPanel page={selectedPage} /> : null}
        </div>
      </main>
    </div>
  );
}
