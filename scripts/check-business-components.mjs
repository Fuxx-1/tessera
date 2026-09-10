import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

const HOST = "127.0.0.1";
const RESULT_DIR = join(process.cwd(), "tmp", "business-components-evidence");
const RESULT_PATH = join(RESULT_DIR, "summary.json");
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
];
const ROUTES = [
  "#metric-card",
  "#mini-chart-card",
  "#data-toolbar",
  "#filter-panel",
  "#property-list",
  "#status-timeline",
  "#command-palette",
  "#code-block",
  "#markdown-editor",
  "#mermaid-svg-viewer",
  "#mobile-preview-frame",
];

const failures = [];
const evidence = [];
let chromeProcess;
let userDataDir;
let viteProcess;

function info(message) {
  console.log(`[business-components] ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`[business-components] FAIL ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, HOST, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : undefined;
      server.close(() => (port ? resolve(port) : reject(new Error("Unable to allocate a port"))));
    });
  });
}

async function waitForHttp(url, timeoutMs = 20_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite or CDP is still starting.
    }
    await sleep(200);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function ensureAppServer() {
  if (process.env.ACCEPTANCE_URL) {
    await waitForHttp(process.env.ACCEPTANCE_URL);
    return process.env.ACCEPTANCE_URL;
  }

  const port = await getFreePort();
  const baseUrl = `http://${HOST}:${port}`;
  info(`starting Vite dev server at ${baseUrl}`);
  viteProcess = spawn("bun", ["run", "dev", "--", "--host", HOST, "--port", String(port), "--strictPort"], {
    cwd: process.cwd(),
    env: { ...process.env, BROWSER: "none" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  viteProcess.stdout.on("data", (chunk) => process.stdout.write(chunk));
  viteProcess.stderr.on("data", (chunk) => process.stderr.write(chunk));
  await waitForHttp(baseUrl);
  return baseUrl;
}

function findChromeExecutable() {
  const cacheRoot = join(homedir(), "Library", "Caches", "ms-playwright");
  const cached = existsSync(cacheRoot)
    ? readdirSync(cacheRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name.startsWith("chromium-"))
        .flatMap((entry) => [
          join(cacheRoot, entry.name, "chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
          join(cacheRoot, entry.name, "chrome-mac-arm64", "Chromium.app", "Contents", "MacOS", "Chromium"),
          join(cacheRoot, entry.name, "chrome-mac", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
          join(cacheRoot, entry.name, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
        ])
    : [];

  return [
    process.env.CHROME_PATH,
    ...cached,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].find((candidate) => candidate && existsSync(candidate));
}

function waitForProcessExit(childProcess, timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    childProcess.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal });
    });
  });
}

async function launchChrome() {
  const chromePath = findChromeExecutable();
  if (!chromePath) throw new Error("Chrome/Chromium executable not found. Set CHROME_PATH to run business smoke.");

  const remoteDebuggingPort = await getFreePort();
  userDataDir = mkdtempSync(join(tmpdir(), "tessera-business-components-"));
  chromeProcess = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-extensions",
    "--remote-allow-origins=*",
    `--remote-debugging-address=${HOST}`,
    `--remote-debugging-port=${remoteDebuggingPort}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ], {
    stdio: ["ignore", "ignore", "pipe"],
  });

  const stderr = [];
  chromeProcess.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    stderr.push(text);
    if (!text.includes("DevTools listening")) process.stderr.write(text);
  });

  const startupExit = await waitForProcessExit(chromeProcess, 300);
  if (startupExit) throw new Error(`Chrome exited before CDP startup: ${stderr.join("").trim()}`);

  await waitForHttp(`http://${HOST}:${remoteDebuggingPort}/json/version`, 45_000);
  const targetResponse = await fetch(`http://${HOST}:${remoteDebuggingPort}/json/new?about:blank`, { method: "PUT" });
  const target = await targetResponse.json();
  return connectCdp(target.webSocketDebuggerUrl);
}

function connectCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  let nextId = 1;
  const pending = new Map();
  const listeners = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { reject, resolve } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.message}: ${message.error.data ?? ""}`));
      else resolve(message.result);
      return;
    }

    const handlers = listeners.get(message.method);
    if (handlers) {
      for (const handler of handlers) handler(message.params ?? {});
    }
  });

  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  return {
    on(method, handler) {
      const handlers = listeners.get(method) ?? [];
      handlers.push(handler);
      listeners.set(method, handlers);
    },
    async send(method, params = {}) {
      await ready;
      const id = nextId++;
      const result = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
      socket.send(JSON.stringify({ id, method, params }));
      return result;
    },
    close() {
      socket.close();
    },
  };
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Evaluation failed");
  }
  return result.result.value;
}

async function setupPage(client) {
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Log.enable");
}

async function setViewport(client, viewport) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width <= 430,
    screenWidth: viewport.width,
    screenHeight: viewport.height,
  });
}

async function waitForCondition(client, conditionExpression, timeoutMs = 8_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const matched = await evaluate(client, `Boolean(${conditionExpression})`);
    if (matched) return true;
    await sleep(100);
  }
  return false;
}

async function navigate(client, baseUrl, route) {
  await client.send("Page.navigate", { url: `${baseUrl}/${route}` });
  const ready = await waitForCondition(
    client,
    `document.readyState !== "loading" && location.hash === ${JSON.stringify(route)} && document.querySelector(".docs-shell__topbar strong")`,
    10_000,
  );
  if (!ready) throw new Error(`Timed out waiting for ${route}`);
}

function createErrorCollector(client) {
  const errors = [];
  client.on("Runtime.consoleAPICalled", (params) => {
    if (params.type === "error" || params.type === "assert") {
      errors.push(`console.${params.type}: ${params.args?.map((arg) => arg.value ?? arg.description).join(" ")}`);
    }
  });
  client.on("Runtime.exceptionThrown", (params) => {
    errors.push(`exception: ${params.exceptionDetails?.text ?? params.exceptionDetails?.exception?.description ?? "unknown"}`);
  });
  client.on("Log.entryAdded", (params) => {
    if (params.entry?.level === "error") errors.push(`log.error: ${params.entry.text}`);
  });
  return errors;
}

async function inspectGenericRoute(client, baseUrl, route, viewport, pageErrors) {
  pageErrors.length = 0;
  await setViewport(client, viewport);
  await navigate(client, baseUrl, route);
  await sleep(250);

  const report = await evaluate(client, `(() => {
    const round = (value) => Math.round(value * 100) / 100;
    const viewportWidth = document.documentElement.clientWidth;
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const route = ${JSON.stringify(route)};
    const text = document.querySelector(".docs-shell__content")?.textContent ?? "";
    const componentClassByRoute = {
      "#metric-card": ".b-metric-card",
      "#mini-chart-card": ".b-mini-chart-card",
      "#data-toolbar": ".b-data-toolbar",
      "#filter-panel": ".b-filter-panel",
      "#property-list": ".b-property-list",
      "#status-timeline": ".b-status-timeline",
      "#markdown-editor": ".b-markdown-editor",
      "#mobile-preview-frame": ".b-mobile-preview-frame",
    };
    const selector = componentClassByRoute[route];
    const components = selector ? Array.from(document.querySelectorAll(selector)) : [];
    const styleReports = components.slice(0, 6).map((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        width: round(rect.width),
        borderRadius: style.borderRadius,
        borderTopColor: style.borderTopColor,
        backgroundColor: style.backgroundColor,
        boxShadow: style.boxShadow,
      };
    });
    return {
      route,
      viewport: ${JSON.stringify(viewport.name)},
      title: document.querySelector(".docs-shell__topbar strong")?.textContent?.trim() ?? "",
      componentCount: components.length,
      codeCount: document.querySelectorAll(".button-doc-code code").length,
      hasFiveRoles: ["产品专家", "UI 专家", "研发专家", "测试专家", "白帽专家"].every((role) => text.includes(role)),
      hasOneLineSample: Array.from(document.querySelectorAll(".button-doc-code code")).some((node) => !/\\n/.test(node.textContent ?? "")),
      noUndefinedText: !/\\bundefined\\b/.test(text),
      noPageOverflow: scrollWidth <= viewportWidth + 1,
      scrollWidth,
      viewportWidth,
      styleReports,
    };
  })()`);

  if (pageErrors.length > 0) fail(`${viewport.name} ${route} emitted errors: ${pageErrors.join(" | ")}`);
  if (!report.noPageOverflow) fail(`${viewport.name} ${route} horizontal overflow ${report.scrollWidth}/${report.viewportWidth}`);
  if (!report.noUndefinedText) fail(`${viewport.name} ${route} contains visible undefined`);
  if (report.componentCount < 1) fail(`${viewport.name} ${route} did not render target business component`);
  if (!report.hasFiveRoles) fail(`${viewport.name} ${route} missing five-role copy`);
  if (!report.hasOneLineSample && report.codeCount > 0) fail(`${viewport.name} ${route} missing one-line sample`);
  evidence.push(report);
}

async function inspectMetricCard(client, baseUrl, route, viewport, pageErrors, { requireError = true, requireLongValue = true } = {}) {
  await inspectGenericRoute(client, baseUrl, route, viewport, pageErrors);
  pageErrors.length = 0;
  await setViewport(client, viewport);
  await navigate(client, baseUrl, route);
  await sleep(250);

  const report = await evaluate(client, `(() => {
    const cards = Array.from(document.querySelectorAll(".b-metric-card"));
    const states = cards.map((card) => card.getAttribute("data-state") ?? "");
    const deltas = Array.from(document.querySelectorAll(".b-metric-card__delta"));
    return {
      route: ${JSON.stringify(route)},
      viewport: ${JSON.stringify(viewport.name)},
      states,
      hasReady: states.includes("ready"),
      hasLoading: states.includes("loading"),
      hasError: states.includes("error"),
      hasEmpty: states.includes("empty"),
      loadingTextVisible: cards.some((card) => card.getAttribute("data-state") === "loading" && /Loading/.test(card.textContent ?? "")),
      errorAlertCount: document.querySelectorAll('.b-metric-card [role="alert"]').length,
      emptyStatusCount: document.querySelectorAll('.b-metric-card[data-state="empty"] [role="status"]').length,
      allDeltasLabelled: deltas.length > 0 && deltas.every((delta) => /Trend (increased|decreased|unchanged):/.test(delta.getAttribute("aria-label") ?? "")),
      longValueWrapped: cards.some((card) => /1,284,932,018/.test(card.textContent ?? "") && card.getBoundingClientRect().width <= document.documentElement.clientWidth),
      noPageOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= document.documentElement.clientWidth + 1,
    };
  })()`);

  if (pageErrors.length > 0) fail(`${viewport.name} ${route} metric state check emitted errors: ${pageErrors.join(" | ")}`);
  if (!report.hasReady || !report.hasLoading || !report.hasEmpty || (requireError && !report.hasError)) fail(`${viewport.name} ${route} missing MetricCard state coverage: ${JSON.stringify(report.states)}`);
  if (!report.loadingTextVisible) fail(`${viewport.name} ${route} loading text is not visible`);
  if ((requireError && report.errorAlertCount < 1) || report.emptyStatusCount < 1) fail(`${viewport.name} ${route} missing alert/status state semantics`);
  if (!report.allDeltasLabelled) fail(`${viewport.name} ${route} deltas lack accessible trend labels`);
  if ((requireLongValue && !report.longValueWrapped) || !report.noPageOverflow) fail(`${viewport.name} ${route} long KPI value overflow risk`);
  evidence.push(report);
}

async function inspectDataToolbar(client, baseUrl, viewport, pageErrors) {
  await inspectGenericRoute(client, baseUrl, "#data-toolbar", viewport, pageErrors);
  pageErrors.length = 0;
  await setViewport(client, viewport);
  await navigate(client, baseUrl, "#data-toolbar");
  await sleep(250);

  const report = await evaluate(client, `(async () => {
    const mobileToolbar = Array.from(document.querySelectorAll(".b-data-toolbar")).find((toolbar) =>
      toolbar.textContent?.includes("Approval queue")
    );
    const toggle = mobileToolbar?.querySelector(".b-data-toolbar__mobile-toggle");
    const beforeCollapsed = mobileToolbar?.getAttribute("data-mobile-collapsed") === "true";
    const beforeSearchVisible = Boolean(mobileToolbar?.querySelector(".b-data-toolbar__search")) &&
      getComputedStyle(mobileToolbar.querySelector(".b-data-toolbar__search")).display !== "none";
    toggle?.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const afterCollapsed = mobileToolbar?.getAttribute("data-mobile-collapsed") === "true";
    const search = mobileToolbar?.querySelector(".b-data-toolbar__search");
    const actions = mobileToolbar?.querySelector(".b-data-toolbar__actions");
    const activeFilters = mobileToolbar?.querySelector(".b-data-toolbar__active-filters");
    const batch = mobileToolbar?.querySelector(".b-data-toolbar__batch");
    const actionStyle = actions ? getComputedStyle(actions) : null;
    const controlIds = toggle?.getAttribute("aria-controls")?.split(/\\s+/).filter(Boolean) ?? [];
    return {
      route: "#data-toolbar",
      viewport: ${JSON.stringify(viewport.name)},
      hasMobileToolbar: Boolean(mobileToolbar),
      hasToggle: Boolean(toggle),
      toggleVisible: toggle ? getComputedStyle(toggle).display !== "none" : false,
      beforeCollapsed,
      beforeSearchVisible,
      afterCollapsed,
      afterExpanded: !afterCollapsed,
      searchVisibleAfterToggle: search ? getComputedStyle(search).display !== "none" : false,
      ariaExpandedAfterToggle: toggle?.getAttribute("aria-expanded") ?? "",
      controlsExist: controlIds.length >= 4 && controlIds.every((id) => Boolean(document.getElementById(id))),
      wrapModeNoWrapActions: actionStyle?.flexWrap === "nowrap",
      internalScrollReady: [actions, activeFilters, batch].filter(Boolean).every((node) => ["auto", "scroll"].includes(getComputedStyle(node).overflowX)),
      noPageOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= document.documentElement.clientWidth + 1,
    };
  })()`);

  if (pageErrors.length > 0) fail(`${viewport.name} #data-toolbar mobile check emitted errors: ${pageErrors.join(" | ")}`);
  if (!report.hasMobileToolbar || !report.hasToggle) fail(`${viewport.name} #data-toolbar missing mobile collapse demo`);
  if (viewport.width <= 430) {
    if (!report.toggleVisible || !report.beforeCollapsed || report.beforeSearchVisible) fail(`${viewport.name} #data-toolbar collapsed mobile controls not hidden`);
    if (!report.afterExpanded || !report.searchVisibleAfterToggle || report.ariaExpandedAfterToggle !== "true") fail(`${viewport.name} #data-toolbar mobile toggle did not expand controls`);
    if (!report.controlsExist) fail(`${viewport.name} #data-toolbar mobile toggle aria-controls broken`);
    if (!report.wrapModeNoWrapActions || !report.internalScrollReady) fail(`${viewport.name} #data-toolbar wrap mode internal scroll not ready`);
  }
  if (!report.noPageOverflow) fail(`${viewport.name} #data-toolbar caused page overflow`);
  evidence.push(report);
}

async function inspectFilterPanel(client, baseUrl, viewport, pageErrors) {
  await inspectGenericRoute(client, baseUrl, "#filter-panel", viewport, pageErrors);
  pageErrors.length = 0;
  await setViewport(client, viewport);
  await navigate(client, baseUrl, "#filter-panel");
  await sleep(250);

  const report = await evaluate(client, `(async () => {
    const drawerReady = document.querySelector(".b-filter-panel--mobile-drawer-ready");
    const form = drawerReady?.querySelector(".b-filter-panel__form");
    const toggle = drawerReady?.querySelector(".b-filter-panel__header-actions .c-button");
    const collapsedInitially = drawerReady?.getAttribute("data-collapsed") === "true" || Boolean(form?.hidden);
    toggle?.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const formAfterOpen = drawerReady?.querySelector(".b-filter-panel__form");
    const style = formAfterOpen ? getComputedStyle(formAfterOpen) : null;
    return {
      route: "#filter-panel",
      viewport: ${JSON.stringify(viewport.name)},
      hasDrawerReady: Boolean(drawerReady),
      collapsedInitially,
      expandedAfterClick: Boolean(formAfterOpen) && !formAfterOpen.hidden,
      mobileScrollCap: style?.maxHeight ?? "",
      mobileOverflowY: style?.overflowY ?? "",
      noPageOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= document.documentElement.clientWidth + 1,
    };
  })()`);

  if (pageErrors.length > 0) fail(`${viewport.name} #filter-panel mobile check emitted errors: ${pageErrors.join(" | ")}`);
  if (!report.hasDrawerReady || !report.collapsedInitially || !report.expandedAfterClick) fail(`${viewport.name} #filter-panel drawer-ready collapse/expand failed`);
  if (viewport.width <= 430 && (!report.mobileScrollCap || !["auto", "scroll"].includes(report.mobileOverflowY))) fail(`${viewport.name} #filter-panel drawer-ready mobile scroll cap missing`);
  if (!report.noPageOverflow) fail(`${viewport.name} #filter-panel caused page overflow`);
  evidence.push(report);
}

async function inspectCodeBlock(client, baseUrl, viewport, pageErrors) {
  pageErrors.length = 0;
  await setViewport(client, viewport);
  await navigate(client, baseUrl, "#code-block");
  await sleep(350);

  const report = await evaluate(client, `(async () => {
    const round = (value) => Math.round(value * 100) / 100;
    const viewportWidth = document.documentElement.clientWidth;
    const blocks = Array.from(document.querySelectorAll(".b-code-block"));
    const firstBlock = blocks[0];
    const copyButton = firstBlock?.querySelector("button[aria-label], button");
    const wrapButton = Array.from(firstBlock?.querySelectorAll("button") ?? []).find((button) => button.getAttribute("aria-pressed") !== null);
    try {
      copyButton?.focus({ focusVisible: true });
    } catch {
      copyButton?.focus();
    }
    const copyFocus = document.activeElement === copyButton;
    const copyFocusStyle = copyButton ? getComputedStyle(copyButton) : null;
    const copyFocusVisible = Boolean(copyFocusStyle && (
      (copyFocusStyle.outlineStyle !== "none" && copyFocusStyle.outlineWidth !== "0px") ||
      copyFocusStyle.outlineWidth !== "0px" ||
      copyFocusStyle.boxShadow !== "none"
    ));
    wrapButton?.click();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const wrapPressed = wrapButton?.getAttribute("aria-pressed") === "true";
    const longBlock = Array.from(blocks).find((block) => block.textContent?.includes("line intentionally stays readable"));
    const longPre = longBlock?.querySelector(".b-code-block__pre");
    const headerReports = blocks.slice(0, 4).map((block) => {
      const header = block.querySelector(".b-code-block__header");
      const tools = block.querySelector(".b-code-block__header-tools");
      const h2 = block.querySelector("h2");
      const headerRect = header?.getBoundingClientRect();
      const toolsRect = tools?.getBoundingClientRect();
      const h2Rect = h2?.getBoundingClientRect();
      return {
        title: h2?.textContent?.trim() ?? "",
        headerWidth: headerRect ? round(headerRect.width) : 0,
        toolsWidth: toolsRect ? round(toolsRect.width) : 0,
        titleWidth: h2Rect ? round(h2Rect.width) : 0,
        toolsBelowOrBesideTitle: Boolean(headerRect && toolsRect && h2Rect && (toolsRect.left >= h2Rect.right - 1 || toolsRect.top >= h2Rect.bottom - 1)),
      };
    });
    return {
      route: "#code-block",
      viewport: ${JSON.stringify(viewport.name)},
      blockCount: blocks.length,
      noPageOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= viewportWidth + 1,
      viewportWidth,
      hasCopyButton: Boolean(copyButton),
      copyFocus,
      copyFocusOutline: copyFocusStyle?.outlineStyle ?? "",
      copyFocusOutlineWidth: copyFocusStyle?.outlineWidth ?? "",
      copyFocusBoxShadow: copyFocusStyle?.boxShadow ?? "",
      copyFocusVisible,
      hasWrapButton: Boolean(wrapButton),
      wrapPressed,
      wrapIcon: wrapButton?.querySelector("svg")?.classList.contains("c-icon") ?? false,
      longLineScrollsInternally: longPre ? longPre.scrollWidth > longPre.clientWidth : false,
      headerReports,
    };
  })()`);

  if (pageErrors.length > 0) fail(`${viewport.name} #code-block emitted errors: ${pageErrors.join(" | ")}`);
  if (!report.noPageOverflow) fail(`${viewport.name} #code-block caused page overflow`);
  if (report.blockCount < 8) fail(`${viewport.name} #code-block expected examples and states`);
  if (!report.hasCopyButton || !report.copyFocus) fail(`${viewport.name} #code-block copy button focus failed`);
  if (!report.copyFocusVisible) fail(`${viewport.name} #code-block copy focus outline not visible`);
  if (!report.hasWrapButton || !report.wrapPressed || !report.wrapIcon) fail(`${viewport.name} #code-block wrap button did not work`);
  if (!report.longLineScrollsInternally && viewport.name === "desktop") fail("#code-block desktop long line did not scroll internally");
  if (!report.headerReports.every((item) => item.toolsBelowOrBesideTitle)) fail(`${viewport.name} #code-block tools overlap title: ${JSON.stringify(report.headerReports)}`);
  evidence.push(report);
}

async function inspectCommandPalette(client, baseUrl, viewport, pageErrors) {
  pageErrors.length = 0;
  await setViewport(client, viewport);
  await navigate(client, baseUrl, "#command-palette");
  await sleep(350);

  const report = await evaluate(client, `(async () => {
    const round = (value) => Math.round(value * 100) / 100;
    const trigger = Array.from(document.querySelectorAll(".command-palette-doc-stack .c-button, .b-command-palette .c-button"))
      .find((button) => /Command palette|Open controlled palette/.test(button.textContent ?? ""));
    trigger?.click();
    await new Promise((resolve) => setTimeout(resolve, 160));
    const dialog = document.querySelector(".b-command-palette__dialog");
    const input = dialog?.querySelector("input");
    const items = Array.from(dialog?.querySelectorAll(".b-command-palette__item") ?? []);
    const focusedInput = document.activeElement === input;
    const bodyOverflowWhenOpen = document.body.style.overflow;
    input?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 60));
    const activeAfterArrow = dialog?.querySelector(".b-command-palette__item--active strong")?.textContent?.trim() ?? "";
    if (input) {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      valueSetter?.call(input, "copy");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
    const highlightedText = Array.from(dialog?.querySelectorAll(".b-command-palette__highlight") ?? []).map((node) => node.textContent ?? "");
    const filteredCount = dialog?.querySelectorAll(".b-command-palette__item").length ?? 0;
    const firstEnabled = Array.from(dialog?.querySelectorAll(".b-command-palette__item") ?? []).find((item) => !item.disabled);
    firstEnabled?.click();
    await new Promise((resolve) => setTimeout(resolve, 160));
    const closedAfterEnter = !document.querySelector(".b-command-palette__dialog");
    const bodyOverflowAfterSelect = document.body.style.overflow;
    const outputText = document.querySelector(".command-palette-doc-stack .segmented-doc-output")?.textContent?.trim() ?? "";
    trigger?.click();
    await new Promise((resolve) => setTimeout(resolve, 120));
    const secondDialog = document.querySelector(".b-command-palette__dialog");
    secondDialog?.querySelector("input")?.focus();
    secondDialog?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 120));
    const closedByEscape = !document.querySelector(".b-command-palette__dialog");
    const bodyOverflowAfterEscape = document.body.style.overflow;
    const focusRestored = document.activeElement === trigger;
    trigger?.click();
    await new Promise((resolve) => setTimeout(resolve, 120));
    const thirdDialog = document.querySelector(".b-command-palette__dialog");
    const rect = thirdDialog?.getBoundingClientRect();
    const searchRect = thirdDialog?.querySelector(".b-command-palette__search")?.getBoundingClientRect();
    const thirdItems = Array.from(thirdDialog?.querySelectorAll(".b-command-palette__item") ?? []);
    const unsafeText = thirdDialog?.textContent ?? document.body.textContent ?? "";
    const bodyOverflowWhenReopened = document.body.style.overflow;
    return {
      route: "#command-palette",
      viewport: ${JSON.stringify(viewport.name)},
      hasTrigger: Boolean(trigger),
      hasDialog: Boolean(thirdDialog),
      dialogWidth: rect ? round(rect.width) : 0,
      dialogRight: rect ? round(rect.right) : 0,
      searchHeight: searchRect ? round(searchRect.height) : 0,
      itemCount: thirdItems.length,
      focusedInput,
      activeAfterArrow,
      highlightedText,
      filteredCount,
      closedAfterEnter,
      closedByEscape,
      bodyOverflowWhenOpen,
      bodyOverflowAfterSelect,
      bodyOverflowAfterEscape,
      bodyOverflowWhenReopened,
      outputText,
      focusRestored,
      hasDisabledItem: thirdItems.some((item) => item.hasAttribute("disabled") || item.getAttribute("aria-disabled") === "true"),
      hasUnsafeTextAsText: unsafeText.includes("<img src=x onerror=alert(1)>"),
      unsafeDomCreated: Boolean(thirdDialog?.querySelector("img, script")),
      noPageOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= document.documentElement.clientWidth + 1,
    };
  })()`);

  if (pageErrors.length > 0) fail(`${viewport.name} #command-palette emitted errors: ${pageErrors.join(" | ")}`);
  if (!report.hasTrigger || !report.hasDialog) fail(`${viewport.name} #command-palette did not open dialog`);
  if (report.itemCount < 5) fail(`${viewport.name} #command-palette rendered too few commands`);
  if (!report.focusedInput) fail(`${viewport.name} #command-palette input did not receive focus`);
  if (!report.activeAfterArrow || report.activeAfterArrow === "Open component docs") fail(`${viewport.name} #command-palette ArrowDown did not move active command`);
  if (!report.highlightedText.some((text) => text.toLowerCase() === "copy") || report.filteredCount < 1) fail(`${viewport.name} #command-palette search highlight failed`);
  if (!report.closedAfterEnter || !report.outputText || report.outputText === "No command selected") fail(`${viewport.name} #command-palette command selection failed`);
  if (!report.closedByEscape || !report.focusRestored) fail(`${viewport.name} #command-palette Escape close/focus restore failed`);
  if (report.bodyOverflowWhenOpen !== "hidden" || report.bodyOverflowWhenReopened !== "hidden" || report.bodyOverflowAfterSelect === "hidden" || report.bodyOverflowAfterEscape === "hidden") {
    fail(`${viewport.name} #command-palette body scroll lock conflict: ${JSON.stringify({
      open: report.bodyOverflowWhenOpen,
      reopened: report.bodyOverflowWhenReopened,
      afterSelect: report.bodyOverflowAfterSelect,
      afterEscape: report.bodyOverflowAfterEscape,
    })}`);
  }
  if (!report.hasDisabledItem) fail(`${viewport.name} #command-palette missing disabled command evidence`);
  if (!report.hasUnsafeTextAsText || report.unsafeDomCreated) fail(`${viewport.name} #command-palette unsafe text boundary failed`);
  if (!report.noPageOverflow) fail(`${viewport.name} #command-palette caused page overflow`);
  evidence.push(report);
}

async function inspectMermaid(client, baseUrl, viewport, pageErrors) {
  pageErrors.length = 0;
  await setViewport(client, viewport);
  await navigate(client, baseUrl, "#mermaid-svg-viewer");
  const ready = await waitForCondition(client, "document.querySelectorAll('.b-mermaid-viewer .b-mermaid-viewer__svg svg').length >= 7", 14_000);
  if (!ready) fail(`${viewport.name} #mermaid-svg-viewer Mermaid SVGs did not become ready`);

  const report = await evaluate(client, `(async () => {
    const ready = ${JSON.stringify(ready)};
    const round = (value) => Math.round(value * 100) / 100;
    const viewers = Array.from(document.querySelectorAll(".b-mermaid-viewer"));
    const firstViewer = viewers[0];
    const viewportNode = firstViewer?.querySelector(".b-mermaid-viewer__viewport");
    const controls = firstViewer?.querySelector(".b-mermaid-viewer__controls");
    const title = firstViewer?.querySelector(".b-mermaid-viewer__bar > span");
    const buttons = Array.from(controls?.querySelectorAll("button") ?? []);
    const titleRect = title?.getBoundingClientRect();
    const controlsRect = controls?.getBoundingClientRect();
    const viewerReports = viewers.map((viewer, index) => {
      const svg = viewer.querySelector(".b-mermaid-viewer__svg svg");
      const edges = Array.from(svg?.querySelectorAll(".b-mermaid-edge, .edgePath path, .flowchart-link, path.relationshipLine, path.transition, line.messageLine0, line.messageLine1") ?? []);
      const markers = Array.from(svg?.querySelectorAll("marker, marker path, path.arrowheadPath") ?? []);
      const edgeStyles = edges.slice(0, 8).map((edge) => {
        const style = getComputedStyle(edge);
        const rect = edge.getBoundingClientRect();
        return {
          stroke: edge.getAttribute("stroke") || style.stroke,
          strokeWidth: edge.getAttribute("stroke-width") || style.strokeWidth,
          markerEnd: edge.getAttribute("marker-end") || style.markerEnd,
          visibleBox: round(rect.width + rect.height),
        };
      });
      return {
        index,
        title: viewer.querySelector(".b-mermaid-viewer__bar")?.textContent?.trim() ?? "",
        hasSvg: Boolean(svg),
        viewBox: svg?.getAttribute("viewBox") ?? "",
        edgeCount: edges.length,
        markerCount: markers.length,
        edgeStyles,
      };
    });
    try {
      viewportNode?.focus({ focusVisible: true });
    } catch {
      viewportNode?.focus();
    }
    const viewportFocused = document.activeElement === viewportNode;
    const viewportFocusStyle = viewportNode ? getComputedStyle(viewportNode) : null;
    const viewportFocusVisible = Boolean(viewportFocusStyle && (
      (viewportFocusStyle.outlineStyle !== "none" && viewportFocusStyle.outlineWidth !== "0px") ||
      viewportFocusStyle.outlineWidth !== "0px" ||
      viewportFocusStyle.boxShadow !== "none"
    ));
    buttons.find((button) => button.getAttribute("aria-label") === "Zoom in")?.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const zoomedCaption = firstViewer?.querySelector(".b-mermaid-viewer__bar small")?.textContent?.trim() ?? "";
    const transformAfterZoom = firstViewer?.querySelector(".b-mermaid-viewer__svg")?.style.transform ?? "";
    viewportNode?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 80));
    const transformAfterPan = firstViewer?.querySelector(".b-mermaid-viewer__svg")?.style.transform ?? "";
    buttons.find((button) => button.getAttribute("aria-label") === "Fit view")?.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    document.documentElement.dataset.theme = "dark";
    await new Promise((resolve) => setTimeout(resolve, 220));
    const darkStyle = firstViewer ? getComputedStyle(firstViewer) : null;
    const darkViewportStyle = viewportNode ? getComputedStyle(viewportNode) : null;
    document.documentElement.dataset.theme = "light";
    return {
      route: "#mermaid-svg-viewer",
      viewport: ${JSON.stringify(viewport.name)},
      ready,
      viewerCount: viewers.length,
      controlButtonLabels: buttons.map((button) => button.getAttribute("aria-label") ?? button.textContent?.trim() ?? ""),
      controlsInBar: Boolean(controls?.closest(".b-mermaid-viewer__bar")),
      controlsDoNotOverlapTitle: Boolean(titleRect && controlsRect && (controlsRect.left >= titleRect.right - 1 || controlsRect.top >= titleRect.bottom - 1)),
      viewportFocused,
      viewportFocusOutline: viewportFocusStyle?.outlineStyle ?? "",
      viewportFocusOutlineWidth: viewportFocusStyle?.outlineWidth ?? "",
      viewportFocusBoxShadow: viewportFocusStyle?.boxShadow ?? "",
      viewportFocusVisible,
      zoomedCaption,
      transformAfterZoom,
      transformAfterPan,
      darkBackground: darkStyle?.backgroundColor ?? "",
      darkViewportBackground: darkViewportStyle?.backgroundColor ?? "",
      noPageOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= document.documentElement.clientWidth + 1,
      viewerReports,
    };
  })()`);

  const requiredButtons = ["Copy Mermaid source", "Download Mermaid SVG", "Zoom out", "Zoom in", "Fit view"];
  if (pageErrors.length > 0) fail(`${viewport.name} #mermaid-svg-viewer emitted errors: ${pageErrors.join(" | ")}`);
  if (report.viewerCount < 7) fail(`${viewport.name} #mermaid-svg-viewer expected independent fixtures`);
  for (const button of requiredButtons) {
    if (!report.controlButtonLabels.includes(button)) fail(`${viewport.name} #mermaid-svg-viewer missing button ${button}`);
  }
  if (!report.controlsInBar || !report.controlsDoNotOverlapTitle) fail(`${viewport.name} #mermaid-svg-viewer controls overlap title`);
  if (!report.viewportFocused || !report.viewportFocusVisible) fail(`${viewport.name} #mermaid-svg-viewer viewport focus failed`);
  if (!report.zoomedCaption.endsWith("%")) fail(`${viewport.name} #mermaid-svg-viewer zoom did not update caption`);
  if (!report.transformAfterZoom.includes("scale(") || !report.transformAfterPan.includes("translate(")) fail(`${viewport.name} #mermaid-svg-viewer zoom/pan transform missing`);
  if (!report.viewerReports.every((item) => item.hasSvg && item.viewBox && item.edgeCount > 0)) {
    fail(`${viewport.name} #mermaid-svg-viewer missing SVG edges: ${JSON.stringify(report.viewerReports)}`);
  }
  if (!report.viewerReports.some((item) => item.markerCount > 0)) fail(`${viewport.name} #mermaid-svg-viewer markers missing`);
  if (!report.viewerReports.flatMap((item) => item.edgeStyles).every((edge) => edge.visibleBox > 0 && edge.stroke && edge.stroke !== "none")) {
    fail(`${viewport.name} #mermaid-svg-viewer invisible or unstroked edge found`);
  }
  if (!report.darkBackground || !report.darkViewportBackground) fail(`${viewport.name} #mermaid-svg-viewer dark theme styles not readable`);
  if (!report.noPageOverflow) fail(`${viewport.name} #mermaid-svg-viewer caused page overflow`);
  evidence.push(report);
}

async function inspectMarkdownEditor(client, baseUrl, viewport, pageErrors) {
  pageErrors.length = 0;
  await setViewport(client, viewport);
  await navigate(client, baseUrl, "#markdown-editor");
  await waitForCondition(client, "document.querySelector('.b-markdown-editor')", 8_000);

  const focusTarget = await evaluate(client, `(() => {
    const editors = Array.from(document.querySelectorAll(".b-markdown-editor"));
    const editor = editors.find((item) => {
      const textarea = item.querySelector("textarea");
      return item.getAttribute("aria-label") === "Release draft" && textarea && !textarea.readOnly && !textarea.disabled;
    })
      ?? editors.find((item) => {
        const textarea = item.querySelector("textarea");
        return textarea && !textarea.readOnly && !textarea.disabled;
      })
      ?? editors[0];
    const textarea = editor?.querySelector("textarea");
    textarea?.scrollIntoView({ block: "center", inline: "nearest" });
    const rect = textarea?.getBoundingClientRect();
    return {
      hasEditor: Boolean(editor),
      editorLabel: editor?.getAttribute("aria-label") ?? "",
      hasTextarea: Boolean(textarea),
      textareaReadOnly: textarea?.readOnly ?? false,
      textareaDisabled: textarea?.disabled ?? false,
      x: rect ? Math.round(rect.left + Math.min(Math.max(rect.width / 2, 16), Math.max(rect.width - 16, 16))) : 0,
      y: rect ? Math.round(rect.top + Math.min(Math.max(rect.height / 2, 16), Math.max(rect.height - 16, 16))) : 0,
    };
  })()`);

  if (focusTarget.hasTextarea && !focusTarget.textareaReadOnly && !focusTarget.textareaDisabled) {
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: focusTarget.x,
      y: focusTarget.y,
      button: "none",
    });
    await client.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: focusTarget.x,
      y: focusTarget.y,
      button: "left",
      clickCount: 1,
    });
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: focusTarget.x,
      y: focusTarget.y,
      button: "left",
      clickCount: 1,
    });
  }
  await sleep(160);

  const report = await evaluate(client, `(async () => {
    const editors = Array.from(document.querySelectorAll(".b-markdown-editor"));
    const editor = editors.find((item) => {
      const textarea = item.querySelector("textarea");
      return item.getAttribute("aria-label") === "Release draft" && textarea && !textarea.readOnly && !textarea.disabled;
    })
      ?? editors.find((item) => {
        const textarea = item.querySelector("textarea");
        return textarea && !textarea.readOnly && !textarea.disabled;
      })
      ?? editors[0];
    const textarea = editor?.querySelector("textarea");
    const textareaFocused = document.activeElement === textarea;
    const workspace = editor?.querySelector(".b-markdown-editor__workspace");
    const textareaStyle = textarea ? getComputedStyle(textarea) : null;
    const workspaceFocusClass = workspace?.classList.contains("b-markdown-editor__workspace--focus") ?? false;
    const textareaFocusOutline = textareaStyle?.outlineStyle ?? "";
    const textareaFocusOutlineWidth = textareaStyle?.outlineWidth ?? "";
    const textareaFocusBoxShadow = textareaStyle?.boxShadow ?? "";
    const textareaFocusVisible = Boolean(textareaStyle && (
      (textareaStyle.outlineStyle !== "none" && textareaStyle.outlineWidth !== "0px") ||
      textareaStyle.outlineWidth !== "0px" ||
      textareaStyle.boxShadow !== "none"
    ));
    const previewTab = Array.from(editor?.querySelectorAll(".b-markdown-editor__modes button") ?? []).find((button) => button.textContent?.trim() === "Preview");
    previewTab?.click();
    await new Promise((resolve) => setTimeout(resolve, 140));
    const mermaidReady = await new Promise((resolve) => {
      const started = Date.now();
      const tick = () => {
        if (editor?.querySelector(".b-mermaid-viewer .b-mermaid-viewer__svg svg") || Date.now() - started > 6000) {
          resolve(Boolean(editor?.querySelector(".b-mermaid-viewer .b-mermaid-viewer__svg svg")));
        }
        else setTimeout(tick, 100);
      };
      tick();
    });
    return {
      route: "#markdown-editor",
      viewport: ${JSON.stringify(viewport.name)},
      hasEditor: Boolean(editor),
      editorLabel: editor?.getAttribute("aria-label") ?? "",
      hasTextarea: Boolean(textarea),
      textareaReadOnly: textarea?.readOnly ?? false,
      textareaDisabled: textarea?.disabled ?? false,
      textareaFocused,
      textareaMatchesFocus: textarea?.matches(":focus") ?? false,
      workspaceFocusClass,
      textareaFocusOutline,
      textareaFocusOutlineWidth,
      textareaFocusBoxShadow,
      textareaFocusVisible,
      selectedPreview: previewTab?.getAttribute("aria-selected") === "true",
      mermaidReady,
      noPageOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= document.documentElement.clientWidth + 1,
    };
  })()`);

  if (pageErrors.length > 0) fail(`${viewport.name} #markdown-editor emitted errors: ${pageErrors.join(" | ")}`);
  if (!report.hasEditor) fail(`${viewport.name} #markdown-editor missing editor`);
  if (!report.hasTextarea || !report.textareaFocused || !report.workspaceFocusClass || !report.textareaFocusVisible) fail(`${viewport.name} #markdown-editor focus not visible`);
  if (!report.selectedPreview) fail(`${viewport.name} #markdown-editor preview tab did not activate`);
  if (!report.mermaidReady) fail(`${viewport.name} #markdown-editor embedded Mermaid not ready`);
  if (!report.noPageOverflow) fail(`${viewport.name} #markdown-editor caused page overflow`);
  evidence.push(report);
}

async function main() {
  mkdirSync(RESULT_DIR, { recursive: true });
  const baseUrl = await ensureAppServer();
  const client = await launchChrome();
  await setupPage(client);
  const pageErrors = createErrorCollector(client);

  for (const viewport of VIEWPORTS) {
    info(`checking ${viewport.name}`);
    for (const route of ROUTES) {
      if (route === "#metric-card") {
        await inspectMetricCard(client, baseUrl, route, viewport, pageErrors);
      } else if (route === "#mini-chart-card") {
        await inspectMetricCard(client, baseUrl, route, viewport, pageErrors, { requireError: false, requireLongValue: false });
      } else if (route === "#data-toolbar") {
        await inspectDataToolbar(client, baseUrl, viewport, pageErrors);
      } else if (route === "#filter-panel") {
        await inspectFilterPanel(client, baseUrl, viewport, pageErrors);
      } else if (route === "#code-block") {
        await inspectCodeBlock(client, baseUrl, viewport, pageErrors);
      } else if (route === "#command-palette") {
        await inspectCommandPalette(client, baseUrl, viewport, pageErrors);
      } else if (route === "#mermaid-svg-viewer") {
        await inspectMermaid(client, baseUrl, viewport, pageErrors);
      } else if (route === "#markdown-editor") {
        await inspectMarkdownEditor(client, baseUrl, viewport, pageErrors);
      } else {
        await inspectGenericRoute(client, baseUrl, route, viewport, pageErrors);
      }
    }
  }

  const result = {
    status: failures.length ? "FAIL" : "PASS",
    routes: ROUTES,
    viewports: VIEWPORTS,
    failures,
    evidence,
  };
  writeFileSync(RESULT_PATH, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  if (failures.length > 0) process.exitCode = 1;
  client.close();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    chromeProcess?.kill("SIGTERM");
    viteProcess?.kill("SIGTERM");
    if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
  });
