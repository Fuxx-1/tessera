import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

const HOST = "127.0.0.1";
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
];

const failures = [];
let chromeProcess;
let userDataDir;
let viteProcess;

function info(message) {
  console.log(`[mobile-preview-frame] ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`[mobile-preview-frame] FAIL ${message}`);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
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
      // Server or CDP is still booting.
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
          join(
            playwrightCache,
            entry.name,
            "chrome-mac",
            "Google Chrome for Testing.app",
            "Contents",
            "MacOS",
            "Google Chrome for Testing",
          ),
        ])
    : [];

  return [
    process.env.CHROME_PATH,
    ...playwrightChromes,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  ]
    .filter(Boolean)
    .find((candidate) => existsSync(candidate));
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
  if (!chromePath) {
    throw new Error("Chrome/Chromium was not found. Set CHROME_PATH to run MobilePreviewFrame smoke.");
  }

  const remoteDebuggingPort = await getFreePort();
  userDataDir = mkdtempSync(join(tmpdir(), "tessera-mobile-preview-frame-"));
  const stderr = [];
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

  chromeProcess.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    stderr.push(text);
    if (!text.includes("DevTools listening")) {
      process.stderr.write(text);
    }
  });

  const startupExit = await waitForProcessExit(chromeProcess, 300);
  if (startupExit) {
    throw new Error(`Chrome exited before CDP startup: ${stderr.join("").trim()}`);
  }

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
      if (message.error) {
        reject(new Error(`${message.error.message}: ${message.error.data ?? ""}`));
      } else {
        resolve(message.result);
      }
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

async function navigate(client, url) {
  await client.send("Page.navigate", { url });
  const startedAt = Date.now();
  while (Date.now() - startedAt < 10_000) {
    const ready = await evaluate(client, `Boolean(
      document.readyState !== "loading" &&
      document.querySelector(".mobile-preview-frame-doc") &&
      document.querySelectorAll(".b-mobile-preview-frame").length >= 3
    )`);
    if (ready) {
      await sleep(350);
      return;
    }
    await sleep(100);
  }
  throw new Error("Timed out waiting for MobilePreviewFrame doc route");
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
    if (params.entry?.level === "error") {
      errors.push(`log.error: ${params.entry.text}`);
    }
  });
  return errors;
}

async function inspect(client, baseUrl, viewport, pageErrors) {
  pageErrors.length = 0;
  await setViewport(client, viewport);
  await navigate(client, `${baseUrl}/#mobile-preview-frame`);

  const report = await evaluate(client, `(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const text = document.body.textContent.replace(/\\s+/g, " ").trim();
    const frames = Array.from(document.querySelectorAll(".b-mobile-preview-frame"));
    const rectOf = (node) => {
      const rect = node.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        scrollWidth: Math.round(node.scrollWidth),
        clientWidth: Math.round(node.clientWidth),
      };
    };
    const frameReports = frames.map((frame) => {
      const device = frame.querySelector(".b-mobile-preview-frame__device");
      const screen = frame.querySelector(".b-mobile-preview-frame__screen");
      const status = frame.querySelector(".b-mobile-preview-frame__status");
      const content = frame.querySelector(".b-mobile-preview-frame__content");
      const deviceRect = device.getBoundingClientRect();
      const expectedWidth = Number(frame.getAttribute("data-preview-width"));
      const expectedHeight = Number(frame.getAttribute("data-preview-height"));
      const scale = expectedWidth > 0 ? deviceRect.width / expectedWidth : 0;
      const aspectError = expectedWidth && expectedHeight
        ? Math.abs((deviceRect.width / Math.max(deviceRect.height, 1)) - (expectedWidth / expectedHeight))
        : 0;
      return {
        title: frame.querySelector("h2")?.textContent?.trim() ?? "",
        chrome: frame.getAttribute("data-chrome"),
        orientation: frame.getAttribute("data-orientation"),
        expectedWidth,
        expectedHeight,
        root: rectOf(frame),
        device: rectOf(device),
        screen: rectOf(screen),
        scale: Math.round(scale * 1000) / 1000,
        aspectError: Math.round(aspectError * 1000) / 1000,
        statusVisible: Boolean(status && status.getBoundingClientRect().height > 0),
        hasHome: Boolean(frame.querySelector(".b-mobile-preview-frame__home")),
        hasAndroidNav: Boolean(frame.querySelector(".b-mobile-preview-frame__android-nav")),
        screenScrollable: screen ? screen.scrollHeight > screen.clientHeight && getComputedStyle(screen).overflowY !== "hidden" : false,
        contentOverflow: content ? content.scrollWidth > content.clientWidth + 2 : false,
        contentText: content?.textContent?.replace(/\\s+/g, " ").trim().slice(0, 120) ?? "",
      };
    });
    const offenders = Array.from(document.body.querySelectorAll("*"))
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return { node, rect };
      })
      .filter(({ rect }) => rect.width > 0 && (rect.right > viewportWidth + 1 || rect.left < -1))
      .slice(0, 8)
      .map(({ node, rect }) => ({
        tag: node.tagName.toLowerCase(),
        className: typeof node.className === "string" ? node.className.split(/\\s+/).slice(0, 4).join(" ") : "",
        text: (node.textContent || node.getAttribute("aria-label") || "").trim().replace(/\\s+/g, " ").slice(0, 80),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      }));
    return {
      hash: window.location.hash,
      title: document.querySelector("#mobile-preview-frame-doc-title")?.textContent?.trim() ?? "",
      viewportWidth,
      scrollWidth,
      pageOverflow: scrollWidth > viewportWidth + 1,
      offenders,
      frameReports,
      hasOneLineSample: text.includes('<MobilePreviewFrame chrome="ios" size="iphone-14" screenLabel="Release preview"><ReleaseMobilePanel /></MobilePreviewFrame>'),
      hasSecurityBoundary: text.includes("iframe sandbox") && text.includes("ReactNode") && text.includes("不使用 innerHTML"),
      hasFiveRoles: ["产品专家", "UI 专家", "研发专家", "测试专家", "白帽专家"].every((label) => text.includes(label)),
      hasViewportCopy: ["desktop", "360px", "390px", "430px", "no overflow"].every((label) => text.includes(label)),
      hasUndefinedText: text.includes("undefined"),
    };
  })()`);

  if (pageErrors.length) {
    fail(`${viewport.name}: console errors ${JSON.stringify(pageErrors)}`);
  }
  if (report.hash !== "#mobile-preview-frame" || report.title !== "MobilePreviewFrame 移动预览框") {
    fail(`${viewport.name}: route/title failed ${JSON.stringify({ hash: report.hash, title: report.title })}`);
  }
  if (report.pageOverflow) {
    fail(`${viewport.name}: page horizontal overflow ${report.scrollWidth}px > ${report.viewportWidth}px offenders=${JSON.stringify(report.offenders)}`);
  }
  if (report.hasUndefinedText) {
    fail(`${viewport.name}: visible undefined text detected`);
  }
  if (!report.hasOneLineSample || !report.hasSecurityBoundary || !report.hasFiveRoles || !report.hasViewportCopy) {
    fail(`${viewport.name}: doc coverage missing ${JSON.stringify({
      oneLine: report.hasOneLineSample,
      security: report.hasSecurityBoundary,
      fiveRoles: report.hasFiveRoles,
      viewports: report.hasViewportCopy,
    })}`);
  }

  const ios = report.frameReports.find((frame) => frame.chrome === "ios");
  const android = report.frameReports.find((frame) => frame.chrome === "android");
  const bare = report.frameReports.find((frame) => frame.chrome === "none");
  if (!ios || !android || !bare) {
    fail(`${viewport.name}: expected ios/android/none frames ${JSON.stringify(report.frameReports.map((frame) => frame.chrome))}`);
  }

  for (const frame of report.frameReports) {
    if (frame.root.right > report.viewportWidth + 1 || frame.device.right > report.viewportWidth + 1 || frame.root.left < -1) {
      fail(`${viewport.name}: frame escaped viewport ${JSON.stringify(frame)}`);
    }
    if (frame.device.width > frame.root.width + 1 || frame.screen.width > frame.device.width + 1 || frame.contentOverflow) {
      fail(`${viewport.name}: preview/children boundary failed ${JSON.stringify(frame)}`);
    }
    if (frame.scale <= 0 || frame.scale > 1.01 || frame.aspectError > 0.035) {
      fail(`${viewport.name}: scale/aspect failed ${JSON.stringify(frame)}`);
    }
  }

  if (ios && (!ios.statusVisible || !ios.hasHome || ios.hasAndroidNav || !ios.screenScrollable)) {
    fail(`${viewport.name}: iOS chrome/scroll boundary failed ${JSON.stringify(ios)}`);
  }
  if (android && (!android.statusVisible || !android.hasAndroidNav || android.hasHome || android.orientation !== "landscape" || android.expectedWidth <= android.expectedHeight)) {
    fail(`${viewport.name}: Android landscape chrome failed ${JSON.stringify(android)}`);
  }
  if (bare && (bare.statusVisible || bare.hasHome || bare.hasAndroidNav || bare.screenScrollable || bare.expectedWidth !== 360 || bare.expectedHeight !== 640)) {
    fail(`${viewport.name}: no-chrome custom preview failed ${JSON.stringify(bare)}`);
  }

  info(`${viewport.name}: viewport=${report.viewportWidth}, overflow=${report.pageOverflow}, scales=${report.frameReports.map((frame) => `${frame.chrome}:${frame.scale}`).join(", ")}`);
}

async function main() {
  let client;
  try {
    const baseUrl = await ensureAppServer();
    client = await launchChrome();
    await setupPage(client);
    const pageErrors = createErrorCollector(client);

    for (const viewport of VIEWPORTS) {
      await inspect(client, baseUrl, viewport, pageErrors);
    }

    if (failures.length > 0) {
      console.error(`MobilePreviewFrame smoke failed with ${failures.length} issue(s).`);
      process.exitCode = 1;
      return;
    }

    console.log("MobilePreviewFrame smoke passed: device chrome, status bars, portrait/landscape, scale, children boundary, security copy, one-line sample, and desktop/360/390/430 no-overflow checks are clean.");
  } finally {
    if (client) client.close();
    if (chromeProcess) chromeProcess.kill("SIGTERM");
    if (viteProcess) viteProcess.kill("SIGTERM");
    if (userDataDir) rmSync(userDataDir, { force: true, recursive: true });
  }
}

main().catch((error) => {
  console.error(`[mobile-preview-frame] ${error.stack || error.message}`);
  process.exit(1);
});
