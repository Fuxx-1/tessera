import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import "./style.css";

export type TreeSelectValue = string | string[];
export type TreeSelectSize = "sm" | "md";

export interface TreeSelectNode {
  children?: TreeSelectNode[];
  disabled?: boolean;
  label: ReactNode;
  searchText?: string;
  value: string;
}

export interface TreeSelectChangeInfo {
  node?: TreeSelectNode;
  selectedNodes: TreeSelectNode[];
}

export interface TreeSelectProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "defaultValue" | "onChange"> {
  allowClear?: boolean;
  checkable?: boolean;
  defaultOpen?: boolean;
  defaultValue?: TreeSelectValue;
  disabled?: boolean;
  emptyText?: ReactNode;
  error?: boolean;
  errorText?: ReactNode;
  expandedKeys?: string[];
  helpText?: ReactNode;
  hint?: ReactNode;
  label?: ReactNode;
  mobileMode?: "popover" | "sheet";
  name?: string;
  onExpandedKeysChange?: (keys: string[]) => void;
  onOpenChange?: (open: boolean) => void;
  onSearchChange?: (search: string) => void;
  onValueChange?: (value: TreeSelectValue, info: TreeSelectChangeInfo) => void;
  open?: boolean;
  placeholder?: string;
  searchValue?: string;
  showSearch?: boolean;
  size?: TreeSelectSize;
  treeData: TreeSelectNode[];
  value?: TreeSelectValue;
}

type FlatNode = {
  children?: TreeSelectNode[];
  childValues: string[];
  depth: number;
  disabled?: boolean;
  enabledValues: string[];
  id: string;
  label: ReactNode;
  labelText: string;
  parent?: string;
  searchLabel: string;
  source: TreeSelectNode;
  value: string;
};

type CheckState = "checked" | "mixed" | "unchecked";

const TREE_SELECT_VISIBLE_NODE_LIMIT = 160;
const TREE_SELECT_INDEX_NODE_LIMIT = 10000;
const TREE_SELECT_MAX_DEPTH = 64;

type TreeIndex = {
  flatNodes: FlatNode[];
  nodeByValue: Map<string, FlatNode>;
  truncated: boolean;
};

function getLabelText(label: ReactNode) {
  if (typeof label === "string" || typeof label === "number") {
    return String(label);
  }
  return "";
}

function getDefaultExpanded(nodes: TreeSelectNode[]) {
  return nodes.filter((node) => node.children?.length).map((node) => node.value);
}

function createTreeIndex(nodes: TreeSelectNode[], baseId: string): TreeIndex {
  const flatNodes: FlatNode[] = [];
  const nodeByValue = new Map<string, FlatNode>();
  const stack = nodes
    .slice()
    .reverse()
    .map((node) => ({ depth: 1, node, parent: undefined as string | undefined }));
  let truncated = false;

  while (stack.length > 0 && flatNodes.length < TREE_SELECT_INDEX_NODE_LIMIT) {
    const item = stack.pop();
    if (!item) {
      break;
    }

    const { depth, node, parent } = item;
    const labelText = getLabelText(node.label) || node.value;
    const safeValue = node.value.replace(/[^a-zA-Z0-9_-]/g, "-");
    const duplicateSuffix = nodeByValue.has(node.value) ? `-${flatNodes.length}` : "";
    const flatNode: FlatNode = {
      childValues: [node.value],
      children: node.children,
      depth,
      disabled: node.disabled,
      enabledValues: node.disabled ? [] : [node.value],
      id: `${baseId}-node-${safeValue}${duplicateSuffix}`,
      label: node.label,
      labelText,
      parent,
      searchLabel: [labelText, node.searchText, node.value].filter(Boolean).join(" ").toLowerCase(),
      source: node,
      value: node.value,
    };
    flatNodes.push(flatNode);
    if (!nodeByValue.has(node.value)) {
      nodeByValue.set(node.value, flatNode);
    }

    const children = node.children ?? [];
    if (depth >= TREE_SELECT_MAX_DEPTH && children.length > 0) {
      truncated = true;
      continue;
    }
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push({ depth: depth + 1, node: children[index], parent: node.value });
    }
  }

  if (stack.length > 0) {
    truncated = true;
  }

  for (let index = flatNodes.length - 1; index >= 0; index -= 1) {
    const node = flatNodes[index];
    if (!node.parent) {
      continue;
    }
    const parentNode = nodeByValue.get(node.parent);
    if (!parentNode) {
      continue;
    }
    parentNode.childValues.push(...node.childValues);
    parentNode.enabledValues.push(...node.enabledValues);
  }

  return { flatNodes, nodeByValue, truncated };
}

function getVisibleSearchValues(flatNodes: FlatNode[], nodeByValue: Map<string, FlatNode>, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) {
    return undefined;
  }

  const visibleValues = new Set<string>();
  flatNodes.forEach((node) => {
    if (!node.searchLabel.includes(query)) {
      return;
    }
    visibleValues.add(node.value);
    let parent = node.parent;
    while (parent) {
      visibleValues.add(parent);
      parent = nodeByValue.get(parent)?.parent;
    }
  });
  return visibleValues;
}

function getVisibleNodes(
  flatNodes: FlatNode[],
  nodeByValue: Map<string, FlatNode>,
  expandedKeys: Set<string>,
  search: string,
) {
  const searchVisibleValues = getVisibleSearchValues(flatNodes, nodeByValue, search);
  if (searchVisibleValues) {
    return flatNodes.filter((node) => searchVisibleValues.has(node.value));
  }

  return flatNodes.filter((node) => {
    let parent = node.parent;
    while (parent) {
      if (!expandedKeys.has(parent)) {
        return false;
      }
      parent = nodeByValue.get(parent)?.parent;
    }
    return true;
  });
}

function getSelectedNodes(nodeByValue: Map<string, FlatNode>, selectedValues: Set<string>) {
  return Array.from(selectedValues)
    .map((value) => nodeByValue.get(value)?.source)
    .filter((node): node is TreeSelectNode => Boolean(node));
}

function getCheckState(node: FlatNode, selectedValues: Set<string>): CheckState {
  if (node.enabledValues.length === 0) {
    return "unchecked";
  }
  const selectedCount = node.enabledValues.filter((value) => selectedValues.has(value)).length;
  if (selectedCount === 0) {
    return "unchecked";
  }
  return selectedCount === node.enabledValues.length ? "checked" : "mixed";
}

function getSummaryText(selectedNodes: TreeSelectNode[], placeholder?: string) {
  if (selectedNodes.length === 0) {
    return placeholder ?? "请选择";
  }
  if (selectedNodes.length === 1) {
    return getLabelText(selectedNodes[0].label) || selectedNodes[0].value;
  }
  return `已选择 ${selectedNodes.length} 项`;
}

export function TreeSelect({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  allowClear = false,
  checkable = false,
  className,
  defaultOpen = false,
  defaultValue,
  disabled = false,
  emptyText = "没有匹配的节点",
  error = false,
  errorText,
  expandedKeys,
  helpText,
  hint,
  id,
  label,
  mobileMode = "popover",
  name,
  onExpandedKeysChange,
  onOpenChange,
  onSearchChange,
  onValueChange,
  open,
  placeholder = "请选择",
  searchValue,
  showSearch = true,
  size = "md",
  treeData,
  value,
  ...props
}: TreeSelectProps) {
  const generatedId = useId();
  const fieldId = id ?? name ?? generatedId;
  const labelId = label ? `${fieldId}-label` : undefined;
  const listboxId = `${fieldId}-tree`;
  const helpId = errorText || helpText || hint ? `${fieldId}-help` : undefined;
  const describedBy = [ariaDescribedBy, helpId].filter(Boolean).join(" ") || undefined;
  const invalid = ariaInvalid ?? (error || Boolean(errorText) || undefined);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentOpen, setCurrentOpen] = useControllableState({
    defaultValue: defaultOpen,
    fallbackValue: false,
    onChange: onOpenChange,
    value: open,
  });
  const fallbackValue = checkable ? [] : "";
  const [currentValue, setCurrentValue] = useControllableState<TreeSelectValue>({
    defaultValue,
    fallbackValue,
    value,
  });
  const [currentSearch, setCurrentSearch] = useControllableState({
    defaultValue: "",
    fallbackValue: "",
    onChange: onSearchChange,
    value: searchValue,
  });
  const [currentExpandedKeys, setExpandedKeys] = useControllableState({
    defaultValue: getDefaultExpanded(treeData),
    fallbackValue: getDefaultExpanded(treeData),
    onChange: onExpandedKeysChange,
    value: expandedKeys,
  });
  const [activeValue, setActiveValue] = useState<string | undefined>();
  const treeIndex = useMemo(() => createTreeIndex(treeData, fieldId), [fieldId, treeData]);
  const { flatNodes, nodeByValue } = treeIndex;
  const expandedSet = useMemo(() => new Set(currentExpandedKeys), [currentExpandedKeys]);
  const visibleNodes = useMemo(
    () => getVisibleNodes(flatNodes, nodeByValue, expandedSet, showSearch ? currentSearch : ""),
    [currentSearch, expandedSet, flatNodes, nodeByValue, showSearch],
  );
  const renderedNodes = useMemo(() => visibleNodes.slice(0, TREE_SELECT_VISIBLE_NODE_LIMIT), [visibleNodes]);
  const overflowCount = Math.max(visibleNodes.length - renderedNodes.length, 0);
  const selectedValues = useMemo(
    () => new Set(Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue] : []),
    [currentValue],
  );
  const selectedNodes = useMemo(() => getSelectedNodes(nodeByValue, selectedValues), [nodeByValue, selectedValues]);
  const activeNode = activeValue ? nodeByValue.get(activeValue) : undefined;
  const activeRendered = renderedNodes.some((node) => node.value === activeValue);
  const activeId = currentOpen && activeNode && activeRendered ? activeNode.id : undefined;
  const fieldHelp = errorText ?? helpText ?? hint;
  const renderedSearch = currentOpen && showSearch ? currentSearch : getSummaryText(selectedNodes, placeholder);
  const searchActive = showSearch && currentSearch.trim().length > 0;
  const hasValue = selectedNodes.length > 0;

  const commitValue = useCallback(
    (nextValue: TreeSelectValue, node?: TreeSelectNode) => {
      setCurrentValue(nextValue);
      const selectedSet = new Set(Array.isArray(nextValue) ? nextValue : nextValue ? [nextValue] : []);
      onValueChange?.(nextValue, { node, selectedNodes: getSelectedNodes(nodeByValue, selectedSet) });
    },
    [nodeByValue, onValueChange, setCurrentValue],
  );

  const setSearch = useCallback(
    (nextSearch: string) => {
      setCurrentSearch(nextSearch);
      if (!currentOpen) {
        setCurrentOpen(true);
      }
    },
    [currentOpen, setCurrentOpen, setCurrentSearch],
  );

  const toggleExpanded = useCallback(
    (nodeValue: string, force?: boolean) => {
      const nextExpanded = new Set(currentExpandedKeys);
      const nextOpen = force ?? !nextExpanded.has(nodeValue);
      if (nextOpen) {
        nextExpanded.add(nodeValue);
      } else {
        nextExpanded.delete(nodeValue);
      }
      setExpandedKeys(Array.from(nextExpanded));
    },
    [currentExpandedKeys, setExpandedKeys],
  );

  const selectNode = useCallback(
    (nodeValue: string) => {
      const node = nodeByValue.get(nodeValue);
      if (!node || node.disabled) {
        return;
      }

      if (checkable) {
        const nextSelected = new Set(selectedValues);
        const shouldCheck = node.enabledValues.some((childValue) => !nextSelected.has(childValue));
        node.enabledValues.forEach((childValue) => {
          if (shouldCheck) {
            nextSelected.add(childValue);
          } else {
            nextSelected.delete(childValue);
          }
        });
        commitValue(Array.from(nextSelected), node.source);
        return;
      }

      commitValue(node.value, node.source);
      setCurrentOpen(false);
      setCurrentSearch("");
    },
    [checkable, commitValue, nodeByValue, selectedValues, setCurrentOpen, setCurrentSearch],
  );

  const focusInputSoon = () => {
    inputRef.current?.focus();
    window.requestAnimationFrame(() => inputRef.current?.focus());
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const clearValue = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    commitValue(checkable ? [] : "");
    setCurrentSearch("");
    setCurrentOpen(false);
    focusInputSoon();
  };

  useEffect(() => {
    if (!currentOpen) {
      return;
    }
    const nextActive =
      renderedNodes.find((node) => selectedValues.has(node.value) && !node.disabled)?.value ??
      renderedNodes.find((node) => !node.disabled)?.value;
    setActiveValue((previous) => (previous && renderedNodes.some((node) => node.value === previous) ? previous : nextActive));
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [currentOpen, renderedNodes, selectedValues]);

  useEffect(() => {
    if (!currentOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setCurrentOpen(false);
        setCurrentSearch("");
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [currentOpen, setCurrentOpen, setCurrentSearch]);

  const moveActive = (offset: number) => {
    const enabledNodes = renderedNodes.filter((node) => !node.disabled);
    if (enabledNodes.length === 0) {
      return;
    }
    const currentIndex = Math.max(
      0,
      enabledNodes.findIndex((node) => node.value === activeValue),
    );
    const nextIndex = Math.min(Math.max(currentIndex + offset, 0), enabledNodes.length - 1);
    setActiveValue(enabledNodes[nextIndex].value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }

    if (!currentOpen && ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      setCurrentOpen(true);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setCurrentOpen(false);
      setCurrentSearch("");
      return;
    }

    if (!currentOpen) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveValue(renderedNodes.find((node) => !node.disabled)?.value);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveValue([...renderedNodes].reverse().find((node) => !node.disabled)?.value);
    } else if (event.key === "ArrowRight" && activeNode?.children?.length) {
      event.preventDefault();
      toggleExpanded(activeNode.value, true);
    } else if (event.key === "ArrowLeft" && activeNode?.children?.length) {
      event.preventDefault();
      toggleExpanded(activeNode.value, false);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (activeValue) {
        selectNode(activeValue);
      }
    }
  };

  const handleInputClick = () => {
    if (disabled) {
      return;
    }
    if (!currentOpen) {
      setCurrentOpen(true);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const handleToggleClick = () => {
    if (disabled) {
      return;
    }
    setCurrentOpen(!currentOpen);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleNodeClick = (event: MouseEvent, node: FlatNode) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveValue(node.value);
    selectNode(node.value);
  };

  return (
    <div
      className={cx(
        "c-tree-select-field",
        invalid && "c-tree-select-field--error",
        disabled && "c-tree-select-field--disabled",
        currentOpen && "c-tree-select-field--open",
        className,
      )}
      ref={rootRef}
      {...props}
    >
      {label ? (
        <label className="c-field__label" htmlFor={fieldId} id={labelId}>
          {label}
        </label>
      ) : null}
      {name ? (
        <input
          name={name}
          type="hidden"
          value={Array.isArray(currentValue) ? currentValue.join(",") : currentValue}
        />
      ) : null}
      <div className="c-tree-select-field__control">
        <input
          aria-activedescendant={activeId}
          aria-autocomplete={showSearch ? "list" : undefined}
          aria-controls={listboxId}
          aria-describedby={describedBy}
          aria-expanded={currentOpen}
          aria-haspopup="tree"
          aria-invalid={invalid}
          autoComplete="off"
          className={cx("c-tree-select", `c-tree-select--${size}`)}
          disabled={disabled}
          id={fieldId}
          onChange={(event) => setSearch(event.currentTarget.value)}
          onClick={handleInputClick}
          onKeyDown={handleKeyDown}
          placeholder={currentOpen && showSearch ? placeholder : undefined}
          readOnly={!showSearch}
          ref={inputRef}
          role="combobox"
          value={renderedSearch}
        />
        {allowClear && hasValue && !disabled ? (
          <button
            aria-label="清除树选择"
            className="c-tree-select__clear"
            onClick={clearValue}
            onMouseDown={(event) => event.preventDefault()}
            onPointerDown={(event) => event.preventDefault()}
            type="button"
          />
        ) : null}
        <button
          aria-label={currentOpen ? "收起树选择" : "展开树选择"}
          className="c-tree-select__toggle"
          disabled={disabled}
          onClick={handleToggleClick}
          type="button"
        />
      </div>
      <div
        className={cx("c-tree-select__popup", mobileMode === "sheet" && "c-tree-select__popup--sheet")}
        hidden={!currentOpen}
      >
        <div
          aria-label={label ? undefined : "树选择候选项"}
          aria-labelledby={labelId}
          className="c-tree-select__tree"
          id={listboxId}
          role="tree"
        >
          {visibleNodes.length > 0 ? (
            renderedNodes.map((node) => {
              const hasChildren = Boolean(node.children?.length);
              const checkState = getCheckState(node, selectedValues);
              return (
                <div
                  aria-label={node.labelText || node.value}
                  aria-checked={checkable ? (checkState === "mixed" ? "mixed" : checkState === "checked") : undefined}
                  aria-disabled={node.disabled || undefined}
                  aria-expanded={hasChildren ? searchActive || expandedSet.has(node.value) : undefined}
                  aria-level={node.depth}
                  aria-selected={!checkable ? selectedValues.has(node.value) : undefined}
                  className={cx(
                    "c-tree-select__item",
                    checkable && "c-tree-select__item--checkable",
                    activeValue === node.value && "c-tree-select__item--active",
                    selectedValues.has(node.value) && "c-tree-select__item--selected",
                    node.disabled && "c-tree-select__item--disabled",
                  )}
                  id={node.id}
                  key={node.value}
                  onClick={(event) => handleNodeClick(event, node)}
                  role="treeitem"
                  style={{ "--tree-select-depth": node.depth - 1 } as CSSProperties}
                >
                  <button
                    aria-label={expandedSet.has(node.value) ? "收起节点" : "展开节点"}
                    className={cx("c-tree-select__branch", hasChildren && "c-tree-select__branch--visible")}
                    disabled={!hasChildren || node.disabled}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleExpanded(node.value);
                    }}
                    tabIndex={-1}
                    type="button"
                  />
                  {checkable ? (
                    <span
                      aria-hidden="true"
                      className={cx(
                        "c-tree-select__check",
                        checkState === "checked" && "c-tree-select__check--checked",
                        checkState === "mixed" && "c-tree-select__check--mixed",
                      )}
                    />
                  ) : null}
                  <span className="c-tree-select__label">{node.label}</span>
                </div>
              );
            })
          ) : (
            <div className="c-tree-select__empty" role="status">
              {emptyText}
            </div>
          )}
          {overflowCount > 0 ? (
            <div className="c-tree-select__overflow" role="status">
              已显示前 {TREE_SELECT_VISIBLE_NODE_LIMIT} 项，继续输入关键字可缩小范围（剩余 {overflowCount} 项）。
            </div>
          ) : null}
          {treeIndex.truncated ? (
            <div className="c-tree-select__overflow" role="status">
              已达到 {TREE_SELECT_INDEX_NODE_LIMIT} 节点或 {TREE_SELECT_MAX_DEPTH} 层预算，继续输入关键字或分段加载可缩小范围。
            </div>
          ) : null}
        </div>
      </div>
      {fieldHelp ? (
        <span className={cx("c-field__hint", invalid && "c-field__hint--error")} id={helpId}>
          {fieldHelp}
        </span>
      ) : null}
    </div>
  );
}
