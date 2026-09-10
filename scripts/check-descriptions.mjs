import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

const HOST = "127.0.0.1";
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-360", width: 360, height: 780 },
];

const failures = [];
let viteProcess;
let chromeProcess;
let userDataDir;

function info(message) {
  console.log(`[descriptions-smoke] ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`[descriptions-smoke] FAIL ${message}`);
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
      // Server or browser endpoint is still booting.
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function ensureAppServer() {
  if (process.env.DESCRIPTIONS_ACCEPTANCE_URL) {
    await waitForHttp(process.env.DESCRIPTIONS_ACCEPTANCE_URL);
    return process.env.DESCRIPTIONS_ACCEPTANCE_URL;
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
  const candidates = [
    process.env.CHROME_PATH,
    ...playwrightChromes,
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

function connectCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  let nextId = 1;
  const pending = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { reject, resolve } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) {
      reject(new Error(`${message.error.message}: ${message.error.data ?? ""}`));
    } else {
      resolve(message.result);
    }
  });

  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  return {
    async send(method, params = {}) {
      await ready;
      const id = nextId++;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close() {
      socket.close();
    },
  };
}

async function launchChrome() {
  const chromePath = findChromeExecutable();
  if (!chromePath) throw new Error("Chrome/Chromium was not found. Set CHROME_PATH to run Descriptions smoke.");

  const remoteDebuggingPort = await getFreePort();
  userDataDir = mkdtempSync(join(tmpdir(), "tessera-descriptions-smoke-"));
  info(`starting headless browser on CDP port ${remoteDebuggingPort}`);
  const chromeStderr = [];

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

  chromeProcess.stderr.on("data", (chunk) => chromeStderr.push(chunk.toString()));

  const startupExit = await waitForProcessExit(chromeProcess, 300);
  if (startupExit) {
    throw new Error(`Chrome exited before CDP startup: ${chromeStderr.join("").trim()}`);
  }

  await waitForHttp(`http://${HOST}:${remoteDebuggingPort}/json/version`, 45_000);
  const targetResponse = await fetch(`http://${HOST}:${remoteDebuggingPort}/json/new?about:blank`, { method: "PUT" });
  const target = await targetResponse.json();
  return connectCdp(target.webSocketDebuggerUrl);
}

async function evaluate(client, expression, options = {}) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: options.awaitPromise ?? true,
    returnByValue: options.returnByValue ?? true,
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
  });
}

async function waitForDescriptionsDoc(client, timeoutMs = 8_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const ready = await evaluate(
      client,
      `document.readyState === "complete" && !!document.querySelector(".descriptions-doc .c-descriptions")`,
    );
    if (ready) return true;
    await sleep(100);
  }
  return false;
}

async function inspectDescriptions(client, baseUrl, viewport) {
  await setViewport(client, viewport);
  await client.send("Page.navigate", { url: `${baseUrl}/#/descriptions` });
  if (!(await waitForDescriptionsDoc(client))) {
    const debug = await evaluate(client, `(() => ({
      hash: location.hash,
      title: document.title,
      bodyText: document.body.textContent?.trim().replace(/\\s+/g, " ").slice(0, 300) ?? "",
      viteError: document.querySelector("vite-error-overlay")?.shadowRoot?.textContent?.trim().replace(/\\s+/g, " ").slice(0, 300) ?? "",
    }))()`);
    fail(`${viewport.name}: Descriptions doc did not become ready ${JSON.stringify(debug)}`);
    return;
  }
  await sleep(250);

  const report = await evaluate(client, `(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const docText = document.querySelector(".descriptions-doc")?.innerText ?? "";
    const demos = Array.from(document.querySelectorAll(".descriptions-doc .button-doc-demo"));
    const codeBlocks = Array.from(document.querySelectorAll(".descriptions-doc .button-doc-code code"));
    const previewOffenders = Array.from(document.querySelectorAll(".descriptions-doc .button-doc-demo__preview"))
      .flatMap((preview) => {
        const previewRect = preview.getBoundingClientRect();
        return Array.from(preview.querySelectorAll(".c-descriptions, .c-descriptions__list, .c-descriptions__item, .c-descriptions__table-wrap, .c-descriptions__table, .c-descriptions__label, .c-descriptions__content")).map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName.toLowerCase(),
            className: typeof element.className === "string" ? element.className : "",
            text: (element.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 90),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            previewLeft: Math.round(previewRect.left),
            previewRight: Math.round(previewRect.right),
            width: Math.round(rect.width),
          };
        }).filter((item) => item.width > 0 && (item.left < item.previewLeft - 1 || item.right > item.previewRight + 1));
      })
      .slice(0, 8);
    const firstDescriptions = document.querySelector(".descriptions-doc .c-descriptions");
    const firstItems = Array.from(firstDescriptions?.querySelectorAll(".c-descriptions__item") ?? []);
    const tableDescriptions = document.querySelector('.descriptions-doc .c-descriptions[data-semantic="table"]');
    const tableStyle = tableDescriptions ? getComputedStyle(tableDescriptions.querySelector(".c-descriptions__table")) : null;
    const mobileLabels = Array.from(tableDescriptions?.querySelectorAll(".c-descriptions__mobile-label") ?? []).filter((node) => getComputedStyle(node).display !== "none");
    const emptyValue = Array.from(document.querySelectorAll(".descriptions-doc .c-descriptions__empty-value")).map((node) => node.textContent?.trim() ?? "");
    const safeTextFound = docText.includes("<img src=x onerror=alert(1)>") && docText.includes("<script>alert('safe text')</script>");
    return {
      viewportWidth,
      scrollWidth,
      title: document.querySelector(".descriptions-doc .button-doc__header h2")?.textContent?.trim() ?? "",
      demoCount: demos.length,
      oneLineCodeBlocks: codeBlocks.filter((node) => !(node.textContent ?? "").includes("\\n")).length,
      hasVisibleUndefined: /(^|\\s)undefined(\\s|$)/i.test(docText),
      descriptionsCount: document.querySelectorAll(".descriptions-doc .c-descriptions").length,
      dlCount: document.querySelectorAll('.descriptions-doc .c-descriptions[data-semantic="dl"] dl').length,
      tableCount: document.querySelectorAll('.descriptions-doc .c-descriptions[data-semantic="table"] table').length,
      emptyValue,
      safeTextFound,
      firstDemoItemCount: firstItems.length,
      firstDemoOneVisualRow: firstItems.length === 3 && firstItems.every((item) => Math.abs(item.getBoundingClientRect().top - firstItems[0].getBoundingClientRect().top) < 2),
      tableDisplay: tableStyle?.display ?? "",
      mobileLabelCount: mobileLabels.length,
      previewOffenders,
    };
  })()`);

  if (report.title !== "Descriptions 描述列表") fail(`${viewport.name}: #/descriptions did not render independent Descriptions doc`);
  if (report.demoCount !== 6) fail(`${viewport.name}: expected 6 Descriptions demos, got ${report.demoCount}`);
  if (report.oneLineCodeBlocks !== report.demoCount) fail(`${viewport.name}: sample code blocks are not all single-line`);
  if (report.scrollWidth > report.viewportWidth + 1) fail(`${viewport.name}: page overflows horizontally ${report.scrollWidth} > ${report.viewportWidth}`);
  if (report.previewOffenders.length > 0) fail(`${viewport.name}: preview child overflow ${JSON.stringify(report.previewOffenders)}`);
  if (report.hasVisibleUndefined) fail(`${viewport.name}: rendered visible undefined text`);
  if (report.descriptionsCount < 6 || report.dlCount < 4 || report.tableCount < 1) fail(`${viewport.name}: dl/table coverage missing ${JSON.stringify(report)}`);
  if (!report.emptyValue.includes("Pending") || !report.emptyValue.includes("No metadata")) fail(`${viewport.name}: empty value boundary missing ${JSON.stringify(report.emptyValue)}`);
  if (!report.safeTextFound) fail(`${viewport.name}: safe label/value text was not rendered as plain text`);

  if (viewport.width > 760 && !report.firstDemoOneVisualRow) {
    fail(`${viewport.name}: one-line sample did not stay on one visual row`);
  }
  if (viewport.width <= 760 && report.tableDisplay !== "block") {
    fail(`${viewport.name}: table semantic view did not collapse to block, got ${report.tableDisplay}`);
  }
  if (viewport.width <= 760 && report.mobileLabelCount < 1) {
    fail(`${viewport.name}: mobile table top-label pairing is missing`);
  }

  info(`${viewport.name}: demos=${report.demoCount}, dl=${report.dlCount}, table=${report.tableCount}, overflow=false, undefined=false`);
}

async function main() {
  let client;
  try {
    const baseUrl = await ensureAppServer();
    client = await launchChrome();
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    for (const viewport of VIEWPORTS) {
      await inspectDescriptions(client, baseUrl, viewport);
    }
  } finally {
    client?.close();
    if (chromeProcess) chromeProcess.kill("SIGTERM");
    if (viteProcess) viteProcess.kill("SIGTERM");
    if (userDataDir) rmSync(userDataDir, { force: true, recursive: true });
  }

  if (failures.length > 0) {
    console.error(`Descriptions smoke failed with ${failures.length} issue(s).`);
    process.exit(1);
  }
  console.log("Descriptions smoke passed: #/descriptions desktop, 360, 390, 430 no-overflow, no undefined, dl/table, empty, safe text, and mobile pairing checks are green.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
