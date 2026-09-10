import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const forbiddenPackages = new Set([
  "antd",
  "antd-mobile",
  "@ant-design/charts",
  "dayjs",
  "moment",
  "moment-timezone",
  "date-fns",
  "luxon",
  "@internationalized/date",
  "react-datepicker",
  "react-day-picker",
  "flatpickr",
  "rc-picker",
  "rc-calendar",
]);
const lockfileForbiddenPackages = new Set(["antd", "antd-mobile", "@ant-design/charts"]);
const sourceFiles = [
  "package.json",
  "bun.lock",
  "src/App.tsx",
  "src/main.tsx",
  "src/components/base/Affix/Affix.tsx",
  "src/components/base/Anchor/Anchor.tsx",
  "src/components/base/App/App.tsx",
  "src/components/base/App/index.ts",
  "src/components/base/AutoComplete/AutoComplete.tsx",
  "src/components/base/AutoComplete/index.ts",
  "src/components/base/Cascader/Cascader.tsx",
  "src/components/base/Drawer/Drawer.tsx",
  "src/components/base/Masonry/Masonry.tsx",
  "src/components/base/Modal/Modal.tsx",
  "src/components/base/Notification/Notification.tsx",
  "src/components/base/Popconfirm/Popconfirm.tsx",
  "src/components/base/Result/Result.tsx",
  "src/components/base/Splitter/Splitter.tsx",
  "src/components/base/Statistic/Statistic.tsx",
  "src/components/base/Tour/Tour.tsx",
  "src/components/base/Tree/Tree.tsx",
  "src/components/base/index.ts",
  "src/components/base/Upload/Upload.tsx",
  "src/components/charts/SankeyChart.tsx",
  "src/components/charts/WordCloud.tsx",
  "src/docs/AffixDoc.tsx",
  "src/docs/AutoCompleteDoc.tsx",
  "src/components/base/Mentions/Mentions.tsx",
  "src/components/base/Typography/Typography.tsx",
  "src/components/base/Typography/index.ts",
  "src/components/base/Watermark/Watermark.tsx",
  "src/components/charts/GaugeChart.tsx",
  "src/docs/AnchorDoc.tsx",
  "src/docs/AppDoc.tsx",
  "src/docs/CascaderDoc.tsx",
  "src/docs/ChartsDoc.tsx",
  "src/docs/GaugeChartDoc.tsx",
  "src/docs/MindMapDoc.tsx",
  "src/docs/MiniChartCardDoc.tsx",
  "src/docs/SankeyChartDoc.tsx",
  "src/docs/CommandPaletteDoc.tsx",
  "src/docs/ComponentsOverview.tsx",
  "src/docs/DocsShell.tsx",
  "src/docs/UtilDoc.tsx",
  "src/docs/ButtonDoc.tsx",
  "src/docs/MasonryDoc.tsx",
  "src/docs/MentionsDoc.tsx",
  "src/docs/PopconfirmDoc.tsx",
  "src/docs/NotificationDoc.tsx",
  "src/docs/ResultDoc.tsx",
  "src/docs/SplitterDoc.tsx",
  "src/docs/StatisticDoc.tsx",
  "src/docs/TourDoc.tsx",
  "src/docs/UploadDoc.tsx",
  "src/docs/TypographyDoc.tsx",
  "src/docs/WatermarkDoc.tsx",
  "src/docs/WordCloudDoc.tsx",
  "src/docs/TreeDoc.tsx",
  "src/docs/componentRegistry.ts",
  "src/utils/index.ts",
];

const failures = [];

function readProjectFile(file) {
  return readFileSync(join(root, file), "utf8");
}

function checkPackageJson() {
  const pkg = JSON.parse(readProjectFile("package.json"));
  const dependencyGroups = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

  for (const group of dependencyGroups) {
    const dependencies = pkg[group] ?? {};
    for (const dependencyName of Object.keys(dependencies)) {
      if (forbiddenPackages.has(dependencyName)) {
        failures.push(`package.json ${group} contains forbidden package "${dependencyName}"`);
      }
    }
  }
}

function checkImportSources(file, source) {
  const packagePattern = Array.from(forbiddenPackages)
    .map((packageName) => packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const importSourcePattern = new RegExp(
    `(?:from\\s+|import\\s*\\(\\s*|require\\s*\\(\\s*)["'](${packagePattern})(?:\\/[^"']*)?["']`,
    "g",
  );
  let match;

  while ((match = importSourcePattern.exec(source)) !== null) {
    failures.push(`${file} imports forbidden package "${match[1]}"`);
  }
}

function checkLockfile() {
  const lock = readProjectFile("bun.lock");
  for (const packageName of lockfileForbiddenPackages) {
    const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const lockPattern = new RegExp(`["']?${escaped}@|["']${escaped}["']`, "g");
    if (lockPattern.test(lock)) {
      failures.push(`bun.lock references forbidden package "${packageName}"`);
    }
  }
}

function collectSourceFiles(directory) {
  const files = [];
  const entries = readdirSync(join(root, directory), { withFileTypes: true });

  for (const entry of entries) {
    const relativePath = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(relativePath));
    } else if (/\.(cjs|mjs|js|jsx|ts|tsx)$/.test(entry.name)) {
      files.push(relativePath);
    }
  }

  return files;
}

checkPackageJson();
checkLockfile();

for (const file of Array.from(new Set([...sourceFiles, ...collectSourceFiles("src")]))) {
  checkImportSources(file, readProjectFile(file));
}

if (failures.length > 0) {
  console.error("Forbidden dependency scan failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Forbidden dependency scan passed: no forbidden UI or date package usage found.");
