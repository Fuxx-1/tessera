import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

const HOST = "127.0.0.1";
const APP_PORT = Number(process.env.FLOAT_BUTTON_APP_PORT ?? 5177);
const EVIDENCE_PATH = "tmp/float-button-production-evidence.json";
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-360", width: 360, height: 800 },
];
const THEMES = ["light", "dark"];

const failures = [];
let viteProcess;
let chromeProcess;
let userDataDir;

function info(message) {
  console.log(`[float-button-smoke] ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`[float-button-smoke] FAIL ${message}`);
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
      // Wait until the app server or CDP endpoint accepts connections.
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function ensureAppServer() {
  if (process.env.ACCEPTANCE_URL) {
    await waitForHttp(process.env.ACCEPTANCE_URL);
    return process.env.ACCEPTANCE_URL;
  }

  const port = process.env.FLOAT_BUTTON_APP_PORT ? APP_PORT : await getFreePort();
  const baseUrl = `http://${HOST}:${port}`;
  info(`starting Vite at ${baseUrl}`);
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
  const cache = join(homedir(), "Library", "Caches", "ms-playwright");
  const cached = existsSync(cache)
    ? readdirSync(cache, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name.startsWith("chromium-"))
        .flatMap((entry) => [
          join(cache, entry.name, "chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
          join(cache, entry.name, "chrome-mac-arm64", "Chromium.app", "Contents", "MacOS", "Chromium"),
          join(cache, entry.name, "chrome-mac", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
          join(cache, entry.name, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
        ])
    : [];
  const candidates = [
    process.env.CHROME_PATH,
    ...cached,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/opt/google/chrome/chrome",
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate));
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
  if (!chromePath) throw new Error("Chrome/Chromium executable not found");

  const port = await getFreePort();
  const stderr = [];
  userDataDir = mkdtempSync(join(tmpdir(), "float-button-chrome-"));
  info(`starting Chrome CDP on ${HOST}:${port}`);
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
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ], {
    stdio: ["ignore", "ignore", "pipe"],
  });
  chromeProcess.stderr.on("data", (chunk) => stderr.push(chunk.toString()));

  const earlyExit = await waitForProcessExit(chromeProcess, 300);
  if (earlyExit) throw new Error(`Chrome exited before CDP startup: ${stderr.join("").trim()}`);
  await waitForHttp(`http://${HOST}:${port}/json/version`, 45_000);

  const targetResponse = await fetch(`http://${HOST}:${port}/json/new?about:blank`, { method: "PUT" });
  const target = await targetResponse.json();
  return connectCdp(target.webSocketDebuggerUrl);
}

function connectCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  let nextId = 1;
  const pending = new Map();
  const listeners = new Map();
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.message}: ${message.error.data ?? ""}`));
      else resolve(message.result);
      return;
    }
    for (const handler of listeners.get(message.method) ?? []) handler(message.params ?? {});
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
      const response = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
      socket.send(JSON.stringify({ id, method, params }));
      return response;
    },
    close() {
      socket.close();
    },
  };
}

async function setupPage(client) {
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Log.enable");
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

async function waitForCondition(client, condition, timeoutMs = 8_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await evaluate(client, `Boolean(${condition})`)) return true;
    await sleep(100);
  }
  return false;
}

async function setViewport(client, viewport) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width <= 430,
  });
}

async function navigate(client, url) {
  await client.send("Page.navigate", { url });
  await waitForCondition(client, "document.readyState === 'complete' && !!document.querySelector('.float-button-doc')", 10_000);
  await sleep(250);
}

async function pressTab(client) {
  const event = {
    key: "Tab",
    code: "Tab",
    windowsVirtualKeyCode: 9,
    nativeVirtualKeyCode: 9,
  };
  await client.send("Input.dispatchKeyEvent", { ...event, type: "keyDown" });
  await client.send("Input.dispatchKeyEvent", { ...event, type: "keyUp" });
}

async function findKeyboardFocusedFloatButton(client) {
  await client.send("Page.bringToFront");
  await evaluate(client, `
    (() => {
    window.focus();
    document.activeElement?.blur?.();
    window.scrollTo(0, 0);
    document.querySelector("[data-float-button-keyboard-sentinel]")?.remove();
    const firstFloatButton = document.querySelector(".float-button-doc .c-float-button:not(:disabled)");
    const sentinel = document.createElement("button");
    sentinel.type = "button";
    sentinel.textContent = "keyboard sentinel";
    sentinel.setAttribute("data-float-button-keyboard-sentinel", "true");
    sentinel.style.position = "fixed";
    sentinel.style.left = "0";
    sentinel.style.top = "0";
    sentinel.style.width = "1px";
    sentinel.style.height = "1px";
    sentinel.style.opacity = "0";
    sentinel.style.pointerEvents = "none";
    firstFloatButton?.parentElement?.insertBefore(sentinel, firstFloatButton);
    sentinel.focus();
    })();
  `);

  for (let index = 0; index < 120; index += 1) {
    await pressTab(client);
    await sleep(20);
    const focused = await evaluate(client, `(() => {
      const node = document.activeElement;
      if (!node?.classList?.contains("c-float-button")) return null;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        label: node.getAttribute("aria-label") ?? "",
        focusVisible: node.matches(":focus-visible"),
        outlineColor: style.outlineColor,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        rect: {
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        tabCount: ${index + 1},
      };
    })()`);

    if (focused) {
      await evaluate(client, `document.querySelector("[data-float-button-keyboard-sentinel]")?.remove()`);
      return focused;
    }
  }

  await evaluate(client, `document.querySelector("[data-float-button-keyboard-sentinel]")?.remove()`);
  return null;
}

async function collectPageErrors(client, callback) {
  const errors = [];
  client.on("Runtime.consoleAPICalled", (params) => {
    if (params.type === "error" || params.type === "assert") {
      errors.push(`console.${params.type}: ${params.args?.map((arg) => arg.value ?? arg.description).join(" ")}`);
    }
  });
  client.on("Runtime.exceptionThrown", (params) => {
    const details = params.exceptionDetails;
    errors.push(`exception: ${details?.exception?.description ?? details?.text ?? "unknown"}`);
  });
  client.on("Log.entryAdded", (params) => {
    if (params.entry?.level === "error") errors.push(`log.error: ${params.entry.text}`);
  });
  await callback();
  return errors;
}

async function inspectFloatButton(client, baseUrl, viewport, theme) {
  await setViewport(client, viewport);
  const themeScript = await client.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      try {
        window.localStorage.setItem("tessera-theme", ${JSON.stringify(theme)});
        document.documentElement.dataset.theme = ${JSON.stringify(theme)};
      } catch {}
    `,
  });
  const pageErrors = await collectPageErrors(client, async () => {
    await navigate(client, `${baseUrl}/#float-button`);
    await waitForCondition(client, `window.location.hash === "#float-button" && !!document.querySelector(".float-button-doc .c-float-button")`, 10_000);
    await evaluate(client, `document.documentElement.dataset.theme = ${JSON.stringify(theme)}`);
    await sleep(120);
  });
  if (themeScript?.identifier) {
    await client.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: themeScript.identifier });
  }
  const label = `${viewport.name}/${theme}`;
  const keyboardFocus = await findKeyboardFocusedFloatButton(client);

  const report = await evaluate(client, `(async () => {
    const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
    const rectOf = (node) => {
      const rect = node.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const doc = document.querySelector(".float-button-doc");
    const text = doc?.textContent ?? "";
    const buttons = Array.from(doc?.querySelectorAll(".c-float-button") ?? []);
    const minTouch = buttons.reduce((min, button) => {
      const rect = button.getBoundingClientRect();
      return Math.min(min, rect.width, rect.height);
    }, Number.POSITIVE_INFINITY);
    const buttonReports = buttons.map((button) => {
      const icon = button.querySelector(".c-float-button__icon");
      return {
        label: button.getAttribute("aria-label"),
        disabled: button.disabled,
        ariaBusy: button.getAttribute("aria-busy"),
        describedBy: button.getAttribute("aria-describedby"),
        iconHidden: icon?.getAttribute("aria-hidden") ?? null,
        iconHiddenAttribute: icon?.hasAttribute("aria-hidden") ?? false,
        hasUndefinedAttribute: Array.from(button.attributes).some((attribute) => attribute.value === "undefined"),
        rect: rectOf(button),
      };
    });
    const surfaces = Array.from(doc?.querySelectorAll(".float-button-doc-surface, .float-button-doc-phone") ?? []).map((surface) => {
      const surfaceRect = rectOf(surface);
      const floating = Array.from(surface.querySelectorAll(".c-float-button, .c-float-button-group, .c-float-button-badge, .c-float-button-tooltip"));
      return {
        surface: surfaceRect,
        floating: floating.map((node) => ({
          className: node.className,
          rect: rectOf(node),
          contained:
            node.getBoundingClientRect().left >= surface.getBoundingClientRect().left - 1 &&
            node.getBoundingClientRect().right <= surface.getBoundingClientRect().right + 1 &&
            node.getBoundingClientRect().top >= surface.getBoundingClientRect().top - 1 &&
            node.getBoundingClientRect().bottom <= surface.getBoundingClientRect().bottom + 1,
        })),
      };
    });
    const disabledButton = buttons.find((button) => button.getAttribute("aria-label") === "同步不可用");
    const loadingButton = buttons.find((button) => button.getAttribute("aria-label") === "正在提交");
    let disabledClickPrevented = null;
    let loadingClickPrevented = null;
    if (disabledButton) {
      let clicked = false;
      disabledButton.addEventListener("click", () => { clicked = true; }, { once: true });
      disabledButton.click();
      disabledClickPrevented = !clicked;
    }
    if (loadingButton) {
      let clicked = false;
      loadingButton.addEventListener("click", () => { clicked = true; }, { once: true });
      loadingButton.click();
      loadingClickPrevented = !clicked;
    }
    const group = doc?.querySelector(".float-button-doc-group");
    const groupButtons = Array.from(group?.querySelectorAll(".c-float-button") ?? []).map((button) => rectOf(button));
    const groupGapOk = groupButtons.length >= 3 && groupButtons.every((rect, index, all) => index === 0 || Math.abs(all[index - 1].top - rect.bottom - 10) <= 1);
    const groupSurface = group?.closest(".float-button-doc-surface");
    const groupBottomOffset = groupButtons.length > 0 && groupSurface
      ? Math.round(groupSurface.getBoundingClientRect().bottom - groupButtons[0].bottom)
      : null;
    const groupBottomAnchored = typeof groupBottomOffset === "number" && groupBottomOffset >= 8 && groupBottomOffset <= 24;
    const tooltipButton = buttons.find((button) => button.getAttribute("aria-label") === "打开命令面板");
    tooltipButton?.scrollIntoView({ block: "center", inline: "center" });
    await wait(60);
    tooltipButton?.focus();
    tooltipButton?.dispatchEvent(new FocusEvent("focusin", { bubbles: true, cancelable: false, view: window }));
    await wait(140);
    const tooltip = document.querySelector(".c-tooltip__bubble:not([hidden])");
    const tooltipButtonStyle = tooltipButton ? getComputedStyle(tooltipButton) : null;
    const focusReport = tooltipButton ? {
      label: tooltipButton.getAttribute("aria-label") ?? "",
      active: document.activeElement === tooltipButton,
      focusVisible: tooltipButton.matches(":focus-visible"),
      outlineColor: tooltipButtonStyle?.outlineColor ?? "",
      outlineStyle: tooltipButtonStyle?.outlineStyle ?? "",
      outlineWidth: tooltipButtonStyle?.outlineWidth ?? "",
    } : null;
    const tooltipReport = tooltip && tooltipButton ? {
      text: tooltip.textContent?.trim() ?? "",
      role: tooltip.getAttribute("role"),
      described: tooltipButton.getAttribute("aria-describedby") === tooltip.id,
      rect: rectOf(tooltip),
      visibleInViewport:
        tooltip.getBoundingClientRect().left >= 0 &&
        tooltip.getBoundingClientRect().right <= viewportWidth &&
        tooltip.getBoundingClientRect().top >= 0 &&
        tooltip.getBoundingClientRect().bottom <= viewportHeight,
    } : null;
    const fixedProbe = document.createElement("button");
    fixedProbe.className = "c-float-button c-float-button--primary c-float-button--circle c-float-button--bottom-right";
    fixedProbe.style.setProperty("--c-float-button-inline-offset", "16px");
    fixedProbe.style.setProperty("--c-float-button-block-offset", "16px");
    fixedProbe.setAttribute("aria-label", "fixed probe");
    fixedProbe.textContent = "+";
    document.body.appendChild(fixedProbe);
    await wait(30);
    const fixedProbeRect = rectOf(fixedProbe);
    const fixedProbeStyle = getComputedStyle(fixedProbe);
    const fixedProbeZIndex = Number.parseInt(fixedProbeStyle.zIndex, 10);
    const fixedProbePosition = fixedProbeStyle.position;
    fixedProbe.remove();
    const styleRules = Array.from(document.styleSheets).flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules ?? []).map((rule) => rule.cssText);
      } catch {
        return [];
      }
    });
    const zIndexes = Array.from(doc?.querySelectorAll(".c-float-button, .c-float-button-group, .c-float-button-badge, .c-float-button-tooltip") ?? [])
      .map((node) => Number.parseInt(getComputedStyle(node).zIndex, 10))
      .filter(Number.isFinite);
    const rootStyle = getComputedStyle(document.documentElement);
    const firstPrimary = buttons.find((button) => button.classList.contains("c-float-button--primary"));
    const firstSecondary = buttons.find((button) => button.classList.contains("c-float-button--secondary"));
    const primaryStyle = firstPrimary ? getComputedStyle(firstPrimary) : null;
    const secondaryStyle = firstSecondary ? getComputedStyle(firstSecondary) : null;
    const offenders = Array.from(document.body.querySelectorAll("*"))
      .map((element) => ({ tag: element.tagName.toLowerCase(), className: String(element.className || ""), text: (element.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 70), ...rectOf(element) }))
      .filter((item) => item.width > 0 && (item.right > viewportWidth + 1 || item.left < -1))
      .slice(0, 5);

    return {
      hash: window.location.hash,
      title: document.querySelector("#float-button-doc-title")?.textContent?.trim() ?? "",
      hasTutorialScaffold: Boolean(document.querySelector(".tutorial-scaffold[data-kind='action'] .float-button-doc")),
      oneLineExample: document.querySelector(".tutorial-scaffold__inline-code")?.textContent?.trim() ?? "",
      hasThemeStructureCopy: text.includes("theme style") && text.includes("structure style"),
      hasFourPointMatrix: ["教程壳层", "真实预览", "紧凑样例", "生产约束"].every((item) => text.includes(item)),
      hasMobileCopy: text.includes("360") && text.includes("390") && text.includes("430"),
      viewportWidth,
      viewportHeight,
      scrollWidth,
      textHasUndefined: text.includes("undefined"),
      buttonCount: buttons.length,
      minTouch,
      buttonReports,
      surfaces,
      disabledClickPrevented,
      loadingClickPrevented,
      loadingStable: loadingButton ? {
        disabled: loadingButton.disabled,
        ariaBusy: loadingButton.getAttribute("aria-busy"),
        hasSpinner: Boolean(loadingButton.querySelector(".c-float-button__spinner")),
        rect: rectOf(loadingButton),
      } : null,
      group: {
        role: group?.getAttribute("role") ?? null,
        label: group?.getAttribute("aria-label") ?? null,
        buttonCount: groupButtons.length,
        groupGapOk,
        groupBottomAnchored,
        groupBottomOffset,
        rect: group ? rectOf(group) : null,
      },
      tooltip: tooltipReport,
      focus: focusReport,
      theme: {
        expected: ${JSON.stringify(theme)},
        actual: document.documentElement.dataset.theme ?? "",
        rootBg: rootStyle.getPropertyValue("--ct-bg").trim(),
        rootText: rootStyle.getPropertyValue("--ct-text").trim(),
        focusRing: rootStyle.getPropertyValue("--ct-focus-ring").trim(),
        primaryBg: primaryStyle?.backgroundColor ?? "",
        primaryColor: primaryStyle?.color ?? "",
        secondaryBg: secondaryStyle?.backgroundColor ?? "",
        secondaryColor: secondaryStyle?.color ?? "",
      },
      zIndexes,
      safeAreaRulePresent: styleRules.some((rule) => rule.includes("env(safe-area-inset-")),
      fixedProbe: fixedProbeRect,
      fixedProbeOk:
        fixedProbePosition === "fixed" &&
        fixedProbeZIndex >= 45 &&
        Math.abs(fixedProbeRect.right - (viewportWidth - 16)) <= 1 &&
        Math.abs(fixedProbeRect.bottom - (viewportHeight - 16)) <= 1 &&
        fixedProbeRect.width >= (viewportWidth <= 430 ? 48 : 52) &&
        fixedProbeRect.height >= (viewportWidth <= 430 ? 48 : 52),
      fixedProbePosition,
      fixedProbeZIndex,
      offenders,
    };
  })()`);
  report.keyboardFocus = keyboardFocus;

  const screenshotPath = join("tmp", `float-button-${viewport.name}-${theme}.png`);
  const screenshot = await client.send("Page.captureScreenshot", {
    captureBeyondViewport: false,
    format: "png",
    fromSurface: true,
  });
  writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));
  report.screenshotPath = screenshotPath;

  if (pageErrors.length > 0) fail(`${label} emitted errors: ${pageErrors.join(" | ")}`);
  if (report.hash !== "#float-button") fail(`${label} did not render #float-button route`);
  if (report.title !== "FloatButton 悬浮按钮") fail(`${label} missing independent FloatButton title`);
  if (!report.hasTutorialScaffold || !report.oneLineExample.includes("<FloatButton")) fail(`${label} missing FloatButton tutorial scaffold or one-line example`);
  if (!report.hasThemeStructureCopy || !report.hasFourPointMatrix || !report.hasMobileCopy) fail(`${label} missing theme/structure, four-point matrix, or 360/390/430 mobile copy`);
  if (report.theme.actual !== theme) fail(`${label} did not apply expected theme: ${JSON.stringify(report.theme)}`);
  if (theme === "light" && !report.theme.rootBg.toLowerCase().includes("#f9f9f9")) fail(`${label} light theme token mismatch: ${JSON.stringify(report.theme)}`);
  if (theme === "dark" && !report.theme.rootBg.toLowerCase().includes("#181818")) fail(`${label} dark theme token mismatch: ${JSON.stringify(report.theme)}`);
  if (!report.theme.focusRing || !report.theme.primaryBg || !report.theme.secondaryBg) fail(`${label} missing theme style computed colors: ${JSON.stringify(report.theme)}`);
  if (!report.focus?.active || !report.focus.label) fail(`${label} programmatic focus did not land on labelled FloatButton`);
  if (!report.keyboardFocus?.label || !report.keyboardFocus.focusVisible || report.keyboardFocus.outlineStyle === "none") {
    fail(`${label} keyboard Tab focus-visible did not land on labelled FloatButton: ${JSON.stringify(report.keyboardFocus)}`);
  }
  if (report.textHasUndefined) fail(`${label} rendered literal undefined text`);
  if (report.scrollWidth > report.viewportWidth + 1) fail(`${label} has horizontal overflow ${report.scrollWidth} > ${report.viewportWidth}: ${JSON.stringify(report.offenders)}`);
  if (report.buttonCount < 10) fail(`${label} expected rich FloatButton demos, saw ${report.buttonCount}`);
  if (report.minTouch < (viewport.width <= 430 ? 48 : 52)) fail(`${label} touch target below expected size: ${report.minTouch}`);
  if (report.buttonReports.some((button) => button.hasUndefinedAttribute)) fail(`${label} found DOM attribute value 'undefined'`);
  if (report.buttonReports.some((button) => button.label && !button.iconHiddenAttribute)) fail(`${label} has labelled button without decorative hidden icon`);
  if (report.surfaces.some((surface) => surface.floating.some((item) => !item.contained))) fail(`${label} doc preview has floating element outside its surface`);
  if (!report.disabledClickPrevented) fail(`${label} disabled FloatButton accepted click`);
  if (!report.loadingClickPrevented) fail(`${label} loading FloatButton accepted click`);
  if (!report.loadingStable?.disabled || report.loadingStable.ariaBusy !== "true" || !report.loadingStable.hasSpinner) fail(`${label} loading state missing disabled/aria-busy/spinner`);
  if (report.loadingStable?.rect.width !== (viewport.width <= 430 ? 48 : 52)) fail(`${label} loading width changed unexpectedly`);
  if (report.group.role !== "group" || report.group.label !== "页面快捷操作" || report.group.buttonCount !== 3) fail(`${label} group semantics incomplete`);
  if (!report.group.groupGapOk || !report.group.groupBottomAnchored) fail(`${label} group stack is not stable`);
  if (!report.tooltip?.described || !report.tooltip.visibleInViewport) fail(`${label} tooltip did not describe button within viewport`);
  if (!report.safeAreaRulePresent) fail(`${label} missing safe-area CSS rule`);
  if (!report.zIndexes.some((value) => value >= 45)) fail(`${label} expected z-index >= 45 on fixed layer: ${JSON.stringify(report.zIndexes)}`);
  if (!report.fixedProbeOk) fail(`${label} fixed probe misplaced or wrong size: ${JSON.stringify(report.fixedProbe)}`);

  return report;
}

async function main() {
  mkdirSync("tmp", { recursive: true });
  const baseUrl = await ensureAppServer();
  const client = await launchChrome();
  await setupPage(client);

  const reports = [];
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      info(`checking ${viewport.name} ${viewport.width}x${viewport.height} ${theme}`);
      reports.push({ viewport, theme, report: await inspectFloatButton(client, baseUrl, viewport, theme) });
    }
  }

  client.close();
  writeFileSync(EVIDENCE_PATH, JSON.stringify({ baseUrl, reports, failures }, null, 2));
  if (failures.length > 0) {
    console.error(`[float-button-smoke] evidence written to ${EVIDENCE_PATH}`);
    process.exit(1);
  }
  console.log(`[float-button-smoke] PASS evidence written to ${EVIDENCE_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  if (chromeProcess) chromeProcess.kill("SIGTERM");
  if (viteProcess) viteProcess.kill("SIGTERM");
  if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
});
