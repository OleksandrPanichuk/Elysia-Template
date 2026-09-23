import * as Sentry from "@sentry/bun";

import { type ErrorReport, ErrorReporter } from "@/core/error-reporting";
import { getLogger } from "@/infrastructure";
import { ERROR_REPORTING_FLUSH_TIMEOUT_MS } from "@/platform/error-reporting/error-reporting.constants";

export interface SentryErrorReporterOptions {
  dsn: string;
  environment: string;
  release?: string;
}

export interface SentrySdk {
  init(options: {
    dsn: string;
    environment: string;
    release?: string;
    sendDefaultPii: boolean;
  }): unknown;
  captureException(
    error: unknown,
    context: {
      tags: Record<string, string>;
      extra: Record<string, unknown>;
      user?: { id: string };
    },
  ): string;
  close(timeoutMs: number): PromiseLike<boolean>;
}

const bunSentry: SentrySdk = {
  init: (options) =>
    Sentry.initWithoutDefaultIntegrations({
      ...options,
      integrations: [
        Sentry.dedupeIntegration(),
        Sentry.linkedErrorsIntegration(),
        Sentry.functionToStringIntegration(),
        Sentry.eventFiltersIntegration(),
        Sentry.contextLinesIntegration(),
        Sentry.nodeContextIntegration(),
      ],
    }),
  captureException: (error, context) => Sentry.captureException(error, context),
  close: (timeoutMs) => Sentry.close(timeoutMs),
};

export class SentryErrorReporter extends ErrorReporter {
  constructor(
    private readonly options: SentryErrorReporterOptions,
    private readonly sdk: SentrySdk = bunSentry,
  ) {
    super();
  }

  public start(): Promise<void> {
    this.sdk.init({
      dsn: this.options.dsn,
      environment: this.options.environment,
      release: this.options.release,
      sendDefaultPii: false,
    });

    return Promise.resolve();
  }

  public report(
    error: unknown,
    { source, requestId, userId, tags, extra }: ErrorReport,
  ): void {
    try {
      this.sdk.captureException(error, {
        tags: {
          source,
          ...(requestId ? { requestId } : {}),
          ...tags,
        },
        extra: { ...extra },
        ...(userId ? { user: { id: userId } } : {}),
      });
    } catch (cause) {
      getLogger().error(
        { component: "SentryErrorReporter", err: cause },
        "error report was not sent",
      );
    }
  }

  public async close(): Promise<void> {
    await this.sdk.close(ERROR_REPORTING_FLUSH_TIMEOUT_MS);
  }
}
