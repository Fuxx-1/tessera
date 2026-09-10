import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

const HOST = "127.0.0.1";
const APP_PORT = Number(process.env.ANCHOR_SMOKE_PORT ?? 5177);
const CDP_PORT = Number(process.env.ANCHOR_SMOKE_CDP_PORT ?? 9346);
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
];

const failures = [];
const summaries = [];
let viteProcess;
let chromeProcess;
let userDataDir;
const clients = new Set();

function info(message) {
  console.log(`[anchor-smoke] ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`[anchor-smoke] FAIL ${message}`);
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
    throw new Error("No Chrome/Chromium executable found for Anchor smoke");
  }

  userDataDir = mkdtempSync(join(tmpdir(), "anchor-smoke-chrome-"));
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
  if (report.hash !== "#anchor" || report.title !== "Anchor 锚点" || !report.hasIndependentDoc) {
    fail(`${viewport.name} route/title/independent doc failed: ${JSON.stringify(report.route)}`);
  }
  if (report.demoCount < 8 || report.codeCount !== report.demoCount || report.multilineCodeCount !== 0) {
    fail(`${viewport.name} demos or one-line samples failed: ${JSON.stringify(report.samples)}`);
  }
  if (report.reviewRows !== 5 || !report.rolesOk) {
    fail(`${viewport.name} five-role review failed: ${JSON.stringify(report.review)}`);
  }
  if (report.visibleUndefined) {
    fail(`${viewport.name} contains visible undefined text`);
  }
  if (report.scrollWidth > report.viewportWidth + 1) {
    fail(`${viewport.name} horizontal overflow ${report.scrollWidth}px > ${report.viewportWidth}px; offenders: ${JSON.stringify(report.offenders)}`);
  }
  if (report.unsafeAnchors.length || report.rejectedLinkCount < 4) {
    fail(`${viewport.name} unsafe href filtering failed: ${JSON.stringify(report.security)}`);
  }
  if (!report.deepLinkOk || !report.longLinkOk) {
    fail(`${viewport.name} long/deep anchor layout failed: ${JSON.stringify(report.depth)}`);
  }
  if (viewport.width < 600 && (!report.mobileSticky || !report.mobileClickOk || !report.mobileScrollable || report.minHitHeight < 44)) {
    fail(`${viewport.name} mobile sticky/click/scroll target failed: ${JSON.stringify(report.mobile)}`);
  }
  if (viewport.width >= 600 && (!report.desktopVertical || !report.activeMarkerOk)) {
    fail(`${viewport.name} desktop vertical active marker failed: ${JSON.stringify(report.desktop)}`);
  }
  if (!report.controlledClickOk || !report.containerActiveOk) {
    fail(`${viewport.name} active hash/container behavior failed: ${JSON.stringify(report.behavior)}`);
  }
}

async function inspectAnchor(client, baseUrl, viewport) {
  await navigate(client, `${baseUrl}/#anchor`, viewport);

  const report = await evaluate(client, `(() => new Promise((resolve) => {
    const viewportWidthForSmoke = ${viewport.width};
    const wait = (ms) => new Promise((done) => setTimeout(done, ms));
    const rectJson = (rect) => ({ left: rect.left, top: rect.top, width: rect.width, height: rect.height, right: rect.right });
    const findOffenders = () => Array.from(document.querySelectorAll("body *"))
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 0 && rect.right > window.innerWidth + 1)
      .slice(0, 6)
      .map(({ element, rect }) => ({
        tag: element.tagName,
        className: element.className || "",
        text: (element.textContent || "").trim().slice(0, 80),
        rect: rectJson(rect),
      }));

    (async () => {
      const doc = document.querySelector(".anchor-doc");
      const controlled = document.querySelector(".anchor-doc-controlled");
      const controlledApi = controlled?.querySelector('a[href="#anchor-demo-api"]');
      controlledApi?.click();
      await wait(120);

      const viewportPanel = document.querySelector(".anchor-doc-container-demo__viewport");
      if (viewportPanel) {
        viewportPanel.scrollTop = viewportPanel.scrollHeight;
        viewportPanel.dispatchEvent(new Event("scroll", { bubbles: true }));
      }
      await wait(160);

      const mobileList = document.querySelector(".c-anchor--mobile-sticky .c-anchor__list");
      if (mobileList) {
        mobileList.scrollLeft = mobileList.scrollWidth;
      }
      const mobileLink = document.querySelector(".anchor-doc-mobile__frame a[href='#anchor-demo-usage']");
      mobileLink?.click();
      await wait(80);

      const anchorLists = Array.from(document.querySelectorAll(".anchor-doc .c-anchor__list"));
      const firstList = anchorLists[0];
      const firstListStyle = firstList ? getComputedStyle(firstList) : null;
      const links = Array.from(document.querySelectorAll(".anchor-doc .c-anchor__link"));
      const linkRects = links.map((link) => link.getBoundingClientRect());
      const deepItem = Array.from(document.querySelectorAll(".anchor-doc .c-anchor__item")).find((item) =>
        (item.textContent || "").includes("Deep nested release gate")
      );
      const deepLink = deepItem?.querySelector(".c-anchor__link");
      const deepDepth = deepItem ? Number.parseInt(getComputedStyle(deepItem).getPropertyValue("--anchor-depth"), 10) : 0;
      const longLink = Array.from(document.querySelectorAll(".anchor-doc .c-anchor__link")).find((link) =>
        (link.textContent || "").includes("Quarterly governance release checklist")
      );
      const mobileSticky = viewportWidthForSmoke < 600
        ? Array.from(document.querySelectorAll(".anchor-doc .c-anchor")).every((anchor) => getComputedStyle(anchor).position === "sticky")
        : false;
      const rejectedLabels = [
        "Rejected absolute URL",
        "Rejected script URL",
        "Rejected encoded path",
        "Rejected empty hash",
      ];
      const rejectedLinkCount = rejectedLabels.filter((label) =>
        Array.from(document.querySelectorAll(".anchor-doc span.c-anchor__link--disabled")).some((item) => (item.textContent || "").includes(label))
      ).length;
      const unsafeAnchors = Array.from(document.querySelectorAll(".anchor-doc a"))
        .map((anchor) => anchor.getAttribute("href") || "")
        .filter((href) => href.startsWith("javascript:") || href.startsWith("http") || href.includes("%2f") || href === "#");
      const codeBlocks = Array.from(document.querySelectorAll(".anchor-doc .button-doc-code code"));
      const roleText = Array.from(document.querySelectorAll("#anchor-review .button-doc-table tbody tr td:first-child")).map((cell) => cell.textContent || "");
      const panelCurrent = document.querySelector(".anchor-doc-container-demo [aria-current='location']");
      const controlledStatus = document.querySelector(".anchor-doc-controlled__status code")?.textContent || "";

      resolve({
        hash: "#anchor",
        title: document.querySelector(".docs-topbar__title")?.textContent?.trim() || document.querySelector("#anchor-doc-title")?.textContent?.trim() || "",
        hasIndependentDoc: Boolean(doc) && !document.querySelector(".component-doc-page.detail-doc"),
        demoCount: document.querySelectorAll(".anchor-doc .button-doc-demo").length,
        codeCount: codeBlocks.length,
        multilineCodeCount: codeBlocks.filter((code) => (code.textContent || "").includes("\\n")).length,
        reviewRows: roleText.length,
        rolesOk: ["产品专家", "UI 专家", "研发专家", "测试专家", "白帽专家"].every((role) => roleText.includes(role)),
        visibleUndefined: (document.body.innerText || "").includes("undefined"),
        viewportWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        offenders: findOffenders(),
        unsafeAnchors,
        rejectedLinkCount,
        deepLinkOk: Boolean(deepLink) && deepDepth >= 2 && deepLink.getBoundingClientRect().right <= window.innerWidth + 1,
        longLinkOk: Boolean(longLink) && longLink.scrollWidth >= longLink.clientWidth && longLink.getBoundingClientRect().right <= window.innerWidth + 1,
        mobileSticky,
        mobileClickOk: window.location.hash === "#anchor-demo-usage",
        mobileScrollable: mobileList ? mobileList.scrollWidth > mobileList.clientWidth && mobileList.scrollLeft > 0 : viewportWidthForSmoke >= 600,
        minHitHeight: Math.min(...linkRects.map((rect) => rect.height).filter((height) => height > 0)),
        desktopVertical: firstListStyle ? firstListStyle.display === "grid" && firstListStyle.borderLeftWidth !== "0px" : false,
        activeMarkerOk: Boolean(document.querySelector(".anchor-doc .c-anchor__item--current [aria-current='location']")),
        controlledClickOk: controlledStatus === "#anchor-demo-api",
        containerActiveOk: Boolean(panelCurrent && panelCurrent.getAttribute("href") === "#anchor-container-release"),
        route: { hash: "#anchor", title: document.querySelector("#anchor-doc-title")?.textContent?.trim() || "", hasIndependentDoc: Boolean(doc) },
        samples: { demoCount: document.querySelectorAll(".anchor-doc .button-doc-demo").length, codeCount: codeBlocks.length },
        review: { roleText },
        security: { unsafeAnchors, rejectedLinkCount },
        depth: { deepDepth, deepText: deepLink?.textContent || "", longWidth: longLink?.scrollWidth || 0, longClient: longLink?.clientWidth || 0 },
        mobile: { mobileSticky, mobileScrollable: mobileList ? mobileList.scrollWidth > mobileList.clientWidth : null, minHitHeight: Math.min(...linkRects.map((rect) => rect.height).filter((height) => height > 0)) },
        desktop: { display: firstListStyle?.display || "", borderLeftWidth: firstListStyle?.borderLeftWidth || "" },
        behavior: { controlledStatus, panelCurrent: panelCurrent?.getAttribute("href") || panelCurrent?.textContent || "" },
      });
    })();
  }))()`);

  summaries.push({
    viewport: viewport.name,
    demos: report.demoCount,
    scrollWidth: report.scrollWidth,
    viewportWidth: report.viewportWidth,
    deepLinkOk: report.deepLinkOk,
    mobileSticky: report.mobileSticky,
    controlledClickOk: report.controlledClickOk,
    containerActiveOk: report.containerActiveOk,
  });
  assertReport(viewport, report);
}

async function main() {
  try {
    await startVite();
    await startChrome();
    const baseUrl = `http://${HOST}:${APP_PORT}`;

    for (const viewport of VIEWPORTS) {
      info(`checking ${viewport.name} ${viewport.width}x${viewport.height}`);
      const client = await createPage();
      await inspectAnchor(client, baseUrl, viewport);
      client.close();
    }
  } catch (error) {
    fail(error?.stack || error?.message || String(error));
  } finally {
    for (const client of clients) {
      try {
        client.close();
      } catch {
        // noop
      }
    }
    if (chromeProcess) chromeProcess.kill("SIGTERM");
    if (viteProcess) viteProcess.kill("SIGTERM");
    if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
  }

  console.log(`[anchor-smoke] summaries ${JSON.stringify(summaries, null, 2)}`);
  if (failures.length) {
    console.error(`[anchor-smoke] ${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log("[anchor-smoke] PASS");
}

await main();
