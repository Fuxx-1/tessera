import type { HTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

export type ToolbarDensity = "regular" | "compact";
export type ToolbarOrientation = "horizontal" | "vertical";
export type ToolbarJustify = "start" | "center" | "end" | "between";
export type ToolbarAlign = "start" | "center" | "end" | "stretch";
export type ToolbarMobileBehavior = "wrap" | "scroll" | "stack";

export interface ToolbarProps extends Omit<HTMLAttributes<HTMLDivElement>, "dangerouslySetInnerHTML"> {
  children: ReactNode;
  align?: ToolbarAlign;
  compact?: boolean;
  density?: ToolbarDensity;
  justify?: ToolbarJustify;
  rovingFocus?: boolean;
  mobileBehavior?: ToolbarMobileBehavior;
  orientation?: ToolbarOrientation;
  sticky?: boolean;
  variant?: "subtle" | "plain" | "framed";
  wrap?: boolean;
}

export interface ToolbarGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "dangerouslySetInnerHTML"> {
  children: ReactNode;
  align?: ToolbarAlign;
  grow?: boolean;
  separated?: boolean;
}

type InternalToolbarProps = ToolbarProps & {
  dangerouslySetInnerHTML?: never;
};

type InternalToolbarGroupProps = ToolbarGroupProps & {
  dangerouslySetInnerHTML?: never;
};

const toolbarFocusableSelector = [
  "button:not(:disabled)",
  "[href]",
  "input:not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function getFocusableItems(toolbar: HTMLElement) {
  return Array.from(toolbar.querySelectorAll<HTMLElement>(toolbarFocusableSelector)).filter((element) => {
    const style = window.getComputedStyle(element);

    return !element.hasAttribute("disabled") && style.visibility !== "hidden" && style.display !== "none";
  });
}

export function Toolbar({
  align = "center",
  children,
  className,
  compact = false,
  density,
  justify = "between",
  mobileBehavior = "wrap",
  onKeyDown,
  orientation = "horizontal",
  rovingFocus = true,
  role = "toolbar",
  sticky = false,
  variant = "subtle",
  wrap = true,
  ...props
}: InternalToolbarProps) {
  const resolvedDensity = density ?? (compact ? "compact" : "regular");
  const { "aria-orientation": ariaOrientationProp, dangerouslySetInnerHTML: _dangerouslySetInnerHTML, ...rootProps } = props;
  const ariaOrientation = role === "toolbar" ? orientation : ariaOrientationProp;
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);

    if (event.defaultPrevented || !rovingFocus || role !== "toolbar" || isEditableTarget(event.target)) {
      return;
    }

    const forwardKey = orientation === "vertical" ? "ArrowDown" : "ArrowRight";
    const backwardKey = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
    const isForward = event.key === forwardKey;
    const isBackward = event.key === backwardKey;
    const isHome = event.key === "Home";
    const isEnd = event.key === "End";

    if (!isForward && !isBackward && !isHome && !isEnd) {
      return;
    }

    const items = getFocusableItems(event.currentTarget);
    if (items.length === 0) {
      return;
    }

    const activeIndex = items.indexOf(document.activeElement as HTMLElement);
    const fallbackIndex = activeIndex === -1 ? 0 : activeIndex;
    const nextIndex = isHome
      ? 0
      : isEnd
        ? items.length - 1
        : (fallbackIndex + (isForward ? 1 : -1) + items.length) % items.length;

    event.preventDefault();
    items[nextIndex]?.focus();
  };

  return (
    <div
      aria-orientation={ariaOrientation}
      className={cx(
        "c-toolbar",
        `c-toolbar--${resolvedDensity}`,
        `c-toolbar--${variant}`,
        `c-toolbar--${orientation}`,
        `c-toolbar--align-${align}`,
        `c-toolbar--justify-${justify}`,
        `c-toolbar--mobile-${mobileBehavior}`,
        wrap && "c-toolbar--wrap",
        sticky && "c-toolbar--sticky",
        className,
      )}
      data-roving-focus={rovingFocus ? "true" : undefined}
      onKeyDown={handleKeyDown}
      role={role}
      {...rootProps}
    >
      {children}
    </div>
  );
}

export function ToolbarGroup({
  align = "center",
  children,
  className,
  grow = false,
  role = "group",
  separated = false,
  ...props
}: InternalToolbarGroupProps) {
  const { dangerouslySetInnerHTML: _dangerouslySetInnerHTML, ...groupProps } = props;

  return (
    <div
      className={cx(
        "c-toolbar__group",
        `c-toolbar__group--align-${align}`,
        grow && "c-toolbar__group--grow",
        separated && "c-toolbar__group--separated",
        className,
      )}
      role={role}
      {...groupProps}
    >
      {children}
    </div>
  );
}
