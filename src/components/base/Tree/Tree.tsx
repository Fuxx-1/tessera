import {
  useCallback,
  useEffect,
  useId,
  useMemo,
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

export type TreeSelectionMode = "single" | "multiple";
export type TreeCheckState = "checked" | "mixed" | "unchecked";

export interface TreeNode {
  children?: TreeNode[];
  disabled?: boolean;
  label: ReactNode;
  key: string;
}

export interface TreeChangeInfo {
  key: string;
  node: TreeNode;
}

export interface TreeCheckInfo extends TreeChangeInfo {
  checked: boolean;
  checkedKeys: string[];
}

export interface TreeProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "defaultChecked"> {
  ariaLabel?: string;
  checkable?: boolean;
  checkedKeys?: string[];
  defaultCheckedKeys?: string[];
  defaultExpandedKeys?: string[];
  defaultSelectedKeys?: string[];
  disabled?: boolean;
  emptyText?: ReactNode;
  expandedKeys?: string[];
  maxVisibleNodes?: number;
  onCheckedKeysChange?: (keys: string[], info: TreeCheckInfo) => void;
  onExpandedKeysChange?: (keys: string[], info: TreeChangeInfo) => void;
  onSelectedKeysChange?: (keys: string[], info: TreeChangeInfo) => void;
  selectedKeys?: string[];
  selectionMode?: TreeSelectionMode;
  treeData: TreeNode[];
}

type FlatTreeNode = {
  childCount: number;
  depth: number;
  disabled?: boolean;
  id: string;
  isLastSibling: boolean;
  key: string;
  label: ReactNode;
  parentKey?: string;
  siblingIndex: number;
};

function hashKey(key: string) {
  let hash = 5381;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 33) ^ key.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function createDomId(baseId: string, key: string) {
  return `${baseId}-node-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}-${hashKey(key)}`;
}

function buildTreeIndexes(treeData: TreeNode[], baseId: string) {
  const flatNodes: FlatTreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();
  const flatMap = new Map<string, FlatTreeNode>();
  const parentMap = new Map<string, string | undefined>();
  const childKeysMap = new Map<string, string[]>();
  const stack = treeData
    .map((node, index) => ({
      depth: 1,
      isLastSibling: index === treeData.length - 1,
      node,
      parentKey: undefined as string | undefined,
      siblingIndex: index + 1,
    }))
    .reverse();

  while (stack.length > 0) {
    const item = stack.pop();
    if (!item) {
      continue;
    }

    const { depth, isLastSibling, node, parentKey, siblingIndex } = item;
    const children = node.children ?? [];
    const flatNode: FlatTreeNode = {
      childCount: children.length,
      depth,
      disabled: node.disabled,
      id: createDomId(baseId, node.key),
      isLastSibling,
      key: node.key,
      label: node.label,
      parentKey,
      siblingIndex,
    };

    flatNodes.push(flatNode);
    nodeMap.set(node.key, node);
    flatMap.set(node.key, flatNode);
    parentMap.set(node.key, parentKey);
    childKeysMap.set(node.key, children.map((child) => child.key));

    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push({
        depth: depth + 1,
        isLastSibling: index === children.length - 1,
        node: children[index],
        parentKey: node.key,
        siblingIndex: index + 1,
      });
    }
  }

  return { childKeysMap, flatMap, flatNodes, nodeMap, parentMap };
}

function getVisibleNodes(flatNodes: FlatTreeNode[], parentMap: Map<string, string | undefined>, expandedKeys: Set<string>) {
  return flatNodes.filter((node) => {
    let parentKey = parentMap.get(node.key);
    while (parentKey) {
      if (!expandedKeys.has(parentKey)) {
        return false;
      }
      parentKey = parentMap.get(parentKey);
    }
    return true;
  });
}

function collectEnabledDescendantKeys(rootKey: string, childKeysMap: Map<string, string[]>, nodeMap: Map<string, TreeNode>) {
  const keys: string[] = [];
  const stack = [rootKey];

  while (stack.length > 0) {
    const key = stack.pop();
    if (!key) {
      continue;
    }
    const node = nodeMap.get(key);
    if (!node || node.disabled) {
      continue;
    }

    keys.push(key);
    const childKeys = childKeysMap.get(key) ?? [];
    for (let index = childKeys.length - 1; index >= 0; index -= 1) {
      stack.push(childKeys[index]);
    }
  }

  return keys;
}

function getCheckState(key: string, checkedSet: Set<string>, childKeysMap: Map<string, string[]>, nodeMap: Map<string, TreeNode>) {
  const keys = collectEnabledDescendantKeys(key, childKeysMap, nodeMap);
  if (keys.length === 0) {
    return "unchecked";
  }

  const checkedCount = keys.filter((candidateKey) => checkedSet.has(candidateKey)).length;
  if (checkedCount === 0) {
    return "unchecked";
  }

  return checkedCount === keys.length ? "checked" : "mixed";
}

function getNextEnabledNode(visibleNodes: FlatTreeNode[], activeKey: string | undefined, offset: number) {
  const enabledNodes = visibleNodes.filter((node) => !node.disabled);
  if (enabledNodes.length === 0) {
    return undefined;
  }

  const foundIndex = enabledNodes.findIndex((node) => node.key === activeKey);
  if (foundIndex === -1) {
    return offset > 0 ? enabledNodes[0] : enabledNodes[enabledNodes.length - 1];
  }

  const currentIndex = Math.max(0, foundIndex);
  const nextIndex = Math.min(Math.max(currentIndex + offset, 0), enabledNodes.length - 1);
  return enabledNodes[nextIndex];
}

function getNextSelectedKeys(
  currentKeys: Set<string>,
  nodeKey: string,
  selectionMode: TreeSelectionMode,
  additive: boolean,
) {
  if (selectionMode === "multiple") {
    const nextKeys = additive ? new Set(currentKeys) : new Set<string>();
    if (nextKeys.has(nodeKey)) {
      nextKeys.delete(nodeKey);
    } else {
      nextKeys.add(nodeKey);
    }
    return Array.from(nextKeys);
  }

  return currentKeys.has(nodeKey) ? [] : [nodeKey];
}

function normalizeSelectedKeys(keys: string[], selectionMode: TreeSelectionMode) {
  const uniqueKeys = Array.from(new Set(keys));
  return selectionMode === "single" ? uniqueKeys.slice(0, 1) : uniqueKeys;
}

export function Tree({
  ariaLabel,
  checkable = false,
  checkedKeys,
  className,
  defaultCheckedKeys,
  defaultExpandedKeys,
  defaultSelectedKeys,
  disabled = false,
  emptyText = "No tree data",
  expandedKeys,
  id,
  maxVisibleNodes = 800,
  onCheckedKeysChange,
  onExpandedKeysChange,
  onSelectedKeysChange,
  selectedKeys,
  selectionMode = "single",
  treeData,
  ...props
}: TreeProps) {
  const generatedId = useId();
  const treeId = id ?? generatedId;
  const { childKeysMap, flatMap, flatNodes, nodeMap, parentMap } = useMemo(
    () => buildTreeIndexes(treeData, treeId),
    [treeData, treeId],
  );
  const [currentExpandedKeys, setExpandedKeys] = useControllableState({
    defaultValue: defaultExpandedKeys,
    fallbackValue: [],
    value: expandedKeys,
  });
  const [currentSelectedKeys, setSelectedKeys] = useControllableState({
    defaultValue: defaultSelectedKeys ? normalizeSelectedKeys(defaultSelectedKeys, selectionMode) : undefined,
    fallbackValue: [],
    value: selectedKeys ? normalizeSelectedKeys(selectedKeys, selectionMode) : undefined,
  });
  const [currentCheckedKeys, setCheckedKeys] = useControllableState({
    defaultValue: defaultCheckedKeys,
    fallbackValue: [],
    value: checkedKeys,
  });
  const expandedSet = useMemo(() => new Set(currentExpandedKeys), [currentExpandedKeys]);
  const selectedSet = useMemo(() => new Set(currentSelectedKeys), [currentSelectedKeys]);
  const checkedSet = useMemo(() => new Set(currentCheckedKeys), [currentCheckedKeys]);
  const visibleNodes = useMemo(
    () => getVisibleNodes(flatNodes, parentMap, expandedSet),
    [expandedSet, flatNodes, parentMap],
  );
  const renderLimit = Math.max(0, Math.floor(maxVisibleNodes));
  const renderedNodes = useMemo(
    () => (renderLimit > 0 ? visibleNodes.slice(0, renderLimit) : []),
    [renderLimit, visibleNodes],
  );
  const hiddenVisibleCount = Math.max(0, visibleNodes.length - renderedNodes.length);
  const [activeKey, setActiveKey] = useState<string | undefined>();
  const activeNode = activeKey ? flatMap.get(activeKey) : undefined;

  useEffect(() => {
    if (activeKey && renderedNodes.some((node) => node.key === activeKey && !node.disabled)) {
      return;
    }

    const nextActive =
      renderedNodes.find((node) => selectedSet.has(node.key) && !node.disabled)?.key ??
      renderedNodes.find((node) => !node.disabled)?.key;
    setActiveKey(nextActive);
  }, [activeKey, renderedNodes, selectedSet]);

  const toggleExpanded = useCallback(
    (key: string, force?: boolean) => {
      const node = nodeMap.get(key);
      if (disabled || !node || node.disabled || !(node.children?.length)) {
        return;
      }

      const nextExpanded = new Set(currentExpandedKeys);
      const shouldExpand = force ?? !nextExpanded.has(key);
      if (shouldExpand) {
        nextExpanded.add(key);
      } else {
        nextExpanded.delete(key);
      }

      const nextKeys = Array.from(nextExpanded);
      setExpandedKeys(nextKeys);
      onExpandedKeysChange?.(nextKeys, { key, node });
    },
    [currentExpandedKeys, disabled, nodeMap, onExpandedKeysChange, setExpandedKeys],
  );

  const selectNode = useCallback(
    (key: string, additive = false) => {
      const node = nodeMap.get(key);
      if (disabled || !node || node.disabled) {
        return;
      }

      const nextKeys = getNextSelectedKeys(selectedSet, key, selectionMode, additive);
      setSelectedKeys(nextKeys);
      onSelectedKeysChange?.(nextKeys, { key, node });
    },
    [disabled, nodeMap, onSelectedKeysChange, selectedSet, selectionMode, setSelectedKeys],
  );

  const checkNode = useCallback(
    (key: string) => {
      const node = nodeMap.get(key);
      if (disabled || !node || node.disabled) {
        return;
      }

      const enabledKeys = collectEnabledDescendantKeys(key, childKeysMap, nodeMap);
      const nextChecked = new Set(currentCheckedKeys);
      const shouldCheck = enabledKeys.some((candidateKey) => !nextChecked.has(candidateKey));

      enabledKeys.forEach((candidateKey) => {
        if (shouldCheck) {
          nextChecked.add(candidateKey);
        } else {
          nextChecked.delete(candidateKey);
        }
      });

      const nextKeys = Array.from(nextChecked);
      setCheckedKeys(nextKeys);
      onCheckedKeysChange?.(nextKeys, { checked: shouldCheck, checkedKeys: nextKeys, key, node });
    },
    [childKeysMap, currentCheckedKeys, disabled, nodeMap, onCheckedKeysChange, setCheckedKeys],
  );

  const activateNode = (key: string) => {
    if (disabled) {
      return;
    }
    const node = nodeMap.get(key);
    if (!node || node.disabled) {
      return;
    }
    setActiveKey(key);
  };

  const handleNodeClick = (event: MouseEvent, node: FlatTreeNode) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled || node.disabled) {
      return;
    }

    setActiveKey(node.key);
    selectNode(node.key, event.metaKey || event.ctrlKey || event.shiftKey);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || renderedNodes.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveKey(getNextEnabledNode(renderedNodes, activeKey, 1)?.key);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveKey(getNextEnabledNode(renderedNodes, activeKey, -1)?.key);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveKey(renderedNodes.find((node) => !node.disabled)?.key);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveKey([...renderedNodes].reverse().find((node) => !node.disabled)?.key);
    } else if (event.key === "ArrowRight" && activeNode) {
      event.preventDefault();
      if (activeNode.childCount > 0 && !expandedSet.has(activeNode.key)) {
        toggleExpanded(activeNode.key, true);
      } else {
        const nextChild = renderedNodes.find((node) => node.parentKey === activeNode.key && !node.disabled);
        setActiveKey(nextChild?.key ?? activeNode.key);
      }
    } else if (event.key === "ArrowLeft" && activeNode) {
      event.preventDefault();
      if (activeNode.childCount > 0 && expandedSet.has(activeNode.key)) {
        toggleExpanded(activeNode.key, false);
      } else {
        const parentKey = parentMap.get(activeNode.key);
        if (parentKey && !nodeMap.get(parentKey)?.disabled) {
          setActiveKey(parentKey);
        }
      }
    } else if (event.key === "Enter" && activeNode) {
      event.preventDefault();
      selectNode(activeNode.key, event.metaKey || event.ctrlKey || event.shiftKey);
    } else if (event.key === " " && activeNode) {
      event.preventDefault();
      if (checkable) {
        checkNode(activeNode.key);
      } else {
        selectNode(activeNode.key, event.metaKey || event.ctrlKey || event.shiftKey);
      }
    } else if (event.key === "*" || event.key === "+") {
      event.preventDefault();
      const parentKey = activeNode?.parentKey;
      const siblingKeys = renderedNodes
        .filter((node) => node.parentKey === parentKey && node.childCount > 0 && !node.disabled)
        .map((node) => node.key);
      const nextExpanded = Array.from(new Set([...currentExpandedKeys, ...siblingKeys]));
      setExpandedKeys(nextExpanded);
      if (activeNode) {
        const sourceNode = nodeMap.get(activeNode.key);
        if (sourceNode) {
          onExpandedKeysChange?.(nextExpanded, { key: activeNode.key, node: sourceNode });
        }
      }
    }
  };

  if (flatNodes.length === 0) {
    return (
      <div
        aria-disabled={disabled || undefined}
        aria-label={ariaLabel ?? "Tree"}
        className={cx("c-tree", disabled && "c-tree--disabled", className)}
        id={id}
        role="tree"
        tabIndex={disabled ? undefined : 0}
        {...props}
      >
        <div className="c-tree__empty" role="status">
          {emptyText}
        </div>
      </div>
    );
  }

  return (
    <div
      aria-activedescendant={activeNode?.id}
      aria-disabled={disabled || undefined}
      aria-label={ariaLabel ?? "Tree"}
      aria-multiselectable={!checkable && selectionMode === "multiple" ? true : undefined}
      className={cx("c-tree", checkable && "c-tree--checkable", disabled && "c-tree--disabled", className)}
      id={id}
      onKeyDown={handleKeyDown}
      role="tree"
      tabIndex={disabled ? undefined : 0}
      {...props}
    >
      {renderedNodes.map((node) => {
        const hasChildren = node.childCount > 0;
        const checkState = getCheckState(node.key, checkedSet, childKeysMap, nodeMap);
        const isExpanded = expandedSet.has(node.key);
        const isSelected = selectedSet.has(node.key);
        const sourceNode = nodeMap.get(node.key);

        return (
          <div
            aria-checked={checkable ? (checkState === "mixed" ? "mixed" : checkState === "checked") : undefined}
            aria-disabled={disabled || node.disabled || undefined}
            aria-expanded={hasChildren ? isExpanded : undefined}
            aria-level={node.depth}
            aria-posinset={node.siblingIndex}
            aria-selected={!checkable ? isSelected : undefined}
            aria-setsize={
              node.parentKey ? childKeysMap.get(node.parentKey)?.length ?? 1 : treeData.length
            }
            className={cx(
              "c-tree__item",
              activeKey === node.key && "c-tree__item--active",
              isSelected && "c-tree__item--selected",
              node.disabled && "c-tree__item--disabled",
            )}
            id={node.id}
            key={node.key}
            onClick={(event) => handleNodeClick(event, node)}
            onMouseDown={() => activateNode(node.key)}
            role="treeitem"
            style={{ "--tree-depth": node.depth - 1 } as CSSProperties}
            title={typeof node.label === "string" ? node.label : undefined}
          >
            <button
              aria-label={isExpanded ? "Collapse node" : "Expand node"}
              className={cx("c-tree__branch", hasChildren && "c-tree__branch--visible")}
              disabled={disabled || node.disabled || !hasChildren}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleExpanded(node.key);
              }}
              tabIndex={-1}
              type="button"
            />
            {checkable ? (
              <button
                aria-label={`${checkState === "checked" ? "Uncheck" : "Check"} node`}
                className={cx(
                  "c-tree__check",
                  checkState === "checked" && "c-tree__check--checked",
                  checkState === "mixed" && "c-tree__check--mixed",
                )}
                disabled={disabled || sourceNode?.disabled}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setActiveKey(node.key);
                  checkNode(node.key);
                }}
                tabIndex={-1}
                type="button"
              />
            ) : null}
            <span className="c-tree__label">{node.label}</span>
          </div>
        );
      })}
      {hiddenVisibleCount > 0 ? (
        <div className="c-tree__overflow" role="status">
          {hiddenVisibleCount} more visible nodes hidden by render budget.
        </div>
      ) : null}
    </div>
  );
}
