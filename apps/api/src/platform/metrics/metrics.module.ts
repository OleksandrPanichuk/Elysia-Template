import { CloudWatchMetrics } from "@/adapters/metrics/cloudwatch";
import { MemoryMetrics } from "@/adapters/metrics/memory.metrics";
import { NoopMetrics } from "@/adapters/metrics/noop.metrics";
import { NodeEnv } from "@/configs";
import { SECOND } from "@/constants";
import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";

import { Metrics } from "./ports";

export const metricsModule = defineModule({
  name: "metrics",

  register: ({ env, logger }) => {
    if (env.NODE_ENV === NodeEnv.Test) {
      const metrics = new MemoryMetrics();

      bind(Metrics, () => metrics);

      return { metrics };
    }

    const namespace = env.CLOUDWATCH_METRICS_NAMESPACE;

    if (!namespace) {
      logger.info(
        "CLOUDWATCH_METRICS_NAMESPACE is not set; metrics are not recorded",
      );

      const metrics = new NoopMetrics();

      bind(Metrics, () => metrics);

      return { metrics };
    }

    const metrics = new CloudWatchMetrics({
      namespace,
      environment: env.NODE_ENV,
      flushIntervalMs: env.CLOUDWATCH_METRICS_FLUSH_SECONDS * SECOND,
    });

    bind(Metrics, () => metrics);

    return { metrics };
  },

  start: ({ state }) => state.metrics.start(),

  shutdown: ({ state }) => state.metrics.close(),
});
