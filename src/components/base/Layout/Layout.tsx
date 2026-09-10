import { useCallback, useId, useState } from "react";
import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

export type LayoutTone = "plain" | "surface";
export type LayoutGap = "none" | "sm" | "md" | "lg";
export type LayoutCollapseAt = "never" | "sm" | "md";

export interface LayoutProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  collapsed?: boolean;
  collapsedWidth?: number | string;
  collapseLabel?: string;
  collapseAt?: LayoutCollapseAt;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  expandLabel?: string;
  gap?: LayoutGap;
  hasSider?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  responsive?: boolean;
  sidebar?: ReactNode;
  sidebarMinWidth?: number | string;
  sidebarPosition?: "start" | "end";
  sidebarWidth?: number | string;
  tone?: LayoutTone;
}

export interface LayoutRegionProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
}

export interface LayoutContentProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
}

export function Layout({
  children,
  className,
  collapsed,
  collapsedWidth = 56,
  collapseLabel = "Collapse sidebar",
  collapseAt = "md",
  collapsible = false,
  defaultCollapsed = false,
  expandLabel = "Expand sidebar",
  gap = "none",
  hasSider,
  onCollapsedChange,
  responsive = true,
  sidebar,
  sidebarMinWidth,
  sidebarPosition = "start",
  sidebarWidth,
  style,
  tone = "plain",
  ...props
}: LayoutProps) {
  const sidebarBodyId = useId();
  const isCollapsedControlled = collapsed !== undefined;
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = useState(defaultCollapsed);
  const resolvedHasSider = hasSider ?? Boolean(sidebar);
  const canCollapse = Boolean(collapsible && sidebar);
  const resolvedCollapsed = canCollapse && (isCollapsedControlled ? Boolean(collapsed) : uncontrolledCollapsed);
  const resolvedSidebarMinWidth = sidebarMinWidth ?? sidebarWidth;
  const layoutStyle = {
    ...style,
    ...(sidebarWidth ? { "--c-layout-sidebar-width": formatCssLength(sidebarWidth) } : null),
    ...(resolvedSidebarMinWidth ? { "--c-layout-sidebar-min-width": formatCssLength(resolvedSidebarMinWidth) } : null),
    ...(collapsible ? { "--c-layout-sidebar-collapsed-width": formatCssLength(collapsedWidth) } : null),
  } as CSSProperties;
  const toggleLabel = resolvedCollapsed ? expandLabel : collapseLabel;
  const handleSidebarToggle = useCallback(() => {
    const nextCollapsed = !resolvedCollapsed;
    if (!isCollapsedControlled) {
      setUncontrolledCollapsed(nextCollapsed);
    }
    onCollapsedChange?.(nextCollapsed);
  }, [isCollapsedControlled, onCollapsedChange, resolvedCollapsed]);
  const sidebarSlot = sidebar ? (
    <div className="c-layout__sidebar-slot">
      {canCollapse ? (
        <button
          aria-controls={sidebarBodyId}
          aria-expanded={!resolvedCollapsed}
          aria-label={toggleLabel}
          className="c-layout__sider-toggle"
          onClick={handleSidebarToggle}
          title={toggleLabel}
          type="button"
        >
          <span aria-hidden="true" className="c-layout__sider-toggle-icon" />
        </button>
      ) : null}
      {canCollapse ? (
        <div className="c-layout__sider-body" hidden={resolvedCollapsed} id={sidebarBodyId}>
          {sidebar}
        </div>
      ) : (
        sidebar
      )}
    </div>
  ) : null;

  return (
    <div
      className={cx(
        "c-layout",
        `c-layout--${tone}`,
        `c-layout--gap-${gap}`,
        resolvedHasSider && "c-layout--has-sider",
        resolvedHasSider && `c-layout--sidebar-${sidebarPosition}`,
        resolvedCollapsed && "c-layout--sider-collapsed",
        canCollapse && "c-layout--collapsible",
        responsive && "c-layout--responsive",
        responsive && `c-layout--collapse-${collapseAt}`,
        className,
      )}
      style={layoutStyle}
      {...props}
    >
      {sidebarPosition === "start" ? sidebarSlot : null}
      <div className="c-layout__main-slot">{children}</div>
      {sidebarPosition === "end" ? sidebarSlot : null}
    </div>
  );
}

export function LayoutHeader({ as: Component = "header", children, className, ...props }: LayoutRegionProps) {
  return (
    <Component className={cx("c-layout__header", className)} {...props}>
      {children}
    </Component>
  );
}

export function LayoutSider({ as: Component = "aside", children, className, ...props }: LayoutRegionProps) {
  return (
    <Component className={cx("c-layout__sider", className)} {...props}>
      {children}
    </Component>
  );
}

export function LayoutContent({ as: Component = "main", children, className, ...props }: LayoutContentProps) {
  return (
    <Component className={cx("c-layout__content", className)} {...props}>
      {children}
    </Component>
  );
}

export function LayoutFooter({ as: Component = "footer", children, className, ...props }: LayoutRegionProps) {
  return (
    <Component className={cx("c-layout__footer", className)} {...props}>
      {children}
    </Component>
  );
}

function formatCssLength(value: number | string) {
  return typeof value === "number" ? `${value}px` : value;
}
