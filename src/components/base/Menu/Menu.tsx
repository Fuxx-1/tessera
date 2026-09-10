import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import "./style.css";
import { getSafeHref, getSafeLinkRel } from "../../../utils/url";

export type MenuOrientation = "vertical" | "horizontal";
export type MenuMode = MenuOrientation;
export type MenuSelectionKey = string;

export type MenuItem = {
  disabled?: boolean;
  href?: string;
  icon?: ReactNode;
  key: string;
  label: ReactNode;
  title?: string;
  type?: "item";
  linkProps?: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className" | "href" | "onClick" | "role" | "title">;
  buttonProps?: Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "className" | "disabled" | "onClick" | "role" | "title" | "type"
  >;
};

export type MenuSubmenu = {
  children: MenuNode[];
  disabled?: boolean;
  icon?: ReactNode;
  key: string;
  label: ReactNode;
  title?: string;
  type: "submenu";
};

export type MenuGroup = {
  children: MenuNode[];
  key: string;
  label: ReactNode;
  type: "group";
};

export type MenuSeparator = {
  key: string;
  type: "separator";
};

export type MenuNode = MenuItem | MenuSubmenu | MenuGroup | MenuSeparator;

export interface MenuProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "defaultValue" | "onSelect"> {
  "aria-label"?: string;
  defaultOpenKeys?: string[];
  defaultSelected?: string;
  defaultSelectedKey?: string;
  items: MenuNode[];
  mode?: MenuMode;
  mobileOverflow?: boolean;
  onOpenChange?: (openKeys: string[]) => void;
  onOpenKeysChange?: (openKeys: string[]) => void;
  onSelect?: (key: string, item: MenuItem) => void;
  openKeys?: string[];
  overflow?: "auto" | "wrap";
  orientation?: MenuOrientation;
  selected?: string;
  selectedKey?: string;
}

export interface MenuSelectionChange {
  item: MenuItem;
  key: MenuSelectionKey;
}

export type MenuLeafItem = MenuItem;
export type MenuSubmenuItem = MenuSubmenu;
export type MenuGroupItem = MenuGroup;

type RenderableMenuItem = {
  disabled: boolean;
  href?: string;
  key: string;
  node: MenuItem | MenuSubmenu;
  parentKey?: string;
  submenu: boolean;
};

function isGroup(item: MenuNode): item is MenuGroup {
  return item.type === "group";
}

function isSeparator(item: MenuNode): item is MenuSeparator {
  return item.type === "separator";
}

function isSubmenu(item: MenuNode): item is MenuSubmenu {
  return item.type === "submenu";
}

function isLeafItem(item: MenuNode): item is MenuItem {
  return item.type === "item" || item.type === undefined;
}

function getEnabledItems(items: MenuNode[], openKeySet: Set<string>, parentKey?: string): RenderableMenuItem[] {
  return items.flatMap((item): RenderableMenuItem[] => {
    if (isSeparator(item)) {
      return [];
    }

    if (isGroup(item)) {
      return getEnabledItems(item.children, openKeySet, parentKey);
    }

    const current = {
      disabled: Boolean(item.disabled),
      href: isLeafItem(item) ? item.href : undefined,
      key: item.key,
      node: item,
      parentKey,
      submenu: isSubmenu(item),
    };

    if (isSubmenu(item) && openKeySet.has(item.key)) {
      return [current, ...getEnabledItems(item.children, openKeySet, item.key)];
    }

    return [current];
  });
}

function findFirstEnabledKey(items: RenderableMenuItem[]) {
  return items.find((item) => !item.disabled)?.key ?? items[0]?.key ?? "";
}

function safeDomId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function readItemText(node: ReactNode) {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  return undefined;
}

export function Menu({
  "aria-label": ariaLabel = "Menu",
  className,
  defaultOpenKeys = [],
  defaultSelected,
  defaultSelectedKey,
  items,
  mode,
  mobileOverflow = true,
  onOpenChange,
  onOpenKeysChange,
  onSelect,
  openKeys,
  overflow = "auto",
  orientation = "vertical",
  selected,
  selectedKey,
  ...props
}: MenuProps) {
  const resolvedOrientation = mode ?? orientation;
  const resolvedSelectedKey = selectedKey ?? selected;
  const resolvedDefaultSelectedKey = defaultSelectedKey ?? defaultSelected;
  const generatedId = useId();
  const menuId = `menu-${generatedId.replace(/:/g, "")}`;
  const [currentSelectedKey, setSelected] = useControllableState({
    defaultValue: resolvedDefaultSelectedKey,
    fallbackValue: "",
    onChange: undefined,
    value: resolvedSelectedKey,
  });
  const openIsControlled = openKeys !== undefined;
  const [internalOpenKeys, setInternalOpenKeys] = useState(defaultOpenKeys);
  const currentOpenKeys = openIsControlled ? openKeys : internalOpenKeys;
  const openKeySet = useMemo(() => new Set(currentOpenKeys), [currentOpenKeys]);
  const focusRefs = useRef<Record<string, HTMLElement | null>>({});
  const [activeKey, setActiveKey] = useState("");
  const enabledItems = useMemo(() => getEnabledItems(items, openKeySet), [items, openKeySet]);

  useEffect(() => {
    if (!enabledItems.some((item) => item.key === activeKey && !item.disabled)) {
      const selectedEnabledItem = enabledItems.find((item) => item.key === currentSelectedKey && !item.disabled);
      setActiveKey(selectedEnabledItem?.key ?? findFirstEnabledKey(enabledItems));
    }
  }, [activeKey, currentSelectedKey, enabledItems]);

  function commitOpenKeys(nextKeys: string[]) {
    if (!openIsControlled) {
      setInternalOpenKeys(nextKeys);
    }

    onOpenChange?.(nextKeys);
    onOpenKeysChange?.(nextKeys);
  }

  function openSubmenu(key: string) {
    if (!openKeySet.has(key)) {
      commitOpenKeys([...currentOpenKeys, key]);
    }
  }

  function closeSubmenu(key: string) {
    if (openKeySet.has(key)) {
      commitOpenKeys(currentOpenKeys.filter((currentKey) => currentKey !== key));
    }
  }

  function toggleSubmenu(key: string) {
    if (openKeySet.has(key)) {
      closeSubmenu(key);
    } else {
      openSubmenu(key);
    }
  }

  function focusItem(key: string) {
    setActiveKey(key);
    focusRefs.current[key]?.focus();
    requestAnimationFrame(() => {
      focusRefs.current[key]?.focus();
    });
  }

  function focusByOffset(key: string, offset: number) {
    const focusableItems = enabledItems.filter((item) => !item.disabled);
    const currentIndex = focusableItems.findIndex((item) => item.key === key);
    const startIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (startIndex + offset + focusableItems.length) % focusableItems.length;
    const nextKey = focusableItems[nextIndex]?.key;

    if (nextKey) {
      focusItem(nextKey);
    }
  }

  function focusBoundary(first: boolean) {
    const focusableItems = enabledItems.filter((item) => !item.disabled);
    const nextKey = first ? focusableItems[0]?.key : focusableItems[focusableItems.length - 1]?.key;

    if (nextKey) {
      focusItem(nextKey);
    }
  }

  function selectLeaf(item: MenuItem) {
    if (item.disabled) {
      return;
    }

    setSelected(item.key);
    onSelect?.(item.key, item);
  }

  function findRenderable(key: string) {
    return enabledItems.find((item) => item.key === key);
  }

  function handleItemKeyDown(event: KeyboardEvent<HTMLElement>, item: MenuItem | MenuSubmenu, parentKey?: string) {
    const renderable = findRenderable(item.key);
    const isRootHorizontal = resolvedOrientation === "horizontal" && !parentKey;
    const isItemSubmenu = isSubmenu(item);

    if (event.key === "Home") {
      event.preventDefault();
      focusBoundary(true);
    } else if (event.key === "End") {
      event.preventDefault();
      focusBoundary(false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (isRootHorizontal && isItemSubmenu) {
        openSubmenu(item.key);
        const firstChildKey = getEnabledItems(item.children, new Set([item.key, ...currentOpenKeys])).find(
          (child) => !child.disabled,
        )?.key;
        if (firstChildKey) {
          focusItem(firstChildKey);
        }
      } else {
        focusByOffset(item.key, 1);
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusByOffset(item.key, -1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      if (isItemSubmenu && resolvedOrientation === "vertical") {
        openSubmenu(item.key);
        const firstChildKey = getEnabledItems(item.children, new Set([item.key, ...currentOpenKeys])).find(
          (child) => !child.disabled,
        )?.key;
        if (firstChildKey) {
          focusItem(firstChildKey);
        }
      } else {
        focusByOffset(item.key, 1);
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (parentKey) {
        closeSubmenu(parentKey);
        focusItem(parentKey);
      } else {
        focusByOffset(item.key, -1);
      }
    } else if (event.key === "Escape") {
      if (parentKey) {
        event.preventDefault();
        closeSubmenu(parentKey);
        focusItem(parentKey);
      }
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isItemSubmenu) {
        toggleSubmenu(item.key);
      } else if (renderable && isLeafItem(item)) {
        selectLeaf(item);
      }
    }
  }

  function handleLeafClick(event: MouseEvent<HTMLElement>, item: MenuItem) {
    if (item.disabled) {
      event.preventDefault();
      return;
    }

    selectLeaf(item);
  }

  function renderItems(menuItems: MenuNode[], depth: number, parentKey?: string) {
    return menuItems.map((item, index) => {
      if (isSeparator(item)) {
        return <li className="c-menu__separator" key={item.key} role="separator" />;
      }

      if (isGroup(item)) {
        const groupId = `${menuId}-${safeDomId(item.key)}-label`;

        return (
          <li className="c-menu__group" key={item.key} role="none">
            <div className="c-menu__group-label" id={groupId}>
              {item.label}
            </div>
            <ul aria-labelledby={groupId} className="c-menu__group-list" role="group">
              {renderItems(item.children, depth + 1, parentKey)}
            </ul>
          </li>
        );
      }

      const isOpen = isSubmenu(item) && openKeySet.has(item.key);
      const isSelected = currentSelectedKey === item.key;
      const tabIndex = activeKey === item.key && !item.disabled ? 0 : -1;
      const safeHref = isLeafItem(item) ? getSafeHref(item.href) : undefined;
      const controlId = `${menuId}-${safeDomId(item.key)}-submenu`;
      const current: "page" | undefined = isSelected && safeHref ? "page" : undefined;
      const commonProps = {
        "aria-disabled": item.disabled || undefined,
        "data-disabled": item.disabled ? "true" : undefined,
        "data-open": isOpen ? "true" : undefined,
        "data-selected": isSelected ? "true" : undefined,
        "data-submenu": isSubmenu(item) ? "true" : undefined,
        className: cx("c-menu__item", isSelected && "c-menu__item--selected"),
        onFocus: () => setActiveKey(item.key),
        onKeyDown: (event: KeyboardEvent<HTMLElement>) => handleItemKeyDown(event, item, parentKey),
        ref: (node: HTMLElement | null) => {
          focusRefs.current[item.key] = node;
        },
        role: "menuitem",
        tabIndex,
        title: item.title,
      };
      const content = (
        <>
          {item.icon ? <span aria-hidden="true" className="c-menu__icon">{item.icon}</span> : null}
          <span className="c-menu__label">{item.label}</span>
          {isSubmenu(item) ? <span aria-hidden="true" className="c-menu__chevron">›</span> : null}
        </>
      );

      return (
        <li className="c-menu__row" key={item.key} role="none" style={{ "--menu-depth": depth } as React.CSSProperties}>
          {isSubmenu(item) ? (
            <button
              {...commonProps}
              aria-controls={controlId}
              aria-current={current}
              aria-expanded={isOpen}
              aria-haspopup="menu"
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled) {
                  toggleSubmenu(item.key);
                }
              }}
              type="button"
            >
              {content}
            </button>
          ) : safeHref && !item.disabled ? (
            <a
              {...item.linkProps}
              {...commonProps}
              aria-current={current}
              href={safeHref}
              onClick={(event) => handleLeafClick(event, item)}
              rel={getSafeLinkRel(item.linkProps?.rel, item.linkProps?.target)}
            >
              {content}
            </a>
          ) : (
            <button
              {...item.buttonProps}
              {...commonProps}
              aria-current={current}
              disabled={item.disabled}
              onClick={(event) => handleLeafClick(event, item)}
              type="button"
            >
              {content}
            </button>
          )}
          {isSubmenu(item) && isOpen ? (
            <ul
              aria-label={`${readItemText(item.label) ?? "Submenu"} submenu`}
              className="c-menu__submenu"
              data-orientation="vertical"
              id={controlId}
              role="menu"
            >
              {renderItems(item.children, depth + 1, item.key)}
            </ul>
          ) : null}
        </li>
      );
    });
  }

  return (
    <nav
      aria-label={ariaLabel}
      className={cx(
        "c-menu",
        `c-menu--${resolvedOrientation}`,
        mobileOverflow && "c-menu--mobile-overflow",
        className,
      )}
      data-orientation={resolvedOrientation}
      {...props}
    >
      <div className="c-menu__viewport" data-overflow={overflow} data-overflowing={mobileOverflow ? "true" : undefined}>
        <ul
          aria-orientation={resolvedOrientation}
          className="c-menu__list"
          role={resolvedOrientation === "horizontal" ? "menubar" : "menu"}
        >
          {renderItems(items, 0)}
        </ul>
      </div>
    </nav>
  );
}
