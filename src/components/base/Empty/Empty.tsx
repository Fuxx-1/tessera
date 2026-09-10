import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

export interface EmptyProps extends Omit<HTMLAttributes<HTMLDivElement>, "dangerouslySetInnerHTML" | "title"> {
  action?: ReactNode;
  description?: ReactNode;
  image?: ReactNode;
  imageDescription?: string;
  size?: "sm" | "md";
  status?: "empty" | "search" | "error";
  title?: ReactNode;
}

type EmptyStatus = NonNullable<EmptyProps["status"]>;

type InternalEmptyProps = EmptyProps & {
  dangerouslySetInnerHTML?: never;
};

function getDefaultImageLabel(status: EmptyStatus) {
  if (status === "search") return "No search results";
  if (status === "error") return "Unavailable content";
  return "Empty content";
}

function isRenderableNode(node: ReactNode) {
  return node !== null && node !== undefined && typeof node !== "boolean";
}

export function Empty({
  action,
  "aria-live": ariaLive,
  className,
  description = "No data",
  dangerouslySetInnerHTML: _dangerouslySetInnerHTML,
  image,
  imageDescription,
  role = "status",
  size = "md",
  status = "empty",
  title = "Empty",
  ...props
}: InternalEmptyProps) {
  const imageAriaProps = imageDescription ? { "aria-label": imageDescription, role: "img" } : { "aria-hidden": true };
  const defaultImageLabel = getDefaultImageLabel(status);
  const hasImage = isRenderableNode(image);
  const hasDescription = isRenderableNode(description);
  const hasAction = isRenderableNode(action);

  return (
    <div
      {...props}
      aria-live={ariaLive ?? (role === "status" ? "polite" : undefined)}
      className={cx("c-empty", size === "sm" && "c-empty--sm", `c-empty--${status}`, className)}
      role={role}
    >
      {hasImage ? (
        <div className="c-empty__image" {...imageAriaProps}>
          {image}
        </div>
      ) : (
        <div aria-hidden="true" className="c-empty__mark" title={defaultImageLabel}>
          <span className="c-empty__mark-top" />
          <span className="c-empty__mark-line" />
          <span className="c-empty__mark-line" />
          <span className="c-empty__mark-dot" />
        </div>
      )}
      <div className="c-empty__content">
        <strong>{title}</strong>
        {hasDescription ? <div className="c-empty__description">{description}</div> : null}
      </div>
      {hasAction ? <div className="c-empty__action">{action}</div> : null}
    </div>
  );
}
