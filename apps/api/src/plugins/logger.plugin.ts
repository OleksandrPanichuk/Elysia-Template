import { Elysia } from "elysia";

import { getLogger } from "@/infrastructure";
import { enterRequestContext } from "@/shared";

export const REQUEST_ID_HEADER = "x-request-id";

const startTimes = new WeakMap<Request, number>();

export const IGNORED_LOG_PATHS = new Set<string>([
  "/favicon.ico",
  "/robots.txt",
]);

export const loggerPlugin = new Elysia({ name: "logger" })
  .onRequest(({ request, set }) => {
    startTimes.set(request, performance.now());

    const requestId =
      request.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID();

    set.headers[REQUEST_ID_HEADER] = requestId;
    enterRequestContext({ requestId });
  })
  .derive(({ set }) => ({
    requestId: set.headers[REQUEST_ID_HEADER] ?? "",
    log: getLogger(),
  }))
  .onAfterResponse(({ request, set }) => {
    const startedAt = startTimes.get(request);
    startTimes.delete(request);

    const status = set.status ?? 200;
    const code = typeof status === "number" ? status : undefined;
    const path = new URL(request.url).pathname;

    if (IGNORED_LOG_PATHS.has(path) && (code === undefined || code < 500)) {
      return;
    }

    const level =
      code === undefined || code < 400 ? "info" : code < 500 ? "warn" : "error";

    getLogger()[level](
      {
        method: request.method,
        path,
        status,
        ...(startedAt === undefined
          ? {}
          : { durationMs: Number((performance.now() - startedAt).toFixed(2)) }),
      },
      "request completed",
    );
  })
  .as("global");
