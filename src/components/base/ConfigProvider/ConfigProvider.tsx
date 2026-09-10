import { createContext, useContext, useMemo, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { tokens as defaultTokens, type ThemeTokens } from "../../../theme/tokens";
import { cx } from "../../../utils/cx";
import "./style.css";

type TokenLeaf = string | number;
type TokenBranch = { [key: string]: TokenLeaf | TokenBranch };
type WidenTokenValues<T> = {
  [Key in keyof T]: T[Key] extends string
    ? string
    : T[Key] extends number
      ? number
      : T[Key] extends Record<string, unknown>
        ? WidenTokenValues<T[Key]>
        : T[Key];
};
type ResolvedThemeTokens = WidenTokenValues<ThemeTokens>;

export type ConfigProviderDensity = "comfortable" | "compact" | "spacious";
export type ConfigProviderDirection = "ltr" | "rtl";
export type ConfigProviderPrefixCls = string;
export type ConfigProviderThemeName = "light" | "dark";
export type ConfigProviderTokenOverrides<T = ResolvedThemeTokens> = {
  [Key in keyof T]?: T[Key] extends Record<string, unknown> ? ConfigProviderTokenOverrides<T[Key]> : TokenLeaf;
};

export type ConfigProviderLocale = {
  locale: string;
  emptyText?: string;
  loadingText?: string;
  okText?: string;
  cancelText?: string;
};

export type ConfigProviderTheme =
  | ConfigProviderThemeName
  | {
      name?: ConfigProviderThemeName | (string & {});
      tokens?: ConfigProviderTokenOverrides;
    };

export type ConfigProviderContextValue = {
  density: ConfigProviderDensity;
  direction: ConfigProviderDirection;
  locale: ConfigProviderLocale;
  prefixCls: ConfigProviderPrefixCls;
  theme: ConfigProviderThemeName | (string & {});
  tokens: ResolvedThemeTokens;
};

export interface ConfigProviderProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "dangerouslySetInnerHTML" | "dir"> {
  children?: ReactNode;
  density?: ConfigProviderDensity;
  direction?: ConfigProviderDirection;
  locale?: string | ConfigProviderLocale;
  prefixCls?: ConfigProviderPrefixCls;
  theme?: ConfigProviderTheme;
  tokens?: ConfigProviderTokenOverrides;
}

const lightThemeTokens: ResolvedThemeTokens = defaultTokens;

const darkThemeTokens: ResolvedThemeTokens = {
  ...defaultTokens,
  color: {
    ...defaultTokens.color,
    canvas: "#181818",
    surface: "#303030",
    surfaceElevated: "#303030",
    surfaceSubtle: "#212121",
    surfaceSunken: "#0d0d0d",
    border: "color-mix(in oklab, #ffffff 10%, transparent)",
    borderLight: "color-mix(in oklab, #ffffff 6%, transparent)",
    borderStrong: "color-mix(in oklab, #ffffff 18%, transparent)",
    text: "#f3f3ee",
    textMuted: "color-mix(in oklab, #f3f3ee 55%, transparent)",
    textSubtle: "color-mix(in oklab, #f3f3ee 35%, transparent)",
    textQuaternary: "color-mix(in oklab, #f3f3ee 18%, transparent)",
    textDisabled: "color-mix(in oklab, #f3f3ee 30%, transparent)",
    control: "color-mix(in oklab, #ffffff 8%, transparent)",
    controlHover: "color-mix(in oklab, #ffffff 12%, transparent)",
    controlActive: "color-mix(in oklab, #ffffff 16%, transparent)",
    inverse: "#ededed",
    inverseText: "#0d0d0d",
    focus: "color-mix(in oklab, #4aa8ff 75%, transparent)",
    accent: "#0a8bff",
    accentHover: "#4aa8ff",
    accentSoft: "color-mix(in oklab, #0285ff 22%, transparent)",
    success: "#6cc08b",
    successBorder: "color-mix(in oklab, #6cc08b 40%, transparent)",
    successBg: "color-mix(in oklab, #6cc08b 14%, transparent)",
    warning: "#e3b341",
    warningBorder: "color-mix(in oklab, #e3b341 40%, transparent)",
    warningBg: "color-mix(in oklab, #e3b341 14%, transparent)",
    danger: "#f0786f",
    dangerBorder: "color-mix(in oklab, #f0786f 40%, transparent)",
    dangerBg: "color-mix(in oklab, #f0786f 14%, transparent)",
    info: "#8ab3d6",
    infoBorder: "color-mix(in oklab, #8ab3d6 40%, transparent)",
    infoBg: "color-mix(in oklab, #8ab3d6 14%, transparent)",
  },
  shadow: {
    ...defaultTokens.shadow,
    hairline: "0px 0px 0px 0.5px #00000066",
    sm: "0px 1px 2px -1px #00000066",
    md: "0px 2px 6px -1px #00000080",
    lg: "0px 6px 14px -4px #0000008c",
    xl: "0px 12px 24px -8px #00000099",
    "2xl": "0px 20px 40px -12px #000000b3",
  },
};

const defaultLocale: ConfigProviderLocale = {
  locale: "en-US",
  emptyText: "No data",
  loadingText: "Loading",
  okText: "OK",
  cancelText: "Cancel",
};

export const defaultConfigProviderContext: ConfigProviderContextValue = {
  density: "comfortable",
  direction: "ltr",
  locale: defaultLocale,
  prefixCls: "c",
  theme: "light",
  tokens: lightThemeTokens,
};

const ConfigProviderContext = createContext<ConfigProviderContextValue>(defaultConfigProviderContext);

const unsafeTokenPattern = /(?:url\s*\(|expression\s*\(|javascript:|data:|[;{}<>])/i;
const safePrefixClsPattern = /^[a-z][a-z0-9-]{0,31}$/i;
const safeLocalePattern = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i;

function mergeTokens<T extends TokenBranch>(base: T, override?: ConfigProviderTokenOverrides<T>): T {
  if (!override) {
    return base;
  }

  const next: TokenBranch = { ...base };

  Object.entries(override).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    const baseValue = base[key];

    if (isTokenBranch(baseValue) && isTokenBranch(value)) {
      next[key] = mergeTokens(baseValue, value as ConfigProviderTokenOverrides<TokenBranch>);
      return;
    }

    if (isSafeTokenValue(value)) {
      next[key] = value;
    }
  });

  return next as T;
}

function isTokenBranch(value: unknown): value is TokenBranch {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSafeTokenValue(value: unknown): value is TokenLeaf {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  return typeof value === "string" && value.trim().length > 0 && !unsafeTokenPattern.test(value);
}

function getThemeName(theme: ConfigProviderTheme | undefined, inheritedTheme: ConfigProviderContextValue["theme"]) {
  if (typeof theme === "string") {
    return theme;
  }

  return theme?.name ?? inheritedTheme;
}

function getThemeTokens(theme: ConfigProviderTheme | undefined, inherited: ResolvedThemeTokens): ResolvedThemeTokens {
  const themeName = typeof theme === "string" ? theme : theme?.name;
  const namedTokens = themeName === "dark" ? darkThemeTokens : themeName === "light" ? lightThemeTokens : inherited;
  const themeTokens = typeof theme === "object" ? theme.tokens : undefined;

  return mergeTokens(namedTokens, themeTokens);
}

function isSafeLocaleCode(value: unknown): value is string {
  return typeof value === "string" && safeLocalePattern.test(value.trim());
}

function isLocaleText(value: unknown): value is string {
  return typeof value === "string";
}

function normalizeLocale(locale: string | ConfigProviderLocale | undefined, inherited: ConfigProviderLocale) {
  if (!locale) {
    return inherited;
  }

  if (typeof locale === "string") {
    return isSafeLocaleCode(locale) ? { ...inherited, locale: locale.trim() } : inherited;
  }

  return {
    ...inherited,
    ...(isSafeLocaleCode(locale.locale) ? { locale: locale.locale.trim() } : {}),
    ...(isLocaleText(locale.emptyText) ? { emptyText: locale.emptyText } : {}),
    ...(isLocaleText(locale.loadingText) ? { loadingText: locale.loadingText } : {}),
    ...(isLocaleText(locale.okText) ? { okText: locale.okText } : {}),
    ...(isLocaleText(locale.cancelText) ? { cancelText: locale.cancelText } : {}),
  };
}

function normalizePrefixCls(prefixCls: ConfigProviderPrefixCls | undefined, inherited: ConfigProviderPrefixCls) {
  const nextPrefixCls = prefixCls?.trim();

  return nextPrefixCls && safePrefixClsPattern.test(nextPrefixCls) ? nextPrefixCls : inherited;
}

function toCssVariableName(path: string[]) {
  return `--c-config-${path.map((part) => part.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)).join("-")}`;
}

function assignTokenVariables(source: TokenBranch, style: CSSProperties & Record<string, string | number>, path: string[] = []) {
  Object.entries(source).forEach(([key, value]) => {
    const nextPath = [...path, key];

    if (isTokenBranch(value)) {
      assignTokenVariables(value, style, nextPath);
      return;
    }

    if (isSafeTokenValue(value)) {
      style[toCssVariableName(nextPath)] = value;
    }
  });
}

function assignCtAliasVariables(tokens: ResolvedThemeTokens, style: CSSProperties & Record<string, string | number>) {
  const color = tokens.color;
  const radius = tokens.radius;
  const shadow = tokens.shadow;
  const font = tokens.font;
  const size = tokens.size;

  Object.assign(style, {
    "--ct-bg": color.canvas,
    "--ct-surface": color.surface,
    "--ct-surface-elevated": color.surfaceElevated,
    "--ct-surface-muted": color.surfaceSubtle,
    "--ct-surface-sunken": color.surfaceSunken,
    "--ct-border-light": color.borderLight,
    "--ct-border": color.border,
    "--ct-border-heavy": color.borderStrong,
    "--ct-text": color.text,
    "--ct-text-secondary": color.textMuted,
    "--ct-text-tertiary": color.textSubtle,
    "--ct-text-quaternary": color.textQuaternary,
    "--ct-text-disabled": color.textDisabled,
    "--ct-ink": color.inverse,
    "--ct-text-on-accent": color.inverseText,
    "--ct-focus-ring": color.focus,
    "--ct-accent": color.accent,
    "--ct-accent-hover": color.accentHover,
    "--ct-accent-soft": color.accentSoft,
    "--ct-success": color.success,
    "--ct-success-border": color.successBorder,
    "--ct-success-bg": color.successBg,
    "--ct-warning": color.warning,
    "--ct-warning-border": color.warningBorder,
    "--ct-warning-bg": color.warningBg,
    "--ct-danger": color.danger,
    "--ct-danger-border": color.dangerBorder,
    "--ct-danger-bg": color.dangerBg,
    "--ct-info": color.info,
    "--ct-info-border": color.infoBorder,
    "--ct-info-bg": color.infoBg,
    "--ct-btn-primary-bg": color.inverse,
    "--ct-btn-primary-fg": color.inverseText,
    "--ct-btn-secondary-bg": color.control,
    "--ct-btn-secondary-bg-hover": color.controlHover,
    "--ct-btn-secondary-fg": color.text,
    "--ct-radius-2xs": radius["2xs"],
    "--ct-radius-xs": radius.xs,
    "--ct-radius-sm": radius.sm,
    "--ct-radius-md": radius.md,
    "--ct-radius-lg": radius.lg,
    "--ct-radius-xl": radius.xl,
    "--ct-radius-2xl": radius["2xl"],
    "--ct-radius-3xl": radius["3xl"],
    "--ct-radius-4xl": radius["4xl"],
    "--ct-radius-full": radius.full,
    "--ct-shadow-hairline": shadow.hairline,
    "--ct-shadow-sm": shadow.sm,
    "--ct-shadow-md": shadow.md,
    "--ct-shadow-lg": shadow.lg,
    "--ct-shadow-xl": shadow.xl,
    "--ct-shadow-2xl": shadow["2xl"],
    "--ct-font-sans": font.sans,
    "--ct-font-mono": font.mono,
    "--ct-control-height": size.controlHeight,
    "--ct-control-height-sm": size.controlHeightSm,
    "--ct-content-max-width": size.pageMaxWidth,
  });
}

function getConfigProviderStyle(tokens: ResolvedThemeTokens, style?: CSSProperties) {
  const variableStyle: CSSProperties & Record<string, string | number> = {};
  assignTokenVariables(tokens, variableStyle);
  assignCtAliasVariables(tokens, variableStyle);

  return { ...variableStyle, ...style };
}

export function ConfigProvider({
  children,
  className,
  density,
  direction,
  locale,
  prefixCls,
  style,
  theme,
  tokens,
  ...props
}: ConfigProviderProps) {
  const inherited = useContext(ConfigProviderContext);

  const value = useMemo<ConfigProviderContextValue>(() => {
    const themedTokens = getThemeTokens(theme, inherited.tokens);
    const mergedTokens = mergeTokens(themedTokens, tokens);
    const themeName = getThemeName(theme, inherited.theme);

    return {
      density: density ?? inherited.density,
      direction: direction ?? inherited.direction,
      locale: normalizeLocale(locale, inherited.locale),
      prefixCls: normalizePrefixCls(prefixCls, inherited.prefixCls),
      theme: themeName,
      tokens: mergedTokens,
    };
  }, [density, direction, inherited, locale, prefixCls, theme, tokens]);

  const providerStyle = useMemo(() => getConfigProviderStyle(value.tokens, style), [style, value.tokens]);

  return (
    <ConfigProviderContext.Provider value={value}>
      <div
        {...props}
        className={cx("c-config-provider", value.prefixCls !== "c" && `${value.prefixCls}-config-provider`, className)}
        data-density={value.density}
        data-prefix-cls={value.prefixCls}
        data-theme={value.theme}
        dir={value.direction}
        lang={value.locale.locale}
        style={providerStyle}
      >
        {children}
      </div>
    </ConfigProviderContext.Provider>
  );
}

export function useConfigProvider() {
  return useContext(ConfigProviderContext);
}
