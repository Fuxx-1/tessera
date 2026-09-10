import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

export type AffixOffset = number | string;
export type AffixContainer = Window | HTMLElement | (() => Window | HTMLElement | null);
export type AffixPlacement = "top" | "bottom";

export interface AffixChangeInfo {
  affixed: boolean;
  placement: AffixPlacement;
  target: HTMLElement;
}

export interface AffixProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "dangerouslySetInnerHTML" | "onChange"> {
  children: ReactNode;
  container?: AffixContainer;
  dangerouslySetInnerHTML?: never;
  disabled?: boolean;
  mobileSticky?: boolean;
  offsetBottom?: AffixOffset;
  offsetTop?: AffixOffset;
  onChange?: (affixed: boolean, info: AffixChangeInfo) => void;
}

type InternalAffixProps = AffixProps & {
  dangerouslySetInnerHTML?: never;
};

type StaticPosition = {
  container: Window | HTMLElement | null;
  height: number;
  top: number;
};
type ScrollListenerTarget = Window | Document | HTMLElement;

function toCssLength(value: AffixOffset | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return typeof value === "number" ? `${value}px` : value;
}

function getPlacement(offsetTop: AffixOffset | undefined, offsetBottom: AffixOffset | undefined): AffixPlacement {
  return offsetTop !== undefined || offsetBottom === undefined ? "top" : "bottom";
}

function resolveContainer(container: AffixContainer | undefined) {
  if (typeof window === "undefined") {
    return null;
  }

  if (!container) {
    return null;
  }

  return typeof container === "function" ? container() : container;
}

function isWindowContainer(container: Window | HTMLElement | null): container is Window {
  return typeof Window !== "undefined" && container instanceof Window;
}

function getContainerRect(container: Window | HTMLElement | null) {
  if (!container || isWindowContainer(container)) {
    return {
      top: 0,
      bottom: window.innerHeight,
      paddingTop: 0,
      paddingBottom: 0,
    };
  }

  const rect = container.getBoundingClientRect();
  const style = window.getComputedStyle(container);
  return {
    top: rect.top,
    bottom: rect.bottom,
    paddingTop: readNumericOffset(style.paddingTop),
    paddingBottom: readNumericOffset(style.paddingBottom),
  };
}

function getScrollOffset(container: Window | HTMLElement | null) {
  if (!container || isWindowContainer(container)) {
    return window.scrollY || window.document.documentElement.scrollTop || 0;
  }

  return container.scrollTop;
}

function getContainerViewportHeight(container: Window | HTMLElement | null) {
  if (!container || isWindowContainer(container)) {
    return window.innerHeight;
  }

  return container.clientHeight;
}

function getNearestScrollContainer(target: HTMLElement | null) {
  if (typeof window === "undefined" || !target) {
    return null;
  }

  let parent = target.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);
    const overflow = `${style.overflow} ${style.overflowY}`;
    if (/(auto|scroll|overlay)/.test(overflow)) {
      return parent;
    }
    parent = parent.parentElement;
  }

  return window;
}

function getScrollTargets(target: HTMLElement | null): ScrollListenerTarget[] {
  if (typeof window === "undefined") {
    return [];
  }

  const targets: ScrollListenerTarget[] = [];
  let parent = target?.parentElement ?? null;

  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);
    const overflow = `${style.overflow} ${style.overflowY}`;
    if (/(auto|scroll|overlay)/.test(overflow)) {
      targets.push(parent);
    }
    parent = parent.parentElement;
  }

  targets.push(document);
  targets.push(window);
  return targets;
}

function readNumericOffset(value: AffixOffset | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getTargetTopInContainer(
  target: HTMLElement,
  container: Window | HTMLElement | null,
  containerRect: ReturnType<typeof getContainerRect>,
  scrollOffset: number,
) {
  const targetRect = target.getBoundingClientRect();

  if (!container || isWindowContainer(container)) {
    return targetRect.top + scrollOffset;
  }

  return targetRect.top - containerRect.top + scrollOffset;
}

export const Affix = forwardRef<HTMLDivElement, AffixProps>(function Affix(
  {
    children,
    className,
    container,
    dangerouslySetInnerHTML: _dangerouslySetInnerHTML,
    disabled = false,
    mobileSticky = true,
    offsetBottom,
    offsetTop,
    onChange,
    style,
    ...props
  }: InternalAffixProps,
  forwardedRef,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const previousAffixedRef = useRef(false);
  const staticPositionRef = useRef<StaticPosition | null>(null);
  const [affixed, setAffixed] = useState(false);
  const placement = getPlacement(offsetTop, offsetBottom);
  const resolvedOffsetTop = placement === "top" ? offsetTop ?? 0 : undefined;
  const resolvedOffsetBottom = placement === "bottom" ? offsetBottom ?? 0 : undefined;

  useImperativeHandle(forwardedRef, () => rootRef.current as HTMLDivElement, []);

  const measure = useCallback(() => {
    const target = rootRef.current;

    if (typeof window === "undefined" || disabled) {
      if (previousAffixedRef.current) {
        previousAffixedRef.current = false;
        setAffixed(false);
        if (target) {
          onChange?.(false, { affixed: false, placement, target });
        }
      }
      staticPositionRef.current = null;
      return;
    }

    if (!target) {
      return;
    }

    const scrollContainer = resolveContainer(container) ?? getNearestScrollContainer(target);
    const containerRect = getContainerRect(scrollContainer);
    const scrollOffset = getScrollOffset(scrollContainer);
    const targetRect = target.getBoundingClientRect();
    const targetHeight = targetRect.height;
    const reusablePosition = staticPositionRef.current?.container === scrollContainer ? staticPositionRef.current : null;
    const staticTop =
      reusablePosition?.top ?? getTargetTopInContainer(target, scrollContainer, containerRect, scrollOffset);
    const staticHeight = targetHeight || reusablePosition?.height || 0;

    staticPositionRef.current = {
      container: scrollContainer,
      height: staticHeight,
      top: staticTop,
    };

    const nextAffixed =
      placement === "top"
        ? scrollOffset > 0 &&
          scrollOffset + containerRect.paddingTop + readNumericOffset(resolvedOffsetTop) >= staticTop - 1
        : scrollOffset > 0 &&
          targetRect.bottom >=
            containerRect.bottom - containerRect.paddingBottom - readNumericOffset(resolvedOffsetBottom) - 1;

    if (previousAffixedRef.current !== nextAffixed) {
      previousAffixedRef.current = nextAffixed;
      setAffixed(nextAffixed);
      onChange?.(nextAffixed, { affixed: nextAffixed, placement, target });
    }
  }, [container, disabled, onChange, placement, resolvedOffsetBottom, resolvedOffsetTop]);

  const clearScheduledMeasure = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const flushMeasure = useCallback(() => {
    clearScheduledMeasure();
    measure();
  }, [clearScheduledMeasure, measure]);

  const requestMeasure = useCallback(() => {
    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(flushMeasure);
    timeoutRef.current = window.setTimeout(flushMeasure, 80);
  }, [flushMeasure]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    if (disabled) {
      previousAffixedRef.current = false;
      setAffixed(false);
      clearScheduledMeasure();
      return undefined;
    }

    const root = rootRef.current;
    const scrollContainer = resolveContainer(container);
    const scrollTargets: ScrollListenerTarget[] = scrollContainer ? [scrollContainer] : getScrollTargets(root);
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(requestMeasure) : null;
    const scrollListenerOptions = { capture: true, passive: true };

    requestMeasure();
    scrollTargets.forEach((scrollTarget) => scrollTarget.addEventListener("scroll", requestMeasure, scrollListenerOptions));
    window.addEventListener("resize", requestMeasure, { passive: true });

    if (root) {
      resizeObserver?.observe(root);
    }

    if (scrollContainer && !isWindowContainer(scrollContainer)) {
      resizeObserver?.observe(scrollContainer);
    }

    return () => {
      scrollTargets.forEach((scrollTarget) => {
        scrollTarget.removeEventListener("scroll", requestMeasure, true);
        scrollTarget.removeEventListener("scroll", requestMeasure);
      });
      window.removeEventListener("resize", requestMeasure);
      resizeObserver?.disconnect();

      clearScheduledMeasure();
    };
  }, [clearScheduledMeasure, container, disabled, requestMeasure]);

  const offsetStyle = {
    "--c-affix-offset-top": toCssLength(resolvedOffsetTop),
    "--c-affix-offset-bottom": toCssLength(resolvedOffsetBottom),
  } as CSSProperties;

  return (
    <div
      className={cx(
        "c-affix",
        `c-affix--${placement}`,
        affixed && "c-affix--affixed",
        disabled && "c-affix--disabled",
        mobileSticky && "c-affix--mobile-sticky",
        className,
      )}
      data-affixed={affixed ? "true" : "false"}
      data-placement={placement}
      ref={rootRef}
      style={{ ...offsetStyle, ...style }}
      {...props}
    >
      {children}
    </div>
  );
});
