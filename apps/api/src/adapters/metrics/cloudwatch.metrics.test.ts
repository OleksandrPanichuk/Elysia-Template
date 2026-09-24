import type { PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { describe, expect, test } from "bun:test";

import { CLOUDWATCH_MAX_METRICS_PER_REQUEST } from "@/platform/metrics";

import { CloudWatchMetrics, type MetricsSender } from "./cloudwatch.metrics";

const NOW = new Date("2026-09-24T12:00:00.000Z");

const recorder = (fail = false) => {
  const sent: Array<PutMetricDataCommand["input"]> = [];
  const client: MetricsSender = {
    send: (command) => {
      sent.push(command.input);

      return fail
        ? Promise.reject(new Error("no credentials"))
        : Promise.resolve({});
    },
  };
  const metrics = new CloudWatchMetrics({
    namespace: "acme",
    environment: "production",
    flushIntervalMs: 60_000,
    client,
    now: () => NOW,
  });

  return { sent, metrics };
};

const request = (durationMs: number, status = 200) => ({
  method: "GET",
  route: "/api/users/me",
  status,
  durationMs,
});

describe("CloudWatchMetrics", () => {
  test("aggregates requests with the same dimensions into one statistic set", async () => {
    const { sent, metrics } = recorder();

    metrics.recordRequest(request(10));
    metrics.recordRequest(request(30));
    metrics.recordRequest(request(20));
    await metrics.flush();

    expect(sent).toHaveLength(1);
    expect(sent[0]?.Namespace).toBe("acme");

    const datum = (name: string) =>
      sent[0]?.MetricData?.find((metric) => metric.MetricName === name);

    expect(datum("RequestDuration")).toEqual({
      MetricName: "RequestDuration",
      Unit: "Milliseconds",
      Timestamp: NOW,
      Dimensions: [
        { Name: "Environment", Value: "production" },
        { Name: "Method", Value: "GET" },
        { Name: "Route", Value: "/api/users/me" },
        { Name: "StatusClass", Value: "2xx" },
      ],
      StatisticValues: { SampleCount: 3, Sum: 60, Minimum: 10, Maximum: 30 },
    });
    expect(datum("RequestCount")?.StatisticValues).toEqual({
      SampleCount: 3,
      Sum: 3,
      Minimum: 1,
      Maximum: 1,
    });
  });

  test("keeps different dimensions apart", async () => {
    const { sent, metrics } = recorder();

    metrics.recordRequest(request(10, 200));
    metrics.recordRequest(request(10, 503));
    metrics.recordJob({
      job: "notifications.send-email",
      queue: "notifications",
      outcome: "failed",
      durationMs: 5,
    });
    await metrics.flush();

    const names = (sent[0]?.MetricData ?? []).map(
      (datum) =>
        `${datum.MetricName}:${datum.Dimensions?.map((d) => d.Value).join(",")}`,
    );

    expect(names).toHaveLength(6);
    expect(names).toContain("RequestCount:production,GET,/api/users/me,5xx");
    expect(names).toContain(
      "JobDuration:production,notifications.send-email,notifications,failed",
    );
  });

  test("splits a large flush into requests CloudWatch accepts", async () => {
    const { sent, metrics } = recorder();

    for (let i = 0; i < CLOUDWATCH_MAX_METRICS_PER_REQUEST; i += 1) {
      metrics.recordRequest({ ...request(1), route: `/api/r${i}` });
    }
    await metrics.flush();

    expect(sent).toHaveLength(2);
    expect(sent.map((input) => input.MetricData?.length)).toEqual([
      CLOUDWATCH_MAX_METRICS_PER_REQUEST,
      CLOUDWATCH_MAX_METRICS_PER_REQUEST,
    ]);
  });

  test("sends nothing when nothing was recorded", async () => {
    const { sent, metrics } = recorder();

    await metrics.flush();

    expect(sent).toHaveLength(0);
  });

  test("starts a fresh window after each flush", async () => {
    const { sent, metrics } = recorder();

    metrics.recordRequest(request(10));
    await metrics.flush();
    await metrics.flush();

    expect(sent).toHaveLength(1);
  });

  test("never throws when CloudWatch refuses the request", async () => {
    const { sent, metrics } = recorder(true);

    metrics.recordRequest(request(10));

    expect(await metrics.flush().then(() => "settled")).toBe("settled");
    expect(sent).toHaveLength(1);
  });

  test("flushes what is left on close", async () => {
    const { sent, metrics } = recorder();

    await metrics.start();
    metrics.recordRequest(request(10));
    await metrics.close();

    expect(sent).toHaveLength(1);
  });
});
