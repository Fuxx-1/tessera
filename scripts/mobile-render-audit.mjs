import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

const HOST = "127.0.0.1";
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900, mobile: false },
  { name: "mobile-360", width: 360, height: 800, mobile: true },
  { name: "mobile-390", width: 390, height: 844, mobile: true },
  { name: "mobile-430", width: 430, height: 932, mobile: true },
];
const BASE_URL = process.env.AUDIT_URL;
const SCREENSHOT_MODE = process.env.AUDIT_SCREENSHOTS ?? "failures";
const OUT_DIR = process.env.AUDIT_OUT_DIR ?? join(".tessera-evidence", `mobile-render-audit-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const COMPONENT_TYPES = ["ComponentId", "CustomComponentId", "BusinessComponentId", "ChartComponentId"];
const failures = [];

let chromeProcess;
let userDataDir;

function log(message) {
  console.log(`[mobile-audit] ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`[mobile-audit] FAIL ${message}`);
}

function parseComponentIds() {
  const source = readFileSync("src/docs/componentRegistry.ts", "utf8");
  const ids = [];

  for (const typeName of COMPONENT_TYPES) {
    const pattern = new RegExp(`export type ${typeName} =([\\s\\S]*?);`);
    const block = source.match(pattern)?.[1] ?? "";
    ids.push(...Array.from(block.matchAll(/"([^"]+)"/g), (match) => match[1]));
  }

  return ids.filter((id, index, all) => all.indexOf(id) === index);
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
      server.close(() => (port ? resolve(port) : reject(new Error("Unable to allocate port"))));
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
      // Wait until preview/CDP is reachable.
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
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

  const candidates = [
    process.env.CHROME_PATH,
    ...playwrightChromes,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
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
  if (!chromePath) {
    throw new Error("Chrome/Chromium was not found. Set CHROME_PATH to run render audit.");
  }

  const remoteDebuggingPort = await getFreePort();
  userDataDir = join(tmpdir(), `tessera-mobile-audit-${Date.now()}`);
  mkdirSync(userDataDir, { recursive: true });
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
      const { resolve, reject } = pending.get(message.id);
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

async function evaluate(client, expression, options = {}) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: options.awaitPromise ?? true,
    returnByValue: options.returnByValue ?? true,
    userGesture: true,
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || result.exceptionDetails.exception?.description || "Runtime evaluation failed");
  }

  return result.result.value;
}

async function setViewport(client, viewport) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
    screenWidth: viewport.width,
    screenHeight: viewport.height,
  });
}

async function navigate(client, url) {
  await client.send("Page.navigate", { url });
  await waitForReady(client);
}

async function waitForReady(client) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20_000) {
    const ready = await evaluate(client, `(() => {
      const root = document.querySelector("#root");
      return document.readyState !== "loading" && root && root.children.length > 0;
    })()`);
    if (ready) {
      await sleep(350);
      return;
    }
    await sleep(120);
  }
  throw new Error("Timed out waiting for React content");
}

async function captureScreenshot(client, filePath) {
  const result = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    fromSurface: true,
  });
  writeFileSync(filePath, Buffer.from(result.data, "base64"));
}

function createErrorCollector(client) {
  const pageErrors = [];
  client.on("Runtime.consoleAPICalled", (params) => {
    if (params.type === "error" || params.type === "assert") {
      pageErrors.push(`console.${params.type}: ${params.args?.map((arg) => arg.value ?? arg.description).join(" ")}`);
    }
  });
  client.on("Runtime.exceptionThrown", (params) => {
    pageErrors.push(`exception: ${params.exceptionDetails?.text ?? params.exceptionDetails?.exception?.description ?? "unknown"}`);
  });
  client.on("Log.entryAdded", (params) => {
    if (params.entry?.level === "error") {
      pageErrors.push(`log.error: ${params.entry.text}`);
    }
  });
  return pageErrors;
}

async function inspectRoute(client, baseUrl, id, viewport, pageErrors) {
  pageErrors.length = 0;
  await setViewport(client, viewport);
  await navigate(client, `${baseUrl}/#${id}`);
  const report = await evaluate(client, `(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const content = document.querySelector(".docs-shell__content");
    const sidebar = document.querySelector(".docs-shell__sidebar");
    const nav = document.querySelector(".docs-shell__nav");
    const currentNav = document.querySelector(".docs-shell__nav-link[aria-current='page']");
    const topbarTitle = document.querySelector(".docs-shell__topbar strong")?.textContent?.trim() ?? "";
    const h1 = document.querySelector("h1")?.textContent?.trim() ?? "";
    const h2 = document.querySelector("h2")?.textContent?.trim() ?? "";
    const text = content?.textContent?.replace(/\\s+/g, " ").trim() ?? "";
    const rectInfo = (node) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        scrollWidth: Math.round(node.scrollWidth ?? 0),
        clientWidth: Math.round(node.clientWidth ?? 0),
        scrollHeight: Math.round(node.scrollHeight ?? 0),
        clientHeight: Math.round(node.clientHeight ?? 0),
      };
    };
    const isVisible = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    };
    const describe = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName.toLowerCase(),
        className: typeof element.className === "string" ? element.className.split(/\\s+/).slice(0, 4).join(" ") : "",
        text: (element.textContent || element.getAttribute("aria-label") || "").trim().replace(/\\s+/g, " ").slice(0, 90),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };
    const offenders = Array.from(document.body.querySelectorAll("*"))
      .filter(isVisible)
      .map(describe)
      .filter((item) => item.width > 0 && (item.right > viewportWidth + 1 || item.left < -1))
      .slice(0, 8);
    const textOverflow = Array.from(document.body.querySelectorAll("button, a, p, span, strong, code, th, td, h1, h2, h3, h4, label, dt, dd, li"))
      .filter(isVisible)
      .filter((node) => {
        const style = getComputedStyle(node);
        const textValue = (node.textContent || "").trim();
        if (!textValue || node.closest("svg")) return false;
        if (style.overflowX === "auto" || style.overflowX === "scroll" || style.textOverflow === "ellipsis") return false;
        if (node.closest(".button-doc-code, .b-code-block, .button-doc-table-wrap, .c-chart__body, .c-menu--horizontal")) return false;
        return node.scrollWidth > node.clientWidth + 2;
      })
      .map(describe)
      .slice(0, 8);
    const controls = Array.from(document.body.querySelectorAll("button, input, textarea, select, a[href], [role='button'], [role='tab'], [role='menuitem'], [role='checkbox'], [role='radio'], [role='slider']"))
      .filter(isVisible)
      .filter((node) => !node.closest(".docs-shell__nav"))
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return { node, rect, info: describe(node) };
      });
    const minControl = viewportWidth <= 430 ? 36 : 28;
    const controlIssues = controls
      .filter(({ rect }) => rect.width < minControl || rect.height < minControl || rect.left < -1 || rect.right > viewportWidth + 1)
      .map(({ info }) => info)
      .slice(0, 8);
    const overlaps = [];
    for (let i = 0; i < controls.length; i += 1) {
      for (let j = i + 1; j < controls.length; j += 1) {
        const a = controls[i];
        const b = controls[j];
        if (a.node.contains(b.node) || b.node.contains(a.node)) continue;
        if (a.node.parentElement !== b.node.parentElement) continue;
        const x = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left));
        const y = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top));
        if (x * y > 6) overlaps.push({ a: a.info, b: b.info });
      }
    }
    const fixedIssues = Array.from(document.body.querySelectorAll("*"))
      .filter(isVisible)
      .filter((node) => {
        const style = getComputedStyle(node);
        if (style.position !== "fixed" && style.position !== "sticky") return false;
        const rect = node.getBoundingClientRect();
        return rect.width > viewportWidth + 2 || rect.left < -2 || rect.right > viewportWidth + 2 || rect.height > viewportHeight + 2;
      })
      .map(describe)
      .slice(0, 8);
    const chartIssues = Array.from(document.querySelectorAll(".c-chart"))
      .filter(isVisible)
      .map((chart) => {
        const body = chart.querySelector(".c-chart__body");
        const svg = chart.querySelector(".c-chart__svg, svg");
        const bodyRect = body?.getBoundingClientRect();
        const svgRect = svg?.getBoundingClientRect();
        const internallyScrollable = body ? body.scrollWidth > body.clientWidth + 1 : false;
        const pageWide = svgRect ? svgRect.right > viewportWidth + 1 || svgRect.left < -1 : false;
        return {
          title: chart.querySelector(".c-chart__title, h3, h4")?.textContent?.trim().slice(0, 60) ?? "",
          bodyWidth: bodyRect ? Math.round(bodyRect.width) : 0,
          svgWidth: svgRect ? Math.round(svgRect.width) : 0,
          internallyScrollable,
          pageWide,
        };
      })
      .filter((item) => item.pageWide && !item.internallyScrollable)
      .slice(0, 8);
    const demoPreviewRows = Array.from(document.querySelectorAll(".button-doc-demo__preview, .base-production-demo-grid .demo-row, .demo-row"))
      .filter(isVisible)
      .map((node) => rectInfo(node))
      .filter((rect) => rect && rect.scrollWidth > rect.clientWidth + 2)
      .slice(0, 8);
    return {
      hash: window.location.hash,
      title: topbarTitle || h1 || h2,
      topbarTitle,
      h1,
      h2,
      textLength: text.length,
      keyContentVisible: Boolean(topbarTitle && content && text.length > 120 && currentNav),
      selectedNavText: currentNav?.textContent?.trim().replace(/\\s+/g, " ") ?? "",
      scrollWidth,
      viewportWidth,
      overflow: scrollWidth > viewportWidth + 1,
      offenders,
      textOverflow,
      controlIssues,
      overlapCount: overlaps.length,
      overlapSamples: overlaps.slice(0, 4),
      fixedIssues,
      chartIssues,
      demoPreviewRows,
      sidebar: rectInfo(sidebar),
      nav: rectInfo(nav),
      chartCount: document.querySelectorAll(".c-chart").length,
      svgCount: document.querySelectorAll("svg").length,
      hasUndefinedText: text.includes("undefined"),
      hasGenericFallback: Boolean(document.querySelector(".component-doc-page__empty")),
    };
  })()`);

  const issues = [];
  if (pageErrors.length) issues.push("console");
  if (!report.keyContentVisible) issues.push("content");
  if (report.overflow) issues.push("horizontal-overflow");
  if (report.hasUndefinedText) issues.push("undefined-text");
  if (report.textOverflow.length) issues.push("text-overflow-warning");
  if (report.controlIssues.length) issues.push("control-warning");
  if (report.overlapCount) issues.push("control-overlap-warning");
  if (report.fixedIssues.length) issues.push("fixed-layer-warning");
  if (report.chartIssues.length) issues.push("chart-responsive-warning");

  return {
    componentId: id,
    viewport: viewport.name,
    width: viewport.width,
    height: viewport.height,
    url: `${baseUrl}/#${id}`,
    consoleErrors: [...pageErrors],
    issues,
    ...report,
  };
}

function shouldScreenshot(result) {
  if (SCREENSHOT_MODE === "none") return false;
  if (SCREENSHOT_MODE === "all") return true;
  return result.issues.some((issue) => !issue.endsWith("-warning"));
}

function writeMarkdown(results, componentIds) {
  const hardFailures = results.filter(
    (item) => item.consoleErrors.length || !item.keyContentVisible || item.overflow || item.hasUndefinedText,
  );
  const warnings = results.filter(
    (item) =>
      item.textOverflow.length ||
      item.controlIssues.length ||
      item.overlapCount ||
      item.fixedIssues.length ||
      item.chartIssues.length,
  );
  const lines = [
    "# Mobile Render Audit",
    "",
    `- Base URL: ${BASE_URL}`,
    `- Components: ${componentIds.length}`,
    `- Viewports: ${VIEWPORTS.map((viewport) => `${viewport.name}(${viewport.width}x${viewport.height})`).join(", ")}`,
    `- Route/viewport checks: ${results.length}`,
    `- Hard failures: ${hardFailures.length}`,
    `- Warnings: ${warnings.length}`,
    "",
    "## Hard Failures",
    "",
  ];

  if (hardFailures.length === 0) {
    lines.push("None.");
  } else {
    for (const item of hardFailures) {
      lines.push(
        `- ${item.componentId} ${item.viewport}: title="${item.title}", overflow=${item.overflow}, content=${item.keyContentVisible}, console=${item.consoleErrors.length}`,
      );
    }
  }

  lines.push("", "## Coverage", "", "| hash | viewport | title | overflow | console | key content | warnings |", "| --- | --- | --- | --- | --- | --- | --- |");
  for (const item of results) {
    const warningCount =
      item.textOverflow.length +
      item.controlIssues.length +
      item.overlapCount +
      item.fixedIssues.length +
      item.chartIssues.length;
    lines.push(
      `| #${item.componentId} | ${item.viewport} | ${item.title.replaceAll("|", "/")} | ${item.overflow ? "FAIL" : "PASS"} | ${item.consoleErrors.length} | ${item.keyContentVisible ? "PASS" : "FAIL"} | ${warningCount} |`,
    );
  }

  writeFileSync(join(OUT_DIR, "summary.md"), `${lines.join("\n")}\n`);
}

async function main() {
  if (!BASE_URL) {
    throw new Error("Set AUDIT_URL to a production preview URL, for example AUDIT_URL=http://127.0.0.1:5200");
  }

  mkdirSync(join(OUT_DIR, "screenshots"), { recursive: true });
  const componentIds = parseComponentIds();
  log(`loaded ${componentIds.length} component ids`);

  const client = await launchChrome();
  const pageErrors = createErrorCollector(client);
  const results = [];
  try {
    await setupPage(client);
    await waitForHttp(BASE_URL);

    for (const viewport of VIEWPORTS) {
      log(`checking ${viewport.name} (${viewport.width}x${viewport.height})`);
      for (const id of componentIds) {
        const result = await inspectRoute(client, BASE_URL, id, viewport, pageErrors);
        const status = result.consoleErrors.length || !result.keyContentVisible || result.overflow || result.hasUndefinedText ? "FAIL" : "PASS";
        log(`${status} #${id} ${viewport.name} title="${result.title}" overflow=${result.overflow} console=${result.consoleErrors.length}`);
        if (shouldScreenshot(result)) {
          const screenshotPath = join(OUT_DIR, "screenshots", `${viewport.name}-${id}.png`);
          await captureScreenshot(client, screenshotPath);
          result.screenshot = screenshotPath;
        }
        results.push(result);
      }
    }
  } finally {
    client.close();
    if (chromeProcess) chromeProcess.kill("SIGTERM");
    if (userDataDir) rmSync(userDataDir, { force: true, recursive: true });
  }

  const hardFailures = results.filter(
    (item) => item.consoleErrors.length || !item.keyContentVisible || item.overflow || item.hasUndefinedText,
  );
  writeFileSync(join(OUT_DIR, "results.json"), JSON.stringify({ baseUrl: BASE_URL, viewports: VIEWPORTS, componentIds, results }, null, 2));
  writeMarkdown(results, componentIds);

  console.log(`\nMobile render audit evidence: ${OUT_DIR}`);
  console.log(`Checked ${results.length} route/viewport combinations across ${componentIds.length} components.`);
  console.log(`Hard failures: ${hardFailures.length}`);

  if (hardFailures.length > 0) {
    for (const item of hardFailures.slice(0, 12)) {
      fail(`#${item.componentId} ${item.viewport}: title="${item.title}", overflow=${item.overflow}, content=${item.keyContentVisible}, console=${item.consoleErrors.length}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[mobile-audit] ${error.stack || error.message}`);
  process.exit(1);
});
