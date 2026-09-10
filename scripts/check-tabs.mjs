import { existsSync, mkdtempSync, readdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

const HOST = "127.0.0.1";
const APP_PORT = Number(process.env.TABS_ACCEPTANCE_PORT ?? 5177);
const CDP_PORT = Number(process.env.TABS_ACCEPTANCE_CDP_PORT ?? 9337);
const ROUTE_MODE = process.env.TABS_ACCEPTANCE_MODE ?? "app";
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
];

const failures = [];
let viteProcess;
let chromeProcess;
let userDataDir;
let harnessPath;
let escapeHarnessPath;

function info(message) {
  console.log(`[tabs-acceptance] ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`[tabs-acceptance] FAIL ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = createServer();
    socket.once("error", () => resolve(false));
    socket.listen(port, HOST, () => {
      socket.close(() => resolve(true));
    });
  });
}

async function waitForHttp(url, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }

  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

function findChromeExecutable() {
  const playwrightCache = join(homedir(), "Library", "Caches", "ms-playwright");
  const playwrightChromes = existsSync(playwrightCache)
    ? readdirSync(playwrightCache, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name.startsWith("chromium-"))
        .flatMap((entry) => [
          join(
            playwrightCache,
            entry.name,
            "chrome-mac-arm64",
            "Google Chrome for Testing.app",
            "Contents",
            "MacOS",
            "Google Chrome for Testing",
          ),
          join(playwrightCache, entry.name, "chrome-mac-arm64", "Chromium.app", "Contents", "MacOS", "Chromium"),
          join(
            playwrightCache,
            entry.name,
            "chrome-mac",
            "Google Chrome for Testing.app",
            "Contents",
            "MacOS",
            "Google Chrome for Testing",
          ),
          join(playwrightCache, entry.name, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
        ])
    : [];
  const candidates = [
    ...playwrightChromes,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

async function startVite() {
  const portFree = await isPortOpen(APP_PORT);
  if (!portFree) {
    info(`using existing dev server on ${HOST}:${APP_PORT}`);
    await waitForHttp(`http://${HOST}:${APP_PORT}/`);
    return;
  }

  info(`starting Vite on ${HOST}:${APP_PORT}`);
  viteProcess = spawn("rtk", ["bun", "run", "dev", "--", "--host", HOST, "--port", String(APP_PORT), "--strictPort"], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  viteProcess.stdout.on("data", (chunk) => process.stdout.write(chunk));
  viteProcess.stderr.on("data", (chunk) => process.stderr.write(chunk));
  await waitForHttp(`http://${HOST}:${APP_PORT}/`);
}

function writeHarness() {
  if (harnessPath) {
    return `/${harnessPath.split("/").pop()}`;
  }

  harnessPath = join(process.cwd(), `.tabs-harness-${Date.now()}.html`);
  writeFileSync(
    harnessPath,
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tabs Harness</title>
    <script type="module">
      import React from "react";
      import { createRoot } from "react-dom/client";
      import "/src/styles.css";
      import { TabsDoc } from "/src/docs/TabsDoc.tsx";

      createRoot(document.getElementById("root")).render(React.createElement(TabsDoc, { showAnchors: true }));
    </script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`,
  );
  return `/${harnessPath.split("/").pop()}`;
}

function writeEscapeHarness() {
  if (escapeHarnessPath) {
    return `/${escapeHarnessPath.split("/").pop()}`;
  }

  escapeHarnessPath = join(process.cwd(), `tabs-escape-harness-${Date.now()}.html`);
  writeFileSync(
    escapeHarnessPath,
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tabs Escape Harness</title>
    <script type="module">
      import React from "react";
      import { createRoot } from "react-dom/client";
      import "/src/styles.css";
      import { Tabs } from "/src/components/base/Tabs/Tabs.tsx";

      createRoot(document.getElementById("root")).render(
        React.createElement(Tabs, {
          "aria-label": "Label escaping probe",
          items: [
            {
              id: "unsafe id",
              label: "<img src=x onerror=alert(1)>Safe",
              content: React.createElement("p", null, "Escaped"),
            },
            {
              id: "unsafe/id",
              label: "Collision",
              content: React.createElement("p", null, "Collision-safe id"),
            },
          ],
        }),
      );
    </script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`,
  );
  return `/${escapeHarnessPath.split("/").pop()}`;
}

async function startChrome() {
  const chromePath = findChromeExecutable();
  if (!chromePath) {
    throw new Error("No Chrome/Chromium executable found for Tabs acceptance");
  }

  userDataDir = mkdtempSync(join(tmpdir(), "tabs-acceptance-chrome-"));
  info(`starting Chrome CDP on ${HOST}:${CDP_PORT}`);
  const stderr = [];
  let exitInfo = null;
  chromeProcess = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-address=${HOST}`,
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${userDataDir}`,
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-background-networking",
    "--no-first-run",
    "about:blank",
  ], {
    stdio: ["ignore", "ignore", "pipe"],
  });

  chromeProcess.once("exit", (code, signal) => {
    exitInfo = { code, signal };
  });
  chromeProcess.stderr.on("data", (chunk) => {
    stderr.push(String(chunk));
    process.stderr.write(chunk);
  });

  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (exitInfo) {
      throw new Error(
        `Chrome exited before CDP startup (code ${exitInfo.code ?? "null"}, signal ${exitInfo.signal ?? "null"}): ${stderr.join("").trim()}`,
      );
    }

    try {
      await waitForHttp(`http://${HOST}:${CDP_PORT}/json/version`, 500);
      return;
    } catch {
      await sleep(200);
    }
  }

  throw new Error(`Timed out waiting for Chrome CDP at ${HOST}:${CDP_PORT}: ${stderr.join("").trim()}`);
}

function createCdpClient(webSocketUrl) {
  const ws = new WebSocket(webSocketUrl);
  let nextId = 1;
  const pending = new Map();
  const events = new Map();

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result);
      }
      return;
    }

    const listeners = events.get(message.method) ?? [];
    for (const listener of listeners) listener(message.params);
  });

  return {
    async ready() {
      if (ws.readyState === WebSocket.OPEN) return;
      await new Promise((resolve, reject) => {
        ws.addEventListener("open", resolve, { once: true });
        ws.addEventListener("error", reject, { once: true });
      });
    },
    send(method, params = {}) {
      const id = nextId++;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });
    },
    once(method) {
      return new Promise((resolve) => {
        const listener = (params) => {
          const listeners = events.get(method) ?? [];
          events.set(method, listeners.filter((item) => item !== listener));
          resolve(params);
        };
        events.set(method, [...(events.get(method) ?? []), listener]);
      });
    },
    close() {
      ws.close();
    },
  };
}

async function createPage() {
  const newTarget = await fetch(`http://${HOST}:${CDP_PORT}/json/new?about:blank`, { method: "PUT" });
  const target = await newTarget.json();
  const client = createCdpClient(target.webSocketDebuggerUrl);
  await client.ready();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  return client;
}

async function navigate(client, url, viewport) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width < 600,
  });
  const loaded = client.once("Page.loadEventFired");
  await client.send("Page.navigate", { url });
  await loaded;
  await sleep(350);
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Runtime evaluation failed");
  }

  return result.result.value;
}

function assertViewportReport(viewport, report) {
  if (!report.isTabsRoute) fail(`${viewport.name}: #tabs route did not render Tabs doc`);
  if (!report.hasToc) fail(`${viewport.name}: TabsDoc did not render independent anchors`);
  if (report.demoCount !== 5) fail(`${viewport.name}: expected 5 Tabs demos, found ${report.demoCount}`);
  if (report.visibleUndefined) fail(`${viewport.name}: visible undefined text rendered on Tabs route`);
  if (report.pageHorizontalOverflow > 1) fail(`${viewport.name}: page has horizontal overflow ${report.pageHorizontalOverflow}px`);
  if (report.ariaMissingControls.length) fail(`${viewport.name}: tabs with missing aria-controls ${report.ariaMissingControls.join(", ")}`);
  if (report.panelMissingLabels.length) fail(`${viewport.name}: panels with missing aria-labelledby ${report.panelMissingLabels.join(", ")}`);
  if (report.duplicateDomIds.length) fail(`${viewport.name}: duplicate Tabs DOM ids ${report.duplicateDomIds.join(", ")}`);
  if (report.activeSelectionIssues.length) fail(`${viewport.name}: invalid selected tab counts ${report.activeSelectionIssues.join(", ")}`);
  if (!report.labelEscapingWorked) fail(`${viewport.name}: unsafe tab label was interpreted as markup`);
  if (!report.safeIdCollisionHandled) fail(`${viewport.name}: normalized tab ids collided in DOM`);
  if (!report.disabledBlocked) fail(`${viewport.name}: disabled tab became selected after click`);
  if (!report.controlledFallbackWorked) fail(`${viewport.name}: controlled disabled value did not fall back to enabled tab`);
  if (!report.keyboardSkippedDisabled) fail(`${viewport.name}: ArrowRight did not skip disabled tab`);
  if (!report.homeEndWorked) fail(`${viewport.name}: Home/End keyboard navigation failed`);
  if (!report.controlledButtonWorked) fail(`${viewport.name}: controlled external button did not switch panel`);
  if (!report.mobileListSingleLine) fail(`${viewport.name}: horizontal tablist wrapped across rows`);
  if (viewport.width < 600 && !report.mobileListScrollable) fail(`${viewport.name}: mobile overflow demo tablist did not scroll horizontally`);
  if (viewport.width < 600 && report.minTouchHeight < 44) fail(`${viewport.name}: tab touch height ${report.minTouchHeight}px is below 44px`);
  if (viewport.width >= 600 && report.minTouchHeight < 32) fail(`${viewport.name}: desktop tab height ${report.minTouchHeight}px is below 32px`);
  if (report.tabListOverflowCount > 0) fail(`${viewport.name}: tablist visually overflowed its Tabs root`);
  if (report.panelOverflowCount > 0) fail(`${viewport.name}: active panel content overflowed its Tabs root`);
  if (!report.darkModeReadable) fail(`${viewport.name}: dark color scheme did not produce readable Tabs foreground/background`);
  if (report.closeButtons !== 0) fail(`${viewport.name}: close controls rendered though Tabs close is unsupported`);
}

async function inspectViewport(viewport) {
  const client = await createPage();
  const harnessUrl = ROUTE_MODE === "harness" ? writeHarness() : null;
  const url = harnessUrl ? `http://${HOST}:${APP_PORT}${harnessUrl}` : `http://${HOST}:${APP_PORT}/#tabs`;
  await client.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: "light" }],
  });
  await navigate(client, url, viewport);
  await evaluate(client, String.raw`new Promise((resolve) => {
    const ready = () => document.querySelectorAll(".button-doc-demo").length >= 4;
    if (ready()) {
      resolve(true);
      return;
    }

    const observer = new MutationObserver(() => {
      if (ready()) {
        observer.disconnect();
        resolve(true);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve(false);
    }, 5000);
  })`);

  const report = await evaluate(client, String.raw`(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const clickTab = (label, root = document) => {
      const tab = Array.from(root.querySelectorAll('[role="tab"]')).find((item) => item.textContent.trim() === label);
      tab?.click();
      return Boolean(tab);
    };
    const demoByTitle = (title) => demos.find((demo) => demo.querySelector(".button-doc-demo__meta h3")?.textContent.trim() === title);
    const keyTab = (label, key, root = document) => {
      const tab = Array.from(root.querySelectorAll('[role="tab"]')).find((item) => item.textContent.trim() === label);
      tab?.focus();
      tab?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      return document.activeElement?.textContent?.trim() ?? "";
    };
    const rect = (node) => {
      const box = node.getBoundingClientRect();
      return { top: Math.round(box.top), left: Math.round(box.left), right: Math.round(box.right), width: Math.round(box.width) };
    };
    const demos = Array.from(document.querySelectorAll(".button-doc-demo"));
    const disabledDemo = demoByTitle("禁用项");
    const controlledDemo = demoByTitle("受控标签页");
      const fallbackDemo = demoByTitle("受控回退");
      const mobileDemo = demoByTitle("移动横向滚动");
    const tabLists = Array.from(document.querySelectorAll('[role="tablist"]'));
    const ariaMissingControls = [];
    const panelMissingLabels = [];
    const activeSelectionIssues = [];
    const visibleUndefined = document.body.innerText.includes("undefined");
    const tabsDomIds = Array.from(document.querySelectorAll(".c-tabs [id]")).map((node) => node.id);
    const duplicateDomIds = tabsDomIds.filter((id, index) => tabsDomIds.indexOf(id) !== index);

    for (const list of tabLists) {
      const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
      const selected = tabs.filter((tab) => tab.getAttribute("aria-selected") === "true");
      if (selected.length !== 1) activeSelectionIssues.push(list.getAttribute("aria-label") ?? "unlabelled");
      for (const tab of tabs) {
        const controls = tab.getAttribute("aria-controls");
        if (!controls || !document.getElementById(controls)) ariaMissingControls.push(tab.textContent.trim());
      }
    }
    for (const panel of document.querySelectorAll('.c-tabs [role="tabpanel"]')) {
      const labelledBy = panel.getAttribute("aria-labelledby");
      const tab = labelledBy ? document.getElementById(labelledBy) : null;
      if (!tab || tab.getAttribute("role") !== "tab") panelMissingLabels.push(panel.id || "missing-id");
    }

    clickTab("Locked", disabledDemo);
    await wait(40);
    const disabledBlocked = disabledDemo?.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim() === "Stable";
    keyTab("Stable", "ArrowRight", disabledDemo);
    await wait(40);
    const keyboardSkippedDisabled = disabledDemo?.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim() === "Next";
    keyTab("Next", "Home", disabledDemo);
    await wait(40);
    const homeSelected = disabledDemo?.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim() === "Stable";
    keyTab("Stable", "End", disabledDemo);
    await wait(40);
    const endSelected = disabledDemo?.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim() === "Next";

    const apiButton = Array.from(controlledDemo?.querySelectorAll(".doc-demo-row > button") ?? []).find((button) => button.textContent.trim() === "API");
    apiButton?.click();
    await wait(120);
    const controlledSelectedTab = controlledDemo?.querySelector('.c-tabs [role="tab"][aria-selected="true"]')?.textContent.trim() ?? "";
    const controlledPanelText = controlledDemo?.querySelector(".c-tabs__panel:not([hidden])")?.textContent ?? "";
    const controlledButtonWorked = controlledSelectedTab === "API" && controlledPanelText.includes("onValueChange");

    const fallbackSelectedTab = fallbackDemo?.querySelector('.c-tabs [role="tab"][aria-selected="true"]')?.textContent.trim() ?? "";
    const fallbackPanelText = fallbackDemo?.querySelector(".c-tabs__panel:not([hidden])")?.textContent ?? "";
    const controlledFallbackWorked = fallbackSelectedTab === "Ready" && fallbackPanelText.includes("fall back");

    const mobileList = mobileDemo?.querySelector('[role="tablist"]');
    const mobileTabs = Array.from(mobileList?.querySelectorAll('[role="tab"]') ?? []);
    const mobileRects = mobileTabs.map(rect);
    const mobileListScrollable = mobileList ? mobileList.scrollWidth > mobileList.clientWidth + 1 : false;
    const mobileListSingleLine = mobileRects.length > 1 && Math.max(...mobileRects.map((item) => item.top)) - Math.min(...mobileRects.map((item) => item.top)) <= 2;
    const allTabHeights = Array.from(document.querySelectorAll('.c-tabs [role="tab"]')).map((tab) => tab.getBoundingClientRect().height);
    const minTouchHeight = Math.round(Math.min(...allTabHeights));
    const panelOverflowCount = Array.from(document.querySelectorAll(".c-tabs")).filter((root) => {
      const rootBox = root.getBoundingClientRect();
      const panel = root.querySelector(".c-tabs__panel:not([hidden])");
      if (!panel) return false;
      const panelBox = panel.getBoundingClientRect();
      return panelBox.right - rootBox.right > 1 || rootBox.left - panelBox.left > 1;
    }).length;
    const tabListOverflowCount = Array.from(document.querySelectorAll(".c-tabs")).filter((root) => {
      const rootBox = root.getBoundingClientRect();
      const list = root.querySelector(".c-tabs__list");
      if (!list) return false;
      const listBox = list.getBoundingClientRect();
      return listBox.right - rootBox.right > 1 || rootBox.left - listBox.left > 1;
    }).length;
    return {
      isTabsRoute: Boolean(document.querySelector("#tabs-doc-title")) && (${(ROUTE_MODE === "harness").toString()} || location.hash === "#tabs"),
      hasToc: Boolean(document.querySelector('.button-doc__toc a[href="#tabs-api"]')),
      demoCount: demos.length,
      visibleUndefined,
      pageHorizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      ariaMissingControls,
      panelMissingLabels,
      duplicateDomIds,
      activeSelectionIssues,
      disabledBlocked,
      keyboardSkippedDisabled,
      homeEndWorked: homeSelected && endSelected,
      controlledButtonWorked,
      controlledFallbackWorked,
      mobileListScrollable,
      mobileListSingleLine,
      minTouchHeight,
      tabListOverflowCount,
      panelOverflowCount,
      closeButtons: Array.from(document.querySelectorAll('.c-tabs [aria-label*="close" i], .c-tabs [aria-label*="关闭"]')).length,
    };
  })()`);
  const darkProbe = await (async () => {
    await client.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: "dark" }],
    });
    await sleep(80);
    return evaluate(client, String.raw`(() => {
      const list = document.querySelector(".c-tabs__list");
      const selected = document.querySelector('.c-tabs [role="tab"][aria-selected="true"]');
      const panel = document.querySelector(".c-tabs__panel:not([hidden])");
      if (!list || !selected || !panel) return null;
      const listStyles = getComputedStyle(list);
      const selectedStyles = getComputedStyle(selected);
      const panelStyles = getComputedStyle(panel);
      return {
        listBackground: listStyles.backgroundColor,
        selectedBackground: selectedStyles.backgroundColor,
        selectedColor: selectedStyles.color,
        panelColor: panelStyles.color,
      };
    })()`);
  })();
  report.darkProbe = darkProbe;
  report.darkModeReadable = darkProbe
    ? darkProbe.listBackground !== darkProbe.selectedBackground &&
      darkProbe.selectedBackground !== darkProbe.selectedColor &&
      darkProbe.panelColor !== darkProbe.listBackground
    : false;
  const escapeHarnessUrl = `http://${HOST}:${APP_PORT}${writeEscapeHarness()}`;
  await client.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: "light" }],
  });
  await navigate(client, escapeHarnessUrl, viewport);
  const labelEscapeReport = await evaluate(client, String.raw`(() => {
    const tab = document.querySelector('[role="tab"]');
    return {
      title: document.title,
      pathname: location.pathname,
      hasProbe: Boolean(tab),
      tabText: tab?.textContent ?? "",
      imageCount: document.querySelectorAll("img").length,
      duplicateIds: Array.from(document.querySelectorAll(".c-tabs [id]"))
        .map((node) => node.id)
        .filter((id, index, ids) => ids.indexOf(id) !== index),
      bodyText: document.body.innerText.slice(0, 160),
    };
  })()`);
  report.labelEscapeReport = labelEscapeReport;
  report.labelEscapingWorked = labelEscapeReport.hasProbe && labelEscapeReport.tabText.includes("<img") && labelEscapeReport.imageCount === 0;
  report.safeIdCollisionHandled = labelEscapeReport.duplicateIds.length === 0;

  assertViewportReport(viewport, report);
  info(`${viewport.name}: ${JSON.stringify(report)}`);
  client.close();
}

async function main() {
  try {
    await startVite();
    await startChrome();

    for (const viewport of VIEWPORTS) {
      await inspectViewport(viewport);
    }
  } finally {
    if (chromeProcess) chromeProcess.kill("SIGTERM");
    if (viteProcess) viteProcess.kill("SIGTERM");
    if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
    if (harnessPath) unlinkSync(harnessPath);
    if (escapeHarnessPath) unlinkSync(escapeHarnessPath);
  }

  if (failures.length) {
    console.error(`[tabs-acceptance] ${failures.length} failure(s)`);
    process.exit(1);
  }

  info("PASS");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
