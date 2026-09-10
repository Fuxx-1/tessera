import { existsSync, readFileSync } from "node:fs";

import {
  businessComponents,
  chartComponents,
  componentItems,
  customComponents,
  docsComponentGroups,
  docsComponentItems,
} from "../src/docs/componentRegistry.ts";

const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function read(filePath) {
  return readFileSync(filePath, "utf8");
}

function regexEscape(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasNamedExport(source, name) {
  return new RegExp(`export\\s*\\{[^}]*\\b${regexEscape(name)}\\b[^}]*\\}`).test(source);
}

function hasDocsExport(source, name) {
  return new RegExp(`export\\s*\\{[^}]*\\b${regexEscape(name)}Doc\\b[^}]*\\}`).test(source);
}

function hasSampleSignal(source) {
  return /<pre[\s>]|<code[\s>]|<CodeBlock\s+code=|code:\s*`|代码演示|一行样例|单行样例|示例/.test(source);
}

function hasFiveRoleSignal(source) {
  return ["产品", "UI", "研发", "测试", "白帽"].every((label) => source.includes(label)) || /五角色|五专家|五视角/.test(source);
}

function hasMobileSignal(source, item) {
  return /移动端|Mobile|mobile|375|390|430|窄屏/.test(source) || item.tags?.includes("mobile") || /mobile|移动/.test(item.risk ?? "");
}

function hasSecuritySignal(source) {
  return /白帽|安全|Security|dangerouslySetInnerHTML|HTML 注入|外部 UI|antd|@ant-design\/charts/.test(source);
}

function hasApiSignal(source) {
  return /api|API/.test(source);
}

function hasSemanticSignal(source) {
  return /semantic|Semantic DOM|语义 DOM|语义/.test(source);
}

function hasA11ySignal(source) {
  return /a11y|可访问|accessibility/i.test(source);
}

function hasVisibleUndefinedRisk(source) {
  return /`[^`]*undefined[^`]*`|>\s*undefined\s*<|["'“”][^"'“”]*undefined[^"'“”]*["'“”]/.test(source);
}

function getSourcePath(item) {
  if (item.id === "util") {
    return null;
  }

  if (item.id === "mermaid-svg-viewer") {
    return "src/components/business/MarkdownEditor/MermaidSvgViewer.tsx";
  }

  if (item.categoryId === "business") {
    return `src/components/business/${item.name}/${item.name}.tsx`;
  }

  if (item.categoryId === "charts") {
    return `src/components/charts/${item.name}.tsx`;
  }

  return `src/components/base/${item.name}/${item.name}.tsx`;
}

function getBarrelSource(item, sources) {
  if (item.categoryId === "business") {
    return sources.businessIndex;
  }

  if (item.categoryId === "charts") {
    return sources.chartsIndex;
  }

  return sources.baseIndex;
}

function normalizeItems() {
  return [
    ...componentItems.map((item) => ({ ...item, category: "Base", categoryId: "base" })),
    ...customComponents.map((item) => ({ ...item, category: "Base", categoryId: "base", group: "自有基础扩展" })),
    ...businessComponents,
    ...chartComponents,
  ];
}

function assertCounts(items) {
  const ids = items.map((item) => item.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  const sidebarIds = docsComponentGroups.flatMap((group) => group.items.map((item) => item.id));
  const sidebarMissing = ids.filter((id) => !sidebarIds.includes(id));
  const sidebarExtra = sidebarIds.filter((id) => !ids.includes(id));

  if (items.length !== 101) {
    fail(`expected 101 registry components, saw ${items.length}`);
  }

  if (componentItems.length + customComponents.length !== 75) {
    fail(`expected 75 Base components, saw ${componentItems.length + customComponents.length}`);
  }

  if (businessComponents.length !== 11) {
    fail(`expected 11 Business components, saw ${businessComponents.length}`);
  }

  if (chartComponents.length !== 15) {
    fail(`expected 15 Charts components, saw ${chartComponents.length}`);
  }

  if (docsComponentItems.length !== items.length) {
    fail(`docsComponentItems count ${docsComponentItems.length} does not match registry count ${items.length}`);
  }

  if (duplicates.length > 0) {
    fail(`duplicate component ids: ${Array.from(new Set(duplicates)).join(", ")}`);
  }

  if (sidebarMissing.length > 0 || sidebarExtra.length > 0) {
    fail(`sidebar mismatch missing=[${sidebarMissing.join(", ")}] extra=[${sidebarExtra.join(", ")}]`);
  }
}

function auditItem(item, sources) {
  if (item.implementationStatus !== "production" || item.docsStatus !== "ready") {
    fail(`${item.id}: status is ${item.implementationStatus}/${item.docsStatus}, expected production/ready`);
  }

  const sourcePath = getSourcePath(item);
  if (sourcePath && !existsSync(sourcePath)) {
    fail(`${item.id}: missing source file ${sourcePath}`);
  }

  const docPath = `src/docs/${item.name}Doc.tsx`;
  if (!existsSync(docPath)) {
    fail(`${item.id}: missing independent doc file ${docPath}`);
    return;
  }

  const docSource = read(docPath);
  const barrelSource = getBarrelSource(item, sources);

  const hasComponentExport =
    item.id === "app" ? hasNamedExport(barrelSource, "AppProvider") && hasNamedExport(barrelSource, "AppShell") : hasNamedExport(barrelSource, item.name);

  if (item.id !== "util" && !hasComponentExport) {
    fail(`${item.id}: missing ${item.name} export from component barrel`);
  }

  if (!hasDocsExport(sources.docsIndex, item.name)) {
    fail(`${item.id}: missing ${item.name}Doc export from docs barrel`);
  }

  if (!sources.app.includes(`selectedPage === "${item.id}"`)) {
    fail(`${item.id}: missing explicit App route branch`);
  }

  if (!hasSampleSignal(docSource)) {
    fail(`${item.id}: doc has no code/sample signal`);
  }

  if (!hasApiSignal(docSource)) {
    fail(`${item.id}: doc has no API signal`);
  }

  if (!hasSemanticSignal(docSource)) {
    fail(`${item.id}: doc has no semantic DOM signal`);
  }

  if (!hasA11ySignal(docSource)) {
    fail(`${item.id}: doc has no a11y signal`);
  }

  if (!hasFiveRoleSignal(docSource)) {
    warn(`${item.id}: five-role review signal is weak`);
  }

  if (!hasMobileSignal(docSource, item)) {
    warn(`${item.id}: mobile/responsive risk signal is weak`);
  }

  if (!hasSecuritySignal(docSource)) {
    warn(`${item.id}: security/white-hat risk signal is weak`);
  }

  if (hasVisibleUndefinedRisk(docSource)) {
    fail(`${item.id}: doc may expose visible literal undefined`);
  }
}

function assertIndependentDocs(sources) {
  const forbiddenMergedDocs = ["ChoiceControlsDoc", "LayoutPrimitivesDoc route", "DataEntryDoc route", "DataDisplayFeedbackDoc route"];

  if (existsSync("src/docs/ChoiceControlsDoc.tsx") || /choice-controls|ChoiceControlsDoc/.test(sources.app + sources.docsIndex)) {
    fail("Checkbox and Radio must remain independent; ChoiceControlsDoc is not allowed");
  }

  for (const route of ["checkbox", "radio", "button", "float-button"]) {
    if (!sources.app.includes(`selectedPage === "${route}"`)) {
      fail(`${route}: required independent route branch is missing`);
    }
  }

  for (const label of forbiddenMergedDocs) {
    if (sources.app.includes(label)) {
      fail(`unexpected merged route marker: ${label}`);
    }
  }
}

function main() {
  const sources = {
    app: read("src/App.tsx"),
    docsIndex: read("src/docs/index.ts"),
    baseIndex: read("src/components/base/index.ts"),
    businessIndex: read("src/components/business/index.ts"),
    chartsIndex: read("src/components/charts/index.ts"),
  };
  const items = normalizeItems();

  assertCounts(items);
  assertIndependentDocs(sources);

  for (const item of items) {
    auditItem(item, sources);
  }

  const partialCapability = items.filter((item) => item.capabilityStatus === "partial").map((item) => item.id);

  console.log(
    JSON.stringify(
      {
        counts: {
          total: items.length,
          base: componentItems.length + customComponents.length,
          business: businessComponents.length,
          charts: chartComponents.length,
          sidebarGroups: docsComponentGroups.map((group) => ({
            id: group.id,
            title: group.title,
            category: group.category,
            count: group.items.length,
          })),
        },
        partialCapability,
        warnings,
        failures,
      },
      null,
      2,
    ),
  );

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main();
