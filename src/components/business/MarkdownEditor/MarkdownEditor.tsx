import type { CSSProperties, ChangeEvent } from "react";
import { useEffect, useId, useMemo, useState } from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import type { MarkdownBlock } from "../../../utils/markdown";
import { renderMarkdownToSafeHtml, splitMarkdownBlocks } from "../../../utils/markdown";
import { UI_RENDER_BUDGETS } from "../../../utils/performance";
import { MermaidSvgViewer } from "./MermaidSvgViewer";
import "./MarkdownEditor.css";

export type MarkdownEditorMode = "edit" | "preview" | "split";

export interface MarkdownEditorProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  mode?: MarkdownEditorMode;
  defaultMode?: MarkdownEditorMode;
  onModeChange?: (mode: MarkdownEditorMode) => void;
  className?: string;
  editorLabel?: string;
  maxMermaidSourceLength?: number;
  mermaidTitle?: string;
  minHeight?: number | string;
  placeholder?: string;
  previewLabel?: string;
  title?: string;
}

export function MarkdownEditor({
  className,
  editorLabel = "Editor",
  maxMermaidSourceLength,
  mermaidTitle = "Mermaid SVG",
  minHeight,
  value,
  defaultValue,
  onChange,
  mode,
  defaultMode = "split",
  onModeChange,
  placeholder = "Write Markdown here...",
  previewLabel = "Preview",
  title = "Markdown Editor",
}: MarkdownEditorProps) {
  const editorId = useId();
  const previewId = useId();
  const [editorValue, setEditorValue] = useControllableState({
    value,
    defaultValue,
    fallbackValue: "",
    onChange,
  });
  const [viewMode, setViewMode] = useControllableState<MarkdownEditorMode>({
    value: mode,
    defaultValue: defaultMode,
    fallbackValue: "split",
    onChange: onModeChange,
  });
  const safeViewMode = isMarkdownEditorMode(viewMode) ? viewMode : "split";
  const [hasFocus, setHasFocus] = useState(false);
  const [deferredValue, setDeferredValue] = useState(editorValue);
  useEffect(() => {
    const updatePreview = () => setDeferredValue(editorValue);
    const timeoutId = window.setTimeout(updatePreview, editorValue.length > 10000 ? 180 : 48);
    return () => window.clearTimeout(timeoutId);
  }, [editorValue]);
  const blocks = useMemo(
    () =>
      splitMarkdownBlocks(deferredValue, {
        maxMermaidBlocks: UI_RENDER_BUDGETS.mermaidBlocks,
        maxSourceLength: UI_RENDER_BUDGETS.markdownSourceCharacters,
      }),
    [deferredValue],
  );
  const mermaidCount = blocks.filter((block) => block.type === "mermaid").length;
  const isReadonlyControlled = value !== undefined && !onChange;

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setEditorValue(event.target.value);
  };

  const workspaceStyle = minHeight ? ({ minHeight } satisfies CSSProperties) : undefined;

  return (
    <section className={cx("b-markdown-editor", className)} aria-label={title}>
      <header className="b-markdown-editor__toolbar">
        <div className="b-markdown-editor__title">
          <span>{title}</span>
          <span>{mermaidCount} Mermaid SVG</span>
        </div>
        <div className="b-markdown-editor__modes" role="tablist" aria-label="Markdown editor mode">
          {(["edit", "split", "preview"] as const).map((nextMode) => (
            <button
              key={nextMode}
              type="button"
              role="tab"
              aria-controls={nextMode === "edit" ? editorId : previewId}
              aria-selected={safeViewMode === nextMode}
              onClick={() => setViewMode(nextMode)}
            >
              {getModeLabel(nextMode)}
            </button>
          ))}
        </div>
      </header>

      <div
        className={cx(
          "b-markdown-editor__workspace",
          `b-markdown-editor__workspace--${safeViewMode}`,
          hasFocus && "b-markdown-editor__workspace--focus",
        )}
        style={workspaceStyle}
      >
        {safeViewMode !== "preview" ? (
          <label className="b-markdown-editor__pane b-markdown-editor__pane--editor" role="tabpanel">
            <span className="b-markdown-editor__pane-label">{editorLabel}</span>
            <textarea
              id={editorId}
              value={editorValue}
              placeholder={placeholder}
              onChange={handleChange}
              onFocus={() => setHasFocus(true)}
              onBlur={() => setHasFocus(false)}
              readOnly={isReadonlyControlled}
              spellCheck={false}
              aria-label={editorLabel}
            />
          </label>
        ) : null}

        {safeViewMode !== "edit" ? (
          <article
            aria-label="Markdown preview"
            className="b-markdown-editor__pane b-markdown-editor__pane--preview"
            id={previewId}
            role="tabpanel"
          >
            <span className="b-markdown-editor__pane-label">{previewLabel}</span>
            <MarkdownPreview blocks={blocks} maxMermaidSourceLength={maxMermaidSourceLength} mermaidTitle={mermaidTitle} />
          </article>
        ) : null}
      </div>
    </section>
  );
}

function MarkdownPreview({
  blocks,
  maxMermaidSourceLength,
  mermaidTitle,
}: {
  blocks: MarkdownBlock[];
  maxMermaidSourceLength?: number;
  mermaidTitle: string;
}) {
  return (
    <div className="b-markdown-preview">
      {blocks.map((block) =>
        block.type === "mermaid" ? (
          <MermaidSvgViewer
            key={block.id}
            maxSourceLength={maxMermaidSourceLength}
            source={block.content}
            title={mermaidTitle}
          />
        ) : (
          <MarkdownHtml key={block.id} source={block.content} />
        ),
      )}
    </div>
  );
}

function MarkdownHtml({ source }: { source: string }) {
  const html = useMemo(() => renderMarkdownToSafeHtml(source), [source]);

  if (!source.trim()) {
    return null;
  }

  return <div className="b-markdown-preview__html" dangerouslySetInnerHTML={{ __html: html }} />;
}

function getModeLabel(mode: MarkdownEditorMode) {
  if (mode === "edit") return "Edit";
  if (mode === "preview") return "Preview";
  return "Split";
}

function isMarkdownEditorMode(mode: unknown): mode is MarkdownEditorMode {
  return mode === "edit" || mode === "preview" || mode === "split";
}
