import { useId, useMemo, useState, type HTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import { UI_RENDER_BUDGETS, clampRenderLimit, limitItems } from "../../../utils/performance";
import { Button } from "../Button";
import { Input } from "../Input";
import "./style.css";

export type TransferKey = string;
export type TransferDirection = "left" | "right";

export interface TransferItem {
  disabled?: boolean;
  description?: ReactNode;
  key: TransferKey;
  label: ReactNode;
  searchText?: string;
}

export interface TransferListSelectionInfo {
  direction: TransferDirection;
  selectedKeys: TransferKey[];
}

export interface TransferMoveInfo {
  direction: TransferDirection;
  movedKeys: TransferKey[];
  targetKeys: TransferKey[];
}

export interface TransferProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "defaultValue" | "onChange"> {
  dataSource: TransferItem[];
  targetKeys?: TransferKey[];
  defaultTargetKeys?: TransferKey[];
  selectedKeys?: TransferKey[];
  defaultSelectedKeys?: TransferKey[];
  disabled?: boolean;
  leftTitle?: ReactNode;
  rightTitle?: ReactNode;
  leftSearchPlaceholder?: string;
  rightSearchPlaceholder?: string;
  locale?: {
    emptyText?: ReactNode;
    leftTitle?: ReactNode;
    moveLeft?: string;
    moveRight?: string;
    noResultsText?: ReactNode;
    overflowText?: (visibleCount: number, totalCount: number) => ReactNode;
    rightTitle?: ReactNode;
    searchPlaceholder?: string;
    selectAll?: string;
  };
  maxVisibleItems?: number;
  renderItem?: (item: TransferItem, direction: TransferDirection) => ReactNode;
  showSearch?: boolean;
  onChange?: (targetKeys: TransferKey[], info: TransferMoveInfo) => void;
  onSelectChange?: (sourceSelectedKeys: TransferKey[], targetSelectedKeys: TransferKey[]) => void;
  onListSelectChange?: (info: TransferListSelectionInfo) => void;
}

const defaultLocale = {
  emptyText: "No items",
  leftTitle: "Available",
  moveLeft: "Move selected left",
  moveRight: "Move selected right",
  noResultsText: "No matching items",
  overflowText: (visibleCount: number, totalCount: number) =>
    `Showing first ${visibleCount.toLocaleString()} of ${totalCount.toLocaleString()} items. Refine search to narrow the list.`,
  rightTitle: "Selected",
  searchPlaceholder: "Search items",
  selectAll: "Select all",
};

function getTextContent(value: ReactNode): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(getTextContent).join(" ");
  }

  return "";
}

function uniqueKeys(keys: readonly TransferKey[]) {
  return Array.from(new Set(keys));
}

function getEnabledKeys(items: readonly TransferItem[]) {
  return items.filter((item) => !item.disabled).map((item) => item.key);
}

function filterItems(items: readonly TransferItem[], searchValue: string) {
  const query = searchValue.trim().toLowerCase();
  if (!query) {
    return items;
  }

  return items.filter((item) => {
    const searchableText = item.searchText ?? `${getTextContent(item.label)} ${getTextContent(item.description)}`;
    return searchableText.toLowerCase().includes(query);
  });
}

function focusRelativeOption(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") {
    return;
  }

  const list = event.currentTarget.closest(".c-transfer__items");
  if (!list) {
    return;
  }

  const options = Array.from(list.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:not(:disabled)'));
  const currentIndex = options.indexOf(event.currentTarget);
  if (currentIndex === -1 || options.length === 0) {
    return;
  }

  event.preventDefault();
  const nextIndex =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? options.length - 1
        : event.key === "ArrowDown"
          ? Math.min(options.length - 1, currentIndex + 1)
          : Math.max(0, currentIndex - 1);

  options[nextIndex]?.focus();
}

export function Transfer({
  className,
  dataSource,
  defaultSelectedKeys,
  defaultTargetKeys,
  disabled = false,
  leftSearchPlaceholder,
  leftTitle,
  locale: localeProp,
  maxVisibleItems = UI_RENDER_BUDGETS.transferItems,
  onChange,
  onListSelectChange,
  onSelectChange,
  renderItem,
  rightSearchPlaceholder,
  rightTitle,
  selectedKeys,
  showSearch = true,
  targetKeys,
  ...props
}: TransferProps) {
  const generatedId = useId();
  const locale = { ...defaultLocale, ...localeProp };
  const [currentTargetKeys, setTargetKeys] = useControllableState({
    defaultValue: defaultTargetKeys ? uniqueKeys(defaultTargetKeys) : undefined,
    fallbackValue: [],
    value: targetKeys,
  });
  const [currentSelectedKeys, setSelectedKeys] = useControllableState({
    defaultValue: defaultSelectedKeys ? uniqueKeys(defaultSelectedKeys) : undefined,
    fallbackValue: [],
    value: selectedKeys,
  });
  const [leftSearch, setLeftSearch] = useState("");
  const [rightSearch, setRightSearch] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const listRenderLimit = clampRenderLimit(maxVisibleItems, UI_RENDER_BUDGETS.transferItems, 1, UI_RENDER_BUDGETS.transferItems);

  const validKeySet = useMemo(() => new Set(dataSource.map((item) => item.key)), [dataSource]);
  const targetKeySet = useMemo(
    () => new Set(currentTargetKeys.filter((key) => validKeySet.has(key))),
    [currentTargetKeys, validKeySet],
  );
  const selectableKeySet = useMemo(
    () => new Set(dataSource.filter((item) => !item.disabled).map((item) => item.key)),
    [dataSource],
  );
  const selectedKeySet = useMemo(
    () => new Set(currentSelectedKeys.filter((key) => validKeySet.has(key) && selectableKeySet.has(key))),
    [currentSelectedKeys, selectableKeySet, validKeySet],
  );
  const leftItems = useMemo(() => dataSource.filter((item) => !targetKeySet.has(item.key)), [dataSource, targetKeySet]);
  const rightItems = useMemo(() => dataSource.filter((item) => targetKeySet.has(item.key)), [dataSource, targetKeySet]);
  const filteredLeftItems = useMemo(() => filterItems(leftItems, leftSearch), [leftItems, leftSearch]);
  const filteredRightItems = useMemo(() => filterItems(rightItems, rightSearch), [rightItems, rightSearch]);
  const leftEnabledKeys = useMemo(() => getEnabledKeys(leftItems), [leftItems]);
  const rightEnabledKeys = useMemo(() => getEnabledKeys(rightItems), [rightItems]);
  const leftSelectedKeys = leftEnabledKeys.filter((key) => selectedKeySet.has(key));
  const rightSelectedKeys = rightEnabledKeys.filter((key) => selectedKeySet.has(key));
  const canMoveRight = !disabled && leftSelectedKeys.length > 0;
  const canMoveLeft = !disabled && rightSelectedKeys.length > 0;

  const notifySelection = (nextSelectedKeys: TransferKey[], direction: TransferDirection) => {
    const nextSelectedSet = new Set(nextSelectedKeys);
    const nextSourceSelected = leftEnabledKeys.filter((key) => nextSelectedSet.has(key));
    const nextTargetSelected = rightEnabledKeys.filter((key) => nextSelectedSet.has(key));

    setSelectedKeys(nextSelectedKeys);
    onSelectChange?.(nextSourceSelected, nextTargetSelected);
    onListSelectChange?.({
      direction,
      selectedKeys: direction === "left" ? nextSourceSelected : nextTargetSelected,
    });
  };

  const toggleKey = (key: TransferKey, direction: TransferDirection) => {
    if (disabled) {
      return;
    }

    const item = dataSource.find((candidate) => candidate.key === key);
    if (!item || item.disabled) {
      return;
    }

    const nextSelectedSet = new Set(selectedKeySet);
    if (nextSelectedSet.has(key)) {
      nextSelectedSet.delete(key);
    } else {
      nextSelectedSet.add(key);
    }

    notifySelection(Array.from(nextSelectedSet), direction);
  };

  const toggleAllVisible = (direction: TransferDirection, keys: readonly TransferKey[]) => {
    if (disabled || keys.length === 0) {
      return;
    }

    const nextSelectedSet = new Set(selectedKeySet);
    const allVisibleSelected = keys.every((key) => nextSelectedSet.has(key));

    for (const key of keys) {
      if (allVisibleSelected) {
        nextSelectedSet.delete(key);
      } else {
        nextSelectedSet.add(key);
      }
    }

    notifySelection(Array.from(nextSelectedSet), direction);
  };

  const move = (direction: TransferDirection) => {
    const movedKeys = direction === "right" ? leftSelectedKeys : rightSelectedKeys;
    if (disabled || movedKeys.length === 0) {
      return;
    }

    const movedKeySet = new Set(movedKeys);
    const nextTargetKeys =
      direction === "right"
        ? uniqueKeys([...currentTargetKeys, ...movedKeys]).filter((key) => validKeySet.has(key))
        : currentTargetKeys.filter((key) => !movedKeySet.has(key) && validKeySet.has(key));
    const nextSelectedKeys = currentSelectedKeys.filter((key) => !movedKeySet.has(key) && validKeySet.has(key));

    setTargetKeys(nextTargetKeys);
    setSelectedKeys(nextSelectedKeys);
    onChange?.(nextTargetKeys, { direction, movedKeys, targetKeys: nextTargetKeys });
    onSelectChange?.(
      leftEnabledKeys.filter((key) => nextSelectedKeys.includes(key)),
      rightEnabledKeys.filter((key) => nextSelectedKeys.includes(key)),
    );
    setAnnouncement(`${movedKeys.length} item${movedKeys.length === 1 ? "" : "s"} moved ${direction}.`);
  };

  const renderList = (
    direction: TransferDirection,
    items: readonly TransferItem[],
    filteredItems: readonly TransferItem[],
    enabledKeys: readonly TransferKey[],
    searchValue: string,
    setSearchValue: (value: string) => void,
  ) => {
    const listTitle =
      direction === "left"
        ? (leftTitle ?? locale.leftTitle)
        : (rightTitle ?? locale.rightTitle);
    const listId = `${generatedId}-${direction}-list`;
    const searchPlaceholder =
      direction === "left"
        ? (leftSearchPlaceholder ?? locale.searchPlaceholder)
        : (rightSearchPlaceholder ?? locale.searchPlaceholder);
    const visibleItems = limitItems(filteredItems, listRenderLimit);
    const visibleEnabledKeys = getEnabledKeys(visibleItems.items);
    const selectedRenderedCount = visibleEnabledKeys.filter((key) => selectedKeySet.has(key)).length;
    const allVisibleSelected = visibleEnabledKeys.length > 0 && selectedRenderedCount === visibleEnabledKeys.length;
    const someVisibleSelected = selectedRenderedCount > 0 && selectedRenderedCount < visibleEnabledKeys.length;

    return (
      <section className="c-transfer__list" aria-labelledby={`${listId}-title`}>
        <div className="c-transfer__list-header">
          <div>
            <h3 id={`${listId}-title`}>{listTitle}</h3>
            <span>{`${enabledKeys.filter((key) => selectedKeySet.has(key)).length}/${items.length} selected`}</span>
          </div>
          <label className="c-transfer__select-all">
            <input
              aria-label={`${locale.selectAll} ${getTextContent(listTitle) || direction}`}
              checked={allVisibleSelected}
              disabled={disabled || visibleEnabledKeys.length === 0}
              onChange={() => toggleAllVisible(direction, visibleEnabledKeys)}
              ref={(node) => {
                if (node) {
                  node.indeterminate = someVisibleSelected;
                }
              }}
              type="checkbox"
            />
            <span>{locale.selectAll}</span>
          </label>
        </div>
        {showSearch ? (
          <div className="c-transfer__search">
            <Input
              aria-label={`Search ${getTextContent(listTitle) || direction}`}
              disabled={disabled}
              onChange={(event) => setSearchValue(event.currentTarget.value)}
              placeholder={searchPlaceholder}
              value={searchValue}
            />
          </div>
        ) : null}
        <ul aria-multiselectable="true" className="c-transfer__items" id={listId} role="listbox">
          {filteredItems.length > 0 ? (
            <>
              {visibleItems.items.map((item) => {
                const checked = selectedKeySet.has(item.key);
                const itemDisabled = disabled || item.disabled;
                const content = renderItem ? renderItem(item, direction) : item.label;

                return (
                  <li
                    aria-disabled={itemDisabled || undefined}
                    aria-selected={checked}
                    className={cx("c-transfer__item", itemDisabled && "c-transfer__item--disabled")}
                    key={item.key}
                    role="option"
                  >
                    <label className="c-transfer__option">
                      <input
                        checked={checked}
                        disabled={itemDisabled}
                        onKeyDown={focusRelativeOption}
                        onChange={() => toggleKey(item.key, direction)}
                        type="checkbox"
                      />
                      <span className="c-transfer__option-body">
                        <span className="c-transfer__option-label">{content}</span>
                        {item.description ? <span className="c-transfer__option-description">{item.description}</span> : null}
                      </span>
                    </label>
                  </li>
                );
              })}
              {visibleItems.hiddenCount > 0 ? (
                <li className="c-transfer__overflow" role="status">
                  {locale.overflowText(visibleItems.items.length, filteredItems.length)}
                </li>
              ) : null}
            </>
          ) : (
            <li className="c-transfer__empty">{items.length === 0 ? locale.emptyText : locale.noResultsText}</li>
          )}
        </ul>
      </section>
    );
  };

  return (
    <div className={cx("c-transfer", disabled && "c-transfer--disabled", className)} {...props}>
      {renderList(
        "left",
        leftItems,
        filteredLeftItems,
        leftEnabledKeys,
        leftSearch,
        setLeftSearch,
      )}
      <div className="c-transfer__actions" aria-label="Transfer actions">
        <Button
          aria-label={locale.moveRight}
          disabled={!canMoveRight}
          onClick={() => move("right")}
          size="sm"
          variant="solid"
        >
          &gt;
        </Button>
        <Button aria-label={locale.moveLeft} disabled={!canMoveLeft} onClick={() => move("left")} size="sm">
          &lt;
        </Button>
      </div>
      {renderList(
        "right",
        rightItems,
        filteredRightItems,
        rightEnabledKeys,
        rightSearch,
        setRightSearch,
      )}
      <span className="c-sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
