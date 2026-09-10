import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  useMemo,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import "./style.css";

export type SplitterOrientation = "horizontal" | "vertical";

export interface SplitterPanelProps extends HTMLAttributes<HTMLDivElement> {
  "data-collapsible"?: boolean | "true" | "false";
  "data-size"?: number;
  children: ReactNode;
  collapsedSize?: number;
  collapsible?: boolean;
  defaultSize?: number;
  max?: number;
  min?: number;
  size?: number;
}

export interface SplitterProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  children: ReactNode;
  defaultValue?: number[];
  disabled?: boolean;
  keyboardStep?: number;
  max?: number;
  min?: number;
  onValueChange?: (value: number[]) => void;
  orientation?: SplitterOrientation;
  value?: number[];
}

type PanelConfig = {
  collapsedSize: number;
  collapsible: boolean;
  max: number;
  min: number;
};

type DragState = {
  handleIndex: number;
  pairSize: number;
  startCoordinate: number;
  startSizes: number[];
};

const TOTAL_SIZE = 100;
const DEFAULT_PANEL_MIN = 8;
const DEFAULT_COLLAPSED_SIZE = 8;
const DEFAULT_KEYBOARD_STEP = 5;

export const Splitter = forwardRef<HTMLDivElement, SplitterProps>(function Splitter(
  {
    children,
    className,
    defaultValue,
    disabled = false,
    id,
    keyboardStep = DEFAULT_KEYBOARD_STEP,
    max = TOTAL_SIZE,
    min = DEFAULT_PANEL_MIN,
    onValueChange,
    orientation = "horizontal",
    value,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const splitterId = id ?? `splitter-${generatedId.replace(/:/g, "")}`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const panels = useMemo(() => getPanelElements(children), [children]);
  const panelConfigs = useMemo(
    () => panels.map((panel) => getPanelConfig(panel.props, min, max)),
    [max, min, panels],
  );
  const fallbackSizes = useMemo(
    () => normalizeSizes(getInitialSizes(panels), panelConfigs),
    [panelConfigs, panels],
  );
  const [currentSizes, setCurrentSizes] = useControllableState({
    defaultValue: defaultValue ? normalizeSizes(defaultValue, panelConfigs) : undefined,
    fallbackValue: fallbackSizes,
    onChange: onValueChange,
    value: value ? normalizeSizes(value, panelConfigs) : undefined,
  });
  const sizes = normalizeSizes(currentSizes, panelConfigs);
  const isHorizontal = orientation === "horizontal";
  const separatorOrientation = isHorizontal ? "vertical" : "horizontal";
  const axisSize = isHorizontal ? "width" : "height";
  const safeKeyboardStep = Number.isFinite(keyboardStep) && keyboardStep > 0 ? keyboardStep : DEFAULT_KEYBOARD_STEP;

  function setRootNode(node: HTMLDivElement | null) {
    rootRef.current = node;

    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }

  function commitSizes(nextSizes: number[]) {
    setCurrentSizes(normalizeSizes(nextSizes, panelConfigs));
  }

  function handlePointerDown(handleIndex: number, event: ReactPointerEvent<HTMLButtonElement>) {
    if (disabled || event.button !== 0) {
      return;
    }

    const root = rootRef.current;
    if (!root) {
      return;
    }

    const rect = root.getBoundingClientRect();
    const axisLength = isHorizontal ? rect.width : rect.height;
    if (axisLength <= 0) {
      return;
    }

    dragStateRef.current = {
      handleIndex,
      pairSize: sizes[handleIndex] + sizes[handleIndex + 1],
      startCoordinate: isHorizontal ? event.clientX : event.clientY,
      startSizes: sizes,
    };
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic pointer events used by smoke tests may not own a capture slot.
    }
    event.preventDefault();
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const dragState = dragStateRef.current;
    const root = rootRef.current;
    if (!dragState || disabled || !root) {
      return;
    }

    const rect = root.getBoundingClientRect();
    const axisLength = isHorizontal ? rect.width : rect.height;
    if (axisLength <= 0) {
      return;
    }

    const coordinate = isHorizontal ? event.clientX : event.clientY;
    const delta = ((coordinate - dragState.startCoordinate) / axisLength) * TOTAL_SIZE;
    const proposedFirst = dragState.startSizes[dragState.handleIndex] + delta;
    commitSizes(resizePair(dragState.startSizes, panelConfigs, dragState.handleIndex, proposedFirst, dragState.pairSize));
    event.preventDefault();
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLButtonElement>) {
    dragStateRef.current = null;
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // Release can fail if the pointer was cancelled outside the element.
    }
  }

  function handleKeyDown(handleIndex: number, event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }

    const pairSize = sizes[handleIndex] + sizes[handleIndex + 1];
    let nextFirstSize: number | undefined;

    if (isHorizontal && event.key === "ArrowLeft") {
      nextFirstSize = sizes[handleIndex] - safeKeyboardStep;
    } else if (isHorizontal && event.key === "ArrowRight") {
      nextFirstSize = sizes[handleIndex] + safeKeyboardStep;
    } else if (!isHorizontal && event.key === "ArrowUp") {
      nextFirstSize = sizes[handleIndex] - safeKeyboardStep;
    } else if (!isHorizontal && event.key === "ArrowDown") {
      nextFirstSize = sizes[handleIndex] + safeKeyboardStep;
    } else if (event.key === "Home") {
      nextFirstSize = getLowerBound(panelConfigs[handleIndex]);
    } else if (event.key === "End") {
      nextFirstSize = pairSize - getLowerBound(panelConfigs[handleIndex + 1]);
    } else if (event.key === "Enter") {
      nextFirstSize = getToggleSize(sizes[handleIndex], panelConfigs[handleIndex]);
    }

    if (nextFirstSize === undefined) {
      return;
    }

    event.preventDefault();
    commitSizes(resizePair(sizes, panelConfigs, handleIndex, nextFirstSize, pairSize));
  }

  if (panels.length === 0) {
    return null;
  }

  return (
    <div
      className={cx(
        "c-splitter",
        `c-splitter--${orientation}`,
        disabled && "c-splitter--disabled",
        className,
      )}
      data-orientation={orientation}
      id={splitterId}
      ref={setRootNode}
      {...props}
    >
      {panels.map((panel, index) => {
        const panelId = panel.props.id ?? `${splitterId}-panel-${index + 1}`;
        const nextPanelId = panels[index + 1]?.props.id ?? `${splitterId}-panel-${index + 2}`;
        const sizeStyle = {
          ...panel.props.style,
          "--c-splitter-panel-size": `${roundSize(sizes[index])}%`,
        } as CSSProperties;
        const panelNode = cloneElement(panel, {
          className: cx("c-splitter__panel", panel.props.className),
          "data-collapsible": panelConfigs[index].collapsible ? true : undefined,
          "data-size": roundSize(sizes[index]),
          id: panelId,
          style: sizeStyle,
        } as Partial<SplitterPanelProps> & {
          "data-collapsible"?: boolean;
          "data-size": number;
        });

        return (
          <div className="c-splitter__item" key={panelId} style={sizeStyle}>
            {panelNode}
            {index < panels.length - 1 ? (
              <button
                aria-controls={`${panelId} ${nextPanelId}`}
                aria-label={`Resize panels ${index + 1} and ${index + 2}`}
                aria-orientation={separatorOrientation}
                aria-valuemax={roundSize(getPairUpperBound(panelConfigs, index, sizes[index] + sizes[index + 1]))}
                aria-valuemin={roundSize(getLowerBound(panelConfigs[index]))}
                aria-valuenow={roundSize(sizes[index])}
                className="c-splitter__handle"
                disabled={disabled}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPointerCancel={handlePointerEnd}
                onPointerDown={(event) => handlePointerDown(index, event)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                role="separator"
                tabIndex={disabled ? -1 : 0}
                type="button"
              >
                <span className="c-splitter__handle-track" />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
});

export function SplitterPanel({
  children,
  className,
  collapsedSize: _collapsedSize,
  collapsible: _collapsible,
  defaultSize: _defaultSize,
  max: _max,
  min: _min,
  size: _size,
  ...props
}: SplitterPanelProps) {
  return (
    <div className={cx("c-splitter__panel", className)} {...props}>
      {children}
    </div>
  );
}

function getPanelElements(children: ReactNode) {
  return Children.toArray(children).filter(isPanelElement) as Array<ReactElement<SplitterPanelProps>>;
}

function isPanelElement(child: ReactNode): child is ReactElement<SplitterPanelProps> {
  return isValidElement<SplitterPanelProps>(child) && child.type === SplitterPanel;
}

function getPanelConfig(props: SplitterPanelProps, rootMin: number, rootMax: number): PanelConfig {
  const min = normalizeLimit(props.min ?? rootMin, 0, TOTAL_SIZE, DEFAULT_PANEL_MIN);
  const max = normalizeLimit(props.max ?? rootMax, min, TOTAL_SIZE, TOTAL_SIZE);
  const collapsedSize = normalizeLimit(props.collapsedSize ?? DEFAULT_COLLAPSED_SIZE, 0, Math.min(min, max), DEFAULT_COLLAPSED_SIZE);
  return {
    collapsedSize,
    collapsible: Boolean(props.collapsible),
    max,
    min,
  };
}

function getInitialSizes(panels: Array<ReactElement<SplitterPanelProps>>) {
  const configured = panels.map((panel) => panel.props.size ?? panel.props.defaultSize);
  if (configured.every((size) => typeof size === "number" && Number.isFinite(size))) {
    return configured as number[];
  }

  const count = Math.max(1, panels.length);
  const configuredTotal = configured.reduce<number>((sum, size) => {
    return typeof size === "number" && Number.isFinite(size) && size >= 0 ? sum + size : sum;
  }, 0);
  const unconfiguredCount = configured.filter((size) => !(typeof size === "number" && Number.isFinite(size) && size >= 0)).length;
  const fallbackSize = unconfiguredCount > 0 ? Math.max(0, TOTAL_SIZE - configuredTotal) / unconfiguredCount : TOTAL_SIZE / count;

  return configured.map((size) => {
    return typeof size === "number" && Number.isFinite(size) && size >= 0 ? size : fallbackSize;
  });
}

function normalizeSizes(source: number[], configs: PanelConfig[]) {
  const count = configs.length;
  if (count === 0) {
    return [];
  }

  const fallback = TOTAL_SIZE / count;
  const next = Array.from({ length: count }, (_, index) => {
    const value = source[index];
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  });
  const total = next.reduce((sum, size) => sum + size, 0) || TOTAL_SIZE;
  const normalized = next.map((size) => (size / total) * TOTAL_SIZE);
  return fitSizesToConstraints(normalized, configs).map(roundSize);
}

function fitSizesToConstraints(sizes: number[], configs: PanelConfig[]) {
  let next = sizes.map((size, index) => clamp(size, getLowerBound(configs[index]), configs[index].max));

  for (let pass = 0; pass < configs.length * 2; pass += 1) {
    const delta = TOTAL_SIZE - next.reduce((sum, size) => sum + size, 0);
    if (Math.abs(delta) < 0.01) {
      return next;
    }

    const adjustableIndexes = next
      .map((size, index) => {
        const lower = getLowerBound(configs[index]);
        const upper = configs[index].max;
        return {
          index,
          room: delta > 0 ? upper - size : size - lower,
        };
      })
      .filter((item) => item.room > 0.01);

    if (adjustableIndexes.length === 0) {
      return next;
    }

    const share = Math.abs(delta) / adjustableIndexes.length;
    next = next.map((size, index) => {
      const adjustable = adjustableIndexes.find((item) => item.index === index);
      if (!adjustable) {
        return size;
      }

      const change = Math.min(share, adjustable.room) * Math.sign(delta);
      return size + change;
    });
  }

  return next;
}

function resizePair(
  sizes: number[],
  configs: PanelConfig[],
  handleIndex: number,
  proposedFirstSize: number,
  pairSize: number,
) {
  const firstConfig = configs[handleIndex];
  const secondConfig = configs[handleIndex + 1];
  const firstLower = getLowerBound(firstConfig);
  const secondLower = getLowerBound(secondConfig);
  const firstUpper = Math.min(firstConfig.max, pairSize - secondLower);
  const secondUpper = Math.min(secondConfig.max, pairSize - firstLower);
  const lower = Math.max(firstLower, pairSize - secondUpper);
  const upper = Math.max(lower, firstUpper);
  const firstSize = clamp(proposedFirstSize, lower, upper);
  const next = [...sizes];
  next[handleIndex] = firstSize;
  next[handleIndex + 1] = pairSize - firstSize;
  return next;
}

function getLowerBound(config: PanelConfig) {
  return config.collapsible ? config.collapsedSize : config.min;
}

function getPairUpperBound(configs: PanelConfig[], handleIndex: number, pairSize: number) {
  return Math.min(configs[handleIndex].max, pairSize - getLowerBound(configs[handleIndex + 1]));
}

function getToggleSize(currentSize: number, config: PanelConfig) {
  if (!config.collapsible) {
    return currentSize;
  }

  return currentSize <= config.collapsedSize + 0.5 ? config.min : config.collapsedSize;
}

function normalizeLimit(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return clamp(value, min, max);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundSize(value: number) {
  return Number(value.toFixed(2));
}
