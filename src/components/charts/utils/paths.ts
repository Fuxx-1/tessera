import type { ChartPoint, PieChartSlice } from "../types";
import { sanitizeNumber } from "./scale";

export function sanitizeSvgPoint(point: ChartPoint): ChartPoint | null {
  return Number.isFinite(point.x) && Number.isFinite(point.y) ? point : null;
}

export function getRenderablePoints(points: ChartPoint[]) {
  return points.flatMap((point) => {
    const safePoint = sanitizeSvgPoint(point);
    return safePoint ? [safePoint] : [];
  });
}

function formatPathCoordinate(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

export function createLinePath(points: ChartPoint[]) {
  return getRenderablePoints(points)
    .map((point, index) => `${index === 0 ? "M" : "L"} ${formatPathCoordinate(point.x)} ${formatPathCoordinate(point.y)}`)
    .join(" ");
}

export function createAreaPath(points: ChartPoint[], baselineY: number) {
  const renderablePoints = getRenderablePoints(points);
  const safeBaselineY = sanitizeNumber(baselineY, 0);

  if (renderablePoints.length === 0) {
    return "";
  }

  const linePath = createLinePath(renderablePoints);
  const lastPoint = renderablePoints[renderablePoints.length - 1];
  const firstPoint = renderablePoints[0];
  return `${linePath} L ${lastPoint.x} ${safeBaselineY} L ${firstPoint.x} ${safeBaselineY} Z`;
}

export function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const safeCenterX = sanitizeNumber(centerX, 0);
  const safeCenterY = sanitizeNumber(centerY, 0);
  const safeRadius = Math.max(0, sanitizeNumber(radius, 0));
  const safeAngle = sanitizeNumber(angleInDegrees, 0);
  const angleInRadians = ((safeAngle - 90) * Math.PI) / 180;
  return {
    x: safeCenterX + safeRadius * Math.cos(angleInRadians),
    y: safeCenterY + safeRadius * Math.sin(angleInRadians),
  };
}

export function createPieSlicePath(centerX: number, centerY: number, radius: number, slice: PieChartSlice) {
  const safeCenterX = sanitizeNumber(centerX, 0);
  const safeCenterY = sanitizeNumber(centerY, 0);
  const safeRadius = Math.max(0, sanitizeNumber(radius, 0));
  const safeStartAngle = sanitizeNumber(slice.startAngle, 0);
  const safeEndAngle = sanitizeNumber(slice.endAngle, safeStartAngle);
  const angleSpan = Math.max(0, safeEndAngle - safeStartAngle);

  if (safeRadius <= 0 || angleSpan <= 0) {
    return "";
  }

  if (angleSpan >= 359.999) {
    return [
      `M ${safeCenterX} ${safeCenterY}`,
      `L ${safeCenterX} ${safeCenterY - safeRadius}`,
      `A ${safeRadius} ${safeRadius} 0 1 1 ${safeCenterX} ${safeCenterY + safeRadius}`,
      `A ${safeRadius} ${safeRadius} 0 1 1 ${safeCenterX} ${safeCenterY - safeRadius}`,
      "Z",
    ].join(" ");
  }

  const start = polarToCartesian(safeCenterX, safeCenterY, safeRadius, safeEndAngle);
  const end = polarToCartesian(safeCenterX, safeCenterY, safeRadius, safeStartAngle);
  const largeArcFlag = angleSpan <= 180 ? "0" : "1";

  return [
    `M ${safeCenterX} ${safeCenterY}`,
    `L ${start.x} ${start.y}`,
    `A ${safeRadius} ${safeRadius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

export function createPieSlices(data: Array<{ label: string; value: number }>): PieChartSlice[] {
  const safeData = data.filter((datum) => Number.isFinite(datum.value) && datum.value > 0);
  const total = safeData.reduce((sum, datum) => sum + datum.value, 0);
  let currentAngle = 0;

  if (!Number.isFinite(total) || total <= 0) {
    return [];
  }

  return safeData.map((datum) => {
    const angle = (datum.value / total) * 360;
    const slice = {
      ...datum,
      percentage: datum.value / total,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
    };
    currentAngle += angle;
    return slice;
  });
}
