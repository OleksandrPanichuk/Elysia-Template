import { MemoryErrorReporter } from "@/adapters/error-reporting/memory.error-reporter";
import { NoopErrorReporter } from "@/adapters/error-reporting/noop.error-reporter";
import { SentryErrorReporter } from "@/adapters/error-reporting/sentry.error-reporter";
import { NodeEnv } from "@/configs";
import { ErrorReporter } from "@/core/error-reporting";
import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";

export const errorReportingModule = defineModule({
  name: "error-reporting",

  register: ({ env, logger }) => {
    if (env.NODE_ENV === NodeEnv.Test) {
      const reporter = new MemoryErrorReporter();

      bind(ErrorReporter, () => reporter);

      return { reporter };
    }

    if (!env.SENTRY_DSN) {
      logger.info("SENTRY_DSN is not set; errors are logged but not reported");

      const reporter = new NoopErrorReporter();

      bind(ErrorReporter, () => reporter);

      return { reporter };
    }

    const reporter = new SentryErrorReporter({
      dsn: env.SENTRY_DSN,
      environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
      release: env.SENTRY_RELEASE,
    });

    bind(ErrorReporter, () => reporter);

    return { reporter };
  },

  start: ({ state }) => state.reporter.start(),

  shutdown: ({ state }) => state.reporter.close(),
});
