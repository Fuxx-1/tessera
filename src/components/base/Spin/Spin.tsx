import { useEffect, useState, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

export interface SpinProps extends Omit<HTMLAttributes<HTMLDivElement>, "dangerouslySetInnerHTML"> {
  children?: ReactNode;
  delay?: number;
  dangerouslySetInnerHTML?: never;
  fullscreen?: boolean;
  indicator?: ReactNode;
  label?: ReactNode;
  size?: "sm" | "md" | "lg";
  spinning?: boolean;
  tip?: ReactNode;
}

export function Spin({
  children,
  className,
  delay = 0,
  fullscreen = false,
  indicator,
  label,
  size = "md",
  spinning = true,
  tip,
  ...props
}: SpinProps) {
  const normalizedDelay = Number.isFinite(delay) ? Math.max(0, delay) : 0;
  const [delayState, setDelayState] = useState(() => ({
    delay: normalizedDelay,
    ready: normalizedDelay <= 0,
  }));
  const delayReady = normalizedDelay <= 0 || (delayState.delay === normalizedDelay && delayState.ready);
  const showSpinner = spinning && delayReady;
  const statusContent = label === undefined ? (tip === undefined ? "Loading" : tip) : label;
  const hasStatusContent = statusContent !== null && statusContent !== undefined && statusContent !== false && statusContent !== "";

  useEffect(() => {
    if (!spinning) {
      setDelayState({ delay: normalizedDelay, ready: normalizedDelay <= 0 });
      return;
    }

    if (normalizedDelay <= 0) {
      setDelayState({ delay: normalizedDelay, ready: true });
      return;
    }

    setDelayState({ delay: normalizedDelay, ready: false });
    const timer = window.setTimeout(() => setDelayState({ delay: normalizedDelay, ready: true }), normalizedDelay);
    return () => window.clearTimeout(timer);
  }, [normalizedDelay, spinning]);

  const spinner = showSpinner ? (
    <div
      {...(!children ? props : undefined)}
      className={cx("c-spin", `c-spin--${size}`, fullscreen && "c-spin--fullscreen", !children && className)}
      role="status"
      aria-live="polite"
    >
      {indicator ? (
        <span className="c-spin__custom-indicator" aria-hidden="true">
          {indicator}
        </span>
      ) : (
        <span className="c-spin__indicator" aria-hidden="true" />
      )}
      {hasStatusContent ? <span className="c-spin__label">{statusContent}</span> : <span className="c-sr-only">Loading</span>}
    </div>
  ) : null;

  if (children) {
    return (
      <div
        {...props}
        className={cx("c-spin-container", showSpinner && "c-spin-container--spinning", className)}
        aria-busy={showSpinner || undefined}
      >
        <div className="c-spin-container__content">{children}</div>
        {spinner ? <div className="c-spin-container__overlay">{spinner}</div> : null}
      </div>
    );
  }

  return spinner;
}
