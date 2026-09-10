import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, HTMLAttributes, KeyboardEvent, PointerEvent, ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

export interface CarouselItem {
  id?: string;
  label?: string;
  content: ReactNode;
}

export interface CarouselChangeInfo {
  source: "autoplay" | "dot" | "keyboard" | "next" | "prev" | "swipe";
}

export interface CarouselProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  "aria-label"?: string;
  "aria-labelledby"?: string;
  autoplay?: boolean;
  children?: ReactNode;
  defaultIndex?: number;
  imageFit?: "cover" | "contain";
  index?: number;
  interval?: number;
  items?: CarouselItem[];
  loop?: boolean;
  nextLabel?: string;
  onIndexChange?: (index: number, info: CarouselChangeInfo) => void;
  pauseOnFocus?: boolean;
  pauseOnHover?: boolean;
  prevLabel?: string;
  reducedMotion?: boolean;
  showArrows?: boolean;
  showDots?: boolean;
  slideLabel?: (index: number, count: number) => string;
}

type PauseReason = "focus" | "hover" | "pointer";
type ChangeSource = CarouselChangeInfo["source"];

function normalizeIndex(index: number, count: number) {
  if (!Number.isFinite(index) || count <= 0) {
    return 0;
  }

  return Math.min(Math.max(Math.trunc(index), 0), count - 1);
}

function getWrappedIndex(index: number, count: number) {
  if (count <= 0) {
    return 0;
  }

  return (index + count) % count;
}

function releasePointerCapture(target: HTMLDivElement, pointerId: number) {
  if (target.hasPointerCapture?.(pointerId)) {
    target.releasePointerCapture(pointerId);
  }
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  return prefersReducedMotion;
}

export const Carousel = forwardRef<HTMLDivElement, CarouselProps>(function Carousel(
  {
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    autoplay = false,
    children,
    className,
    defaultIndex = 0,
    imageFit = "cover",
    index,
    interval = 5000,
    items,
    loop = true,
    nextLabel = "Next slide",
    onIndexChange,
    onBlur,
    onFocus,
    onKeyDown,
    onPointerCancel,
    onPointerDown,
    onPointerLeave,
    onPointerUp,
    onMouseEnter,
    onMouseLeave,
    pauseOnFocus = true,
    pauseOnHover = true,
    prevLabel = "Previous slide",
    reducedMotion,
    showArrows = true,
    showDots = true,
    slideLabel = (slideIndex, count) => `Slide ${slideIndex + 1} of ${count}`,
    style,
    tabIndex,
    ...props
  },
  ref,
) {
  const reactId = useId();
  const carouselId = `carousel-${reactId.replace(/:/g, "")}`;
  const childItems = useMemo(
    () =>
      Children.toArray(children).map<CarouselItem>((child, childIndex) => ({
        id: `child-${childIndex}`,
        content: child,
      })),
    [children],
  );
  const slides: CarouselItem[] = items?.length ? items : childItems;
  const count = slides.length;
  const isControlled = index !== undefined;
  const [uncontrolledIndex, setUncontrolledIndex] = useState(() => normalizeIndex(defaultIndex, count));
  const activeIndex = normalizeIndex(isControlled ? index : uncontrolledIndex, count);
  const canMove = count > 1;
  const prefersReducedMotion = usePrefersReducedMotion();
  const shouldReduceMotion = reducedMotion ?? prefersReducedMotion;
  const [pauseReasons, setPauseReasons] = useState<Set<PauseReason>>(() => new Set());
  const pointerStartRef = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    if (isControlled || count <= 0) {
      return;
    }

    setUncontrolledIndex((current) => normalizeIndex(current, count));
  }, [count, isControlled]);

  const setPauseReason = useCallback((reason: PauseReason, active: boolean) => {
    setPauseReasons((current) => {
      const next = new Set(current);
      if (active) {
        next.add(reason);
      } else {
        next.delete(reason);
      }
      return next;
    });
  }, []);

  const selectIndex = useCallback(
    (nextIndex: number, source: ChangeSource) => {
      if (!canMove && nextIndex !== activeIndex) {
        return;
      }

      const boundedIndex = loop ? getWrappedIndex(nextIndex, count) : normalizeIndex(nextIndex, count);
      if (boundedIndex === activeIndex) {
        return;
      }

      if (!isControlled) {
        setUncontrolledIndex(boundedIndex);
      }

      onIndexChange?.(boundedIndex, { source });
    },
    [activeIndex, canMove, count, isControlled, loop, onIndexChange],
  );

  const goPrev = useCallback(
    (source: ChangeSource = "prev") => {
      selectIndex(activeIndex - 1, source);
    },
    [activeIndex, selectIndex],
  );

  const goNext = useCallback(
    (source: ChangeSource = "next") => {
      selectIndex(activeIndex + 1, source);
    },
    [activeIndex, selectIndex],
  );

  useEffect(() => {
    if (!autoplay || !canMove || shouldReduceMotion || pauseReasons.size > 0) {
      return;
    }

    const timer = window.setInterval(() => goNext("autoplay"), Math.max(interval, 1000));
    return () => window.clearInterval(timer);
  }, [autoplay, canMove, goNext, interval, pauseReasons.size, shouldReduceMotion]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);

    if (event.defaultPrevented || !canMove) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrev("keyboard");
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext("keyboard");
    } else if (event.key === "Home") {
      event.preventDefault();
      selectIndex(0, "keyboard");
    } else if (event.key === "End") {
      event.preventDefault();
      selectIndex(count - 1, "keyboard");
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    onPointerDown?.(event);

    if (event.defaultPrevented || !canMove) {
      return;
    }

    pointerStartRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setPauseReason("pointer", true);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    onPointerUp?.(event);

    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (start) {
      releasePointerCapture(event.currentTarget, start.id);
    }
    setPauseReason("pointer", false);

    if (!start || start.id !== event.pointerId || event.defaultPrevented || !canMove) {
      return;
    }

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const isHorizontalSwipe = Math.abs(deltaX) >= 42 && Math.abs(deltaX) > Math.abs(deltaY) * 1.35;

    if (!isHorizontalSwipe) {
      return;
    }

    if (deltaX < 0) {
      goNext("swipe");
    } else {
      goPrev("swipe");
    }
  }

  function handlePointerCancel(event: PointerEvent<HTMLDivElement>) {
    onPointerCancel?.(event);
    const start = pointerStartRef.current;
    if (start) {
      releasePointerCapture(event.currentTarget, start.id);
    }
    pointerStartRef.current = null;
    setPauseReason("pointer", false);
  }

  function handlePointerLeave(event: PointerEvent<HTMLDivElement>) {
    onPointerLeave?.(event);
    const start = pointerStartRef.current;
    if (start && event.currentTarget.hasPointerCapture?.(start.id)) {
      return;
    }
    pointerStartRef.current = null;
    setPauseReason("pointer", false);
  }

  if (count === 0) {
    return null;
  }

  const rootLabel = ariaLabel ?? (ariaLabelledBy ? undefined : "Carousel");

  return (
    <div
      aria-label={rootLabel}
      aria-labelledby={ariaLabelledBy}
      aria-roledescription="carousel"
      className={cx("c-carousel", shouldReduceMotion && "c-carousel--reduced-motion", className)}
      onBlur={(event) => {
        onBlur?.(event);
        if (pauseOnFocus && !event.currentTarget.contains(event.relatedTarget)) {
          setPauseReason("focus", false);
        }
      }}
      onFocus={(event) => {
        onFocus?.(event);
        if (pauseOnFocus) {
          setPauseReason("focus", true);
        }
      }}
      onKeyDown={handleKeyDown}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        if (pauseOnHover) {
          setPauseReason("hover", true);
        }
      }}
      onMouseLeave={(event) => {
        onMouseLeave?.(event);
        if (pauseOnHover) {
          setPauseReason("hover", false);
        }
      }}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerLeave={handlePointerLeave}
      onPointerUp={handlePointerUp}
      ref={ref}
      role="region"
      style={{ ...style, "--carousel-index": activeIndex } as CSSProperties}
      tabIndex={tabIndex ?? 0}
      {...props}
    >
      <div className="c-carousel__viewport">
        <div className="c-carousel__track">
          {slides.map((slide, slideIndex) => (
            <div
              aria-hidden={slideIndex !== activeIndex}
              aria-label={slide.label ?? slideLabel(slideIndex, count)}
              aria-roledescription="slide"
              className="c-carousel__slide"
              id={`${carouselId}-slide-${slide.id ?? slideIndex}`}
              inert={slideIndex !== activeIndex ? true : undefined}
              key={slide.id ?? slideIndex}
              role="group"
            >
              {isValidElement<{ className?: string }>(slide.content) && slide.content.type === "img"
                ? cloneElement(slide.content, {
                    className: cx("c-carousel__image", `c-carousel__image--${imageFit}`, slide.content.props.className),
                    draggable: false,
                  } as { className: string; draggable: boolean })
                : slide.content}
            </div>
          ))}
        </div>

        {showArrows && canMove ? (
          <div className="c-carousel__arrows">
            <button
              aria-label={prevLabel}
              className="c-carousel__control c-carousel__control--prev"
              disabled={!loop && activeIndex === 0}
              onClick={() => goPrev("prev")}
              type="button"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              aria-label={nextLabel}
              className="c-carousel__control c-carousel__control--next"
              disabled={!loop && activeIndex === count - 1}
              onClick={() => goNext("next")}
              type="button"
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
        ) : null}
      </div>

      {showDots && canMove ? (
        <div className="c-carousel__dots" role="tablist" aria-label="Choose slide">
          {slides.map((slide, slideIndex) => (
            <button
              aria-controls={`${carouselId}-slide-${slide.id ?? slideIndex}`}
              aria-label={slide.label ?? slideLabel(slideIndex, count)}
              aria-selected={slideIndex === activeIndex}
              className="c-carousel__dot"
              key={slide.id ?? slideIndex}
              onClick={() => selectIndex(slideIndex, "dot")}
              role="tab"
              type="button"
            >
              <span />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
});
