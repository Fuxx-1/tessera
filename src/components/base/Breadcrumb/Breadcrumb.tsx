import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./style.css";
import { getSafeHref, getSafeLinkRel } from "../../../utils/url";

export interface BreadcrumbItem {
  key?: string;
  href?: string;
  label: ReactNode;
  linkProps?: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className" | "href" | "title">;
  title?: string;
}

export interface BreadcrumbRoute {
  breadcrumbName?: ReactNode;
  href?: string;
  key?: string;
  label?: ReactNode;
  path?: string;
  title?: string;
}

export interface BreadcrumbRenderInfo {
  index: number;
  isCurrent: boolean;
}

export interface BreadcrumbProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  "aria-label"?: string;
  collapseLabel?: string;
  items?: BreadcrumbItem[];
  maxItems?: number;
  mobileBehavior?: "wrap" | "scroll" | "collapse";
  renderItem?: (item: BreadcrumbItem, info: BreadcrumbRenderInfo) => ReactNode;
  routes?: BreadcrumbRoute[];
  separator?: ReactNode;
}

export type BreadcrumbLinkProps = AnchorHTMLAttributes<HTMLAnchorElement>;

type VisibleBreadcrumbItem = BreadcrumbItem & {
  collapsedCount?: number;
  isEllipsis?: boolean;
};

function getVisibleItems(items: BreadcrumbItem[], maxItems?: number): VisibleBreadcrumbItem[] {
  if (!maxItems || maxItems < 3 || items.length <= maxItems) {
    return items;
  }

  const tailCount = maxItems - 2;
  return [
    items[0],
    {
      key: "__breadcrumb-ellipsis",
      label: "…",
      title: `${items.length - maxItems + 1} hidden breadcrumb levels`,
      collapsedCount: items.length - maxItems + 1,
      isEllipsis: true,
    },
    ...items.slice(items.length - tailCount),
  ];
}

function normalizeRoutes(routes: BreadcrumbRoute[] | undefined): BreadcrumbItem[] {
  return (routes ?? []).map((route, index) => ({
    href: route.href ?? route.path,
    key: route.key ?? (typeof route.path === "string" ? route.path : undefined) ?? `route-${index}`,
    label: route.label ?? route.breadcrumbName ?? route.title ?? route.path ?? "",
    title: route.title ?? (typeof route.breadcrumbName === "string" ? route.breadcrumbName : undefined),
  }));
}

export function Breadcrumb({
  "aria-label": ariaLabel = "Breadcrumb",
  className,
  collapseLabel = "Collapsed breadcrumb levels",
  items,
  maxItems,
  mobileBehavior = "collapse",
  renderItem,
  routes,
  separator = "/",
  ...props
}: BreadcrumbProps) {
  const breadcrumbItems = items ?? normalizeRoutes(routes);
  const visibleItems = getVisibleItems(breadcrumbItems, maxItems);
  const itemCount = visibleItems.length;

  return (
    <nav
      aria-label={ariaLabel}
      className={cx("c-breadcrumb", `c-breadcrumb--mobile-${mobileBehavior}`, className)}
      {...props}
    >
      <ol className="c-breadcrumb__list">
        {visibleItems.map((item, index) => {
          const isCurrent = index === itemCount - 1;
          const itemKey = item.key ?? `${index}-${String(item.title ?? item.href ?? item.label)}`;
          const safeHref = getSafeHref(item.href);
          const textClassName = isCurrent ? "c-breadcrumb__current" : "c-breadcrumb__text";
          const content = item.isEllipsis || !renderItem ? item.label : renderItem(item, { index, isCurrent });

          return (
            <li
              className={cx("c-breadcrumb__item", item.isEllipsis && "c-breadcrumb__item--ellipsis")}
              key={itemKey}
            >
              {index > 0 ? (
                <span aria-hidden="true" className="c-breadcrumb__separator">
                  {separator}
                </span>
              ) : null}
              {item.isEllipsis ? (
                <span
                  aria-label={`${collapseLabel}: ${item.collapsedCount}`}
                  className="c-breadcrumb__ellipsis"
                  title={item.title}
                >
                  {content}
                </span>
              ) : safeHref && !isCurrent ? (
                <a
                  {...item.linkProps}
                  className="c-breadcrumb__link"
                  href={safeHref}
                  rel={getSafeLinkRel(item.linkProps?.rel, item.linkProps?.target)}
                  title={item.title}
                >
                  {content}
                </a>
              ) : (
                <span aria-current={isCurrent ? "page" : undefined} className={textClassName} title={item.title}>
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
