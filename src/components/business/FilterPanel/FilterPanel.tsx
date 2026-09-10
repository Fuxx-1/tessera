import { useId, useState, type FormEvent, type HTMLAttributes, type ReactNode } from "react";
import { Button } from "../../base";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import "./FilterPanel.css";

export interface FilterPanelField {
  id: string;
  label: ReactNode;
  control: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  span?: 1 | 2;
  required?: boolean;
}

export interface FilterPanelProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  fields?: FilterPanelField[];
  children?: ReactNode;
  activeCount?: number;
  collapseLabel?: ReactNode;
  collapsed?: boolean;
  collapsedLabel?: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  loading?: boolean;
  loadingText?: ReactNode;
  error?: ReactNode;
  empty?: ReactNode;
  submitLabel?: ReactNode;
  resetLabel?: ReactNode;
  applyDisabled?: boolean;
  resetDisabled?: boolean;
  columns?: 1 | 2;
  mobileMode?: "stack" | "drawer-ready";
  onApply?: (formData: FormData) => void;
  onCollapsedChange?: (collapsed: boolean) => void;
  onReset?: () => void;
}

export function FilterPanel({
  activeCount,
  children,
  className,
  collapsed,
  collapseLabel = "Collapse",
  collapsedLabel = "Expand",
  collapsible = false,
  defaultCollapsed = false,
  description,
  empty = "No filters configured",
  error,
  fields = [],
  loading = false,
  loadingText = "Loading filters...",
  mobileMode = "stack",
  onApply,
  onCollapsedChange,
  onReset,
  applyDisabled = false,
  resetDisabled = false,
  columns = 2,
  resetLabel = "Reset",
  submitLabel = "Apply",
  title = "Filters",
  "aria-labelledby": ariaLabelledBy,
  ...props
}: FilterPanelProps) {
  const generatedId = useId();
  const [resetVersion, setResetVersion] = useState(0);
  const hasContent = fields.length > 0 || Boolean(children);
  const [isCollapsed, setCollapsed] = useControllableState({
    defaultValue: defaultCollapsed,
    fallbackValue: false,
    onChange: onCollapsedChange,
    value: collapsed,
  });
  const contentId = props.id ? `${props.id}-content` : `${generatedId}-content`;
  const titleId = ariaLabelledBy ? undefined : props.id ? `${props.id}-title` : `${generatedId}-title`;
  const descriptionId = description ? (props.id ? `${props.id}-description` : `${generatedId}-description`) : undefined;
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onApply?.(new FormData(event.currentTarget));
  };
  const handleReset = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetVersion((version) => version + 1);
    onReset?.();
  };
  const showCollapsedContent = collapsible && isCollapsed && !loading && !error && hasContent;
  const displayedActiveCount =
    activeCount === undefined || !Number.isFinite(activeCount) ? undefined : Math.max(0, Math.floor(activeCount));

  return (
    <section
      aria-labelledby={ariaLabelledBy ?? titleId}
      className={cx(
        "b-filter-panel",
        `b-filter-panel--${columns}-columns`,
        `b-filter-panel--mobile-${mobileMode}`,
        showCollapsedContent && "b-filter-panel--collapsed",
        className,
      )}
      aria-busy={loading || undefined}
      data-collapsed={showCollapsedContent || undefined}
      data-loading={loading || undefined}
      {...props}
    >
      <header className="b-filter-panel__header">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description ? <p id={descriptionId}>{description}</p> : null}
        </div>
        <div className="b-filter-panel__header-actions">
          {displayedActiveCount !== undefined ? (
            <span aria-label={`${displayedActiveCount} active filters`} className="b-filter-panel__active-count">
              {displayedActiveCount} active
            </span>
          ) : null}
          {collapsible && hasContent ? (
            <Button
              aria-controls={contentId}
              aria-expanded={!showCollapsedContent}
              onClick={() => setCollapsed(!isCollapsed)}
              size="sm"
              type="button"
              variant="ghost"
            >
              {showCollapsedContent ? collapsedLabel : collapseLabel}
            </Button>
          ) : null}
        </div>
      </header>

      {loading ? (
        <div className="b-filter-panel__loading" role="status">
          <span />
          <span />
          <span />
          <strong>{loadingText}</strong>
        </div>
      ) : error ? (
        <div className="b-business-state b-business-state--error" role="alert">{error}</div>
      ) : hasContent ? (
        <form
          aria-describedby={descriptionId}
          className="b-filter-panel__form"
          hidden={showCollapsedContent}
          id={contentId}
          key={resetVersion}
          onReset={handleReset}
          onSubmit={handleSubmit}
        >
          <div className="b-filter-panel__body">
            {fields.map((field) => (
              <div
                className={cx("b-filter-panel__field", field.span === 2 && "b-filter-panel__field--span-2")}
                key={field.id}
              >
                <label htmlFor={field.id}>
                  {field.label}
                  {field.required ? <span aria-hidden="true">*</span> : null}
                </label>
                <div>{field.control}</div>
                {field.help ? <p>{field.help}</p> : null}
                {field.error ? <p className="b-filter-panel__field-error" role="alert">{field.error}</p> : null}
              </div>
            ))}
            {children}
          </div>
          {onApply || onReset ? (
            <footer className="b-filter-panel__footer">
              {onReset ? (
                <Button disabled={loading || resetDisabled} size="sm" type="reset" variant="ghost">
                  {resetLabel}
                </Button>
              ) : null}
              {onApply ? (
                <Button disabled={loading || applyDisabled} size="sm" type="submit" variant="solid">
                  {submitLabel}
                </Button>
              ) : null}
            </footer>
          ) : null}
        </form>
      ) : (
        <div className="b-business-state" role="status">{empty}</div>
      )}
    </section>
  );
}
