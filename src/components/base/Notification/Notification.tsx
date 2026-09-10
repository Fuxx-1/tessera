import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { HTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "../../../utils/cx";
import "./style.css";

export type NotificationTone = "info" | "success" | "warning" | "error";
export type NotificationPlacement = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type NotificationCloseReason = "manual" | "escape" | "timeout" | "api" | "stack-limit";
export type NotificationAriaLive = "polite" | "assertive" | "off";

export interface NotificationProps extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "dangerouslySetInnerHTML"> {
  actions?: ReactNode;
  ariaLive?: NotificationAriaLive;
  closeLabel?: string;
  closable?: boolean;
  description?: ReactNode;
  onClose?: (reason: Extract<NotificationCloseReason, "manual" | "escape">) => void;
  placement?: NotificationPlacement;
  title: ReactNode;
  tone?: NotificationTone;
}

export type NotificationNotice = {
  actions?: ReactNode;
  ariaLive?: NotificationAriaLive;
  closeLabel?: string;
  closable?: boolean;
  description?: ReactNode;
  duration?: number | null;
  key?: string;
  onClose?: (key: string, reason: NotificationCloseReason) => void;
  placement?: NotificationPlacement;
  title: ReactNode;
  tone?: NotificationTone;
};

export type NotificationNoticeRecord = NotificationNotice & {
  key: string;
  createdAt: number;
  duration: number | null;
  placement: NotificationPlacement;
  timerVersion?: number;
};

export type NotificationViewportProps = {
  ariaLive?: NotificationAriaLive;
  className?: string;
  container?: HTMLElement | null;
  notices: NotificationNoticeRecord[];
  onClose: (key: string, reason: NotificationCloseReason) => void;
  portalRootId?: string;
};

export type NotificationConfig = {
  ariaLive?: NotificationAriaLive;
  container?: HTMLElement | null;
  duration?: number | null;
  maxCount?: number;
  placement?: NotificationPlacement;
  portalRootId?: string;
};

export type NotificationApi = {
  close: (key: string) => void;
  destroy: () => void;
  open: (notice: NotificationNotice) => string;
  update: (key: string, notice: Partial<Omit<NotificationNotice, "key">>) => void;
};

const notificationPlacements: NotificationPlacement[] = ["top-left", "top-right", "bottom-left", "bottom-right"];
const defaultIcons: Record<NotificationTone, string> = {
  error: "!",
  info: "i",
  success: "✓",
  warning: "!",
};

let notificationKeySeed = 0;
let notificationTimerSeed = 0;

function createNotificationKey() {
  notificationKeySeed += 1;
  return `notification-${Date.now()}-${notificationKeySeed}`;
}

function resolveRole(tone: NotificationTone, ariaLive: NotificationAriaLive) {
  if (ariaLive === "off") {
    return undefined;
  }

  return tone === "error" || tone === "warning" || ariaLive === "assertive" ? "alert" : "status";
}

function usePortalContainer(container: HTMLElement | null | undefined, portalRootId: string | undefined, active: boolean) {
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) {
      setPortalContainer(null);
      return;
    }

    if (container === null) {
      setPortalContainer(null);
      return;
    }

    if (container) {
      setPortalContainer(container);
      return;
    }

    if (typeof document === "undefined") {
      setPortalContainer(null);
      return;
    }

    const node = document.createElement("div");
    node.className = "c-notification-portal";
    node.dataset.notificationPortal = "true";
    if (portalRootId) {
      node.id = portalRootId;
    }
    document.body.appendChild(node);
    setPortalContainer(node);

    return () => {
      node.remove();
      setPortalContainer(null);
    };
  }, [active, container, portalRootId]);

  return portalContainer;
}

export function Notification({
  actions,
  ariaLive = "polite",
  className,
  closeLabel = "Close notification",
  closable = true,
  description,
  onClose,
  onKeyDown,
  placement,
  role,
  title,
  tone = "info",
  ...props
}: NotificationProps) {
  const [closed, setClosed] = useState(false);
  const resolvedRole = role ?? resolveRole(tone, ariaLive);
  const handleClose = (reason: Extract<NotificationCloseReason, "manual" | "escape">) => {
    setClosed(true);
    onClose?.(reason);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== "Escape" || !closable) {
      return;
    }

    event.preventDefault();
    handleClose("escape");
  };

  if (closed) {
    return null;
  }

  return (
    <article
      aria-live={ariaLive}
      className={cx("c-notification", `c-notification--${tone}`, placement && `c-notification--${placement}`, className)}
      data-placement={placement}
      data-tone={tone}
      onKeyDown={handleKeyDown}
      role={resolvedRole}
      {...props}
    >
      <div className="c-notification__icon" aria-hidden="true">
        {defaultIcons[tone]}
      </div>
      <div className="c-notification__body">
        <strong className="c-notification__title">{title}</strong>
        {description ? <div className="c-notification__description">{description}</div> : null}
        {actions ? <div className="c-notification__actions">{actions}</div> : null}
      </div>
      {closable ? (
        <button className="c-notification__close" onClick={() => handleClose("manual")} type="button" aria-label={closeLabel}>
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </article>
  );
}

function TimedNotification({
  notice,
  onClose,
}: {
  notice: NotificationNoticeRecord;
  onClose: (key: string, reason: NotificationCloseReason) => void;
}) {
  useEffect(() => {
    if (notice.duration === null || notice.duration <= 0) {
      return;
    }

    const timer = window.setTimeout(() => onClose(notice.key, "timeout"), notice.duration);
    return () => window.clearTimeout(timer);
  }, [notice.duration, notice.key, notice.timerVersion, onClose]);

  return (
    <Notification
      actions={notice.actions}
      ariaLive={notice.ariaLive}
      closeLabel={notice.closeLabel}
      closable={notice.closable}
      description={notice.description}
      onClose={(reason) => onClose(notice.key, reason)}
      placement={notice.placement}
      tone={notice.tone}
      title={notice.title}
    />
  );
}

export function NotificationViewport({
  ariaLive = "polite",
  className,
  container,
  notices,
  onClose,
  portalRootId,
}: NotificationViewportProps) {
  const portalContainer = usePortalContainer(container, portalRootId, notices.length > 0);

  if (!portalContainer || notices.length === 0) {
    return null;
  }

  return createPortal(
    <div className={cx("c-notification-viewport", className)} aria-live={ariaLive}>
      {notificationPlacements.map((placement) => {
        const placementNotices = notices.filter((notice) => notice.placement === placement);
        if (placementNotices.length === 0) {
          return null;
        }

        return (
          <section
            className={cx("c-notification-stack", `c-notification-stack--${placement}`)}
            key={placement}
            aria-label={`${placement.replace("-", " ")} notifications`}
          >
            {placementNotices.map((notice) => (
              <TimedNotification key={notice.key} notice={notice} onClose={onClose} />
            ))}
          </section>
        );
      })}
    </div>,
    portalContainer,
  );
}

export function useNotification(config: NotificationConfig = {}): [NotificationApi, ReactNode] {
  const configRef = useRef(config);
  const [notices, setNotices] = useState<NotificationNoticeRecord[]>([]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const closeWithReason = useCallback((key: string, reason: NotificationCloseReason) => {
    setNotices((current) => {
      const closedNotice = current.find((notice) => notice.key === key);
      if (closedNotice) {
        queueMicrotask(() => closedNotice.onClose?.(key, reason));
      }
      return current.filter((notice) => notice.key !== key);
    });
  }, []);

  const api = useMemo<NotificationApi>(() => {
    return {
      close: (key: string) => closeWithReason(key, "api"),
      destroy: () => {
        setNotices((current) => {
          current.forEach((notice) => queueMicrotask(() => notice.onClose?.(notice.key, "api")));
          return [];
        });
      },
      open: (notice: NotificationNotice) => {
        const currentConfig = configRef.current;
        const key = notice.key ?? createNotificationKey();
        const placement = notice.placement ?? currentConfig.placement ?? "top-right";
        const maxCount = currentConfig.maxCount ?? 4;
        const nextNotice: NotificationNoticeRecord = {
          ...notice,
          closable: notice.closable ?? true,
          createdAt: Date.now(),
          duration:
            notice.duration === undefined
              ? currentConfig.duration === undefined
                ? 4500
                : currentConfig.duration
              : notice.duration,
          key,
          placement,
          timerVersion: ++notificationTimerSeed,
          tone: notice.tone ?? "info",
        };

        setNotices((current) => {
          const withoutSameKey = current.filter((item) => item.key !== key);
          const next = [...withoutSameKey, nextNotice];
          const samePlacement = next.filter((item) => item.placement === placement);
          if (maxCount <= 0) {
            samePlacement.forEach((item) => queueMicrotask(() => item.onClose?.(item.key, "stack-limit")));
            return next.filter((item) => item.placement !== placement);
          }

          if (samePlacement.length <= maxCount) {
            return next;
          }

          const removeCount = samePlacement.length - maxCount;
          const removedKeys = new Set(samePlacement.slice(0, removeCount).map((item) => item.key));
          samePlacement.slice(0, removeCount).forEach((item) => {
            queueMicrotask(() => item.onClose?.(item.key, "stack-limit"));
          });

          return next.filter((item) => !removedKeys.has(item.key));
        });

        return key;
      },
      update: (key: string, notice: Partial<Omit<NotificationNotice, "key">>) => {
        setNotices((current) =>
          current.map((item) =>
            item.key === key
              ? {
                  ...item,
                  ...notice,
                  duration: notice.duration === undefined ? item.duration : notice.duration,
                  placement: notice.placement ?? item.placement,
                  timerVersion: ++notificationTimerSeed,
                }
              : item,
          ),
        );
      },
    };
  }, [closeWithReason]);

  const holder = (
    <NotificationViewport
      ariaLive={config.ariaLive}
      container={config.container}
      notices={notices}
      onClose={closeWithReason}
      portalRootId={config.portalRootId}
    />
  );

  return [api, holder];
}
