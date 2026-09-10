import {
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type BlockquoteHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type Ref,
  type ReactNode,
  type CSSProperties,
} from "react";
import { cx } from "../../../utils/cx";
import { getSafeHref, getSafeLinkRel } from "../../../utils/url";
import "./style.css";

export type TypographyTone = "default" | "secondary" | "muted" | "success" | "warning" | "danger";
export type TypographySize = "sm" | "md" | "lg";
export type TypographyWeight = "regular" | "medium" | "strong";
export type TypographyTitleLevel = 1 | 2 | 3 | 4 | 5;
export type TypographyEllipsis = boolean | { rows?: number; expandable?: boolean; symbol?: ReactNode };
export type TypographyCopyable =
  | boolean
  | {
      text?: string;
      label?: string;
      copiedLabel?: string;
      timeout?: number;
      onCopy?: (copied: boolean) => void;
    };

type CopyState = "idle" | "copied" | "failed";

type TypographyBaseProps = {
  children?: ReactNode;
  copyable?: TypographyCopyable;
  ellipsis?: TypographyEllipsis;
  mobileWrap?: "normal" | "anywhere" | "nowrap";
  tone?: TypographyTone;
  weight?: TypographyWeight;
};

export interface TypographyProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  compact?: boolean;
}

export interface TypographyTextProps
  extends TypographyBaseProps,
    Omit<HTMLAttributes<HTMLSpanElement>, "dangerouslySetInnerHTML"> {
  code?: boolean;
  delete?: boolean;
  keyboard?: boolean;
  mark?: boolean;
  size?: TypographySize;
  strong?: boolean;
  underline?: boolean;
}

export interface TypographyLinkProps
  extends TypographyBaseProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "dangerouslySetInnerHTML"> {
  dangerouslySetInnerHTML?: never;
  size?: TypographySize;
}

export interface TypographyTitleProps
  extends TypographyBaseProps,
    Omit<HTMLAttributes<HTMLHeadingElement>, "dangerouslySetInnerHTML"> {
  level?: TypographyTitleLevel;
  visualLevel?: TypographyTitleLevel;
}

export interface TypographyParagraphProps
  extends TypographyBaseProps,
    Omit<HTMLAttributes<HTMLParagraphElement>, "dangerouslySetInnerHTML"> {
  lead?: boolean;
  size?: TypographySize;
}

export interface TypographyCodeProps
  extends TypographyBaseProps,
    Omit<HTMLAttributes<HTMLElement>, "dangerouslySetInnerHTML"> {
  inline?: true;
}

export interface TypographyKeyboardProps
  extends Omit<HTMLAttributes<HTMLElement>, "dangerouslySetInnerHTML"> {
  children: ReactNode;
}

export interface TypographyQuoteProps extends BlockquoteHTMLAttributes<HTMLQuoteElement> {
  children: ReactNode;
  citeLabel?: ReactNode;
}

function getTextFromChildren(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map(getTextFromChildren).join("");
  }

  if (isValidElement(children)) {
    return getTextFromChildren((children.props as { children?: ReactNode }).children);
  }

  return "";
}

function normalizeEllipsis(ellipsis?: TypographyEllipsis) {
  if (!ellipsis) {
    return undefined;
  }

  if (ellipsis === true) {
    return { rows: 1, expandable: false, symbol: "More" };
  }

  return {
    rows: Math.max(1, ellipsis.rows ?? 1),
    expandable: Boolean(ellipsis.expandable),
    symbol: ellipsis.symbol ?? "More",
  };
}

function normalizeCopyable(copyable: TypographyCopyable | undefined, fallbackText: string) {
  if (!copyable) {
    return undefined;
  }

  if (copyable === true) {
    return {
      text: fallbackText,
      label: "Copy",
      copiedLabel: "Copied",
      timeout: 1600,
      onCopy: undefined,
    };
  }

  return {
    text: copyable.text ?? fallbackText,
    label: copyable.label ?? "Copy",
    copiedLabel: copyable.copiedLabel ?? "Copied",
    timeout: copyable.timeout ?? 1600,
    onCopy: copyable.onCopy,
  };
}

async function writeClipboardSafely(text: string) {
  if (!text) {
    return false;
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.insetInlineStart = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

function CopyButton({
  className,
  config,
  text,
}: {
  className?: string;
  config: NonNullable<ReturnType<typeof normalizeCopyable>>;
  text: string;
}) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const timeoutRef = useRef<number | undefined>(undefined);
  const statusId = useId();
  const currentLabel = copyState === "copied" ? config.copiedLabel : copyState === "failed" ? "Copy failed" : config.label;

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== undefined) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current);
    }

    try {
      const copied = await writeClipboardSafely(text);
      setCopyState(copied ? "copied" : "failed");
      config.onCopy?.(copied);
    } catch {
      setCopyState("failed");
      config.onCopy?.(false);
    }

    timeoutRef.current = window.setTimeout(() => setCopyState("idle"), config.timeout);
  };

  return (
    <>
      <button
        aria-describedby={statusId}
        aria-label={currentLabel}
        className={cx("c-typography__copy", className)}
        data-copy-state={copyState}
        type="button"
        onClick={handleCopy}
      >
        <span aria-hidden="true">{copyState === "copied" ? "✓" : "copy"}</span>
      </button>
      <span className="c-typography__copy-status c-sr-only" id={statusId} role="status">
        {copyState === "idle" ? "" : currentLabel}
      </span>
    </>
  );
}

function ExpandButton({
  expanded,
  onToggle,
  symbol,
}: {
  expanded: boolean;
  onToggle: () => void;
  symbol: ReactNode;
}) {
  return (
    <button className="c-typography__expand" type="button" aria-expanded={expanded} onClick={onToggle}>
      {expanded ? "Less" : symbol}
    </button>
  );
}

function useTypographyAffordances({
  children,
  copyable,
  ellipsis,
}: {
  children: ReactNode;
  copyable?: TypographyCopyable;
  ellipsis?: TypographyEllipsis;
}) {
  const fallbackText = useMemo(() => getTextFromChildren(children), [children]);
  const copyConfig = useMemo(() => normalizeCopyable(copyable, fallbackText), [copyable, fallbackText]);
  const ellipsisConfig = useMemo(() => normalizeEllipsis(ellipsis), [ellipsis]);
  const [expanded, setExpanded] = useState(false);

  return {
    copyConfig,
    copyText: copyConfig?.text ?? "",
    ellipsisConfig,
    expanded,
    setExpanded,
  };
}

function handleExpandableKeyDown(event: KeyboardEvent<HTMLElement>, onToggle: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onToggle();
  }
}

export function Typography({ children, className, compact = false, ...props }: TypographyProps) {
  return (
    <div className={cx("c-typography", compact && "c-typography--compact", className)} {...props}>
      {children}
    </div>
  );
}

export const Text = forwardRef<HTMLElement, TypographyTextProps>(function Text(
  {
    children,
    className,
    code = false,
    copyable,
    delete: deleted = false,
    ellipsis,
    keyboard = false,
    mark = false,
    mobileWrap = "normal",
    size = "md",
    strong = false,
    tone = "default",
    underline = false,
    weight = strong ? "strong" : "regular",
    ...props
  },
  ref,
) {
  const { copyConfig, copyText, ellipsisConfig, expanded, setExpanded } = useTypographyAffordances({
    children,
    copyable,
    ellipsis,
  });
  const Element: "code" | "del" | "kbd" | "mark" | "span" = code ? "code" : keyboard ? "kbd" : deleted ? "del" : mark ? "mark" : "span";
  const content = (
    <Element
      {...props}
      className={cx(
        "c-typography-text",
        "c-typography__text",
        `c-typography__text--${size}`,
        `c-typography--tone-${tone}`,
        `c-typography--weight-${weight}`,
        `c-typography--wrap-${mobileWrap}`,
        underline && "c-typography--underline",
        ellipsisConfig && !expanded && "c-typography--ellipsis",
        ellipsisConfig && !expanded && ellipsisConfig.rows > 1 && "c-typography--ellipsis-multiline",
        code && "c-typography__code",
        keyboard && "c-typography__keyboard",
        className,
      )}
      ref={ref as Ref<never>}
      style={{
        ...(props.style ?? {}),
        ...(ellipsisConfig && !expanded && ellipsisConfig.rows > 1
          ? ({ "--typography-ellipsis-lines": ellipsisConfig.rows } as CSSProperties)
          : undefined),
      }}
      tabIndex={ellipsisConfig?.expandable ? (props.tabIndex ?? 0) : props.tabIndex}
      onKeyDown={(event) => {
        props.onKeyDown?.(event);
        if (!event.defaultPrevented && ellipsisConfig?.expandable) {
          handleExpandableKeyDown(event, () => setExpanded(!expanded));
        }
      }}
    >
      {children}
    </Element>
  );

  if (!copyConfig && !ellipsisConfig?.expandable) {
    return content;
  }

  return (
    <span className="c-typography__affordance">
      {content}
      {ellipsisConfig?.expandable ? (
        <ExpandButton expanded={expanded} symbol={ellipsisConfig.symbol} onToggle={() => setExpanded(!expanded)} />
      ) : null}
      {copyConfig ? <CopyButton config={copyConfig} text={copyText} /> : null}
    </span>
  );
});

export const Link = forwardRef<HTMLAnchorElement, TypographyLinkProps>(function Link(
  {
    children,
    className,
    copyable,
    dangerouslySetInnerHTML: _dangerouslySetInnerHTML,
    ellipsis,
    href,
    mobileWrap = "normal",
    rel,
    size = "md",
    target,
    tone = "default",
    weight = "regular",
    ...props
  },
  ref,
) {
  const { copyConfig, copyText, ellipsisConfig, expanded, setExpanded } = useTypographyAffordances({
    children,
    copyable,
    ellipsis,
  });
  const safeHref = getSafeHref(href);
  const safeRel = getSafeLinkRel(rel, target);
  const content = (
    <a
      className={cx(
        "c-typography-link",
        "c-typography__link",
        `c-typography__text--${size}`,
        `c-typography--tone-${tone}`,
        `c-typography--weight-${weight}`,
        `c-typography--wrap-${mobileWrap}`,
        ellipsisConfig && !expanded && "c-typography--ellipsis",
        className,
      )}
      href={safeHref}
      rel={safeRel}
      ref={ref}
      target={target}
      {...props}
    >
      {children}
    </a>
  );

  if (!copyConfig && !ellipsisConfig?.expandable) {
    return content;
  }

  return (
    <span className="c-typography__affordance">
      {content}
      {ellipsisConfig?.expandable ? (
        <ExpandButton expanded={expanded} symbol={ellipsisConfig.symbol} onToggle={() => setExpanded(!expanded)} />
      ) : null}
      {copyConfig ? <CopyButton config={copyConfig} text={copyText} /> : null}
    </span>
  );
});

export const Title = forwardRef<HTMLHeadingElement, TypographyTitleProps>(function Title(
  {
    children,
    className,
    copyable,
    ellipsis,
    level = 2,
    mobileWrap = "anywhere",
    tone = "default",
    visualLevel,
    weight = "strong",
    ...props
  },
  ref,
) {
  const { copyConfig, copyText, ellipsisConfig, expanded, setExpanded } = useTypographyAffordances({
    children,
    copyable,
    ellipsis,
  });
  const Heading = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5";
  const rendered = (
    <Heading
      className={cx(
        "c-typography-title",
        "c-typography__title",
        `c-typography__title--${visualLevel ?? level}`,
        `c-typography--tone-${tone}`,
        `c-typography--weight-${weight}`,
        `c-typography--wrap-${mobileWrap}`,
        ellipsisConfig && !expanded && "c-typography--ellipsis",
        className,
      )}
      ref={ref}
      {...props}
    >
      {children}
    </Heading>
  );

  if (!copyConfig && !ellipsisConfig?.expandable) {
    return rendered;
  }

  return (
    <div className="c-typography__affordance c-typography__affordance--block">
      {rendered}
      {ellipsisConfig?.expandable ? (
        <ExpandButton expanded={expanded} symbol={ellipsisConfig.symbol} onToggle={() => setExpanded(!expanded)} />
      ) : null}
      {copyConfig ? <CopyButton config={copyConfig} text={copyText} /> : null}
    </div>
  );
});

export const Paragraph = forwardRef<HTMLParagraphElement, TypographyParagraphProps>(function Paragraph(
  {
    children,
    className,
    copyable,
    ellipsis,
    lead = false,
    mobileWrap = "normal",
    size = "md",
    tone = "default",
    weight = "regular",
    ...props
  },
  ref,
) {
  const { copyConfig, copyText, ellipsisConfig, expanded, setExpanded } = useTypographyAffordances({
    children,
    copyable,
    ellipsis,
  });
  const paragraph = (
    <p
      {...props}
      className={cx(
        "c-typography-paragraph",
        "c-typography__paragraph",
        `c-typography__text--${size}`,
        `c-typography--tone-${tone}`,
        `c-typography--weight-${weight}`,
        `c-typography--wrap-${mobileWrap}`,
        lead && "c-typography__paragraph--lead",
        ellipsisConfig && !expanded && "c-typography--ellipsis",
        ellipsisConfig && !expanded && ellipsisConfig.rows > 1 && "c-typography--ellipsis-multiline",
        className,
      )}
      ref={ref}
      style={{
        ...(props.style ?? {}),
        ...(ellipsisConfig && !expanded && ellipsisConfig.rows > 1
          ? ({ "--typography-ellipsis-lines": ellipsisConfig.rows } as CSSProperties)
          : undefined),
      }}
    >
      {children}
    </p>
  );

  if (!copyConfig && !ellipsisConfig?.expandable) {
    return paragraph;
  }

  return (
    <div className="c-typography__affordance c-typography__affordance--block">
      {paragraph}
      {ellipsisConfig?.expandable ? (
        <ExpandButton expanded={expanded} symbol={ellipsisConfig.symbol} onToggle={() => setExpanded(!expanded)} />
      ) : null}
      {copyConfig ? <CopyButton config={copyConfig} text={copyText} /> : null}
    </div>
  );
});

export const Code = forwardRef<HTMLElement, TypographyCodeProps>(function Code(
  { children, className, copyable, ellipsis, mobileWrap = "anywhere", tone = "default", weight = "regular", ...props },
  ref,
) {
  const { copyConfig, copyText, ellipsisConfig, expanded, setExpanded } = useTypographyAffordances({ children, copyable, ellipsis });
  const classNames = cx(
    "c-typography-code",
    "c-typography__code",
    `c-typography--tone-${tone}`,
    `c-typography--weight-${weight}`,
    `c-typography--wrap-${mobileWrap}`,
    ellipsisConfig && !expanded && "c-typography--ellipsis",
    className,
  );

  const content = (
    <code className={classNames} ref={ref} {...props}>
      {children}
    </code>
  );

  if (!copyConfig && !ellipsisConfig?.expandable) {
    return content;
  }

  return (
    <span className="c-typography__affordance">
      {content}
      {ellipsisConfig?.expandable ? (
        <ExpandButton expanded={expanded} symbol={ellipsisConfig.symbol} onToggle={() => setExpanded(!expanded)} />
      ) : null}
      {copyConfig ? <CopyButton config={copyConfig} text={copyText} /> : null}
    </span>
  );
});

export const Keyboard = forwardRef<HTMLElement, TypographyKeyboardProps>(function Keyboard({ children, className, ...props }, ref) {
  return (
    <kbd className={cx("c-typography-keyboard", "c-typography__keyboard", className)} ref={ref} {...props}>
      {children}
    </kbd>
  );
});

export function Quote({ children, citeLabel, className, cite, ...props }: TypographyQuoteProps) {
  return (
    <blockquote className={cx("c-typography__quote", className)} cite={cite} {...props}>
      <div>{children}</div>
      {citeLabel ? <footer>{citeLabel}</footer> : null}
    </blockquote>
  );
}
