import "./styles/word-cloud.css";
import { useId } from "react";
import { UI_RENDER_BUDGETS } from "../../utils/performance";
import { ChartFrame } from "./ChartFrame";
import { chartSeriesColors, getSafeChartColors } from "./palette";
import type { ChartBaseProps, ChartDatum } from "./types";
import {
  clampNumber,
  defaultChartWidth,
  formatDatum,
  getChartA11yTitle,
  normalizeChartLabel,
  sanitizeDimension,
  sanitizeNumber,
} from "./utils";

type WordCloudPlacedWord = ChartDatum & {
  clipped: boolean;
  color: string;
  displayLabel: string;
  fontSize: number;
  height: number;
  index: number;
  width: number;
  x: number;
  y: number;
};

type WordCloudBounds = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

export interface WordCloudProps extends ChartBaseProps {
  colors?: string[];
  height?: number;
  maxFontSize?: number;
  maxWords?: number;
  minFontSize?: number;
  padding?: number;
  showFallbackList?: boolean;
}

const minCloudHeight = 180;
const maxCloudWords = UI_RENDER_BUDGETS.chartWordCloudWords;
const defaultPadding = 10;
const fontFamily = "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
const visualLabelSuffix = "...";

function normalizeWordCloudData(data: ChartDatum[], maxWords: number) {
  const candidates: Array<ChartDatum & { originalIndex: number }> = [];

  for (const [index, datum] of data.entries()) {
    if (!Number.isFinite(datum.value) || datum.value <= 0) {
      continue;
    }

    candidates.push({
      label: normalizeChartLabel(datum.label, `Word ${index + 1}`),
      value: datum.value,
      originalIndex: index,
    });
    candidates.sort((a, b) => b.value - a.value || a.originalIndex - b.originalIndex);

    if (candidates.length > maxWords) {
      candidates.pop();
    }
  }

  return candidates.map(({ originalIndex: _originalIndex, ...datum }) => datum);
}

function estimateWordWidth(label: string, fontSize: number) {
  const wideWeight = Array.from(label).reduce((total, character) => {
    if (/[A-Z0-9]/.test(character)) return total + 0.68;
    if (/[\u4e00-\u9fff]/.test(character)) return total + 1;
    if (/\s/.test(character)) return total + 0.34;
    return total + 0.58;
  }, 0);

  return Math.ceil(Math.max(fontSize * 1.2, wideWeight * fontSize));
}

function fitWordLabel(label: string, fontSize: number, maxWidth: number) {
  if (estimateWordWidth(label, fontSize) <= maxWidth) {
    return { clipped: false, label, width: estimateWordWidth(label, fontSize) };
  }

  const characters = Array.from(label);
  let low = 1;
  let high = characters.length;
  let fitted = visualLabelSuffix;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = `${characters.slice(0, middle).join("")}${visualLabelSuffix}`;
    if (estimateWordWidth(candidate, fontSize) <= maxWidth) {
      fitted = candidate;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return {
    clipped: true,
    label: fitted,
    width: estimateWordWidth(fitted, fontSize),
  };
}

function boundsOverlap(a: WordCloudBounds, b: WordCloudBounds, padding: number) {
  return !(a.right + padding < b.left || a.left - padding > b.right || a.bottom + padding < b.top || a.top - padding > b.bottom);
}

function fitsCloud(bounds: WordCloudBounds, width: number, height: number, padding: number) {
  return bounds.left >= padding && bounds.right <= width - padding && bounds.top >= padding && bounds.bottom <= height - padding;
}

function createBounds(x: number, y: number, width: number, height: number): WordCloudBounds {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return {
    bottom: y + halfHeight,
    left: x - halfWidth,
    right: x + halfWidth,
    top: y - halfHeight,
  };
}

function getPlacedWords({
  colors,
  data,
  height,
  maxFontSize,
  minFontSize,
  padding,
  width,
}: {
  colors: string[];
  data: ChartDatum[];
  height: number;
  maxFontSize: number;
  minFontSize: number;
  padding: number;
  width: number;
}) {
  const values = data.map((datum) => datum.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = maxValue - minValue || 1;
  const centerX = width / 2;
  const centerY = height / 2;
  const placed: WordCloudPlacedWord[] = [];
  const boxes: WordCloudBounds[] = [];

  for (const [index, datum] of data.entries()) {
    const ratio = (datum.value - minValue) / span;
    const fontSize = Math.round(minFontSize + ratio * (maxFontSize - minFontSize));
    const fittedLabel = fitWordLabel(datum.label, fontSize, width - padding * 2);
    const wordWidth = fittedLabel.width;
    const wordHeight = Math.ceil(fontSize * 1.12);
    const angleSeed = (index * 137.508 * Math.PI) / 180;
    const maxAttempts = 260;
    let selected: { bounds: WordCloudBounds; x: number; y: number } | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const radius = attempt === 0 ? 0 : attempt * 2.15 * (1 + index * 0.012);
      const angle = angleSeed + attempt * 0.58;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const bounds = createBounds(x, y, wordWidth, wordHeight);

      if (fitsCloud(bounds, width, height, padding) && boxes.every((box) => !boundsOverlap(bounds, box, padding * 0.42))) {
        selected = { bounds, x, y };
        break;
      }
    }

    if (selected) {
      boxes.push(selected.bounds);
      placed.push({
        ...datum,
        clipped: fittedLabel.clipped,
        color: colors[index % colors.length],
        displayLabel: fittedLabel.label,
        fontSize,
        height: wordHeight,
        index,
        width: wordWidth,
        x: selected.x,
        y: selected.y,
      });
    }
  }

  return placed;
}

export function WordCloud({
  className,
  colors = chartSeriesColors,
  data,
  emptyText,
  error,
  height = 300,
  loading,
  loadingText,
  maxFontSize = 48,
  maxWords = 36,
  minFontSize = 14,
  notice,
  padding = defaultPadding,
  showFallbackList = true,
  summary,
  title,
  valueFormatter,
  ...props
}: WordCloudProps) {
  const titleId = useId();
  const descId = useId();
  const fallbackId = useId();
  const width = defaultChartWidth;
  const safeHeight = sanitizeDimension(height, 300, minCloudHeight, 720);
  const safeMaxWords = Math.floor(clampNumber(sanitizeNumber(maxWords, 36), 1, maxCloudWords));
  const safeMinFontSize = clampNumber(sanitizeNumber(minFontSize, 14), 10, 72);
  const safeMaxFontSize = clampNumber(sanitizeNumber(maxFontSize, 48), safeMinFontSize, 96);
  const safePadding = clampNumber(sanitizeNumber(padding, defaultPadding), 2, 32);
  const safeColors = getSafeChartColors(colors, chartSeriesColors);
  const positiveCount = data.filter((datum) => Number.isFinite(datum.value) && datum.value > 0).length;
  const safeData = normalizeWordCloudData(data, safeMaxWords);
  const words = getPlacedWords({
    colors: safeColors,
    data: safeData,
    height: safeHeight,
    maxFontSize: safeMaxFontSize,
    minFontSize: safeMinFontSize,
    padding: safePadding,
    width,
  });
  const placedIndexes = new Set(words.map((word) => word.index));
  const fallbackWords = safeData.filter((_datum, index) => !placedIndexes.has(index));
  const isEmpty = safeData.length === 0;
  const hasState = loading || error || isEmpty;
  const svgTitle = getChartA11yTitle(title, "Word cloud");
  const topWord = safeData[0];
  const svgSummary =
    summary ??
    (topWord
      ? `${safeData.length} weighted words. Largest word is ${topWord.label} at ${formatDatum(valueFormatter, topWord.value, topWord)}. ${words.length} words placed; ${fallbackWords.length} words listed as fallback.`
      : "No positive weighted words to display.");
  const shouldShowFallback = showFallbackList && safeData.length > 0;
  const renderNotice =
    notice ??
    (positiveCount > safeData.length
      ? `WordCloud limited to ${safeData.length.toLocaleString()} of ${positiveCount.toLocaleString()} weighted words for layout performance.`
      : undefined);

  return (
    <ChartFrame
      className={className}
      empty={isEmpty}
      emptyText={emptyText}
      error={error}
      loading={loading}
      loadingText={loadingText}
      notice={renderNotice}
      summary={summary}
      title={title}
      {...props}
    >
      <svg
        aria-describedby={shouldShowFallback ? fallbackId : undefined}
        aria-hidden={hasState ? true : undefined}
        aria-labelledby={hasState ? undefined : `${titleId} ${descId}`}
        className="c-chart__svg c-chart__svg--word-cloud"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
        role={hasState ? undefined : "img"}
        viewBox={`0 0 ${width} ${safeHeight}`}
      >
        <title id={titleId}>{svgTitle}</title>
        <desc id={descId}>{svgSummary}</desc>
        <g className="c-word-cloud__words">
          {words.map((word) => (
            <text
              dominantBaseline="middle"
              key={`${word.label}-${word.index}`}
              style={{ fill: word.color, fontFamily, fontSize: word.fontSize }}
              textAnchor="middle"
              x={word.x}
              y={word.y}
            >
              <title>{`${word.label}: ${formatDatum(valueFormatter, word.value, word)}${word.clipped ? " (clipped visually)" : ""}`}</title>
              {word.displayLabel}
            </text>
          ))}
        </g>
      </svg>
      {shouldShowFallback ? (
        <ol className="c-word-cloud__fallback" id={fallbackId}>
          {safeData.map((word, index) => (
            <li data-placement={placedIndexes.has(index) ? "placed" : "fallback"} key={`${word.label}-fallback-${index}`}>
              <span>{word.label}</span>
              <strong>{formatDatum(valueFormatter, word.value, word)}</strong>
            </li>
          ))}
        </ol>
      ) : null}
    </ChartFrame>
  );
}
