import { useId, useState } from "react";
import type { ButtonHTMLAttributes, FormEvent, HTMLAttributes, ReactNode } from "react";
import { Button, Input } from "../../base";
import { cx } from "../../../utils/cx";
import "./DataToolbar.css";

export interface DataToolbarSearch {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  submitLabel?: ReactNode;
  showSubmit?: boolean;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

export interface DataToolbarAction extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "dangerouslySetInnerHTML"> {
  id: string;
  ariaLabel?: string;
  label: ReactNode;
  priority?: "primary" | "secondary" | "ghost";
}

export interface DataToolbarProps extends Omit<HTMLAttributes<HTMLElement>, "dangerouslySetInnerHTML" | "onSubmit" | "title"> {
  title?: ReactNode;
  description?: ReactNode;
  resultCount?: number | ReactNode;
  resultLabel?: ReactNode;
  search?: DataToolbarSearch | false;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (value: string) => void;
  filters?: ReactNode;
  activeFilters?: ReactNode;
  batchActions?: DataToolbarAction[];
  batchLabel?: ReactNode;
  density?: "comfortable" | "compact";
  primaryAction?: DataToolbarAction;
  refreshAction?: DataToolbarAction;
  secondaryActions?: DataToolbarAction[];
  actions?: ReactNode;
  loading?: boolean;
  loadingText?: ReactNode;
  error?: ReactNode;
  empty?: ReactNode;
  mobileMode?: "wrap" | "stack";
  mobileCollapsed?: boolean;
  defaultMobileCollapsed?: boolean;
  mobileToggleLabel?: ReactNode;
  onMobileCollapsedChange?: (collapsed: boolean) => void;
}

function renderAction(action: DataToolbarAction, loading: boolean) {
  const { ariaLabel, id, label, priority = "secondary", disabled, className, ...buttonProps } = action;
  const variant = priority === "primary" ? "solid" : priority === "ghost" ? "ghost" : "soft";

  return (
    <Button
      aria-label={ariaLabel}
      className={className}
      disabled={loading || disabled}
      key={id}
      size="sm"
      variant={variant}
      {...buttonProps}
    >
      {label}
    </Button>
  );
}

export function DataToolbar({
  activeFilters,
  actions,
  className,
  description,
  empty,
  error,
  filters,
  loading = false,
  loadingText = "Loading data...",
  mobileMode = "wrap",
  mobileCollapsed,
  defaultMobileCollapsed = false,
  mobileToggleLabel,
  onMobileCollapsedChange,
  batchActions = [],
  batchLabel,
  density = "comfortable",
  onSearchChange,
  onSearchSubmit,
  primaryAction,
  refreshAction,
  resultCount,
  resultLabel,
  search,
  searchPlaceholder = "Search",
  searchValue,
  secondaryActions = [],
  title,
  ...props
}: DataToolbarProps) {
  const generatedId = useId();
  const controlIdPrefix = props.id ? `${props.id}-controls` : `${generatedId}-controls`;
  const searchId = `${controlIdPrefix}-search`;
  const filtersId = `${controlIdPrefix}-filters`;
  const actionsId = `${controlIdPrefix}-actions`;
  const batchId = `${controlIdPrefix}-batch`;
  const activeFiltersId = `${controlIdPrefix}-active-filters`;
  const [localMobileCollapsed, setLocalMobileCollapsed] = useState(defaultMobileCollapsed);
  const isMobileCollapsed = mobileCollapsed ?? localMobileCollapsed;
  const normalizedSearch: DataToolbarSearch | false = search === false
    ? false
    : {
        value: search?.value ?? searchValue,
        defaultValue: search?.defaultValue,
        placeholder: search?.placeholder ?? searchPlaceholder,
        label: search?.label ?? search?.placeholder ?? searchPlaceholder,
        disabled: search?.disabled,
        submitLabel: search?.submitLabel ?? "Search",
        showSubmit: search?.showSubmit ?? Boolean(search?.onSubmit ?? onSearchSubmit),
        onChange: search?.onChange ?? onSearchChange,
        onSubmit: search?.onSubmit ?? onSearchSubmit,
      };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    normalizedSearch && normalizedSearch.onSubmit?.(String(formData.get("search") ?? ""));
  };
  const resultText = resultLabel ?? (typeof resultCount === "number" ? `${resultCount.toLocaleString()} results` : resultCount);
  const renderedPrimaryActions = (
    <>
      {refreshAction ? renderAction(refreshAction, loading) : null}
      {secondaryActions.map((action) => renderAction(action, loading))}
      {primaryAction ? renderAction(primaryAction, loading) : null}
      {actions}
    </>
  );
  const hasPrimaryActions = Boolean(refreshAction || primaryAction || secondaryActions.length > 0 || actions);
  const hasBatchActions = batchActions.length > 0 || Boolean(batchLabel);
  const hasMobileControls = Boolean(normalizedSearch || filters || hasPrimaryActions || hasBatchActions || activeFilters);
  const toggleLabel = mobileToggleLabel ?? (isMobileCollapsed ? "Show controls" : "Hide controls");
  const mobileControlIds = [
    normalizedSearch && searchId,
    filters && filtersId,
    hasPrimaryActions && actionsId,
    hasBatchActions && batchId,
    activeFilters && activeFiltersId,
  ].filter(Boolean).join(" ") || undefined;

  const setMobileCollapsedState = (nextCollapsed: boolean) => {
    if (mobileCollapsed === undefined) {
      setLocalMobileCollapsed(nextCollapsed);
    }
    onMobileCollapsedChange?.(nextCollapsed);
  };

  return (
    <section
      className={cx("b-data-toolbar", `b-data-toolbar--${density}`, `b-data-toolbar--mobile-${mobileMode}`, className)}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      data-mobile-collapsed={isMobileCollapsed || undefined}
      {...props}
    >
      <div className="b-data-toolbar__main">
        {title || description || resultText ? (
          <div className="b-data-toolbar__heading">
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
            {resultText ? <span>{resultText}</span> : null}
          </div>
        ) : null}

        {hasMobileControls ? (
          <Button
            aria-controls={mobileControlIds}
            aria-expanded={!isMobileCollapsed}
            className="b-data-toolbar__mobile-toggle"
            onClick={() => setMobileCollapsedState(!isMobileCollapsed)}
            size="sm"
            type="button"
            variant="soft"
          >
            {toggleLabel}
          </Button>
        ) : null}

        {normalizedSearch ? (
          <form className="b-data-toolbar__search" id={searchId} role="search" onSubmit={handleSubmit}>
            <Input
              aria-label={normalizedSearch.label}
              disabled={loading || normalizedSearch.disabled}
              name="search"
              onChange={(event) => normalizedSearch.onChange?.(event.target.value)}
              placeholder={normalizedSearch.placeholder}
              {...(normalizedSearch.value !== undefined
                ? { value: normalizedSearch.value }
                : { defaultValue: normalizedSearch.defaultValue })}
            />
            {normalizedSearch.showSubmit ? (
              <Button disabled={loading || normalizedSearch.disabled} size="sm" type="submit" variant="ghost">
                {normalizedSearch.submitLabel}
              </Button>
            ) : null}
          </form>
        ) : null}

        {filters ? <div className="b-data-toolbar__filters" id={filtersId}>{filters}</div> : null}
        {hasPrimaryActions ? (
          <div className="b-data-toolbar__actions" id={actionsId} aria-label="Toolbar actions">
            {renderedPrimaryActions}
          </div>
        ) : null}
      </div>

      {hasBatchActions ? (
        <div
          className="b-data-toolbar__batch"
          id={batchId}
          aria-label="Batch actions"
        >
          {batchLabel ? <span>{batchLabel}</span> : null}
          {batchActions.map((action) => renderAction(action, loading))}
        </div>
      ) : null}
      {activeFilters ? (
        <div
          className="b-data-toolbar__active-filters"
          id={activeFiltersId}
          aria-label="Active filters"
        >
          {activeFilters}
        </div>
      ) : null}
      {loading ? <div className="b-data-toolbar__status" role="status">{loadingText}</div> : null}
      {error ? <div className="b-business-state b-business-state--error" role="alert">{error}</div> : null}
      {!loading && !error && empty ? <div className="b-business-state" role="status">{empty}</div> : null}
    </section>
  );
}
