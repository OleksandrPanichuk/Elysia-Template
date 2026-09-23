import { describe, expect, test } from "bun:test";

import { SentryErrorReporter, type SentrySdk } from "./sentry.error-reporter";

interface Captured {
  error: unknown;
  context: Parameters<SentrySdk["captureException"]>[1];
}

const fakeSdk = () => {
  const inits: Array<Parameters<SentrySdk["init"]>[0]> = [];
  const captured: Captured[] = [];
  const closes: number[] = [];

  const sdk: SentrySdk = {
    init: (options) => inits.push(options),
    captureException: (error, context) => {
      captured.push({ error, context });

      return "event-id";
    },
    close: (timeoutMs) => {
      closes.push(timeoutMs);

      return Promise.resolve(true);
    },
  };

  return { sdk, inits, captured, closes };
};

const options = {
  dsn: "https://key@o0.ingest.sentry.io/0",
  environment: "production",
  release: "1.2.3",
};

describe("SentryErrorReporter", () => {
  test("starts the sdk without sending personal data by default", async () => {
    const { sdk, inits } = fakeSdk();

    await new SentryErrorReporter(options, sdk).start();

    expect(inits).toEqual([{ ...options, sendDefaultPii: false }]);
  });

  test("sends the source, request id and user with the error", () => {
    const { sdk, captured } = fakeSdk();
    const error = new Error("boom");

    new SentryErrorReporter(options, sdk).report(error, {
      source: "http",
      requestId: "req-1",
      userId: "user-1",
      tags: { path: "/api/users/me" },
      extra: { attempt: 1 },
    });

    expect(captured).toEqual([
      {
        error,
        context: {
          tags: { source: "http", requestId: "req-1", path: "/api/users/me" },
          extra: { attempt: 1 },
          user: { id: "user-1" },
        },
      },
    ]);
  });

  test("leaves the user out when there is none", () => {
    const { sdk, captured } = fakeSdk();

    new SentryErrorReporter(options, sdk).report(new Error("boom"), {
      source: "job",
    });

    expect(captured[0]?.context).toEqual({
      tags: { source: "job" },
      extra: {},
    });
  });

  test("never throws when the sdk does", () => {
    const { sdk } = fakeSdk();
    const failing: SentrySdk = {
      ...sdk,
      captureException: () => {
        throw new Error("sdk broke");
      },
    };

    expect(() =>
      new SentryErrorReporter(options, failing).report(new Error("boom"), {
        source: "http",
      }),
    ).not.toThrow();
  });

  test("flushes pending events on close", async () => {
    const { sdk, closes } = fakeSdk();

    await new SentryErrorReporter(options, sdk).close();

    expect(closes).toEqual([2_000]);
  });
});
