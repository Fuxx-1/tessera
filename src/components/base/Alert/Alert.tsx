import { useState, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "../../../utils/cx";
import { Icon, type IconName } from "../Icon";
import "./style.css";

export type AlertStatus = "info" | "success" | "warning" | "error";

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "dangerouslySetInnerHTML" | "title"> {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  closable?: boolean;
  closeLabel?: string;
  defaultOpen?: boolean;
  icon?: ReactNode;
  onClose?: () => void;
  open?: boolean;
  showIcon?: boolean;
  status?: AlertStatus;
  tone?: AlertStatus;
}

type InternalAlertProps = AlertProps & {
  dangerouslySetInnerHTML?: never;
};

function hasRenderableNode(node: ReactNode) {
  return node !== undefined && node !== null && node !== false;
}

const defaultIcons: Record<AlertStatus, IconName> = {
  error: "alert",
  info: "info",
  success: "check",
  warning: "alert",
};

export function Alert({
  action,
  children,
  className,
  closable = false,
  closeLabel = "Dismiss alert",
  defaultOpen = true,
  description,
  icon,
  onClose,
  open,
  role,
  showIcon = true,
  status,
  title,
  tone = "info",
  dangerouslySetInnerHTML: _dangerouslySetInnerHTML,
  ...props
}: InternalAlertProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const resolvedOpen = open ?? uncontrolledOpen;
  const resolvedStatus = status ?? tone;
  const alertRole = role ?? (resolvedStatus === "error" || resolvedStatus === "warning" ? "alert" : "status");
  const ariaLive = props["aria-live"] ?? (alertRole === "alert" ? "assertive" : "polite");
  const ariaAtomic = props["aria-atomic"] ?? true;

  if (!resolvedOpen) {
    return null;
  }

  const handleClose = () => {
    if (open === undefined) {
      setUncontrolledOpen(false);
    }

    onClose?.();
  };

  return (
    <div
      {...props}
      className={cx("c-alert", !showIcon && "c-alert--no-icon", `c-alert--${resolvedStatus}`, className)}
      role={alertRole}
      aria-live={ariaLive}
      aria-atomic={ariaAtomic}
      data-status={resolvedStatus}
    >
      {showIcon ? (
        <div className="c-alert__icon" aria-hidden="true">
          {icon ?? <Icon decorative name={defaultIcons[resolvedStatus]} size="sm" />}
        </div>
      ) : null}
      <div className="c-alert__body">
        {hasRenderableNode(title) ? <strong>{title}</strong> : null}
        {hasRenderableNode(description) ? <p>{description}</p> : null}
        {children}
      </div>
      {action ? <div className="c-alert__action">{action}</div> : null}
      {closable ? (
        <button className="c-alert__close" onClick={handleClose} type="button" aria-label={closeLabel}>
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </div>
  );
}
