import { useId, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

export type CardPadding = "none" | "sm" | "md";
export type CardTone = "default" | "muted";

export interface CardMetaProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "dangerouslySetInnerHTML" | "title"> {
  avatar?: ReactNode;
  description?: ReactNode;
  title?: ReactNode;
}

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "dangerouslySetInnerHTML" | "title"> {
  extra?: ReactNode;
  meta?: ReactNode;
  cover?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  hoverable?: boolean;
  loading?: boolean;
  loadingText?: ReactNode;
  padding?: CardPadding;
  titleId?: string;
  tone?: CardTone;
  dangerouslySetInnerHTML?: never;
}

function hasNode(node: ReactNode) {
  return node !== null && node !== undefined && node !== false && node !== true;
}

function CardMeta({ avatar, className, description, title, ...props }: CardMetaProps) {
  const hasAvatar = hasNode(avatar);
  const hasTitle = hasNode(title);
  const hasDescription = hasNode(description);

  if (!hasAvatar && !hasTitle && !hasDescription) return null;

  return (
    <div className={cx("c-card-meta", className)} {...props}>
      {hasAvatar ? <div className="c-card-meta__avatar">{avatar}</div> : null}
      <div className="c-card-meta__content">
        {hasTitle ? <div className="c-card-meta__title">{title}</div> : null}
        {hasDescription ? <div className="c-card-meta__description">{description}</div> : null}
      </div>
    </div>
  );
}

export function Card({
  actions,
  "aria-busy": ariaBusy,
  "aria-describedby": ariaDescribedBy,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  cover,
  description,
  dangerouslySetInnerHTML: _dangerouslySetInnerHTML,
  extra,
  footer,
  hoverable = false,
  loading = false,
  loadingText = "Loading card content",
  meta,
  padding = "md",
  title,
  titleId,
  tone = "default",
  ...props
}: CardProps) {
  const fallbackId = useId();
  const headingId = titleId ?? `card-title-${fallbackId}`;
  const descriptionId = `card-description-${fallbackId}`;
  const hasTitle = hasNode(title);
  const hasDescription = hasNode(description);
  const hasActions = hasNode(actions);
  const hasCover = hasNode(cover);
  const hasExtra = hasNode(extra);
  const hasFooter = hasNode(footer);
  const hasMeta = hasNode(meta);
  const resolvedLabelledBy = ariaLabelledBy ?? (hasTitle ? headingId : undefined);
  const resolvedDescribedBy = ariaDescribedBy ?? (hasDescription ? descriptionId : undefined);

  return (
    <section
      aria-busy={loading ? true : ariaBusy}
      aria-describedby={resolvedDescribedBy}
      aria-labelledby={resolvedLabelledBy}
      className={cx(
        "c-card",
        `c-card--padding-${padding}`,
        tone !== "default" && `c-card--${tone}`,
        hoverable && "c-card--hoverable",
        loading && "c-card--loading",
        className,
      )}
      {...props}
    >
      {hasCover ? <div className="c-card__cover">{cover}</div> : null}
      {hasTitle || hasDescription || hasExtra || hasActions ? (
        <header className="c-card__header">
          <div className="c-card__heading">
            {hasTitle ? <h3 id={headingId}>{title}</h3> : null}
            {hasDescription ? <p id={descriptionId}>{description}</p> : null}
          </div>
          {hasExtra || hasActions ? (
            <div className="c-card__header-tools">
              {hasExtra ? <div className="c-card__extra">{extra}</div> : null}
              {hasActions ? (
                <div className="c-card__actions" aria-label="Card actions">
                  {actions}
                </div>
              ) : null}
            </div>
          ) : null}
        </header>
      ) : null}
      <div className="c-card__body">
        {loading ? (
          <div className="c-card__loading" role="status" aria-live="polite">
            <span className="c-card__skeleton" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="c-card__loading-text">{loadingText}</span>
          </div>
        ) : (
          <>
            {hasMeta ? <div className="c-card__meta">{meta}</div> : null}
            {children}
          </>
        )}
      </div>
      {hasFooter ? <footer className="c-card__footer">{footer}</footer> : null}
    </section>
  );
}

export namespace Card {
  export const Meta = CardMeta;
}
