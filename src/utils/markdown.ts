import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";
import { UI_RENDER_BUDGETS, clampRenderLimit } from "./performance";
import { isSafeHref } from "./url";

export type MarkdownBlock =
  | { id: string; type: "markdown"; content: string }
  | { id: string; type: "mermaid"; content: string };

const markdownRenderer = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: true,
  typographer: true,
});

const defaultValidateLink = markdownRenderer.validateLink;

markdownRenderer.validateLink = (url) => {
  return isSafeHref(url) && defaultValidateLink(url);
};

export function splitMarkdownBlocks(
  source: string,
  options: {
    maxBlocks?: number;
    maxMermaidBlocks?: number;
    maxSourceLength?: number;
  } = {},
): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const maxBlocks = clampRenderLimit(options.maxBlocks, UI_RENDER_BUDGETS.markdownBlocks);
  const maxMermaidBlocks = clampRenderLimit(options.maxMermaidBlocks, UI_RENDER_BUDGETS.mermaidBlocks);
  const maxSourceLength = clampRenderLimit(options.maxSourceLength, UI_RENDER_BUDGETS.markdownSourceCharacters, 1000, 300000);
  const sourceWasTruncated = source.length > maxSourceLength;
  const boundedSource = sourceWasTruncated ? source.slice(0, maxSourceLength) : source;
  const fencePattern = /(^|\n)([ \t]*```(?:mermaid|mmd)[^\n]*\n([\s\S]*?)\n[ \t]*```[ \t]*(?=\n|$))/gi;
  let cursor = 0;
  let match: RegExpExecArray | null;
  let blockIndex = 0;
  let mermaidBlockCount = 0;

  while (blocks.length < maxBlocks && (match = fencePattern.exec(boundedSource))) {
    const blockStart = match.index + match[1].length;
    const blockEnd = match.index + match[0].length;

    if (blockStart > cursor && blocks.length < maxBlocks) {
      blocks.push({
        id: `markdown-${blockIndex}`,
        type: "markdown",
        content: boundedSource.slice(cursor, blockStart),
      });
      blockIndex += 1;
    }

    if (blocks.length < maxBlocks && mermaidBlockCount < maxMermaidBlocks) {
      blocks.push({
        id: `mermaid-${blockIndex}`,
        type: "mermaid",
        content: match[3].trim(),
      });
      blockIndex += 1;
      mermaidBlockCount += 1;
    }
    cursor = blockEnd;
  }

  if (blocks.length < maxBlocks && cursor < boundedSource.length) {
    blocks.push({
      id: `markdown-${blockIndex}`,
      type: "markdown",
      content: boundedSource.slice(cursor),
    });
  }

  if (sourceWasTruncated || blocks.length >= maxBlocks) {
    const noticeBlock: MarkdownBlock = {
      id: "markdown-performance-cap",
      type: "markdown",
      content: "\n\n> Preview truncated for performance. Continue editing in the source pane.\n",
    };
    if (blocks.length >= maxBlocks) {
      blocks[blocks.length - 1] = noticeBlock;
    } else {
      blocks.push(noticeBlock);
    }
  }

  return blocks.length ? blocks : [{ id: "markdown-empty", type: "markdown", content: "" }];
}

export function renderMarkdownToSafeHtml(source: string) {
  const maxLength = UI_RENDER_BUDGETS.markdownHtmlBlockCharacters;
  const boundedSource =
    source.length > maxLength
      ? `${source.slice(0, maxLength)}\n\n> Section preview truncated for performance.\n`
      : source;

  return DOMPurify.sanitize(markdownRenderer.render(boundedSource), {
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[#/]|\.{1,2}\/|[^a-z])/i,
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onmouseenter", "style"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "svg", "math"],
  });
}
