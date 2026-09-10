import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

const HOST = "127.0.0.1";
const APP_PORT = Number(process.env.POPCONFIRM_SMOKE_PORT ?? 5177);
const CDP_PORT = Number(process.env.POPCONFIRM_SMOKE_CDP_PORT ?? 9341);
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
  console.log(`[popconfirm-smoke] ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`[popconfirm-smoke] FAIL ${message}`);
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

async function startChrome() {
  const chromePath = findChromeExecutable();
  if (!chromePath) {
    throw new Error("No Chrome/Chromium executable found for Popconfirm smoke");
  }

  userDataDir = mkdtempSync(join(tmpdir(), "popconfirm-smoke-chrome-"));
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
      throw new Error(`Chrome exited before CDP startup: ${JSON.stringify(exitInfo)} ${stderr.join("").trim()}`);
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

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Runtime evaluation failed");
  }

  return result.result.value;
}

function assertReport(viewport, report) {
  if (report.hash !== "#popconfirm" || report.title !== "Popconfirm 气泡确认框" || !report.hasIndependentDoc) {
    fail(`${viewport.name}: #popconfirm route/doc boundary failed ${JSON.stringify(report.route)}`);
  }
  if (report.demoCount !== 6) fail(`${viewport.name}: expected 6 demos, found ${report.demoCount}`);
  if (!report.hasBoundaryCopy || !report.hasSecurityCopy || !report.hasFiveReview || !report.allSamplesOneLine) {
    fail(`${viewport.name}: missing boundary/security/review/one-line docs ${JSON.stringify(report.docs)}`);
  }
  if (report.hasVisibleUndefined) fail(`${viewport.name}: page renders visible undefined text`);
  if (!report.ariaOk || !report.cancelFocused || !report.buttonOrderOk) {
    fail(`${viewport.name}: aria/focus/button order failed ${JSON.stringify(report.a11y)}`);
  }
  if (!report.disabledDidNotOpen) fail(`${viewport.name}: disabled trigger opened popconfirm`);
  if (!report.longCopyWrapped || !report.escapedTextOk || !report.noScriptElementInPanel) {
    fail(`${viewport.name}: long copy/escaping failed ${JSON.stringify(report.longCopy)}`);
  }
  if (!report.confirmClicked || report.confirmCount !== 1) fail(`${viewport.name}: confirm did not increment exactly once`);
  if (!report.cancelClosed || !report.escapeClosed || !report.outsideClosed) {
    fail(`${viewport.name}: close paths failed ${JSON.stringify(report.closePaths)}`);
  }
  if (!report.focusReturned) fail(`${viewport.name}: focus did not return to trigger`);
  if (!report.pendingDisabled || !report.pendingLabel || report.asyncConfirmCalls !== 1 || report.asyncClosedEarly) {
    fail(`${viewport.name}: async pending/repeat guard failed ${JSON.stringify(report.async)}`);
  }
  if (!report.leftPlacementOk || !report.rightPlacementOk) {
    fail(`${viewport.name}: placement positioning failed ${JSON.stringify(report.placements)}`);
  }
  if (viewport.width < 600 && (!report.mobilePanelOk || report.pageHorizontalOverflow > 1 || report.minActionHeight < 34)) {
    fail(`${viewport.name}: mobile overflow/touch layout failed ${JSON.stringify(report.mobile)}`);
  }
}

async function inspectViewport(viewport) {
  const client = await createPage();
  await navigate(client, `http://${HOST}:${APP_PORT}/#popconfirm`, viewport);
  await evaluate(client, String.raw`new Promise((resolve) => {
    const ready = () => document.querySelector("#popconfirm-doc-title") && document.querySelectorAll(".button-doc-demo").length >= 4;
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
    const demos = Array.from(document.querySelectorAll(".button-doc-demo"));
    const demoByTitle = (title) => demos.find((demo) => demo.querySelector(".button-doc-demo__meta h3")?.textContent.trim() === title);
    const panelForTrigger = (trigger) => {
      const id = trigger?.getAttribute("aria-controls");
      const panel = id ? document.getElementById(id) : null;
      return panel && !panel.hidden ? panel : null;
    };
    const openPanels = () => Array.from(document.querySelectorAll(".c-popconfirm__panel:not([hidden])"));
    const findButton = (container, label) =>
      Array.from(container?.querySelectorAll("button") ?? []).find((item) => item.textContent.trim() === label);
    const clickButton = (demo, label) => {
      const button = findButton(demo, label);
      button?.click();
      return button;
    };
    const clickPanelButton = (trigger, label) => {
      const button = findButton(panelForTrigger(trigger), label);
      button?.click();
      return button;
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

    const basic = demoByTitle("基础确认");
    const controlled = demoByTitle("受控打开");
    const asyncDemo = demoByTitle("异步 loading");
    const placement = demoByTitle("移动与方向");
    const disabled = demoByTitle("禁用状态");
    const longCopy = demoByTitle("长文案与转义");
    const trigger = clickButton(basic, "删除记录");
    await wait(80);
    const basicPanel = panelForTrigger(trigger);
    const basicActions = Array.from(basicPanel?.querySelectorAll(".c-popconfirm__actions button") ?? []).map((item) => item.textContent.trim());
    const buttonOrderOk = basicActions[0] === "Cancel" && basicActions[1] === "删除";
    const ariaOk = trigger?.getAttribute("aria-haspopup") === "dialog" &&
      trigger?.getAttribute("aria-expanded") === "true" &&
      basicPanel?.getAttribute("role") === "dialog" &&
      Boolean(basicPanel?.getAttribute("aria-labelledby")) &&
      document.getElementById(basicPanel?.getAttribute("aria-labelledby") ?? "")?.textContent.includes("确认删除这条记录") &&
      !basicPanel?.hasAttribute("aria-modal");
    const cancelFocused = document.activeElement?.textContent.trim() === "Cancel";
    const cancel = clickPanelButton(trigger, "Cancel");
    await wait(100);
    const cancelClosed = !panelForTrigger(trigger);

    const confirmTrigger = clickButton(basic, "删除记录");
    await wait(80);
    clickPanelButton(confirmTrigger, "删除");
    await wait(100);
    const confirmCount = Number((basic?.textContent.match(/确认次数：(\d+)/) ?? [])[1] ?? "0");
    const confirmClicked = confirmCount >= 1;
    const focusReturned = document.activeElement === trigger;

    clickButton(controlled, "受控确认");
    await wait(80);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wait(100);
    const escapeClosed = controlled?.textContent.includes("最后关闭原因：escape") ?? false;

    clickButton(controlled, "受控确认");
    await wait(80);
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await wait(100);
    const outsideClosed = controlled?.textContent.includes("最后关闭原因：outside") ?? false;

    let asyncConfirmCalls = 0;
    window.setTimeout = ((original) => (handler, timeout, ...args) => {
      if (timeout === 700) asyncConfirmCalls += 1;
      return original(handler, timeout, ...args);
    })(window.setTimeout);
    clickButton(asyncDemo, "异步归档");
    await wait(80);
    const asyncTrigger = Array.from(asyncDemo?.querySelectorAll("button") ?? []).find((item) => item.textContent.trim() === "异步归档");
    const asyncPanel = panelForTrigger(asyncTrigger);
    const confirmButton = Array.from(asyncPanel?.querySelectorAll("button") ?? []).find((item) => item.textContent.trim() === "归档" || item.textContent.trim() === "Working...");
    confirmButton?.click();
    confirmButton?.click();
    await wait(100);
    const pendingDisabled = Boolean(confirmButton?.disabled);
    const pendingLabel = confirmButton?.textContent.trim() === "Working...";
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await wait(120);
    const asyncClosedEarly = !panelForTrigger(asyncTrigger);
    await wait(720);

    const leftTrigger = clickButton(placement, "Left");
    await wait(100);
    const leftPanel = panelForTrigger(leftTrigger);
    const leftTriggerRect = rect(leftTrigger);
    const leftPanelRect = rect(leftPanel);
    const leftPlacementOk = window.innerWidth <= 430 ? leftPanelRect.left >= 11 : leftPanelRect.right <= leftTriggerRect.left;
    clickPanelButton(leftTrigger, "Cancel");
    await wait(80);
    const rightTrigger = clickButton(placement, "Right");
    await wait(100);
    const rightPanel = panelForTrigger(rightTrigger);
    const rightTriggerRect = rect(rightTrigger);
    const rightPanelRect = rect(rightPanel);
    const rightPlacementOk = window.innerWidth <= 430 ? rightPanelRect.right <= window.innerWidth - 11 : rightPanelRect.left >= rightTriggerRect.right;
    const actionRects = Array.from(rightPanel?.querySelectorAll(".c-popconfirm__actions .c-button") ?? []).map(rect);

    clickPanelButton(rightTrigger, "Cancel");
    await wait(80);
    const disabledTrigger = clickButton(disabled, "禁用删除");
    await wait(100);
    const disabledDidNotOpen = !panelForTrigger(disabledTrigger);

    const longTrigger = clickButton(longCopy, "长文案确认");
    await wait(100);
    const longPanel = panelForTrigger(longTrigger);
    const longPanelRect = rect(longPanel);
    const longTitleRect = rect(longPanel?.querySelector(".c-popconfirm__title"));
    const longDescriptionRect = rect(longPanel?.querySelector(".c-popconfirm__description"));
    const longCopyWrapped = longTitleRect.height > 30 &&
      longDescriptionRect.height > 48 &&
      longTitleRect.left >= longPanelRect.left &&
      longDescriptionRect.right <= longPanelRect.right;
    const escapedTextOk = longPanel?.textContent.includes("<script>alert(1)</script>") ?? false;
    const noScriptElementInPanel = !longPanel?.querySelector("script");

    const pageHorizontalOverflow = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const visiblePanels = openPanels().map(rect);
    const mobilePanelOk = visiblePanels.every((item) => item.left >= 11 && item.right <= window.innerWidth - 11);
    const minActionHeight = actionRects.length ? Math.min(...actionRects.map((item) => item.height)) : 0;
    const docText = document.body.textContent ?? "";
    const samples = Array.from(document.querySelectorAll(".popconfirm-doc .button-doc-code code")).map((node) => node.textContent ?? "");
    const hasVisibleUndefined = /\bundefined\b/.test(docText);

    return {
      hash: window.location.hash,
      title: document.querySelector("#popconfirm-doc-title")?.textContent.trim() ?? "",
      hasIndependentDoc: Boolean(document.querySelector(".popconfirm-doc")) && !document.querySelector(".component-doc-page.detail-doc"),
      demoCount: demos.length,
      hasBoundaryCopy: docText.includes("不和 Popover 或 Modal 合并文档") && docText.includes("不包装 Popover 或 Modal"),
      hasSecurityCopy: docText.includes("No antd / antd-mobile") && docText.includes("dangerouslySetInnerHTML") && docText.includes("pending guard"),
      hasFiveReview: ["产品专家", "UI 专家", "研发专家", "测试专家", "白帽专家"].every((text) => docText.includes(text)),
      allSamplesOneLine: samples.length === 6 && samples.every((sample) => !/\n/.test(sample)),
      hasVisibleUndefined,
      ariaOk,
      cancelFocused,
      buttonOrderOk,
      disabledDidNotOpen,
      longCopyWrapped,
      escapedTextOk,
      noScriptElementInPanel,
      confirmClicked,
      confirmCount,
      cancelClosed,
      escapeClosed,
      outsideClosed,
      focusReturned,
      pendingDisabled,
      pendingLabel,
      asyncConfirmCalls,
      asyncClosedEarly,
      leftPlacementOk,
      rightPlacementOk,
      pageHorizontalOverflow,
      mobilePanelOk,
      minActionHeight,
      route: { hash: window.location.hash, title: document.querySelector("#popconfirm-doc-title")?.textContent.trim() ?? "", hasIndependentDoc: Boolean(document.querySelector(".popconfirm-doc")) },
      docs: { hasBoundaryCopy: docText.includes("不和 Popover 或 Modal 合并文档"), hasSecurityCopy: docText.includes("dangerouslySetInnerHTML"), hasFiveReview: ["产品专家", "UI 专家", "研发专家", "测试专家", "白帽专家"].every((text) => docText.includes(text)), allSamplesOneLine: samples.every((sample) => !/\n/.test(sample)) },
      a11y: { ariaOk, cancelFocused, buttonOrderOk, basicActions },
      longCopy: { longCopyWrapped, escapedTextOk, noScriptElementInPanel, longTitleRect, longDescriptionRect, longPanelRect },
      closePaths: { cancelClosed, escapeClosed, outsideClosed },
      async: { pendingDisabled, pendingLabel, asyncConfirmCalls, asyncClosedEarly },
      placements: { leftTriggerRect, leftPanelRect, rightTriggerRect, rightPanelRect },
      mobile: { pageHorizontalOverflow, mobilePanelOk, minActionHeight, visiblePanels },
    };
  })()`);

  assertReport(viewport, report);
  info(`${viewport.name}: ${JSON.stringify({ demos: report.demoCount, confirmCount: report.confirmCount, asyncConfirmCalls: report.asyncConfirmCalls, overflow: report.pageHorizontalOverflow })}`);
  client.close();
  clients.delete(client);
}

async function main() {
  try {
    await startVite();
    await startChrome();

    for (const viewport of VIEWPORTS) {
      await inspectViewport(viewport);
    }
  } finally {
    for (const client of clients) {
      client.close();
    }
    clients.clear();
    if (chromeProcess) chromeProcess.kill("SIGTERM");
    if (viteProcess) viteProcess.kill("SIGTERM");
    if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
  }

  if (failures.length) {
    console.error(`[popconfirm-smoke] ${failures.length} failure(s)`);
    process.exit(1);
  }

  info("PASS");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
