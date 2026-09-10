import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

const HOST = "127.0.0.1";
const RESERVED_APP_PORT = 5177;
const REQUESTED_APP_PORT = process.env.MODAL_SMOKE_PORT ? Number(process.env.MODAL_SMOKE_PORT) : null;
let appPort = REQUESTED_APP_PORT;
const CDP_PORT = Number(process.env.MODAL_SMOKE_CDP_PORT ?? 9342);
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
  console.log(`[modal-smoke] ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`[modal-smoke] FAIL ${message}`);
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

async function getFreeTcpPort() {
  return new Promise((resolve, reject) => {
    const socket = createServer();
    socket.once("error", reject);
    socket.listen(0, HOST, () => {
      const address = socket.address();
      const port = typeof address === "object" && address ? address.port : null;
      socket.close(() => {
        if (!port || port === RESERVED_APP_PORT) {
          getFreeTcpPort().then(resolve, reject);
          return;
        }
        resolve(port);
      });
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
  if (appPort === RESERVED_APP_PORT) {
    throw new Error(`Modal smoke refuses to use reserved port ${RESERVED_APP_PORT}`);
  }

  if (!appPort) {
    appPort = await getFreeTcpPort();
  }

  const portFree = await isPortOpen(appPort);
  if (!portFree) {
    info(`using existing dev server on ${HOST}:${appPort}`);
    await waitForHttp(`http://${HOST}:${appPort}/`);
    return;
  }

  info(`starting Vite on ${HOST}:${appPort}`);
  viteProcess = spawn("rtk", ["bun", "run", "dev", "--", "--host", HOST, "--port", String(appPort), "--strictPort"], {
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  viteProcess.stdout.on("data", (chunk) => process.stdout.write(chunk));
  viteProcess.stderr.on("data", (chunk) => process.stderr.write(chunk));
  await waitForHttp(`http://${HOST}:${appPort}/`);
}

async function startChrome() {
  const chromePath = findChromeExecutable();
  if (!chromePath) {
    throw new Error("No Chrome/Chromium executable found for Modal smoke");
  }

  userDataDir = mkdtempSync(join(tmpdir(), "modal-smoke-chrome-"));
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
    detached: true,
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
  if (report.hash !== "#modal" || report.title !== "Modal 对话框" || !report.hasIndependentDoc) {
    fail(`${viewport.name}: #modal route/doc boundary failed ${JSON.stringify(report.route)}`);
  }
  if (report.demoCount !== 4) fail(`${viewport.name}: expected 4 demos, found ${report.demoCount}`);
  if (
    !report.hasBoundaryCopy ||
    !report.hasSecurityCopy ||
    !report.hasFiveReview ||
    !report.hasTutorialScaffold ||
    !report.hasThemeStructureCopy ||
    !report.allSamplesOneLine
  ) {
    fail(`${viewport.name}: missing boundary/security/review/one-line docs ${JSON.stringify(report.docs)}`);
  }
  if (report.hasVisibleUndefined) fail(`${viewport.name}: page renders visible undefined text`);
  if (report.pageHorizontalOverflow > 1) {
    fail(`${viewport.name}: page horizontal overflow ${report.pageHorizontalOverflow}`);
  }
  if (!report.basicAriaOk || !report.basicFocusOk || !report.bodyLockedOnOpen) {
    fail(`${viewport.name}: basic aria/focus/scroll-lock failed ${JSON.stringify(report.basic)}`);
  }
  if (!report.overlayZIndexOk || !report.darkModeOk) {
    fail(`${viewport.name}: z-index/dark-mode failed ${JSON.stringify(report.visualSystem)}`);
  }
  if (!report.escapeClosed || !report.backdropClosed || !report.closeButtonClosed || !report.focusReturned) {
    fail(`${viewport.name}: close paths failed ${JSON.stringify(report.closePaths)}`);
  }
  if (!report.formInitialFocusOk || !report.focusTrapOk || !report.focusStableAfterInput) {
    fail(`${viewport.name}: initial focus/focus trap failed ${JSON.stringify(report.focus)}`);
  }
  if (!report.longModalOk || !report.longScrollInternal || !report.longBackdropDisabled || !report.longFooterVisible) {
    fail(`${viewport.name}: long-content modal failed ${JSON.stringify(report.longContent)}`);
  }
  if (!report.loadingBusy || !report.loadingLocked || !report.destroyPreserved || !report.loadingClosedAfterSubmit) {
    fail(`${viewport.name}: loading/destroyOnClose failed ${JSON.stringify(report.loading)}`);
  }
  if (viewport.width < 600 && (!report.mobileReadable || report.minCloseSize < 44)) {
    fail(`${viewport.name}: mobile readability/close target failed ${JSON.stringify(report.mobile)}`);
  }
}

async function inspectViewport(viewport) {
  const client = await createPage();
  await navigate(client, `http://${HOST}:${appPort}/#modal`, viewport);
  await evaluate(client, String.raw`new Promise((resolve) => {
    const ready = () => document.querySelector("#modal-doc-title") && document.querySelectorAll(".button-doc-demo").length >= 4;
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
    const findButton = (container, label) =>
      Array.from(container?.querySelectorAll("button") ?? []).find((item) => item.textContent.trim() === label);
    const clickButton = async (demo, label) => {
      const button = findButton(demo, label);
      button?.focus();
      button?.click();
      await wait(120);
      return button;
    };
    const visibleDialogs = () => Array.from(document.querySelectorAll(".c-overlay:not([hidden]) .c-modal[role='dialog']"));
    const activeDialog = () => visibleDialogs().at(-1) ?? null;
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
    const isVisible = (node) => {
      if (!node) return false;
      const box = node.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && getComputedStyle(node).visibility !== "hidden";
    };

    const basic = demoByTitle("基础打开与关闭");
    const form = demoByTitle("表单与初始焦点");
    const longDemo = demoByTitle("长内容与局部容器");
    const pendingDemo = demoByTitle("确认 loading 与保留状态");
    const codes = Array.from(document.querySelectorAll(".modal-doc .button-doc-code code")).map((item) => item.textContent ?? "");
    const docText = document.body.innerText || "";
    const htmlThemeBefore = document.documentElement.getAttribute("data-theme");
    const route = {
      hash: location.hash,
      title: document.querySelector("#modal-doc-title")?.textContent.trim(),
      hasIndependentDoc: Boolean(document.querySelector(".modal-doc")),
    };

    const trigger = await clickButton(basic, "打开 Modal");
    const basicDialog = activeDialog();
    const basicOverlay = basicDialog?.closest(".c-overlay");
    const labelledBy = basicDialog?.getAttribute("aria-labelledby");
    const describedBy = basicDialog?.getAttribute("aria-describedby") ?? "";
    const basicAriaOk =
      basicDialog?.getAttribute("aria-modal") === "true" &&
      basicDialog?.getAttribute("role") === "dialog" &&
      Boolean(labelledBy && document.getElementById(labelledBy)?.textContent.includes("发布确认")) &&
      describedBy.split(/\s+/).some((id) => document.getElementById(id)?.textContent.includes("验收遮罩"));
    const basicFocusOk = document.activeElement === basicDialog?.querySelector(".c-modal__close");
    const bodyLockedOnOpen = document.body.style.overflow === "hidden";
    const overlayZIndex = Number.parseInt(getComputedStyle(basicOverlay).zIndex || "0", 10);
    const overlayZIndexOk = Number.isFinite(overlayZIndex) && overlayZIndex >= 50;
    document.documentElement.setAttribute("data-theme", "dark");
    await wait(40);
    const darkStyles = getComputedStyle(basicDialog);
    const darkBackdropStyles = getComputedStyle(basicOverlay?.querySelector(".c-overlay__backdrop"));
    const darkModeOk =
      darkStyles.backgroundColor !== "rgb(255, 255, 255)" &&
      darkStyles.color !== "rgb(26, 28, 31)" &&
      darkBackdropStyles.backgroundColor !== "rgba(0, 0, 0, 0.28)";
    if (htmlThemeBefore === null) {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", htmlThemeBefore);
    }
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wait(150);
    const escapeClosed = !activeDialog() && basic?.textContent.includes("最后关闭原因：escape");

    await clickButton(basic, "打开 Modal");
    activeDialog()?.closest(".c-overlay")?.querySelector(".c-overlay__backdrop")?.click();
    await wait(150);
    const backdropClosed = !activeDialog() && basic?.textContent.includes("最后关闭原因：backdrop");

    await clickButton(basic, "打开 Modal");
    activeDialog()?.querySelector(".c-modal__close")?.click();
    await wait(150);
    const closeButtonClosed = !activeDialog() && basic?.textContent.includes("最后关闭原因：close-button");
    const focusReturned = document.activeElement === trigger;

    await clickButton(form, "打开表单 Modal");
    const formDialog = activeDialog();
    const firstInput = formDialog?.querySelector("input[name='modal-change-summary']");
    const formInitialFocusOk = document.activeElement === firstInput;
    const formValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    formValueSetter?.call(firstInput, "焦点保持");
    firstInput.dispatchEvent(new Event("input", { bubbles: true }));
    firstInput.dispatchEvent(new Event("change", { bubbles: true }));
    await wait(80);
    const focusStableAfterInput = document.activeElement === firstInput;
    const close = formDialog?.querySelector(".c-modal__close");
    const submit = findButton(formDialog, "提交");
    close?.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }));
    await wait(40);
    const shiftWrapped = document.activeElement === submit;
    submit?.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    await wait(40);
    const tabWrapped = document.activeElement === close;
    const focusTrapOk = shiftWrapped && tabWrapped;
    close?.click();
    await wait(100);

    await clickButton(longDemo, "打开长内容");
    const longDialog = activeDialog();
    const longBox = longDialog ? rect(longDialog) : null;
    const longScroll = longDialog?.querySelector(".c-modal__scroll");
    const longFooter = longDialog?.querySelector(".c-modal__footer");
    const longBackdrop = longDialog?.closest(".c-overlay")?.querySelector(".c-overlay__backdrop");
    const longModalOk =
      Boolean(longBox) &&
      longBox.left >= -1 &&
      longBox.right <= window.innerWidth + 1 &&
      longBox.top >= -1 &&
      longBox.bottom <= window.innerHeight + 1;
    const longScrollInternal =
      Boolean(longScroll) &&
      longScroll.scrollHeight > longScroll.clientHeight &&
      getComputedStyle(longScroll).overflowY !== "visible";
    const longBackdropDisabled = longBackdrop?.disabled === true && longBackdrop?.getAttribute("aria-hidden") === "true";
    const longFooterVisible = isVisible(longFooter) && rect(longFooter).bottom <= window.innerHeight + 1;
    longDialog?.querySelector(".c-modal__close")?.click();
    await wait(100);

    await clickButton(pendingDemo, "打开确认 Modal");
    let pendingDialog = activeDialog();
    const draftInput = pendingDialog?.querySelector("input[name='modal-preserved-draft']");
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(draftInput, "仍然保留");
    draftInput.dispatchEvent(new Event("input", { bubbles: true }));
    draftInput.dispatchEvent(new Event("change", { bubbles: true }));
    pendingDialog?.querySelector(".c-modal__close")?.click();
    await wait(100);
    await clickButton(pendingDemo, "打开确认 Modal");
    pendingDialog = activeDialog();
    const destroyPreserved = pendingDialog?.querySelector("input[name='modal-preserved-draft']")?.value === "仍然保留";
    findButton(pendingDialog, "提交")?.click();
    await wait(80);
    pendingDialog = activeDialog();
    const loadingBusy = pendingDialog?.getAttribute("aria-busy") === "true";
    pendingDialog?.closest(".c-overlay")?.querySelector(".c-overlay__backdrop")?.click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    pendingDialog?.querySelector(".c-modal__close")?.click();
    await wait(120);
    const loadingLocked = Boolean(activeDialog());
    await wait(500);
    const loadingClosedAfterSubmit = !activeDialog();

    const pageHorizontalOverflow = Math.max(
      0,
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
      document.body.scrollWidth - window.innerWidth,
    );
    const minCloseSize = Math.min(
      ...Array.from(document.querySelectorAll(".c-modal__close")).map((item) => {
        const box = item.getBoundingClientRect();
        return Math.min(box.width, box.height);
      }),
    );

    return {
      ...route,
      route,
      demoCount: demos.length,
      hasBoundaryCopy:
        docText.includes("confirmLoading") &&
        docText.includes("maskClosable") &&
        docText.includes("destroyOnClose") &&
        docText.includes("360 / 390 / 430px"),
      hasSecurityCopy: docText.includes("No antd / antd-mobile / charts") && docText.includes("不解析 HTML 字符串"),
      hasFiveReview: ["产品专家", "UI 专家", "研发专家", "测试专家", "白帽专家"].every((label) => docText.includes(label)),
      hasTutorialScaffold: Boolean(document.querySelector(".tutorial-scaffold[data-kind='feedback'][data-overlay='true']")),
      hasThemeStructureCopy:
        docText.includes("主题 style") &&
        docText.includes("结构 style") &&
        docText.includes("--ct-overlay") &&
        docText.includes("viewport clamp"),
      allSamplesOneLine: codes.length === 4 && codes.every((code) => !/[\r\n]/.test(code.trim())),
      docs: {
        hasBoundaryCopy:
          docText.includes("confirmLoading") &&
          docText.includes("maskClosable") &&
          docText.includes("destroyOnClose") &&
          docText.includes("360 / 390 / 430px"),
        hasSecurityCopy: docText.includes("No antd / antd-mobile / charts") && docText.includes("不解析 HTML 字符串"),
        hasFiveReview: ["产品专家", "UI 专家", "研发专家", "测试专家", "白帽专家"].every((label) => docText.includes(label)),
        hasTutorialScaffold: Boolean(document.querySelector(".tutorial-scaffold[data-kind='feedback'][data-overlay='true']")),
        hasThemeStructureCopy:
          docText.includes("主题 style") &&
          docText.includes("结构 style") &&
          docText.includes("--ct-overlay") &&
          docText.includes("viewport clamp"),
        allSamplesOneLine: codes.length === 4 && codes.every((code) => !/[\r\n]/.test(code.trim())),
      },
      hasVisibleUndefined: docText.includes("undefined"),
      pageHorizontalOverflow,
      basicAriaOk,
      basicFocusOk,
      bodyLockedOnOpen,
      basic: { basicAriaOk, basicFocusOk, bodyLockedOnOpen },
      overlayZIndexOk,
      darkModeOk,
      visualSystem: { overlayZIndex, overlayZIndexOk, darkModeOk },
      escapeClosed,
      backdropClosed,
      closeButtonClosed,
      focusReturned,
      closePaths: { escapeClosed, backdropClosed, closeButtonClosed, focusReturned },
      formInitialFocusOk,
      focusTrapOk,
      focusStableAfterInput,
      focus: { formInitialFocusOk, focusTrapOk, focusStableAfterInput, activeText: document.activeElement?.textContent || document.activeElement?.getAttribute("name") },
      longModalOk,
      longScrollInternal,
      longBackdropDisabled,
      longFooterVisible,
      longContent: { longModalOk, longScrollInternal, longBackdropDisabled, longFooterVisible, longBox },
      loadingBusy,
      loadingLocked,
      destroyPreserved,
      loadingClosedAfterSubmit,
      loading: { loadingBusy, loadingLocked, destroyPreserved, loadingClosedAfterSubmit },
      mobileReadable: visibleDialogs().length === 0 && pageHorizontalOverflow <= 1,
      minCloseSize: Number.isFinite(minCloseSize) ? minCloseSize : 44,
      mobile: { minCloseSize, pageHorizontalOverflow },
    };
  })()`);

  assertReport(viewport, report);
  info(`${viewport.name}: overflow=${report.pageHorizontalOverflow}, aria=${report.basicAriaOk}, focus=${report.focusTrapOk}, stableFocus=${report.focusStableAfterInput}, scrollLock=${report.bodyLockedOnOpen}, z=${report.visualSystem.overlayZIndex}, dark=${report.darkModeOk}, closeTarget=${report.minCloseSize}, longScroll=${report.longScrollInternal}, loading=${report.loadingBusy}/${report.loadingLocked}`);
}

async function cleanup() {
  for (const client of clients) {
    try {
      client.close();
    } catch {
      // ignore close errors
    }
  }
  if (chromeProcess && !chromeProcess.killed) {
    try {
      process.kill(-chromeProcess.pid, "SIGTERM");
    } catch {
      chromeProcess.kill();
    }
  }
  if (viteProcess && !viteProcess.killed) {
    try {
      process.kill(-viteProcess.pid, "SIGTERM");
    } catch {
      viteProcess.kill();
    }
  }
  if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
}

async function main() {
  try {
    await startVite();
    await startChrome();
    for (const viewport of VIEWPORTS) {
      await inspectViewport(viewport);
    }
  } catch (error) {
    fail(error.stack || error.message);
  } finally {
    await cleanup();
  }

  if (failures.length) {
    console.error(`[modal-smoke] ${failures.length} failure(s)`);
    process.exit(1);
  }

  console.log(`Modal smoke passed on ${HOST}:${appPort}: desktop/mobile 360/390/430, tutorial scaffold, theme/structure docs, aria dialog, focus trap/restore/stability, Escape/backdrop/close-button, body scroll lock, z-index, dark mode, loading lock, destroyOnClose, internal long-content scroll, one-line samples, no visible undefined, and no page overflow are clean.`);
}

await main();
