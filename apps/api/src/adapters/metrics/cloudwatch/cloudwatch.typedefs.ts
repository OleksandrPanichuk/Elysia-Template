import type {
  PutMetricDataCommand,
  StandardUnit,
} from "@aws-sdk/client-cloudwatch";

export type Dimensions = Readonly<Record<string, string>>;

export interface MetricsSender {
  send(command: PutMetricDataCommand): Promise<unknown>;
}

export interface CloudWatchMetricsOptions {
  namespace: string;
  environment: string;
  flushIntervalMs: number;
  client?: MetricsSender;
  now?: () => Date;
}

export interface Aggregate {
  name: string;
  unit: StandardUnit;
  dimensions: Dimensions;
  count: number;
  sum: number;
  min: number;
  max: number;
}
