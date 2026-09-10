import { type HTMLAttributes, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { cx } from "../../../utils/cx";
import "./style.css";

export type MessageStatus = "success" | "error" | "warning" | "info" | "loading";
export type MessageAriaLive = "polite" | "assertive" | "off";
export type MessageCloseReason = "manual" | "timeout" | "api" | "destroy" | "overflow";

export type MessageItem = {
  ariaLive?: MessageAriaLive;
  className?: string;
  closeLabel?: string;
  closable?: boolean;
  content: ReactNode;
  duration?: number;
  icon?: ReactNode;
  id: string;
  onClose?: (id: string, reason: MessageCloseReason) => void;
  status: MessageStatus;
};

export type MessageOpenOptions = Omit<MessageItem, "id" | "status"> & {
  id?: string;
  maxCount?: number;
  status?: MessageStatus;
};

export type MessageShortcutOptions = Omit<MessageOpenOptions, "content" | "status">;

export type MessageHandle = {
  close: () => void;
  id: string;
  update: (nextOptions: Partial<MessageOpenOptions>) => void;
};

export interface MessageStackProps extends Omit<HTMLAttributes<HTMLDivElement>, "dangerouslySetInnerHTML" | "onClose"> {
  closeLabel?: string;
  messages: MessageItem[];
  onClose?: (id: string, reason: MessageCloseReason) => void;
  placement?: "fixed" | "static";
}

const defaultIcons: Record<MessageStatus, string> = {
  error: "!",
  info: "i",
  loading: "",
  success: "✓",
  warning: "!",
};

export const MESSAGE_DEFAULT_MAX_COUNT = 6;

function getDefaultAriaLive(status: MessageStatus): MessageAriaLive {
  return status === "error" || status === "warning" ? "assertive" : "polite";
}

function getDefaultDuration(status: MessageStatus) {
  return status === "loading" ? 0 : 3000;
}

export function MessageStack({ className, closeLabel = "Close message", messages, onClose, placement = "fixed", ...props }: MessageStackProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className={cx("c-message-portal", placement === "static" && "c-message-portal--static", className)} data-message-count={messages.length} {...props}>
      <div className="c-message-stack" role="presentation">
        {messages.map((item) => {
          const ariaLive = item.ariaLive ?? getDefaultAriaLive(item.status);
          const role = ariaLive === "assertive" ? "alert" : "status";
          const resolvedCloseLabel = item.closeLabel ?? closeLabel;

          return (
            <div
              aria-live={ariaLive}
              className={cx("c-message", `c-message--${item.status}`, item.closable && "c-message--closable", item.className)}
              data-message-id={item.id}
              data-status={item.status}
              key={item.id}
              role={ariaLive === "off" ? undefined : role}
            >
              <span className="c-message__icon" aria-hidden="true">
                {item.status === "loading" && item.icon === undefined ? <span className="c-message__spinner" /> : item.icon ?? defaultIcons[item.status]}
              </span>
              <span className="c-message__content">{item.content}</span>
              {item.closable ? (
                <button className="c-message__close" type="button" aria-label={resolvedCloseLabel} onClick={() => onClose?.(item.id, "manual")}>
                  <span aria-hidden="true">×</span>
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Message(props: MessageStackProps) {
  return <MessageStack {...props} />;
}

type InternalMessageItem = MessageItem;

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let cleanupTimer: number | undefined;
let messageSeed = 0;
let currentMessages: InternalMessageItem[] = [];
let routeCleanupBound = false;

const durationTimers = new Map<string, number>();

function canUseDom() {
  return typeof document !== "undefined" && typeof window !== "undefined";
}

function nextMessageId() {
  messageSeed += 1;
  return `tessera-message-${messageSeed}`;
}

function clearCleanupTimer() {
  if (cleanupTimer !== undefined && canUseDom()) {
    window.clearTimeout(cleanupTimer);
  }
  cleanupTimer = undefined;
}

function ensureRoot() {
  if (!canUseDom()) {
    return false;
  }

  clearCleanupTimer();

  if (!routeCleanupBound) {
    window.addEventListener("hashchange", destroyMessages);
    routeCleanupBound = true;
  }

  if (!container) {
    container = document.createElement("div");
    container.setAttribute("data-tessera-message-root", "true");
    document.body.appendChild(container);
  }

  if (!root) {
    root = createRoot(container);
  }

  return true;
}

function scheduleCleanupIfEmpty() {
  if (!canUseDom() || currentMessages.length > 0 || !root || !container) {
    return;
  }

  cleanupTimer = window.setTimeout(() => {
    if (currentMessages.length > 0 || !root || !container) {
      return;
    }

    root.unmount();
    root = null;
    container.remove();
    container = null;
    if (routeCleanupBound) {
      window.removeEventListener("hashchange", destroyMessages);
      routeCleanupBound = false;
    }
    cleanupTimer = undefined;
  }, 0);
}

function renderMessages() {
  if (currentMessages.length === 0) {
    if (root) {
      root.render(<MessageStack messages={[]} onClose={closeMessage} />);
    }
    scheduleCleanupIfEmpty();
    return;
  }

  if (!ensureRoot() || !root) {
    return;
  }

  root.render(<MessageStack messages={[...currentMessages]} onClose={closeMessage} />);
}

function clearDurationTimer(id: string) {
  const timer = durationTimers.get(id);
  if (timer !== undefined && canUseDom()) {
    window.clearTimeout(timer);
  }
  durationTimers.delete(id);
}

function scheduleDuration(item: MessageItem) {
  clearDurationTimer(item.id);

  if (!canUseDom()) {
    return;
  }

  const duration = item.duration ?? getDefaultDuration(item.status);
  if (duration <= 0) {
    return;
  }

  durationTimers.set(
    item.id,
    window.setTimeout(() => closeMessage(item.id, "timeout"), duration),
  );
}

function normalizeOptions(options: MessageOpenOptions): InternalMessageItem {
  const { maxCount, ...itemOptions } = options;
  const status = options.status ?? "info";
  return {
    ...itemOptions,
    ariaLive: options.ariaLive ?? getDefaultAriaLive(status),
    closeLabel: options.closeLabel ?? "Close message",
    closable: options.closable ?? false,
    duration: options.duration ?? getDefaultDuration(status),
    id: options.id ?? nextMessageId(),
    status,
  };
}

function normalizeMaxCount(maxCount: number | undefined) {
  if (maxCount === undefined || !Number.isFinite(maxCount)) {
    return MESSAGE_DEFAULT_MAX_COUNT;
  }

  return Math.max(1, Math.floor(maxCount));
}

function enforceQueueBudget(maxCount: number) {
  if (currentMessages.length <= maxCount) {
    return;
  }

  const overflowMessages = currentMessages.slice(0, currentMessages.length - maxCount);
  currentMessages = currentMessages.slice(-maxCount);
  for (const item of overflowMessages) {
    clearDurationTimer(item.id);
    item.onClose?.(item.id, "overflow");
  }
}

function openMessage(options: MessageOpenOptions): MessageHandle {
  const item = normalizeOptions(options);
  const existingIndex = currentMessages.findIndex((messageItem) => messageItem.id === item.id);

  if (existingIndex >= 0) {
    currentMessages = currentMessages.map((messageItem, index) => (index === existingIndex ? { ...messageItem, ...item } : messageItem));
  } else {
    currentMessages = [...currentMessages, item];
  }

  scheduleDuration(item);
  enforceQueueBudget(normalizeMaxCount(options.maxCount));
  renderMessages();

  return {
    close: () => closeMessage(item.id),
    id: item.id,
    update: (nextOptions) => updateMessage(item.id, nextOptions),
  };
}

function updateMessage(id: string, nextOptions: Partial<MessageOpenOptions>) {
  const existing = currentMessages.find((item) => item.id === id);
  if (!existing) {
    return;
  }

  const { maxCount, ...itemOptions } = nextOptions;
  const status = nextOptions.status ?? existing.status;
  const statusChanged = status !== existing.status;
  const hasContent = Object.prototype.hasOwnProperty.call(nextOptions, "content") && nextOptions.content !== undefined;
  const nextItem: InternalMessageItem = {
    ...existing,
    ...itemOptions,
    ariaLive: nextOptions.ariaLive ?? (statusChanged ? getDefaultAriaLive(status) : existing.ariaLive ?? getDefaultAriaLive(status)),
    content: hasContent ? nextOptions.content : existing.content,
    duration: nextOptions.duration ?? (statusChanged ? getDefaultDuration(status) : existing.duration ?? getDefaultDuration(status)),
    id,
    status,
  };

  currentMessages = currentMessages.map((item) => (item.id === id ? nextItem : item));
  scheduleDuration(nextItem);
  enforceQueueBudget(normalizeMaxCount(maxCount));
  renderMessages();
}

function closeMessage(id: string, reason: MessageCloseReason = "api") {
  const closingMessage = currentMessages.find((item) => item.id === id);
  if (!closingMessage) {
    clearDurationTimer(id);
    return;
  }

  clearDurationTimer(id);
  currentMessages = currentMessages.filter((item) => item.id !== id);
  renderMessages();
  closingMessage.onClose?.(id, reason);
}

function destroyMessages() {
  const closingMessages = [...currentMessages];
  for (const id of Array.from(durationTimers.keys())) {
    clearDurationTimer(id);
  }
  currentMessages = [];
  renderMessages();
  for (const item of closingMessages) {
    item.onClose?.(item.id, "destroy");
  }
}

export const message = {
  destroy: destroyMessages,
  error: (content: ReactNode, options: MessageShortcutOptions = {}) => openMessage({ ...options, content, status: "error" }),
  info: (content: ReactNode, options: MessageShortcutOptions = {}) => openMessage({ ...options, content, status: "info" }),
  loading: (content: ReactNode, options: MessageShortcutOptions = {}) => openMessage({ ...options, content, status: "loading" }),
  open: openMessage,
  success: (content: ReactNode, options: MessageShortcutOptions = {}) => openMessage({ ...options, content, status: "success" }),
  warning: (content: ReactNode, options: MessageShortcutOptions = {}) => openMessage({ ...options, content, status: "warning" }),
};
