import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { HTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { Icon } from "../../base/Icon/Icon";
import { IconButton } from "../../base/IconButton/IconButton";
import { cx } from "../../../utils/cx";
import "./CodeBlock.css";

type CopyState = "idle" | "copied" | "error";
type CodeTokenTone = "comment" | "keyword" | "string" | "number" | "operator" | "punctuation";
type CodeToken = {
  text: string;
  tone?: CodeTokenTone;
};

const HIGHLIGHT_MAX_CHARACTERS = 20_000;
const HIGHLIGHT_MAX_LINES = 500;
const KEYWORDS_BY_LANGUAGE: Record<string, Set<string>> = {
  js: new Set(["async", "await", "break", "case", "catch", "class", "const", "continue", "default", "do", "else", "export", "extends", "finally", "for", "from", "function", "if", "import", "in", "let", "new", "of", "return", "switch", "throw", "try", "typeof", "var", "while"]),
  jsx: new Set(["async", "await", "break", "case", "catch", "class", "const", "continue", "default", "do", "else", "export", "extends", "finally", "for", "from", "function", "if", "import", "in", "let", "new", "of", "return", "switch", "throw", "try", "typeof", "var", "while"]),
  ts: new Set(["as", "async", "await", "break", "case", "catch", "class", "const", "continue", "default", "do", "else", "export", "extends", "finally", "for", "from", "function", "if", "import", "in", "interface", "let", "new", "of", "return", "satisfies", "switch", "throw", "try", "type", "typeof", "var", "while"]),
  tsx: new Set(["as", "async", "await", "break", "case", "catch", "class", "const", "continue", "default", "do", "else", "export", "extends", "finally", "for", "from", "function", "if", "import", "in", "interface", "let", "new", "of", "return", "satisfies", "switch", "throw", "try", "type", "typeof", "var", "while"]),
  sh: new Set(["case", "do", "done", "elif", "else", "esac", "fi", "for", "function", "if", "in", "then", "while"]),
  bash: new Set(["case", "do", "done", "elif", "else", "esac", "fi", "for", "function", "if", "in", "then", "while"]),
};

const JS_LIKE_LANGUAGES = new Set(["javascript", "js", "jsx", "typescript", "ts", "tsx"]);
const SHELL_LANGUAGES = new Set(["bash", "sh", "shell", "zsh"]);

export interface CodeBlockProps extends Omit<HTMLAttributes<HTMLElement>, "dangerouslySetInnerHTML" | "onCopy" | "title"> {
  code: string;
  language?: string;
  title?: ReactNode;
  description?: ReactNode;
  copyLabel?: string;
  copiedLabel?: string;
  copyErrorLabel?: string;
  loadingLabel?: ReactNode;
  loading?: boolean;
  error?: ReactNode;
  empty?: ReactNode;
  showLineNumbers?: boolean;
  wrap?: boolean;
  dangerouslySetInnerHTML?: never;
  onCopy?: (code: string) => void;
  onCopyError?: (error: unknown) => void;
}

function normalizeLanguage(language: string) {
  return language.trim().toLowerCase().replace(/[^a-z0-9_+-]/g, "-").replace(/-+/g, "-") || "text";
}

function getKeywordLanguage(language: string) {
  if (language === "javascript") return "js";
  if (language === "typescript") return "ts";
  if (language === "shell" || language === "zsh") return "bash";
  return language;
}

function tokenizeCodeLine(line: string, language: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  const keywords = KEYWORDS_BY_LANGUAGE[getKeywordLanguage(language)];
  const jsLike = JS_LIKE_LANGUAGES.has(language);
  const shellLike = SHELL_LANGUAGES.has(language);
  const jsonLike = language === "json";
  const htmlLike = language === "html" || language === "xml" || language === "svg";
  const pattern = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/.*|#.*|\/\*.*?\*\/|<\/?[a-zA-Z][^>\s/]*|[a-zA-Z_$][\w$-]*|-?\d+(?:\.\d+)?|[{}[\]().,;:<>/=+*!|&?-])/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line))) {
    const text = match[0];
    if (match.index > cursor) {
      tokens.push({ text: line.slice(cursor, match.index) });
    }

    let tone: CodeTokenTone | undefined;
    if ((jsLike && (text.startsWith("//") || text.startsWith("/*"))) || (shellLike && text.startsWith("#"))) {
      tone = "comment";
    } else if (text.startsWith("\"") || text.startsWith("'") || text.startsWith("`")) {
      tone = "string";
    } else if (/^-?\d/.test(text)) {
      tone = "number";
    } else if (keywords?.has(text) || (jsonLike && ["true", "false", "null"].includes(text))) {
      tone = "keyword";
    } else if (htmlLike && text.startsWith("<")) {
      tone = "keyword";
    } else if (/^[{}[\]().,;:]$/.test(text)) {
      tone = "punctuation";
    } else if (/^[<>/=+*!|&?-]$/.test(text)) {
      tone = "operator";
    }

    tokens.push({ text, tone });
    cursor = match.index + text.length;
  }

  if (cursor < line.length) {
    tokens.push({ text: line.slice(cursor) });
  }

  return tokens.length ? tokens : [{ text: line }];
}

function renderTokens(tokens: CodeToken[], keyPrefix: string) {
  return tokens.map((token, index) =>
    token.tone ? (
      <span className={`b-code-block__token b-code-block__token--${token.tone}`} key={`${keyPrefix}-${index}`}>
        {token.text}
      </span>
    ) : (
      token.text
    ),
  );
}

function writeWithTextareaFallback(code: string) {
  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = code;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");
  textarea.tabIndex = -1;
  textarea.style.position = "fixed";
  textarea.style.insetBlockStart = "0";
  textarea.style.insetInlineStart = "-9999px";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

async function copyText(code: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(code);
    return;
  }

  if (!writeWithTextareaFallback(code)) {
    throw new Error("Copy command unavailable");
  }
}

export function CodeBlock({
  className,
  code,
  copiedLabel = "Copied",
  copyErrorLabel = "Copy failed",
  copyLabel = "Copy",
  dangerouslySetInnerHTML: _dangerouslySetInnerHTML,
  description,
  empty = "No code",
  error,
  language = "text",
  loading = false,
  loadingLabel = "Loading code...",
  onCopy,
  onCopyError,
  showLineNumbers = false,
  title,
  wrap = false,
  ...props
}: CodeBlockProps) {
  const copyStatusId = useId();
  const resetTimerRef = useRef<number | undefined>(undefined);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [wrapEnabled, setWrapEnabled] = useState(wrap);
  const hasCode = code.trim().length > 0;
  const normalizedLanguage = normalizeLanguage(language);
  const highlighted = code.length <= HIGHLIGHT_MAX_CHARACTERS;
  const lines = useMemo(() => code.replace(/\n$/, "").split("\n"), [code]);
  const canHighlight = highlighted && lines.length <= HIGHLIGHT_MAX_LINES;
  const copyIdleLabel = copyLabel === "Copy" ? "复制代码" : copyLabel;
  const highlightedLines = useMemo(
    () => (canHighlight ? lines.map((line) => tokenizeCodeLine(line, normalizedLanguage)) : []),
    [canHighlight, lines, normalizedLanguage],
  );

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setWrapEnabled(wrap);
  }, [wrap]);

  function resetCopyState(nextState: CopyState, delay: number) {
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }

    setCopyState(nextState);
    resetTimerRef.current = window.setTimeout(() => setCopyState("idle"), delay);
  }

  async function copyCode() {
    if (!hasCode || loading || error) return;

    try {
      await copyText(code);
      onCopy?.(code);
      resetCopyState("copied", 1400);
    } catch (copyError) {
      onCopyError?.(copyError);
      resetCopyState("error", 1800);
    }
  }

  function handleCopyKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    void copyCode();
  }

  return (
    <section
      className={cx("b-code-block", wrapEnabled && "b-code-block--wrap", showLineNumbers && "b-code-block--numbered", className)}
      aria-busy={loading || undefined}
      {...props}
    >
      <header className="b-code-block__header">
        <div>
          {title ? <h2>{title}</h2> : null}
          {description ? <p>{description}</p> : null}
          <span className="b-code-block__language">{normalizedLanguage}</span>
        </div>
        <div className="b-code-block__header-tools c-local-tools" aria-label="Code block tools">
          <IconButton
            aria-describedby={copyStatusId}
            disabled={!hasCode || loading || Boolean(error)}
            label={copyState === "copied" ? copiedLabel : copyState === "error" ? copyErrorLabel : copyIdleLabel}
            onClick={copyCode}
            onKeyDown={handleCopyKeyDown}
            size="sm"
            tone={copyState === "copied" ? "success" : copyState === "error" ? "danger" : "neutral"}
            tooltip={copyState === "copied" ? copiedLabel : copyState === "error" ? copyErrorLabel : copyIdleLabel}
            tooltipPlacement="top"
          >
            <Icon decorative name="copy" />
          </IconButton>
          <IconButton
            aria-pressed={wrapEnabled}
            disabled={!hasCode || loading || Boolean(error)}
            label={wrapEnabled ? "关闭换行" : "切换换行"}
            onClick={() => setWrapEnabled((current) => !current)}
            size="sm"
            tooltip={wrapEnabled ? "关闭换行" : "切换换行"}
            tooltipPlacement="top"
          >
            <Icon decorative name="wrap-text" />
          </IconButton>
        </div>
      </header>
      <span className="c-sr-only" id={copyStatusId} role="status">
        {copyState === "copied" ? copiedLabel : copyState === "error" ? copyErrorLabel : ""}
      </span>

      {loading ? (
        <div className="b-code-block__loading" role="status">{loadingLabel}</div>
      ) : error ? (
        <div className="b-business-state b-business-state--error" role="alert">{error}</div>
      ) : hasCode ? (
        <pre aria-label="Code block content" className="b-code-block__pre" data-wrap={wrapEnabled ? "true" : "false"} tabIndex={0}>
          <code className={`language-${normalizedLanguage}`} data-highlighted={canHighlight ? "true" : "false"}>
            {showLineNumbers
              ? lines.map((line, index) => (
                  <span className="b-code-block__line" key={index}>
                    <span className="b-code-block__line-number" aria-hidden="true">{index + 1}</span>
                    <span className="b-code-block__line-code">
                      {canHighlight ? renderTokens(highlightedLines[index] ?? [{ text: line }], `line-${index}`) : line || " "}
                    </span>
                  </span>
                ))
              : canHighlight
                ? renderTokens(tokenizeCodeLine(code, normalizedLanguage), "block")
                : code}
          </code>
        </pre>
      ) : (
        <div className="b-business-state" role="status">{empty}</div>
      )}
    </section>
  );
}

export const CopyBlock = CodeBlock;
