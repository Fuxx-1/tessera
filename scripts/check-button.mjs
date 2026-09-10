import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

const HOST = "127.0.0.1";
const EVIDENCE_PATH = "tmp/button-production-evidence.json";
const SCREENSHOT_DIR = "tmp/button-production-evidence";
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-360", width: 360, height: 800 },
];

const failures = [];
let viteProcess;
let chromeProcess;
let userDataDir;

function info(message) {
  console.log(`[button-smoke] ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`[button-smoke] FAIL ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function terminateProcess(childProcess) {
  if (!childProcess || childProcess.killed) return;
  try {
    if (childProcess.pid) {
      process.kill(-childProcess.pid, "SIGTERM");
    }
  } catch {
    try {
      childProcess.kill("SIGTERM");
    } catch {
      // Process already exited.
    }
  }
  childProcess.stdout?.destroy?.();
  childProcess.stderr?.destroy?.();
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

  const port = await getFreePort();
  const baseUrl = `http://${HOST}:${port}`;
  info(`starting Vite at ${baseUrl}`);
  viteProcess = spawn("rtk", ["bun", "run", "dev", "--", "--host", HOST, "--port", String(port), "--strictPort"], {
    cwd: process.cwd(),
    env: { ...process.env, BROWSER: "none" },
    detached: true,
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
  userDataDir = mkdtempSync(join(tmpdir(), "button-chrome-"));
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
    detached: true,
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
  throw new Error(`Timed out waiting for condition: ${condition}`);
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
  await waitForCondition(client, "document.readyState === 'complete' && !!document.querySelector('.button-doc')", 10_000);
  await sleep(250);
}

async function captureScreenshot(client, name) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const result = await client.send("Page.captureScreenshot", {
    captureBeyondViewport: false,
    format: "png",
    fromSurface: true,
  });
  const path = `${SCREENSHOT_DIR}/${name}.png`;
  writeFileSync(path, Buffer.from(result.data, "base64"));
  return path;
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

async function inspectButton(client, baseUrl, viewport) {
  await setViewport(client, viewport);
  const pageErrors = await collectPageErrors(client, async () => {
    await navigate(client, `${baseUrl}/#button`);
  });
  await evaluate(client, `(() => {
    const target = Array.from(document.querySelectorAll(".button-doc .c-button")).find((button) => button.textContent.trim() === "发布");
    if (!target) return false;
    for (const element of document.querySelectorAll("a, button, input, select, textarea, [tabindex]")) {
      if (element === target) continue;
      element.setAttribute("data-button-smoke-tabindex", element.getAttribute("tabindex") ?? "");
      element.setAttribute("tabindex", "-1");
    }
    document.activeElement?.blur?.();
    return true;
  })()`);
  await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await evaluate(client, `(() => {
    const target = Array.from(document.querySelectorAll(".button-doc .c-button")).find((button) => button.textContent.trim() === "发布");
    target?.focus?.({ focusVisible: true });
  })()`);
  await sleep(80);

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
    const attrMap = (node) => Object.fromEntries(Array.from(node.attributes).map((attribute) => [attribute.name, attribute.value]));
    const viewportWidth = document.documentElement.clientWidth;
    const rootStyle = getComputedStyle(document.documentElement);
    const doc = document.querySelector(".button-doc");
    const shell = document.querySelector(".tutorial-scaffold");
    const text = doc?.textContent ?? "";
    const buttons = Array.from(doc?.querySelectorAll(".c-button") ?? []);
    const byText = (label) => buttons.find((button) => button.textContent.trim() === label);
    const byTextIncludes = (label) => buttons.find((button) => button.textContent.trim().includes(label));
    const rowsByName = Object.fromEntries(Array.from(doc?.querySelectorAll(".button-doc-table tbody tr") ?? []).map((row) => {
      const cells = row.querySelectorAll("td");
      return [cells[0]?.textContent?.trim(), cells[2]?.textContent?.trim() ?? ""];
    }));
    const allButtons = buttons.map((button) => ({
      text: button.textContent.trim(),
      tag: button.tagName.toLowerCase(),
      type: button.getAttribute("type"),
      disabled: button.disabled,
      ariaBusy: button.getAttribute("aria-busy"),
      hasHref: button.hasAttribute("href"),
      hasUndefinedAttribute: Array.from(button.attributes).some((attribute) => attribute.value === "undefined"),
      rect: rectOf(button),
      className: String(button.className),
    }));
    const publish = byText("发布");
    const submit = byText("提交表单");
    const disabled = byText("不可发布");
    const loading = byText("发布中");
    const ghost = byText("取消");
    const iconStart = byTextIncludes("新建");
    const iconEnd = byTextIncludes("查看详情");
    const longButton = byText("review_trace_button_long_label_wraps_without_page_overflow");
    const refresh = byText("刷新");
    const demoContainers = Array.from(document.querySelectorAll(".button-doc .demo-container"));
    const codeSamples = Array.from(document.querySelectorAll(".button-doc .demo-container__code code")).map((code) => code.textContent ?? "");
    const previewReports = Array.from(document.querySelectorAll(".button-doc .demo-container__preview")).map((preview) => {
      const rect = rectOf(preview);
      return {
        rect,
        scrollWidth: Math.round(preview.scrollWidth),
        childCount: preview.children.length,
        buttonCount: preview.querySelectorAll(".c-button").length,
        overflowX: getComputedStyle(preview).overflowX,
      };
    });
    let disabledClickPrevented = null;
    let loadingClickPrevented = null;
    if (disabled) {
      let clicked = false;
      disabled.addEventListener("click", () => { clicked = true; }, { once: true });
      disabled.click();
      disabledClickPrevented = !clicked;
    }
    if (loading) {
      let clicked = false;
      loading.addEventListener("click", () => { clicked = true; }, { once: true });
      loading.click();
      loadingClickPrevented = !clicked;
    }
    const activeButton = document.activeElement?.matches(".c-button") ? document.activeElement : publish;
    const activeStyle = activeButton ? getComputedStyle(activeButton) : null;
    const ghostStyle = ghost ? getComputedStyle(ghost) : null;
    const publishStyle = publish ? getComputedStyle(publish) : null;
    const softStyle = byText("保存草稿") ? getComputedStyle(byText("保存草稿")) : null;
    const iconStartChildren = iconStart ? Array.from(iconStart.children).map((child) => String(child.className)) : [];
    const iconEndChildren = iconEnd ? Array.from(iconEnd.children).map((child) => String(child.className)) : [];
    const iconSlots = Array.from(document.querySelectorAll(".button-doc .c-button__icon")).map((slot) => {
      const rect = rectOf(slot);
      const child = slot.firstElementChild;
      return {
        rect,
        childTag: child?.tagName.toLowerCase() ?? "",
        childRect: child ? rectOf(child) : null,
      };
    });
    const longRect = longButton ? rectOf(longButton) : null;
    const longContentRect = longButton?.querySelector(".c-button__content") ? rectOf(longButton.querySelector(".c-button__content")) : null;
    const bodyRect = rectOf(document.body);
    const offenders = Array.from(document.body.querySelectorAll("*"))
      .filter((element) => !element.closest(".demo-container__code, .button-doc-code, .button-doc-table-wrap"))
      .map((element) => ({ tag: element.tagName.toLowerCase(), className: String(element.className || ""), text: (element.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 70), ...rectOf(element) }))
      .filter((item) => item.width > 0 && (item.right > viewportWidth + 1 || item.left < -1))
      .slice(0, 8);
    const innerBiggerThanOuter = allButtons.filter((button) => {
      const node = buttons.find((candidate) => candidate.textContent.trim() === button.text && rectOf(candidate).left === button.rect.left && rectOf(candidate).top === button.rect.top);
      const content = node?.querySelector(".c-button__content");
      const icon = node?.querySelector(".c-button__icon");
      const contentRect = content ? rectOf(content) : null;
      const iconRect = icon ? rectOf(icon) : null;
      return Boolean((contentRect && contentRect.width > button.rect.width + 1) || (iconRect && iconRect.width > button.rect.width + 1));
    }).slice(0, 8);

    return {
      hash: window.location.hash,
      title: document.querySelector("#button-doc-title")?.textContent?.trim() ?? "",
      theme: document.documentElement.dataset.theme || "unset",
      viewportWidth,
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      bodyRect,
      textHasUndefined: text.includes("undefined"),
      textHasScriptLiteral: text.includes("<script>"),
      buttonCount: buttons.length,
      tutorial: {
        present: Boolean(shell),
        kind: shell?.getAttribute("data-kind") ?? null,
        oneLineText: document.querySelector(".tutorial-scaffold__inline-code")?.textContent?.trim() ?? "",
        copyButton: Boolean(Array.from(document.querySelectorAll(".tutorial-scaffold .c-button")).find((button) => button.textContent.trim() === "复制一行示例")),
      },
      demos: {
        count: demoContainers.length,
        codeSamples,
        allCodeSingleLine: codeSamples.every((code) => !code.includes("\\n")),
        previews: previewReports,
        realPreviewButtonCount: previewReports.reduce((sum, item) => sum + item.buttonCount, 0),
      },
      allButtons,
      variants: {
        solid: publish ? publish.classList.contains("c-button--solid") : false,
        soft: byText("保存草稿") ? byText("保存草稿").classList.contains("c-button--soft") : false,
        ghost: ghost ? ghost.classList.contains("c-button--ghost") : false,
      },
      sizes: {
        mdHeight: publish ? rectOf(publish).height : 0,
        smHeight: byText("小按钮") ? rectOf(byText("小按钮")).height : 0,
      },
      submitType: submit?.getAttribute("type") ?? null,
      defaultType: publish?.getAttribute("type") ?? null,
      disabledClickPrevented,
      loadingClickPrevented,
      loading: loading ? {
        disabled: loading.disabled,
        ariaBusy: loading.getAttribute("aria-busy"),
        hasSpinner: Boolean(loading.querySelector(".c-button__spinner")),
        spinnerHidden: loading.querySelector(".c-button__icon")?.getAttribute("aria-hidden"),
        rect: rectOf(loading),
      } : null,
      iconOrder: {
        start: iconStartChildren,
        end: iconEndChildren,
      },
      focus: activeStyle ? {
        text: activeButton?.textContent?.trim() ?? "",
        matchesFocusVisible: activeButton?.matches(":focus-visible") ?? false,
        rulePresent: Array.from(document.styleSheets).some((sheet) => {
          try {
            return Array.from(sheet.cssRules ?? []).some((rule) => String(rule.selectorText ?? "").includes(".c-button:focus-visible"));
          } catch {
            return false;
          }
        }),
        outlineWidth: activeStyle.outlineWidth,
        outlineStyle: activeStyle.outlineStyle,
        outlineColor: activeStyle.outlineColor,
        outlineOffset: activeStyle.outlineOffset,
      } : null,
      ghostColor: ghostStyle?.color ?? null,
      themeStyle: {
        focusRingToken: rootStyle.getPropertyValue("--ct-focus-ring").trim(),
        surfaceToken: rootStyle.getPropertyValue("--ct-surface").trim(),
        borderToken: rootStyle.getPropertyValue("--ct-border").trim(),
        solidBackground: publishStyle?.backgroundColor ?? null,
        solidColor: publishStyle?.color ?? null,
        softBackground: softStyle?.backgroundColor ?? null,
        ghostColor: ghostStyle?.color ?? null,
      },
      structureStyle: {
        iconSlots,
        innerBiggerThanOuter,
        buttonWhiteSpace: publishStyle?.whiteSpace ?? null,
        buttonBoxSizing: publishStyle?.boxSizing ?? null,
      },
      long: {
        rect: longRect,
        contentRect: longContentRect,
        fitsViewport: longRect ? longRect.right <= viewportWidth + 1 && longRect.left >= -1 : false,
        wrapsOrShrinks: longRect && longContentRect ? longContentRect.width <= longRect.width : false,
      },
      refreshAriaLabel: refresh?.getAttribute("aria-label") ?? null,
      linkBoundaryText: [rowsByName.ButtonHTMLAttributes, rowsByName["dashed / text / link"], rowsByName["Link boundary"]].join(" "),
      contentSecurityText: rowsByName.Content ?? "",
      formSecurityText: rowsByName.Form ?? "",
      offenders,
    };
  })()`);

  const screenshot = await captureScreenshot(client, `${viewport.name}-light`);
  report.screenshot = screenshot;

  if (pageErrors.length > 0) fail(`${viewport.name} emitted errors: ${pageErrors.join(" | ")}`);
  if (report.hash !== "#button") fail(`${viewport.name} did not render #button route`);
  if (report.title !== "Button 按钮") fail(`${viewport.name} missing Button title`);
  if (report.textHasUndefined) fail(`${viewport.name} rendered literal undefined text`);
  if (report.textHasScriptLiteral) fail(`${viewport.name} rendered script-like demo text in Button doc`);
  if (report.scrollWidth > report.viewportWidth + 1) fail(`${viewport.name} has horizontal overflow ${report.scrollWidth} > ${report.viewportWidth}: ${JSON.stringify(report.offenders)}`);
  if (!report.tutorial.present || report.tutorial.kind !== "feedback" || !report.tutorial.oneLineText.includes("<Button") || !report.tutorial.copyButton) {
    fail(`${viewport.name} tutorial scaffold or one-line example missing: ${JSON.stringify(report.tutorial)}`);
  }
  if (report.demos.count < 7 || !report.demos.allCodeSingleLine || report.demos.realPreviewButtonCount < 18) {
    fail(`${viewport.name} compact real demo coverage failed: ${JSON.stringify({ demos: report.demos.count, singleLine: report.demos.allCodeSingleLine, buttons: report.demos.realPreviewButtonCount })}`);
  }
  if (report.demos.previews.some((preview) => preview.rect.width > 0 && preview.scrollWidth > preview.rect.width + 1 && preview.overflowX !== "auto")) {
    fail(`${viewport.name} demo preview overflow not contained: ${JSON.stringify(report.demos.previews)}`);
  }
  if (report.buttonCount < 18) fail(`${viewport.name} expected rich Button demos, saw ${report.buttonCount}`);
  if (report.allButtons.some((button) => button.tag !== "button")) fail(`${viewport.name} found non-button root in Button demos`);
  if (report.allButtons.some((button) => button.hasHref)) fail(`${viewport.name} found href on Button DOM`);
  if (report.allButtons.some((button) => button.hasUndefinedAttribute)) fail(`${viewport.name} found DOM attribute value 'undefined'`);
  if (!report.variants.solid || !report.variants.soft || !report.variants.ghost) fail(`${viewport.name} missing solid/soft/ghost variant class`);
  if (report.defaultType !== "button" || report.submitType !== "submit") fail(`${viewport.name} native type handling failed`);
  if (!report.disabledClickPrevented) fail(`${viewport.name} disabled Button accepted click`);
  if (!report.loadingClickPrevented) fail(`${viewport.name} loading Button accepted click`);
  if (!report.loading?.disabled || report.loading.ariaBusy !== "true" || !report.loading.hasSpinner || report.loading.spinnerHidden !== "true") {
    fail(`${viewport.name} loading state missing disabled/aria-busy/decorative spinner`);
  }
  if (!report.refreshAriaLabel) fail(`${viewport.name} aria-label native prop was not forwarded`);
  if (!report.focus?.rulePresent || !report.focus?.matchesFocusVisible || report.focus?.outlineStyle === "none" || report.focus?.outlineWidth === "0px") {
    fail(`${viewport.name} focus-visible outline missing`);
  }
  if (!report.iconOrder.start[0]?.includes("c-button__icon") || !report.iconOrder.end.at(-1)?.includes("c-button__icon")) {
    fail(`${viewport.name} icon start/end order is unstable`);
  }
  if (report.structureStyle.buttonWhiteSpace !== "normal" || report.structureStyle.buttonBoxSizing !== "border-box") {
    fail(`${viewport.name} structure style missing white-space/box-sizing: ${JSON.stringify(report.structureStyle)}`);
  }
  if (report.structureStyle.innerBiggerThanOuter.length > 0 || report.structureStyle.iconSlots.some((slot) => slot.childRect && (slot.childRect.width > slot.rect.width + 1 || slot.childRect.height > slot.rect.height + 1))) {
    fail(`${viewport.name} Button internals exceed outer bounds: ${JSON.stringify(report.structureStyle)}`);
  }
  if (!report.themeStyle.focusRingToken || !report.themeStyle.surfaceToken || !report.themeStyle.borderToken || !report.themeStyle.solidBackground || !report.themeStyle.softBackground) {
    fail(`${viewport.name} theme style tokens/computed colors missing: ${JSON.stringify(report.themeStyle)}`);
  }
  const minMd = viewport.width <= 430 ? 44 : 36;
  const minSm = viewport.width <= 430 ? 40 : 30;
  if (report.sizes.mdHeight < minMd || report.sizes.smHeight < minSm) {
    fail(`${viewport.name} touch/control heights too small: ${JSON.stringify(report.sizes)}`);
  }
  if (!report.long.fitsViewport || !report.long.wrapsOrShrinks) fail(`${viewport.name} long label overflows Button bounds`);
  if (!report.linkBoundaryText.includes("不支持 href") || !report.linkBoundaryText.includes("javascript:") || !report.linkBoundaryText.includes("data:")) {
    fail(`${viewport.name} link/dangerous protocol boundary missing from docs`);
  }
  if (!report.contentSecurityText.includes("dangerouslySetInnerHTML") || !report.formSecurityText.includes('type 为 button')) {
    fail(`${viewport.name} content/form security rows missing`);
  }

  return report;
}

async function inspectDarkButton(client, baseUrl) {
  const viewport = { name: "desktop-dark", width: 1280, height: 900 };
  await setViewport(client, viewport);
  await navigate(client, `${baseUrl}/#button`);
  await evaluate(client, `(() => {
    document.documentElement.dataset.theme = "dark";
    try { window.localStorage.setItem("tessera-theme", "dark"); } catch {}
    window.scrollTo(0, 0);
  })()`);
  await sleep(250);
  const report = await evaluate(client, `(() => {
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
    const rootStyle = getComputedStyle(document.documentElement);
    const buttons = Array.from(document.querySelectorAll(".button-doc .c-button"));
    const byText = (label) => buttons.find((button) => button.textContent.trim() === label);
    const publish = byText("发布");
    const ghost = byText("取消");
    const soft = byText("保存草稿");
    const publishStyle = publish ? getComputedStyle(publish) : null;
    const ghostStyle = ghost ? getComputedStyle(ghost) : null;
    const softStyle = soft ? getComputedStyle(soft) : null;
    const viewportWidth = document.documentElement.clientWidth;
    const offenders = Array.from(document.body.querySelectorAll("*"))
      .filter((element) => !element.closest(".demo-container__code, .button-doc-code, .button-doc-table-wrap"))
      .map((element) => ({ tag: element.tagName.toLowerCase(), className: String(element.className || ""), text: (element.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 70), ...rectOf(element) }))
      .filter((item) => item.width > 0 && (item.right > viewportWidth + 1 || item.left < -1))
      .slice(0, 8);
    return {
      theme: document.documentElement.dataset.theme || "",
      viewportWidth,
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      tokenText: rootStyle.getPropertyValue("--ct-text").trim(),
      tokenSurface: rootStyle.getPropertyValue("--ct-surface").trim(),
      tokenFocus: rootStyle.getPropertyValue("--ct-focus-ring").trim(),
      solidBackground: publishStyle?.backgroundColor ?? null,
      solidColor: publishStyle?.color ?? null,
      softBackground: softStyle?.backgroundColor ?? null,
      ghostColor: ghostStyle?.color ?? null,
      tutorialPresent: Boolean(document.querySelector(".tutorial-scaffold")),
      offenders,
    };
  })()`);
  report.screenshot = await captureScreenshot(client, "desktop-dark");
  if (report.theme !== "dark" || !report.tutorialPresent) fail(`dark theme did not apply or tutorial missing: ${JSON.stringify(report)}`);
  if (report.scrollWidth > report.viewportWidth + 1) fail(`dark theme has horizontal overflow ${report.scrollWidth} > ${report.viewportWidth}: ${JSON.stringify(report.offenders)}`);
  if (!report.tokenText || !report.tokenSurface || !report.tokenFocus || !report.solidBackground || !report.softBackground || !report.ghostColor) {
    fail(`dark theme token/computed style missing: ${JSON.stringify(report)}`);
  }
  return report;
}

async function main() {
  const baseUrl = await ensureAppServer();
  const client = await launchChrome();
  await setupPage(client);

  const reports = [];
  for (const viewport of VIEWPORTS) {
    info(`checking ${viewport.name} ${viewport.width}x${viewport.height}`);
    reports.push({ viewport, report: await inspectButton(client, baseUrl, viewport) });
  }
  info("checking desktop dark theme");
  const darkReport = await inspectDarkButton(client, baseUrl);

  client.close();
  writeFileSync(EVIDENCE_PATH, JSON.stringify({ baseUrl, screenshotsDir: SCREENSHOT_DIR, reports, darkReport, failures }, null, 2));
  if (failures.length > 0) {
    console.error(`[button-smoke] evidence written to ${EVIDENCE_PATH}`);
    process.exit(1);
  }
  console.log(`[button-smoke] PASS evidence written to ${EVIDENCE_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  terminateProcess(chromeProcess);
  terminateProcess(viteProcess);
  if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
});
