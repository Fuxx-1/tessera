import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
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
const routeSummaries = [];
let currentStep = "init";
let chromeProcess;
let userDataDir;
let viteProcess;

function info(message) {
  console.log(`[carousel-smoke] ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`[carousel-smoke] FAIL ${message}`);
}

function setStep(step) {
  currentStep = step;
  info(step);
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
  info(`starting Vite preview server at ${baseUrl}`);
  viteProcess = spawn("bun", ["run", "preview", "--", "--host", HOST, "--port", String(port), "--strictPort"], {
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
    throw new Error("Chrome/Chromium was not found. Set CHROME_PATH to run Carousel smoke.");
  }

  const remoteDebuggingPort = await getFreePort();
  userDataDir = mkdtempSync(join(tmpdir(), "tessera-carousel-"));
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

async function evaluate(client, expression, options = {}) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: options.awaitPromise ?? true,
    returnByValue: options.returnByValue ?? true,
    userGesture: options.userGesture ?? true,
  });

  if (result.exceptionDetails) {
    const details = result.exceptionDetails;
    throw new Error(details.exception?.description || details.text || "Evaluation failed");
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

async function waitForCondition(client, conditionExpression, timeoutMs = 5_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const matched = await evaluate(client, `Boolean(${conditionExpression})`);
    if (matched) return true;
    await sleep(100);
  }
  return false;
}

async function navigate(client, url) {
  await client.send("Page.navigate", { url });
  await sleep(350);
  await waitForCondition(
    client,
    "document.readyState === 'complete' && !!document.querySelector('.docs-shell') && !!document.querySelector('.docs-shell__topbar strong')?.textContent?.trim()",
    8_000,
  );
}

async function collectPageErrors(client, callback) {
  const errors = [];
  const onConsole = (params) => {
    if (params.type === "error" || params.type === "assert") {
      errors.push(`console.${params.type}: ${params.args?.map((arg) => arg.value ?? arg.description).join(" ")}`);
    }
  };
  const onException = (params) => {
    const details = params.exceptionDetails;
    const exception = details?.exception;
    errors.push(`exception: ${exception?.description ?? exception?.value ?? exception?.className ?? details?.text ?? "unknown"}`);
  };
  const onLog = (params) => {
    if (params.entry?.level === "error") {
      errors.push(`log.error: ${params.entry.text}`);
    }
  };

  client.on("Runtime.consoleAPICalled", onConsole);
  client.on("Runtime.exceptionThrown", onException);
  client.on("Log.entryAdded", onLog);
  await callback(errors);
  return errors;
}

function assertSourceContains(filePath, patterns) {
  const source = readFileSync(filePath, "utf8");
  for (const pattern of patterns) {
    const matched = pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern);
    if (!matched) {
      fail(`${filePath} missing Carousel guard ${pattern.toString()}`);
    }
  }
}

function assertSourceExcludes(filePath, patterns) {
  const source = readFileSync(filePath, "utf8");
  for (const pattern of patterns) {
    const matched = pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern);
    if (matched) {
      fail(`${filePath} contains forbidden source ${pattern.toString()}`);
    }
  }
}

function runStaticChecks() {
  const docSource = readFileSync("src/docs/CarouselDoc.tsx", "utf8");
  const styleSource = readFileSync("src/styles.css", "utf8");

  assertSourceContains("src/components/base/Carousel/Carousel.tsx", [
    "const activeIndex = normalizeIndex(isControlled ? index : uncontrolledIndex, count)",
    "return () => window.clearInterval(timer)",
    "usePrefersReducedMotion",
    "ArrowLeft",
    "ArrowRight",
    "aria-roledescription=\"carousel\"",
    "aria-roledescription=\"slide\"",
    "inert={slideIndex !== activeIndex ? true : undefined}",
    "onPointerDown={handlePointerDown}",
    "goNext(\"autoplay\")",
  ]);
  assertSourceExcludes("src/components/base/Carousel/Carousel.tsx", [
    /dangerouslySetInnerHTML\s*=/,
    /\bfrom\s+["'](?:antd|antd-mobile|@ant-design\/charts)/,
  ]);
  assertSourceExcludes("src/docs/CarouselDoc.tsx", [
    /dangerouslySetInnerHTML\s*=/,
    /\bfrom\s+["'](?:antd|antd-mobile|@ant-design\/charts)/,
  ]);

  for (const required of [
    "产品专家",
    "UI 专家",
    "研发专家",
    "测试专家",
    "白帽专家",
    "自动播放",
    "pauseOnHover",
    "pauseOnFocus",
    "prefers-reduced-motion",
    "不与 Image 文档合并",
  ]) {
    if (!docSource.includes(required)) {
      fail(`src/docs/CarouselDoc.tsx missing required coverage text: ${required}`);
    }
  }
  if (!styleSource.includes(".c-carousel__viewport") || !styleSource.includes("aspect-ratio: 16 / 9") || !styleSource.includes("touch-action: pan-y")) {
    fail("src/styles.css missing fixed viewport ratio or vertical page pan safety");
  }
  if (!/object-fit:\s*contain/.test(styleSource) || !/object-fit:\s*cover/.test(styleSource)) {
    fail("src/styles.css missing imageFit contain/cover coverage");
  }
}

async function runViewportChecks(client, baseUrl) {
  const route = "#carousel";

  for (const viewport of VIEWPORTS) {
    info(`checking #carousel at ${viewport.name} ${viewport.width}x${viewport.height}`);
    await setViewport(client, viewport);
    const pageErrors = await collectPageErrors(client, async () => {
      await navigate(client, `${baseUrl}/${route}`);
      await waitForCondition(client, "document.querySelector('.carousel-doc .c-carousel')", 5_000);
      await sleep(300);
    });

    if (pageErrors.length > 0) {
      fail(`${route} ${viewport.name} emitted errors: ${pageErrors.join(" | ")}`);
    }

    const report = await evaluate(client, `(async () => {
      const waitFrame = () => new Promise((resolve) => setTimeout(resolve, 30));
      const round = (value) => Math.round(value * 100) / 100;
      const viewportWidth = document.documentElement.clientWidth;
      const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
      const offenders = Array.from(document.body.querySelectorAll("*"))
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName.toLowerCase(),
            className: typeof element.className === "string" ? element.className : "",
            text: (element.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 80),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          };
        })
        .filter((item) => item.width > 0 && (item.right > viewportWidth + 1 || item.left < -1))
        .slice(0, 5);
      const doc = document.querySelector(".carousel-doc");
      const visibleText = doc?.textContent ?? "";
      const carousels = Array.from(document.querySelectorAll(".carousel-doc .c-carousel"));
      const first = carousels[0];
      const activeIndex = () => first ? Array.from(first.querySelectorAll(".c-carousel__slide")).findIndex((slide) => slide.getAttribute("aria-hidden") !== "true") : -1;
      first?.querySelectorAll(".c-carousel__dot")[1]?.click();
      await waitFrame();
      const before = activeIndex();
      first?.querySelector(".c-carousel__control--next")?.click();
      await waitFrame();
      const afterNext = activeIndex();
      first?.querySelector(".c-carousel__dot")?.click();
      await waitFrame();
      const afterDot = activeIndex();
      first?.focus();
      first?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "End" }));
      await waitFrame();
      const afterEnd = activeIndex();
      first?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Home" }));
      await waitFrame();
      const afterHome = activeIndex();
      const carouselReports = carousels.map((carousel) => {
        const rect = carousel.getBoundingClientRect();
        const viewportRect = carousel.querySelector(".c-carousel__viewport")?.getBoundingClientRect();
        const controls = Array.from(carousel.querySelectorAll(".c-carousel__control")).map((button) => {
          const buttonRect = button.getBoundingClientRect();
          return { width: round(buttonRect.width), height: round(buttonRect.height) };
        });
        const dots = Array.from(carousel.querySelectorAll(".c-carousel__dot")).map((button) => {
          const dotRect = button.getBoundingClientRect();
          return { width: round(dotRect.width), height: round(dotRect.height), selected: button.getAttribute("aria-selected") === "true" };
        });
        const slides = Array.from(carousel.querySelectorAll(".c-carousel__slide")).map((slide) => ({
          hidden: slide.getAttribute("aria-hidden"),
          inert: slide.hasAttribute("inert"),
          label: slide.getAttribute("aria-label") ?? "",
          role: slide.getAttribute("role") ?? "",
          description: slide.getAttribute("aria-roledescription") ?? "",
          scrollWidth: slide.scrollWidth,
          clientWidth: slide.clientWidth,
          scrollHeight: slide.scrollHeight,
          clientHeight: slide.clientHeight,
        }));
        return {
          width: round(rect.width),
          viewportWidth: viewportRect ? round(viewportRect.width) : 0,
          viewportHeight: viewportRect ? round(viewportRect.height) : 0,
          controls,
          dots,
          slides,
          role: carousel.getAttribute("role"),
          description: carousel.getAttribute("aria-roledescription"),
          label: carousel.getAttribute("aria-label") ?? carousel.getAttribute("aria-labelledby") ?? "",
        };
      });
      const codeTexts = Array.from(document.querySelectorAll(".carousel-doc .button-doc-code code")).map((node) => node.textContent ?? "");
      const imageAlts = Array.from(document.querySelectorAll(".carousel-doc .c-carousel img")).map((image) => image.getAttribute("alt") ?? "");
      return {
        hash: window.location.hash,
        title: document.querySelector(".docs-shell__topbar strong")?.textContent?.trim() ?? "",
        h2: document.querySelector("#carousel-doc-title")?.textContent?.trim() ?? "",
        hasIndependentDoc: Boolean(doc) && !document.querySelector(".carousel-doc .image-doc") && !document.querySelector(".carousel-doc .card-doc") && !document.querySelector(".carousel-doc .tour-doc"),
        tocCount: document.querySelectorAll(".carousel-doc .button-doc__toc a[href^='#carousel-']").length,
        demoCount: document.querySelectorAll(".carousel-doc .button-doc-demo").length,
        codeCount: codeTexts.length,
        tableCount: document.querySelectorAll(".carousel-doc .button-doc-table").length,
        codeTexts,
        hasVisibleUndefined: visibleText.includes("undefined"),
        hasFiveExperts: ["产品专家", "UI 专家", "研发专家", "测试专家", "白帽专家"].every((text) => visibleText.includes(text)),
        hasSecurityCopy: visibleText.includes("不注入 HTML") && visibleText.includes("alt 文本") && visibleText.includes("inert"),
        imageAlts,
        before,
        afterNext,
        afterDot,
        afterEnd,
        afterHome,
        carouselReports,
        scrollWidth,
        viewportWidth,
        offenders,
      };
    })()`);

    routeSummaries.push({
      viewport: viewport.name,
      scrollWidth: report.scrollWidth,
      viewportWidth: report.viewportWidth,
      carousels: report.carouselReports.length,
    });

    if (report.hash !== route || report.title !== "Carousel 走马灯" || report.h2 !== "Carousel 走马灯" || !report.hasIndependentDoc || report.tocCount < 8) {
      fail(`${route} ${viewport.name} route/title/anchors/independent docs failed: ${JSON.stringify({ hash: report.hash, title: report.title, h2: report.h2, toc: report.tocCount, independent: report.hasIndependentDoc })}`);
    }
    if (report.scrollWidth > report.viewportWidth + 1) {
      fail(`${route} ${viewport.name} horizontal page overflow: ${JSON.stringify({ scrollWidth: report.scrollWidth, viewportWidth: report.viewportWidth, offenders: report.offenders })}`);
    }
    if (report.hasVisibleUndefined) {
      fail(`${route} ${viewport.name} contains visible undefined text`);
    }
    if (report.demoCount < 5 || report.codeCount !== report.demoCount || report.tableCount < 4) {
      fail(`${route} ${viewport.name} demos/code/tables coverage failed: ${JSON.stringify({ demos: report.demoCount, code: report.codeCount, tables: report.tableCount })}`);
    }
    if (!report.codeTexts.every((code) => !code.includes("\\n"))) {
      fail(`${route} ${viewport.name} examples must use one-line code samples: ${JSON.stringify(report.codeTexts)}`);
    }
    if (!report.hasFiveExperts || !report.hasSecurityCopy || report.imageAlts.some((alt) => !alt.trim())) {
      fail(`${route} ${viewport.name} review/security/image alt coverage failed: ${JSON.stringify({ experts: report.hasFiveExperts, security: report.hasSecurityCopy, imageAlts: report.imageAlts })}`);
    }
    if (report.before !== 1 || report.afterNext !== 2 || report.afterDot !== 0 || report.afterEnd !== 2 || report.afterHome !== 0) {
      fail(`${route} ${viewport.name} next/dot/keyboard activeIndex flow failed: ${JSON.stringify({ before: report.before, afterNext: report.afterNext, afterDot: report.afterDot, afterEnd: report.afterEnd, afterHome: report.afterHome })}`);
    }
    if (!report.carouselReports.every((carousel) => carousel.role === "region" && carousel.description === "carousel" && carousel.label && carousel.width <= report.viewportWidth && carousel.viewportWidth <= carousel.width + 1 && carousel.viewportHeight > 0)) {
      fail(`${route} ${viewport.name} carousel region or viewport sizing failed: ${JSON.stringify(report.carouselReports)}`);
    }
    if (!report.carouselReports.every((carousel) => carousel.slides.length > 0 && carousel.slides.every((slide) => slide.role === "group" && slide.description === "slide" && slide.label && slide.scrollWidth <= slide.clientWidth + 1 && (slide.hidden === "true" ? slide.inert : !slide.inert)))) {
      fail(`${route} ${viewport.name} slide semantics/inert/horizontal overflow failed: ${JSON.stringify(report.carouselReports)}`);
    }
    if (!report.carouselReports.every((carousel) => carousel.controls.length === 0 || carousel.controls.every((control) => control.width >= 34 && control.height >= 34)) || !report.carouselReports.every((carousel) => carousel.dots.length === 0 || (carousel.dots.some((dot) => dot.selected) && carousel.dots.every((dot) => dot.width >= 22 && dot.height >= 18)))) {
      fail(`${route} ${viewport.name} arrow or indicator hit targets failed: ${JSON.stringify(report.carouselReports)}`);
    }

    if (viewport.width <= 430) {
      const swipeReport = await evaluate(client, `(async () => {
        const waitFrame = () => new Promise((resolve) => setTimeout(resolve, 30));
        const first = document.querySelector(".carousel-doc .c-carousel");
        const slides = () => Array.from(first?.querySelectorAll(".c-carousel__slide") ?? []);
        first?.querySelector(".c-carousel__dot")?.click();
        await waitFrame();
        const beforeSwipe = slides().findIndex((slide) => slide.getAttribute("aria-hidden") !== "true");
        const viewport = first?.querySelector(".c-carousel__viewport");
        const rect = viewport?.getBoundingClientRect();
        if (!first || !rect) return null;
        first.setPointerCapture = () => {};
        first.releasePointerCapture = () => {};
        first.hasPointerCapture = () => false;
        const pointerId = 41;
        first.dispatchEvent(new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          pointerId,
          pointerType: "touch",
          clientX: rect.right - 28,
          clientY: rect.top + rect.height / 2,
        }));
        first.dispatchEvent(new PointerEvent("pointerup", {
          bubbles: true,
          cancelable: true,
          pointerId,
          pointerType: "touch",
          clientX: rect.left + 28,
          clientY: rect.top + rect.height / 2,
        }));
        await waitFrame();
        const afterSwipe = slides().findIndex((slide) => slide.getAttribute("aria-hidden") !== "true");
        return { beforeSwipe, afterSwipe };
      })()`);
      if (!swipeReport) {
        fail(`${route} ${viewport.name} missing swipe target viewport`);
      } else if (swipeReport.beforeSwipe !== 0 || swipeReport.afterSwipe !== 1) {
        fail(`${route} ${viewport.name} mobile swipe did not advance slide: ${JSON.stringify(swipeReport)}`);
      }
    }
  }
}

async function main() {
  let client;
  let exitCode = 0;
  const watchdog = setTimeout(() => {
    console.error(`[carousel-smoke] timed out while ${currentStep}`);
    if (chromeProcess) chromeProcess.kill("SIGTERM");
    if (viteProcess) viteProcess.kill("SIGTERM");
    if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
    process.exit(124);
  }, 45_000);
  try {
    setStep("running static checks");
    runStaticChecks();
    setStep("starting preview server");
    const baseUrl = await ensureAppServer();
    setStep("launching Chrome");
    client = await launchChrome();
    setStep("setting up CDP page");
    await setupPage(client);
    setStep("running viewport checks");
    await runViewportChecks(client, baseUrl);

    if (failures.length > 0) {
      console.error(`Carousel smoke failed with ${failures.length} issue(s).`);
      exitCode = 1;
    } else {
      console.table(routeSummaries);
      console.log("Carousel smoke passed: route, one-line docs, activeIndex controls, keyboard, mobile swipe, ARIA/inert, image alt, and 360/390/430 overflow are clean.");
    }
  } finally {
    clearTimeout(watchdog);
    if (client) client.close();
    if (chromeProcess) chromeProcess.kill("SIGTERM");
    if (viteProcess) viteProcess.kill("SIGTERM");
    if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
  }
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
