import {
  CloudWatchClient,
  type MetricDatum,
  PutMetricDataCommand,
  type StandardUnit,
} from "@aws-sdk/client-cloudwatch";

import { getLogger } from "@/infrastructure";
import {
  CLOUDWATCH_MAX_METRICS_PER_REQUEST,
  CLOUDWATCH_REQUEST_TIMEOUT_MS,
} from "@/platform/metrics/metrics.constants";
import {
  type JobMeasurement,
  Metrics,
  type RequestMeasurement,
} from "@/platform/metrics/ports/metrics";

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

interface Aggregate {
  name: string;
  unit: StandardUnit;
  dimensions: Record<string, string>;
  count: number;
  sum: number;
  min: number;
  max: number;
}

const statusClass = (status: number): string => `${Math.floor(status / 100)}xx`;

const aggregateKey = (
  name: string,
  dimensions: Record<string, string>,
): string => `${name}|${JSON.stringify(Object.entries(dimensions))}`;

const toDatum = (aggregate: Aggregate, timestamp: Date): MetricDatum => ({
  MetricName: aggregate.name,
  Unit: aggregate.unit,
  Timestamp: timestamp,
  Dimensions: Object.entries(aggregate.dimensions).map(([name, value]) => ({
    Name: name,
    Value: value,
  })),
  StatisticValues: {
    SampleCount: aggregate.count,
    Sum: aggregate.sum,
    Minimum: aggregate.min,
    Maximum: aggregate.max,
  },
});

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

export class CloudWatchMetrics extends Metrics {
  private readonly client: MetricsSender;

  private readonly now: () => Date;

  private buffer = new Map<string, Aggregate>();

  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly options: CloudWatchMetricsOptions) {
    super();

    this.client =
      options.client ??
      new CloudWatchClient({
        requestHandler: { requestTimeout: CLOUDWATCH_REQUEST_TIMEOUT_MS },
      });
    this.now = options.now ?? (() => new Date());
  }

  public recordRequest({
    method,
    route,
    status,
    durationMs,
  }: RequestMeasurement): void {
    const dimensions = {
      Environment: this.options.environment,
      Method: method,
      Route: route,
      StatusClass: statusClass(status),
    };

    this.add("RequestCount", "Count", dimensions, 1);
    this.add("RequestDuration", "Milliseconds", dimensions, durationMs);
  }

  public recordJob({ job, queue, outcome, durationMs }: JobMeasurement): void {
    const dimensions = {
      Environment: this.options.environment,
      Job: job,
      Queue: queue,
      Outcome: outcome,
    };

    this.add("JobCount", "Count", dimensions, 1);
    this.add("JobDuration", "Milliseconds", dimensions, durationMs);
  }

  public start(): Promise<void> {
    this.timer ??= setInterval(() => {
      this.flush().catch(() => undefined);
    }, this.options.flushIntervalMs);
    this.timer.unref();

    return Promise.resolve();
  }

  public async flush(): Promise<void> {
    if (this.buffer.size === 0) return;

    const aggregates = [...this.buffer.values()];
    const timestamp = this.now();

    this.buffer = new Map();

    const batches = chunk(
      aggregates.map((aggregate) => toDatum(aggregate, timestamp)),
      CLOUDWATCH_MAX_METRICS_PER_REQUEST,
    );

    await Promise.all(batches.map((data) => this.send(data)));
  }

  public async close(): Promise<void> {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    await this.flush();
  }

  private add(
    name: string,
    unit: StandardUnit,
    dimensions: Record<string, string>,
    value: number,
  ): void {
    const key = aggregateKey(name, dimensions);
    const current = this.buffer.get(key);

    if (!current) {
      this.buffer.set(key, {
        name,
        unit,
        dimensions,
        count: 1,
        sum: value,
        min: value,
        max: value,
      });

      return;
    }

    current.count += 1;
    current.sum += value;
    current.min = Math.min(current.min, value);
    current.max = Math.max(current.max, value);
  }

  private async send(data: MetricDatum[]): Promise<void> {
    try {
      await this.client.send(
        new PutMetricDataCommand({
          Namespace: this.options.namespace,
          MetricData: data,
        }),
      );
    } catch (cause) {
      getLogger().error(
        {
          component: "CloudWatchMetrics",
          dropped: data.length,
          err: cause,
        },
        "metrics were not sent",
      );
    }
  }
}
