import type { HTMLAttributes, ReactNode } from "react";

export type ChartDatum = {
  label: string;
  value: number;
};

export type ChartMargin = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type ChartPoint = {
  x: number;
  y: number;
};

export type ChartTone = "neutral" | "sage" | "clay" | "plum" | "amber";

export type ChartFormatter = (value: number, datum?: ChartDatum) => string;

export type ScatterChartDatum = {
  label: string;
  x: number;
  y: number;
  radius?: number;
  color?: string;
  group?: string;
};

export type ScatterChartFormatter = (value: number, datum?: ScatterChartDatum) => string;

export type CartesianScaleOptions = {
  yDomain?: [number, number];
  includeZero?: boolean;
  clamp?: boolean;
  tickCount?: number;
};

export interface ChartBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  data: ChartDatum[];
  title?: string;
  summary?: string;
  loading?: boolean;
  error?: ReactNode;
  emptyText?: string;
  loadingText?: string;
  notice?: ReactNode;
  valueFormatter?: ChartFormatter;
}

export type CartesianChartProps = ChartBaseProps & {
  height?: number;
  margin?: Partial<ChartMargin>;
  maxDataPoints?: number;
  scale?: CartesianScaleOptions;
  showGrid?: boolean;
  tone?: ChartTone;
  xLabelMaxLength?: number;
};

export type PieChartSlice = ChartDatum & {
  percentage: number;
  startAngle: number;
  endAngle: number;
};

export type OrganizationChartNode = {
  id: string;
  title: string;
  subtitle?: string;
  avatar?: string;
  children?: OrganizationChartNode[];
};

export type TreemapNode = {
  id?: string;
  label: string;
  value?: number;
  color?: string;
  children?: TreemapNode[];
};

export type HeatmapDatum = {
  x: string;
  y: string;
  value: number | null | undefined;
};

export type HeatmapColorStop = {
  value: number;
  color: string;
  label?: string;
};

export type RadarChartAxis = {
  key: string;
  label: string;
  max?: number;
};

export type RadarChartSeries = {
  name: string;
  values: number[] | Record<string, number>;
  fill?: string;
  stroke?: string;
};

export type SankeyChartNode = {
  id: string;
  label: string;
  layer?: number;
  order?: number;
  value?: number;
};

export type SankeyChartLink = {
  source: string;
  target: string;
  value: number;
  label?: string;
};
