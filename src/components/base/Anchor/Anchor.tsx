import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cx } from "../../../utils/cx";
import "./style.css";
import { getSafeLinkRel } from "../../../utils/url";

export type AnchorScrollContainer = HTMLElement | Window;
export type AnchorScrollContainerResolver = AnchorScrollContainer | null | (() => AnchorScrollContainer | null);

export interface AnchorItem {
  children?: AnchorItem[];
  disabled?: boolean;
  key?: string;
  label: ReactNode;
  title?: string;
  href: string;
  linkProps?: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className" | "href" | "title" | "onClick">;
}

export interface AnchorProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "onChange"> {
  "aria-label"?: string;
  current?: string;
  disabled?: boolean;
  items: AnchorItem[];
  mobileStickyFallback?: boolean;
  offset?: number;
  onChange?: (href: string, item: AnchorItem) => void;
  scrollContainer?: AnchorScrollContainerResolver;
  smooth?: boolean;
}

type RenderableAnchorItem = AnchorItem & {
  depth: number;
  safeHref?: string;
};

function normalizeHashValue(value: string | undefined) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function getSafeLocalHash(href: string | undefined) {
  if (!href) {
    return undefined;
  }

  const trimmed = href.trim();
  if (!trimmed.startsWith("#") || trimmed === "#") {
    return undefined;
  }

  if (/[/?\\]/.test(trimmed) || trimmed.includes(":")) {
    return undefined;
  }

  try {
    const decoded = decodeURIComponent(trimmed.slice(1));
    if (!decoded || /[\u0000-\u001F\u007F/?\\:]/.test(decoded)) {
      return undefined;
    }
  } catch {
    return undefined;
  }

  return trimmed;
}

function flattenItems(items: AnchorItem[], depth = 0): RenderableAnchorItem[] {
  return items.flatMap((item) => [
    { ...item, depth, safeHref: getSafeLocalHash(item.href) },
    ...(item.children ? flattenItems(item.children, depth + 1) : []),
  ]);
}

function readWindowHash() {
  if (typeof window === "undefined") {
    return "";
  }

  return normalizeHashValue(window.location.hash);
}

function findTargetElement(hash: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const id = hash.slice(1);
  try {
    return document.getElementById(decodeURIComponent(id)) ?? document.getElementById(id);
  } catch {
    return document.getElementById(id);
  }
}

function resolveScrollContainer(scrollContainer: AnchorScrollContainerResolver | undefined) {
  if (typeof window === "undefined") {
    return null;
  }

  if (typeof scrollContainer === "function") {
    return scrollContainer() ?? window;
  }

  return scrollContainer ?? window;
}

function isWindowContainer(container: AnchorScrollContainer): container is Window {
  return typeof window !== "undefined" && container === window;
}

function getTargetDistanceFromContainerTop(target: HTMLElement, container: AnchorScrollContainer) {
  if (isWindowContainer(container)) {
    return target.getBoundingClientRect().top;
  }

  return target.getBoundingClientRect().top - container.getBoundingClientRect().top;
}

function scrollContainerToTarget(
  target: HTMLElement,
  container: AnchorScrollContainer,
  offset: number,
  behavior: ScrollBehavior,
) {
  if (isWindowContainer(container)) {
    container.scrollTo({ top: target.getBoundingClientRect().top + container.scrollY - offset, behavior });
    return;
  }

  container.scrollTo({
    top: container.scrollTop + getTargetDistanceFromContainerTop(target, container) - offset,
    behavior,
  });
}

export function Anchor({
  "aria-label": ariaLabel = "Anchor navigation",
  className,
  current,
  disabled = false,
  items,
  mobileStickyFallback = true,
  offset = 0,
  onChange,
  scrollContainer,
  smooth = true,
  ...props
}: AnchorProps) {
  const indicatorId = useId();
  const flattenedItems = useMemo(() => flattenItems(items), [items]);
  const [uncontrolledCurrent, setUncontrolledCurrent] = useState(() => normalizeHashValue(current) || readWindowHash());
  const activeHref = normalizeHashValue(current) || uncontrolledCurrent;

  useEffect(() => {
    if (current !== undefined || typeof window === "undefined") {
      return undefined;
    }

    const handleLocationChange = () => {
      setUncontrolledCurrent(readWindowHash());
    };

    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("hashchange", handleLocationChange);
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, [current]);

  useEffect(() => {
    if (current !== undefined || typeof window === "undefined" || flattenedItems.length === 0) {
      return undefined;
    }

    let frame = 0;
    const container = resolveScrollContainer(scrollContainer);
    if (!container) {
      return undefined;
    }

    const safeItems = flattenedItems
      .filter((item) => item.safeHref && !item.disabled)
      .map((item) => ({
        item,
        target: item.safeHref ? findTargetElement(item.safeHref) : null,
      }))
      .filter((entry): entry is { item: RenderableAnchorItem; target: HTMLElement } => Boolean(entry.target));

    const updateActiveFromScroll = () => {
      frame = 0;

      const nextItem = safeItems.reduce<{ item: RenderableAnchorItem; distance: number } | undefined>((candidate, entry) => {
        const distance = getTargetDistanceFromContainerTop(entry.target, container) - offset;
        if (distance <= 8) {
          return !candidate || distance >= candidate.distance ? { item: entry.item, distance } : candidate;
        }

        return candidate;
      }, undefined);

      if (nextItem?.item.safeHref) {
        setUncontrolledCurrent((previous) => (previous === nextItem.item.safeHref ? previous : nextItem.item.safeHref ?? previous));
      }
    };

    const scheduleUpdate = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(updateActiveFromScroll);
    };

    scheduleUpdate();
    container.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      container.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [current, flattenedItems, offset, scrollContainer]);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, item: AnchorItem, safeHref: string) => {
      if (disabled || item.disabled) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      event.currentTarget.focus();
      const target = findTargetElement(safeHref);
      const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (target && typeof window !== "undefined") {
        const container = resolveScrollContainer(scrollContainer);
        if (container) {
          scrollContainerToTarget(target, container, offset, smooth && !reduceMotion ? "smooth" : "auto");
        }
      }

      if (typeof window !== "undefined") {
        window.history.pushState(null, "", safeHref);
      }

      setUncontrolledCurrent(safeHref);
      onChange?.(safeHref, item);
    },
    [disabled, offset, onChange, scrollContainer, smooth],
  );

  const currentAnchorTitle = flattenedItems.find((item) => item.safeHref === activeHref)?.title;
  const currentAnchorLabel = currentAnchorTitle ?? (activeHref || "none");

  return (
    <nav
      aria-label={ariaLabel}
      className={cx(
        "c-anchor",
        disabled && "c-anchor--disabled",
        mobileStickyFallback && "c-anchor--mobile-sticky",
        className,
      )}
      {...props}
    >
      <ol aria-describedby={indicatorId} className="c-anchor__list">
        {flattenedItems.map((item, index) => {
          const isCurrent = Boolean(item.safeHref && item.safeHref === activeHref);
          const isDisabled = disabled || item.disabled || !item.safeHref;
          const key = item.key ?? `${item.href}-${index}`;
          const style = { "--anchor-depth": item.depth } as CSSProperties;

          return (
            <li className={cx("c-anchor__item", isCurrent && "c-anchor__item--current")} key={key} style={style}>
              {item.safeHref && !isDisabled ? (
                <a
                  {...item.linkProps}
                  aria-current={isCurrent ? "location" : undefined}
                  className="c-anchor__link"
                  href={item.safeHref}
                  rel={getSafeLinkRel(item.linkProps?.rel, item.linkProps?.target)}
                  title={item.title}
                  onClick={(event) => handleClick(event, item, item.safeHref ?? "")}
                >
                  {item.label}
                </a>
              ) : (
                <span
                  aria-current={isCurrent ? "location" : undefined}
                  aria-disabled="true"
                  className="c-anchor__link c-anchor__link--disabled"
                  title={item.title}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <span className="c-sr-only" id={indicatorId}>
        Current anchor: {currentAnchorLabel}
      </span>
    </nav>
  );
}
