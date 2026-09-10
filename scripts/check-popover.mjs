import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

const HOST = "127.0.0.1";
const APP_PORT = Number(process.env.POPOVER_SMOKE_PORT ?? 5177);
const CDP_PORT = Number(process.env.POPOVER_SMOKE_CDP_PORT ?? 9342);
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile-430", width: 430, height: 844 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-360", width: 360, height: 800 },
];

const failures = [];
let viteProcess;
let chromeProcess;
let userDataDir;
const clients = new Set();

function info(message) {
  console.log(`[popover-smoke] ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`[popover-smoke] FAIL ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isPortOpen(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.listen(port, HOST, () => {
      server.close(() => resolve(true));
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
          join(playwrightCache, entry.name, "chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
          join(playwrightCache, entry.name, "chrome-mac-arm64", "Chromium.app", "Contents", "MacOS", "Chromium"),
          join(playwrightCache, entry.name, "chrome-mac", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
          join(playwrightCache, entry.name, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
        ])
    : [];
  return [
    ...playwrightChromes,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].find((candidate) => existsSync(candidate)) ?? null;
}

async function startVite() {
  if (!(await isPortOpen(APP_PORT))) {
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

async function startChrome() {
  const chromePath = findChromeExecutable();
  if (!chromePath) throw new Error("No Chrome/Chromium executable found for Popover smoke");
  userDataDir = mkdtempSync(join(tmpdir(), "popover-smoke-chrome-"));
  info(`starting Chrome CDP on ${HOST}:${CDP_PORT}`);
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
  ], { stdio: ["ignore", "ignore", "pipe"] });
  chromeProcess.stderr.on("data", (chunk) => process.stderr.write(chunk));
  await waitForHttp(`http://${HOST}:${CDP_PORT}/json/version`);
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
      message.error ? reject(new Error(message.error.message)) : resolve(message.result);
      return;
    }
    for (const listener of events.get(message.method) ?? []) listener(message.params);
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
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    once(method) {
      return new Promise((resolve) => {
        const listener = (params) => {
          events.set(method, (events.get(method) ?? []).filter((item) => item !== listener));
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
  const response = await fetch(`http://${HOST}:${CDP_PORT}/json/new?about:blank`, { method: "PUT" });
  const target = await response.json();
  const client = createCdpClient(target.webSocketDebuggerUrl);
  await client.ready();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  clients.add(client);
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
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? "Runtime evaluation failed");
  return result.result.value;
}

function assertReport(viewport, report) {
  if (report.hash !== "#popover" || report.title !== "Popover 气泡卡片" || !report.hasIndependentDoc) {
    fail(`${viewport.name}: #popover route/doc boundary failed ${JSON.stringify(report.route)}`);
  }
  if (report.demoCount !== 4) fail(`${viewport.name}: expected 4 demos, found ${report.demoCount}`);
  if (!report.docsOk || !report.allSamplesOneLine || report.hasVisibleUndefined) {
    fail(`${viewport.name}: docs/security/one-line text failed ${JSON.stringify(report.docs)}`);
  }
  if (!report.defaultPortalOk || !report.defaultPanelBoundsOk || !report.defaultActionSafe) {
    fail(`${viewport.name}: default portal/bounds/action failed ${JSON.stringify(report.defaultPanel)}`);
  }
  if (!report.controlledOpened || !report.escapeClosed || !report.outsideClosed || !report.focusReturned) {
    fail(`${viewport.name}: controlled close paths failed ${JSON.stringify(report.controlled)}`);
  }
  if (!report.combinedOpened || !report.combinedPanelBoundsOk || !report.combinedOutsideClosed) {
    fail(`${viewport.name}: combined trigger/mobile close failed ${JSON.stringify(report.combined)}`);
  }
  if (!report.placementPanelsOk || report.pageHorizontalOverflow > 1) {
    fail(`${viewport.name}: placement overflow failed ${JSON.stringify(report.placement)}`);
  }
}

async function inspectViewport(viewport) {
  const client = await createPage();
  await navigate(client, `http://${HOST}:${APP_PORT}/#popover`, viewport);
  await evaluate(client, String.raw`new Promise((resolve) => {
    const ready = () => document.querySelector("#popover-doc-title") && document.querySelectorAll(".button-doc-demo").length === 4;
    if (ready()) return resolve(true);
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
    const demos = Array.from(document.querySelectorAll(".popover-doc-demo"));
    const demoByTitle = (title) => demos.find((demo) => demo.querySelector(".button-doc-demo__meta h3")?.textContent.trim() === title);
    const findButton = (container, label) => Array.from(container?.querySelectorAll("button") ?? []).find((item) => item.textContent.trim() === label);
    const panelForTrigger = (trigger) => {
      const id = trigger?.getAttribute("aria-controls");
      return id ? document.getElementById(id) : null;
    };
    const rect = (node) => {
      const box = node.getBoundingClientRect();
      return {
        left: Math.round(box.left),
        right: Math.round(box.right),
        top: Math.round(box.top),
        bottom: Math.round(box.bottom),
        width: Math.round(box.width),
        height: Math.round(box.height),
      };
    };
    const inViewport = (node) => {
      if (!node) return false;
      const box = node.getBoundingClientRect();
      return box.left >= 11 && box.right <= window.innerWidth - 11 && box.top >= 11 && box.bottom <= window.innerHeight - 11;
    };

    const structured = demoByTitle("结构化卡片");
    const controlled = demoByTitle("受控打开");
    const triggers = demoByTitle("触发方式");
    const placement = demoByTitle("方向与箭头");

    const defaultTrigger = findButton(structured, "Open summary");
    await wait(120);
    const defaultPanel = panelForTrigger(defaultTrigger);
    const defaultPortalOk = defaultPanel?.parentElement === document.body &&
      defaultPanel?.getAttribute("role") === "dialog" &&
      Boolean(defaultPanel?.getAttribute("aria-labelledby")) &&
      !defaultPanel?.hasAttribute("aria-modal") &&
      defaultTrigger?.getAttribute("aria-expanded") === "true";
    const defaultPanelBoundsOk = inViewport(defaultPanel);
    const defaultPanelRect = defaultPanel ? rect(defaultPanel) : null;
    findButton(defaultPanel, "Review")?.click();
    await wait(80);
    const defaultActionSafe = structured?.textContent.includes("Review clicks: 1") && Boolean(panelForTrigger(defaultTrigger));

    const externalOpenButton = findButton(controlled, "External open");
    externalOpenButton?.focus();
    externalOpenButton?.click();
    await wait(100);
    const controlledTrigger = findButton(controlled, "Controlled target");
    const controlledPanel = panelForTrigger(controlledTrigger);
    const controlledOpened = controlledTrigger?.getAttribute("aria-expanded") === "true" &&
      controlledPanel?.parentElement === document.body &&
      inViewport(controlledPanel);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wait(120);
    const escapeClosed = controlledTrigger?.getAttribute("aria-expanded") === "false" && controlled?.textContent.includes("Open: false");
    const focusReturned = document.activeElement === controlledTrigger || document.activeElement === externalOpenButton;
    externalOpenButton?.focus();
    externalOpenButton?.click();
    await wait(100);
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await wait(120);
    const outsideClosed = controlledTrigger?.getAttribute("aria-expanded") === "false";

    const combinedTrigger = findButton(triggers, "Combined");
    combinedTrigger?.click();
    await wait(120);
    const combinedPanel = panelForTrigger(combinedTrigger);
    const combinedOpened = combinedTrigger?.getAttribute("aria-expanded") === "true" && combinedPanel?.parentElement === document.body;
    const combinedPanelBoundsOk = inViewport(combinedPanel);
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await wait(120);
    const combinedOutsideClosed = combinedTrigger?.getAttribute("aria-expanded") === "false";

    const placementButtons = ["top", "bottom", "left", "right"].map((label) => findButton(placement, label)).filter(Boolean);
    const placementReports = [];
    for (const button of placementButtons) {
      button.click();
      await wait(100);
      const panel = panelForTrigger(button);
      placementReports.push({
        label: button.textContent.trim(),
        portal: panel?.parentElement === document.body,
        inViewport: inViewport(panel),
        trigger: rect(button),
        panel: panel ? rect(panel) : null,
      });
      document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      await wait(80);
    }
    const placementPanelsOk = placementReports.length === 4 && placementReports.every((item) => item.portal && item.inViewport);
    const pageHorizontalOverflow = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const docText = document.body.textContent ?? "";
    const samples = Array.from(document.querySelectorAll(".popover-doc .button-doc-code code")).map((node) => node.textContent ?? "");
    const docsOk = docText.includes("body portal") &&
      docText.includes("No antd / antd-mobile / @ant-design/charts") &&
      docText.includes("dangerouslySetInnerHTML") &&
      ["产品专家", "UI 专家", "研发专家", "测试专家", "白帽专家"].every((text) => docText.includes(text));
    const hasVisibleUndefined = /\bundefined\b/.test(docText);

    return {
      hash: window.location.hash,
      title: document.querySelector("#popover-doc-title")?.textContent.trim() ?? "",
      hasIndependentDoc: Boolean(document.querySelector(".popover-doc")) && !document.querySelector(".component-doc-page.detail-doc"),
      demoCount: demos.length,
      docsOk,
      allSamplesOneLine: samples.length === 4 && samples.every((sample) => !/\n/.test(sample)),
      hasVisibleUndefined,
      defaultPortalOk,
      defaultPanelBoundsOk,
      defaultActionSafe,
      controlledOpened,
      escapeClosed,
      outsideClosed,
      focusReturned,
      combinedOpened,
      combinedPanelBoundsOk,
      combinedOutsideClosed,
      placementPanelsOk,
      pageHorizontalOverflow,
      route: { hash: window.location.hash, title: document.querySelector("#popover-doc-title")?.textContent.trim() ?? "", hasIndependentDoc: Boolean(document.querySelector(".popover-doc")) },
      docs: { docsOk, sampleCount: samples.length, allSamplesOneLine: samples.every((sample) => !/\n/.test(sample)), hasVisibleUndefined },
      defaultPanel: { defaultPortalOk, defaultPanelBoundsOk, defaultActionSafe, panel: defaultPanelRect },
      controlled: { controlledOpened, escapeClosed, outsideClosed, focusReturned },
      combined: { combinedOpened, combinedPanelBoundsOk, combinedOutsideClosed, panel: combinedPanel ? rect(combinedPanel) : null },
      placement: { placementReports, pageHorizontalOverflow },
    };
  })()`);

  assertReport(viewport, report);
  info(`${viewport.name}: ${JSON.stringify({ panels: report.placement.placementReports.length, overflow: report.pageHorizontalOverflow, default: report.defaultPanel.panel })}`);
  client.close();
  clients.delete(client);
}

async function main() {
  try {
    await startVite();
    await startChrome();
    for (const viewport of VIEWPORTS) await inspectViewport(viewport);
  } finally {
    for (const client of clients) client.close();
    clients.clear();
    if (chromeProcess) chromeProcess.kill("SIGTERM");
    if (viteProcess) viteProcess.kill("SIGTERM");
    if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
  }

  if (failures.length) {
    console.error(`[popover-smoke] ${failures.length} failure(s)`);
    process.exit(1);
  }

  info("PASS");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
