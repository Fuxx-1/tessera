import { normalizeUrlLikeValue } from "./url";
import { UI_RENDER_BUDGETS } from "./performance";

export type SvgMetrics = {
  width: number;
  height: number;
};

export type SanitizedSvgResult =
  | { ok: true; svg: string; metrics: SvgMetrics }
  | { ok: false; error: string };

const allowedSvgTags = new Set([
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "textPath",
  "title",
  "desc",
  "defs",
  "marker",
  "pattern",
  "filter",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feMorphology",
  "feOffset",
  "feComposite",
  "feMerge",
  "feMergeNode",
  "clipPath",
  "mask",
  "linearGradient",
  "radialGradient",
  "stop",
  "use",
]);

const allowedSvgStyleProperties = new Set([
  "dominant-baseline",
  "baseline-shift",
  "color",
  "display",
  "fill",
  "fill-opacity",
  "filter",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "letter-spacing",
  "marker-end",
  "marker-mid",
  "marker-start",
  "opacity",
  "paint-order",
  "pointer-events",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "text-anchor",
  "text-decoration",
  "textLength",
  "lengthAdjust",
  "visibility",
]);

const allowedSvgAttributes = new Set([
  "alignment-baseline",
  "aria-hidden",
  "aria-label",
  "aria-labelledby",
  "baseline-shift",
  "class",
  "clip-path",
  "clipPathUnits",
  "cx",
  "cy",
  "d",
  "color",
  "dx",
  "dy",
  "dominant-baseline",
  "filter",
  "filterRes",
  "filterUnits",
  "fill",
  "fill-opacity",
  "fill-rule",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "height",
  "href",
  "id",
  "letter-spacing",
  "mask",
  "maskUnits",
  "marker-end",
  "markerHeight",
  "marker-mid",
  "marker-start",
  "markerUnits",
  "markerWidth",
  "method",
  "offset",
  "opacity",
  "operator",
  "orient",
  "paint-order",
  "points",
  "preserveAspectRatio",
  "patternUnits",
  "patternTransform",
  "pathLength",
  "pointer-events",
  "r",
  "refX",
  "refY",
  "role",
  "rx",
  "ry",
  "spacing",
  "startOffset",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "text-anchor",
  "text-decoration",
  "textLength",
  "text-rendering",
  "transform",
  "type",
  "viewBox",
  "vector-effect",
  "visibility",
  "width",
  "xmlns",
  "xmlns:xlink",
  "xml:space",
  "x",
  "x1",
  "x2",
  "xlink:href",
  "y",
  "y1",
  "y2",
]);

export function sanitizeSvg(svg: string): SanitizedSvgResult {
  const document = new DOMParser().parseFromString(svg, "image/svg+xml");
  const parseError = document.querySelector("parsererror");

  if (parseError) {
    return { ok: false, error: "Unable to parse SVG output." };
  }

  const initialNodeCount = document.querySelectorAll("*").length;
  if (initialNodeCount > UI_RENDER_BUDGETS.svgNodes) {
    return {
      ok: false,
      error: `SVG output exceeds ${UI_RENDER_BUDGETS.svgNodes.toLocaleString()} nodes.`,
    };
  }

  inlineSafeSvgStyleRules(document);

  Array.from(document.querySelectorAll("*")).forEach((element) => {
    if (element.tagName === "foreignObject") {
      replaceForeignObjectWithText(element, document);
      return;
    }

    if (!allowedSvgTags.has(element.tagName)) {
      element.remove();
      return;
    }

    mapSafeStyleToAttributes(element);

    [...element.attributes].forEach((attribute) => {
      if (!isAllowedSvgAttribute(attribute.name, attribute.value)) {
        element.removeAttribute(attribute.name);
      }
    });
  });
  normalizeSvgTextNodes(document);

  const svgElement = document.documentElement;
  if (svgElement.tagName.toLowerCase() !== "svg") {
    return { ok: false, error: "Mermaid did not return an SVG element." };
  }

  const metrics = getSvgMetrics(svgElement);
  if (!svgElement.getAttribute("viewBox")) {
    svgElement.setAttribute("viewBox", `0 0 ${metrics.width} ${metrics.height}`);
  }

  svgElement.setAttribute("width", String(metrics.width));
  svgElement.setAttribute("height", String(metrics.height));
  if (!svgElement.getAttribute("preserveAspectRatio")) {
    svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }

  normalizeMermaidSvgSemantics(svgElement);
  svgElement.classList.add("b-mermaid-svg");
  svgElement.setAttribute("aria-hidden", "true");
  svgElement.removeAttribute("style");

  return {
    ok: true,
    metrics,
    svg: new XMLSerializer().serializeToString(svgElement),
  };
}

function normalizeMermaidSvgSemantics(svgElement: Element) {
  svgElement.querySelectorAll(
    [
      ".edgePaths path",
      ".edgePaths line",
      ".edgePaths polyline",
      "g.edgePath path",
      "g.edgePath line",
      "g.edgePath polyline",
      "path.flowchart-link",
      "line.flowchart-link",
      "polyline.flowchart-link",
      "path.relationshipLine",
      "line.relationshipLine",
      "polyline.relationshipLine",
      "path.transition",
      "line.transition",
      "polyline.transition",
      "path.transitionLine",
      "line.transitionLine",
      "polyline.transitionLine",
      "path.classRelation",
      "line.classRelation",
      "polyline.classRelation",
      "path.relation",
      "line.relation",
      "polyline.relation",
      "path.edge-pattern-solid",
      "path.edge-pattern-dotted",
      "path.edge-pattern-dashed",
      "path.edge",
      ".mindmap-edges path.edge",
      ".mindmap-edge",
    ].join(", "),
  ).forEach((edge) => {
    edge.classList.add("b-mermaid-edge");
    if ((edge.tagName === "path" || edge.tagName === "polyline") && !edge.getAttribute("fill")) {
      edge.setAttribute("fill", "none");
    }
    if (!edge.getAttribute("stroke") || edge.getAttribute("stroke") === "none") {
      edge.setAttribute("stroke", "#66715e");
    }
    if (!edge.getAttribute("stroke-width")) {
      edge.setAttribute("stroke-width", "1.75");
    }
    edge.setAttribute("stroke-linecap", "round");
    edge.setAttribute("stroke-linejoin", "round");
    edge.setAttribute("vector-effect", "non-scaling-stroke");
  });

  svgElement.querySelectorAll("line.messageLine0, line.messageLine1, path.messageLine0, path.messageLine1, polyline.messageLine0, polyline.messageLine1").forEach((line) => {
    line.classList.add("b-mermaid-edge", "b-mermaid-sequence-message");
    line.setAttribute("fill", "none");
    if (!line.getAttribute("stroke") || line.getAttribute("stroke") === "none") {
      line.setAttribute("stroke", "#66715e");
    }
    if (!line.getAttribute("stroke-width")) {
      line.setAttribute("stroke-width", "1.5");
    }
    if (line.classList.contains("messageLine1") && !line.getAttribute("stroke-dasharray")) {
      line.setAttribute("stroke-dasharray", "2,2");
    }
  });

  svgElement.querySelectorAll("text.actor, text.actor-box").forEach((text) => {
    if (!(text.textContent ?? "").trim()) return;
    text.classList.add("b-mermaid-sequence-actor-label");
    text.setAttribute("fill", "currentColor");
  });

  svgElement.querySelectorAll("marker path, path.arrowheadPath").forEach((path) => {
    path.classList.add("b-mermaid-marker-path");
    if (!path.getAttribute("fill") || path.getAttribute("fill") === "none") {
      path.setAttribute("fill", "#66715e");
    }
    if (!path.getAttribute("stroke") || path.getAttribute("stroke") === "none") {
      path.setAttribute("stroke", "#66715e");
    }
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("vector-effect", "non-scaling-stroke");
  });
}

function normalizeSvgTextNodes(document: Document) {
  Array.from(document.querySelectorAll("text")).forEach((text) => {
    Array.from(text.querySelectorAll("tspan")).forEach((tspan) => {
      if (!(tspan.textContent ?? "").trim()) {
        tspan.remove();
      }
    });

    if (!(text.textContent ?? "").trim() && text.querySelectorAll("tspan").length === 0) {
      text.remove();
    }
  });
}

function inlineSafeSvgStyleRules(document: Document) {
  const styleElements = Array.from(document.querySelectorAll("style"));

  for (const styleElement of styleElements) {
    const rules = parseSafeSvgCssRules(styleElement.textContent ?? "");
    for (const rule of rules) {
      let matches: Element[] = [];
      try {
        matches = Array.from(document.querySelectorAll(rule.selector));
      } catch {
        continue;
      }

      for (const element of matches) {
        for (const [property, value] of rule.declarations) {
          element.setAttribute(property, value);
        }
      }
    }
  }
}

function parseSafeSvgCssRules(css: string) {
  const rules: Array<{ selector: string; declarations: Array<[string, string]> }> = [];
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rulePattern = /([^{}]+)\{([^{}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = rulePattern.exec(withoutComments))) {
    const declarations = parseSafeSvgDeclarations(match[2]);
    if (declarations.length === 0) continue;

    for (const rawSelector of match[1].split(",")) {
      const selector = rawSelector.trim();
      if (isSafeSvgSelector(selector)) {
        rules.push({ selector, declarations });
      }
    }
  }

  return rules;
}

function parseSafeSvgDeclarations(block: string) {
  const declarations: Array<[string, string]> = [];
  for (const declaration of splitCssDeclarations(block)) {
    const separatorIndex = declaration.indexOf(":");
    if (separatorIndex < 1) continue;

    const property = declaration.slice(0, separatorIndex).trim();
    const value = getSafeSvgStyleValue(declaration.slice(separatorIndex + 1));
    if (!allowedSvgStyleProperties.has(property) || !value) continue;
    declarations.push([property, value]);
  }

  return declarations;
}

function isSafeSvgSelector(selector: string) {
  const trimmedSelector = selector.trim();
  if (!trimmedSelector || trimmedSelector.length > 240) return false;
  if (/[\[\]='"`@;{}]|\\/.test(trimmedSelector)) return false;

  const normalizedSelector = trimmedSelector.replace(/:where\(([^()]*)\)/g, (_match, inner: string) => {
    const parts = inner.split(",").map((part) => part.trim()).filter(Boolean);
    return parts.length > 0 && parts.every(isSafeSvgSelectorPart) ? "svg" : "\0";
  });

  if (normalizedSelector.includes("\0") || /[:+~]/.test(normalizedSelector)) return false;

  return normalizedSelector
    .split(/\s*>\s*|\s+/)
    .filter(Boolean)
    .every(isSafeSvgSelectorPart);
}

function isSafeSvgSelectorPart(part: string) {
  return /^(?:\*|[a-zA-Z][\w-]*)(?:(?:[.#][A-Za-z_][\w-]*))*$/.test(part) ||
    /^(?:[.#][A-Za-z_][\w-]*)+$/.test(part);
}

function isAllowedSvgAttribute(name: string, rawValue: string) {
  if (name.startsWith("data-")) return false;
  if (name.toLowerCase().startsWith("on")) return false;
  if (name === "style") return false;
  if (!allowedSvgAttributes.has(name)) return false;

  const normalized = normalizeUrlLikeValue(rawValue);
  if (/^(?:javascript|vbscript|data|file|blob):/.test(normalized)) {
    return false;
  }

  if (/\burl\(/i.test(rawValue)) {
    const urlMatches = rawValue.matchAll(/url\(([^)]+)\)/gi);
    for (const match of urlMatches) {
      const reference = match[1].trim().replace(/^['"]|['"]$/g, "");
      if (!/^#[a-zA-Z][\w:.-]*$/.test(reference)) {
        return false;
      }
    }
  }

  if (name === "href" && !/^#[a-zA-Z][\w:.-]*$/.test(rawValue.trim())) {
    return false;
  }

  if (name === "xlink:href" && !/^#[a-zA-Z][\w:.-]*$/.test(rawValue.trim())) {
    return false;
  }

  return true;
}

function mapSafeStyleToAttributes(element: Element) {
  const style = element.getAttribute("style");
  if (!style) return;

  for (const declaration of splitCssDeclarations(style)) {
    const separatorIndex = declaration.indexOf(":");
    if (separatorIndex < 1) continue;

    const property = declaration.slice(0, separatorIndex).trim();
    const value = getSafeSvgStyleValue(declaration.slice(separatorIndex + 1));
    if (!allowedSvgStyleProperties.has(property) || !value) continue;
    element.setAttribute(property, value);
  }

  element.removeAttribute("style");
}

function splitCssDeclarations(block: string) {
  const declarations: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let depth = 0;

  for (let index = 0; index < block.length; index += 1) {
    const char = block[index];
    const previousChar = block[index - 1];

    if ((char === '"' || char === "'") && previousChar !== "\\") {
      quote = quote === char ? null : quote ?? char;
      current += char;
      continue;
    }

    if (!quote) {
      if (char === "(") {
        depth += 1;
      } else if (char === ")") {
        depth = Math.max(0, depth - 1);
      } else if (char === ";" && depth === 0) {
        if (current.trim()) declarations.push(current.trim());
        current = "";
        continue;
      }
    }

    current += char;
  }

  if (current.trim()) declarations.push(current.trim());
  return declarations;
}

function getSafeSvgStyleValue(rawValue: string) {
  const value = rawValue.replace(/\s*!important\s*$/i, "").trim();
  if (!value || /[<>]/.test(value)) return null;
  if (/expression\s*\(/i.test(value)) return null;
  if (/^(?:javascript|vbscript|data|file|blob):/i.test(normalizeUrlLikeValue(value))) return null;

  const urlMatches = value.matchAll(/url\(([^)]+)\)/gi);
  for (const match of urlMatches) {
    const reference = match[1].trim().replace(/^['"]|['"]$/g, "");
    if (!/^#[a-zA-Z][\w:.-]*$/.test(reference)) {
      return null;
    }
  }

  return value;
}

function replaceForeignObjectWithText(element: Element, document: Document) {
  const textSource = element.cloneNode(true) as Element;
  textSource.querySelectorAll("script, style, iframe, object, embed, link, meta, template").forEach((node) => node.remove());
  const textContent = textSource.textContent?.replace(/\s+/g, " ").trim();
  if (!textContent) {
    element.remove();
    return;
  }

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  const x = parseSvgLength(element.getAttribute("x"), 0);
  const y = parseSvgLength(element.getAttribute("y"), 0);
  const width = parseSvgLength(element.getAttribute("width"), 0);
  const height = parseSvgLength(element.getAttribute("height"), 0);
  const lines = wrapSvgText(textContent, Math.max(8, Math.floor(width / 7.2)));
  const lineHeight = 14;
  const startY = y + Math.max(lineHeight, (height - (lines.length - 1) * lineHeight) / 2);

  text.setAttribute("x", String(x + width / 2));
  text.setAttribute("y", String(startY));
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "middle");

  lines.forEach((line, index) => {
    const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    tspan.setAttribute("x", String(x + width / 2));
    if (index > 0) {
      tspan.setAttribute("dy", String(lineHeight));
    }
    tspan.textContent = line;
    text.appendChild(tspan);
  });

  element.replaceWith(text);
}

function wrapSvgText(text: string, maxCharacters: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
      continue;
    }

    if (`${currentLine} ${word}`.length <= maxCharacters) {
      currentLine = `${currentLine} ${word}`;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines.length ? lines.slice(0, 3) : [text.slice(0, maxCharacters)];
}

export function getSvgMetrics(svgElement: Element): SvgMetrics {
  const viewBox = svgElement
    .getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);

  if (viewBox?.length === 4 && viewBox.every((value) => Number.isFinite(value))) {
    return {
      width: Math.max(Math.abs(viewBox[2]), 1),
      height: Math.max(Math.abs(viewBox[3]), 1),
    };
  }

  const width = parseSvgLength(svgElement.getAttribute("width"), 640);
  const height = parseSvgLength(svgElement.getAttribute("height"), 360);
  return { width, height };
}

function parseSvgLength(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
