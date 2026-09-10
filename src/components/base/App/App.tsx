import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

export type AppNoticeTone = "info" | "success" | "warning" | "error";
export type AppThemeMode = "default" | "muted" | "inverse";
export type AppMessagePlacement = "top" | "bottom";
export type AppNotificationPlacement = "top-right" | "top-left" | "bottom-right" | "bottom-left";

export type AppMessageOptions = {
  content: ReactNode;
  duration?: number;
  key?: string;
  tone?: AppNoticeTone;
};

export type AppNotificationOptions = {
  description?: ReactNode;
  duration?: number;
  key?: string;
  title: ReactNode;
  tone?: AppNoticeTone;
};

export type AppMessageApi = {
  destroy: (key?: string) => void;
  error: (content: ReactNode, options?: Omit<AppMessageOptions, "content" | "tone">) => string;
  info: (content: ReactNode, options?: Omit<AppMessageOptions, "content" | "tone">) => string;
  open: (options: AppMessageOptions) => string;
  success: (content: ReactNode, options?: Omit<AppMessageOptions, "content" | "tone">) => string;
  warning: (content: ReactNode, options?: Omit<AppMessageOptions, "content" | "tone">) => string;
};

export type AppNotificationApi = {
  destroy: (key?: string) => void;
  error: (options: Omit<AppNotificationOptions, "tone">) => string;
  info: (options: Omit<AppNotificationOptions, "tone">) => string;
  open: (options: AppNotificationOptions) => string;
  success: (options: Omit<AppNotificationOptions, "tone">) => string;
  warning: (options: Omit<AppNotificationOptions, "tone">) => string;
};

export type AppContextValue = {
  message: AppMessageApi;
  notification: AppNotificationApi;
  overlayContainer: HTMLElement | null;
};

type InternalAppContextValue = AppContextValue & {
  messagePlacement: AppMessagePlacement;
  messages: InternalMessage[];
  notificationPlacement: AppNotificationPlacement;
  notifications: InternalNotification[];
  removeMessage: (key: string) => void;
  removeNotification: (key: string) => void;
  setOverlayContainer: (container: HTMLElement | null) => void;
};

export type AppProviderProps = {
  children: ReactNode;
  messagePlacement?: AppMessagePlacement;
  notificationPlacement?: AppNotificationPlacement;
};

export interface AppShellProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children: ReactNode;
  mobileSafeRoot?: boolean;
  theme?: AppThemeMode;
}

type InternalMessage = Required<Pick<AppMessageOptions, "key" | "tone">> &
  Pick<AppMessageOptions, "content">;

type InternalNotification = Required<Pick<AppNotificationOptions, "key" | "tone">> &
  Pick<AppNotificationOptions, "description" | "title">;

const AppContext = createContext<InternalAppContextValue | null>(null);
const defaultDuration = 3200;
let noticeSeed = 0;

function createNoticeKey(prefix: string) {
  noticeSeed += 1;
  return `${prefix}-${Date.now().toString(36)}-${noticeSeed.toString(36)}`;
}

function hasRenderableNode(node: ReactNode) {
  return node !== undefined && node !== null && node !== false;
}

function useRequiredAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("AppShell and useAppFeedback must be used inside AppProvider.");
  }
  return context;
}

function clearTimer(timers: MutableRefObject<Map<string, number>>, key: string) {
  const timer = timers.current.get(key);
  if (timer !== undefined) {
    globalThis.clearTimeout(timer);
    timers.current.delete(key);
  }
}

export function AppProvider({
  children,
  messagePlacement = "top",
  notificationPlacement = "top-right",
}: AppProviderProps) {
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [notifications, setNotifications] = useState<InternalNotification[]>([]);
  const [overlayContainer, setOverlayContainer] = useState<HTMLElement | null>(null);
  const messageTimers = useRef(new Map<string, number>());
  const notificationTimers = useRef(new Map<string, number>());
  const mountedRef = useRef(true);

  const removeMessage = useCallback((key: string) => {
    clearTimer(messageTimers, key);
    setMessages((items) => items.filter((item) => item.key !== key));
  }, []);

  const removeNotification = useCallback((key: string) => {
    clearTimer(notificationTimers, key);
    setNotifications((items) => items.filter((item) => item.key !== key));
  }, []);

  const scheduleMessageRemoval = useCallback(
    (key: string, duration = defaultDuration) => {
      if (duration <= 0 || typeof window === "undefined") {
        return;
      }
      clearTimer(messageTimers, key);
      messageTimers.current.set(
        key,
        window.setTimeout(() => {
          if (mountedRef.current) {
            removeMessage(key);
          }
        }, duration),
      );
    },
    [removeMessage],
  );

  const scheduleNotificationRemoval = useCallback(
    (key: string, duration = defaultDuration) => {
      if (duration <= 0 || typeof window === "undefined") {
        return;
      }
      clearTimer(notificationTimers, key);
      notificationTimers.current.set(
        key,
        window.setTimeout(() => {
          if (mountedRef.current) {
            removeNotification(key);
          }
        }, duration),
      );
    },
    [removeNotification],
  );

  const message = useMemo<AppMessageApi>(() => {
    const open = ({ content, duration, key = createNoticeKey("message"), tone = "info" }: AppMessageOptions) => {
      setMessages((items) => [...items.filter((item) => item.key !== key), { content, key, tone }]);
      scheduleMessageRemoval(key, duration);
      return key;
    };

    const openTone = (tone: AppNoticeTone, content: ReactNode, options?: Omit<AppMessageOptions, "content" | "tone">) =>
      open({ ...options, content, tone });

    return {
      destroy: (key) => {
        if (key) {
          removeMessage(key);
          return;
        }
        messageTimers.current.forEach((timer) => globalThis.clearTimeout(timer));
        messageTimers.current.clear();
        setMessages([]);
      },
      error: (content, options) => openTone("error", content, options),
      info: (content, options) => openTone("info", content, options),
      open,
      success: (content, options) => openTone("success", content, options),
      warning: (content, options) => openTone("warning", content, options),
    };
  }, [removeMessage, scheduleMessageRemoval]);

  const notification = useMemo<AppNotificationApi>(() => {
    const open = ({
      description,
      duration,
      key = createNoticeKey("notification"),
      title,
      tone = "info",
    }: AppNotificationOptions) => {
      setNotifications((items) => [...items.filter((item) => item.key !== key), { description, key, title, tone }]);
      scheduleNotificationRemoval(key, duration);
      return key;
    };

    const openTone = (tone: AppNoticeTone, options: Omit<AppNotificationOptions, "tone">) => open({ ...options, tone });

    return {
      destroy: (key) => {
        if (key) {
          removeNotification(key);
          return;
        }
        notificationTimers.current.forEach((timer) => globalThis.clearTimeout(timer));
        notificationTimers.current.clear();
        setNotifications([]);
      },
      error: (options) => openTone("error", options),
      info: (options) => openTone("info", options),
      open,
      success: (options) => openTone("success", options),
      warning: (options) => openTone("warning", options),
    };
  }, [removeNotification, scheduleNotificationRemoval]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      messageTimers.current.forEach((timer) => globalThis.clearTimeout(timer));
      notificationTimers.current.forEach((timer) => globalThis.clearTimeout(timer));
      messageTimers.current.clear();
      notificationTimers.current.clear();
    };
  }, []);

  const value = useMemo<InternalAppContextValue>(
    () => ({
      message,
      messagePlacement,
      messages,
      notification,
      notificationPlacement,
      notifications,
      overlayContainer,
      removeMessage,
      removeNotification,
      setOverlayContainer,
    }),
    [
      message,
      messagePlacement,
      messages,
      notification,
      notificationPlacement,
      notifications,
      overlayContainer,
      removeMessage,
      removeNotification,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function AppShell({
  children,
  className,
  mobileSafeRoot = true,
  theme = "default",
  ...props
}: AppShellProps) {
  const context = useRequiredAppContext();
  const {
    messagePlacement,
    messages,
    notificationPlacement,
    notifications,
    removeMessage,
    removeNotification,
    setOverlayContainer,
  } = context;
  const [localOverlayContainer, setLocalOverlayContainer] = useState<HTMLElement | null>(null);

  const setOverlayRoot = useCallback(
    (node: HTMLDivElement | null) => {
      setLocalOverlayContainer(node);
      setOverlayContainer(node);
    },
    [setOverlayContainer],
  );

  const shellContextValue = useMemo<InternalAppContextValue>(
    () => ({
      ...context,
      overlayContainer: localOverlayContainer,
    }),
    [context, localOverlayContainer],
  );

  return (
    <div
      className={cx("c-app-shell", mobileSafeRoot && "c-app-shell--safe-root", `c-app-shell--${theme}`, className)}
      data-c-app-theme={theme}
      {...props}
    >
      <AppContext.Provider value={shellContextValue}>
        <div className="c-app-shell__body">{children}</div>
      </AppContext.Provider>
      <div className="c-app-shell__overlay-root" data-c-app-overlay-root ref={setOverlayRoot} />
      <AppMessageViewport items={messages} onDismiss={removeMessage} placement={messagePlacement} />
      <AppNotificationViewport items={notifications} onDismiss={removeNotification} placement={notificationPlacement} />
    </div>
  );
}

export function useAppFeedback(): Pick<AppContextValue, "message" | "notification"> {
  const { message, notification } = useRequiredAppContext();
  return { message, notification };
}

export function useAppOverlayContainer() {
  return useContext(AppContext)?.overlayContainer ?? null;
}

function AppMessageViewport({
  items,
  onDismiss,
  placement,
}: {
  items: InternalMessage[];
  onDismiss: (key: string) => void;
  placement: AppMessagePlacement;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={cx("c-app-messages", `c-app-messages--${placement}`)}
      data-c-app-message-holder
      role="status"
      aria-live="polite"
    >
      {items.map((item) => (
        <div className={cx("c-app-message", `c-app-message--${item.tone}`)} key={item.key}>
          <span className="c-app-message__mark" aria-hidden="true" />
          <div className="c-app-message__content">{item.content}</div>
          <button aria-label="Dismiss message" type="button" onClick={() => onDismiss(item.key)}>
            <span aria-hidden="true">×</span>
          </button>
        </div>
      ))}
    </div>
  );
}

function AppNotificationViewport({
  items,
  onDismiss,
  placement,
}: {
  items: InternalNotification[];
  onDismiss: (key: string) => void;
  placement: AppNotificationPlacement;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={cx("c-app-notifications", `c-app-notifications--${placement}`)}
      data-c-app-notification-holder
      aria-live="polite"
    >
      {items.map((item) => (
        <section className={cx("c-app-notification", `c-app-notification--${item.tone}`)} key={item.key} role="status">
          <span className="c-app-notification__mark" aria-hidden="true" />
          <div className="c-app-notification__body">
            <strong>{item.title}</strong>
            {hasRenderableNode(item.description) ? <p>{item.description}</p> : null}
          </div>
          <button aria-label="Dismiss notification" type="button" onClick={() => onDismiss(item.key)}>
            <span aria-hidden="true">×</span>
          </button>
        </section>
      ))}
    </div>
  );
}
