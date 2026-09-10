import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon, IconButton } from "../components/base";

export type DemoContainerBackground = "surface" | "muted" | "sunken";

export type DemoContainerProps = {
  /** 样例标题 */
  title: string;
  /** 样例说明（可选） */
  description?: string;
  /** 代码片段（可选，渲染在预览区下方） */
  code?: string;
  /** 预览区底色：默认次级面 muted */
  background?: DemoContainerBackground;
  /** 预览内容 */
  children: ReactNode;
};

/**
 * 教程 / 文档通用「样例容器」。
 * 完全由 `--ct-*` 设计令牌驱动，亮 / 暗主题自动适配；
 * 结构：标题区（title + description）→ 预览区 → 可选代码区。
 */
export function DemoContainer({
  background = "muted",
  children,
  code,
  description,
  title,
}: DemoContainerProps) {
  const copyStatusId = useId();
  const titleId = `${copyStatusId}-title`;
  const descriptionId = description ? `${copyStatusId}-description` : undefined;
  const sourceCode = code?.trim();
  const resetTimerRef = useRef<number | undefined>(undefined);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [sourceVisible, setSourceVisible] = useState(true);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  async function copyCode() {
    if (!sourceCode) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sourceCode);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = sourceCode;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.insetInlineStart = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => setCopyState("idle"), 1400);
  }

  return (
    <article className="demo-container" aria-describedby={descriptionId} aria-labelledby={titleId}>
      <header className="demo-container__header">
        <h3 className="demo-container__title" id={titleId}>{title}</h3>
        {description ? (
          <p className="demo-container__description" id={descriptionId}>
            {description}
          </p>
        ) : null}
      </header>
      <div className={`demo-container__preview demo-container__preview--${background}`} aria-label={`${title} 预览`}>
        {children}
      </div>
      {sourceCode ? (
        <div className="demo-container__code-wrap" data-source-visible={sourceVisible ? "true" : "false"}>
          <div className="demo-container__code-header">
            <div className="demo-container__code-meta">
              <span>tsx</span>
              <strong>{sourceVisible ? "Source" : "Source hidden"}</strong>
            </div>
            <div className="demo-container__code-tools c-local-tools" aria-label="Demo source tools">
              <IconButton
                aria-controls={`${copyStatusId}-source`}
                aria-expanded={sourceVisible}
                label={sourceVisible ? "隐藏源码" : "查看源码"}
                onClick={() => setSourceVisible((visible) => !visible)}
                size="sm"
                tooltip={sourceVisible ? "隐藏源码" : "查看源码"}
                tooltipPlacement="top"
              >
                <Icon decorative name="code" />
              </IconButton>
              <IconButton
                aria-describedby={copyStatusId}
                label={copyState === "copied" ? "已复制" : copyState === "error" ? "复制失败" : "复制样例代码"}
                onClick={copyCode}
                size="sm"
                tone={copyState === "copied" ? "success" : copyState === "error" ? "danger" : "neutral"}
                tooltip={copyState === "copied" ? "已复制" : copyState === "error" ? "复制失败" : "复制样例代码"}
                tooltipPlacement="top"
              >
                <Icon decorative name="copy" />
              </IconButton>
            </div>
          </div>
          <span className="c-sr-only" id={copyStatusId} role="status">
            {copyState === "copied" ? "已复制" : copyState === "error" ? "复制失败" : ""}
          </span>
          <pre className="demo-container__code" hidden={!sourceVisible} id={`${copyStatusId}-source`}>
            <code>{sourceCode}</code>
          </pre>
        </div>
      ) : null}
    </article>
  );
}
