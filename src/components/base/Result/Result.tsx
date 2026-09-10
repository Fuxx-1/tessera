import { useId, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

export type ResultStatus = "success" | "error" | "info" | "warning" | "403" | "404" | "500";
export type ResultSize = "md" | "compact";

export interface ResultProps extends Omit<HTMLAttributes<HTMLElement>, "dangerouslySetInnerHTML" | "title"> {
  actions?: ReactNode;
  icon?: ReactNode;
  size?: ResultSize;
  status?: ResultStatus;
  subTitle?: ReactNode;
  title?: ReactNode;
}

type InternalResultProps = ResultProps & {
  dangerouslySetInnerHTML?: never;
};

const defaultIcons: Record<ResultStatus, ReactNode> = {
  "403": "403",
  "404": "404",
  "500": "500",
  error: "!",
  info: "i",
  success: "✓",
  warning: "!",
};

function hasRenderableNode(node: ReactNode) {
  return node !== null && node !== undefined && node !== false && node !== "";
}

function getStatusLabel(status: ResultStatus) {
  if (status === "403") return "Permission denied";
  if (status === "404") return "Not found";
  if (status === "500") return "Server error";
  return `${status} result`;
}

export function Result({
  actions,
  children,
  className,
  dangerouslySetInnerHTML: _dangerouslySetInnerHTML,
  icon,
  role = "region",
  size = "md",
  status = "info",
  subTitle,
  title,
  ...props
}: InternalResultProps) {
  const generatedId = useId();
  const hasTitle = hasRenderableNode(title);
  const hasSubTitle = hasRenderableNode(subTitle);
  const hasChildren = hasRenderableNode(children);
  const hasActions = hasRenderableNode(actions);
  const titleId = props["aria-labelledby"] ?? (hasTitle ? `result-${generatedId}-title` : undefined);
  const subTitleId = props["aria-describedby"] ?? (hasSubTitle ? `result-${generatedId}-subtitle` : undefined);

  return (
    <section
      aria-describedby={subTitleId}
      aria-label={!titleId ? getStatusLabel(status) : undefined}
      aria-labelledby={titleId}
      className={cx("c-result", `c-result--${status}`, size === "compact" && "c-result--compact", className)}
      data-status={status}
      role={role}
      {...props}
    >
      <div className="c-result__icon" aria-hidden="true">
        {icon ?? defaultIcons[status]}
      </div>
      <div className="c-result__body">
        {hasTitle ? (
          <div aria-level={2} className="c-result__title" id={titleId} role="heading">
            {title}
          </div>
        ) : null}
        {hasSubTitle ? (
          <div className="c-result__subtitle" id={subTitleId}>
            {subTitle}
          </div>
        ) : null}
        {hasChildren ? <div className="c-result__content">{children}</div> : null}
      </div>
      {hasActions ? <div className="c-result__actions">{actions}</div> : null}
    </section>
  );
}
