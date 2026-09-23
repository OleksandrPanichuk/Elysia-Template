import { Elysia } from "elysia";
import type { Server } from "elysia/universal/server";

import type { AuthUser } from "@/core/auth";
import { make } from "@/core/registry";
import type { RouteRateLimitHook } from "@/core/route";
import { getClientIp } from "@/shared";

import { type RateLimitHitResult, RateLimitStore } from "./ports";
import { RateLimitExceededError } from "./rate-limit.errors";
import { rateLimitStoreKey } from "./rate-limit.keys";

interface RateLimitContext {
  request: Request;
  server: Server | null;
  path: string;
  body: unknown;
  user?: AuthUser;
  set: {
    headers: Record<string, string | number>;
  };
}

const defaultKey = (context: RateLimitContext): string =>
  context.user
    ? `user:${context.user.id}`
    : `ip:${getClientIp(context.request, context.server) ?? "unknown"}`;

const rateLimitKey = (
  context: RateLimitContext,
  rule: RouteRateLimitHook,
): string => {
  const scope = rule.scope ?? context.path;
  const subject = rule.key?.(context as never) ?? defaultKey(context);

  return rateLimitStoreKey(scope, subject);
};

const hit = (
  context: RateLimitContext,
  rule: RouteRateLimitHook,
): Promise<RateLimitHitResult> =>
  make(RateLimitStore).hit({
    key: rateLimitKey(context, rule),
    limit: rule.limit,
    windowMs: rule.windowMs,
  });

const tightest = (results: RateLimitHitResult[]): RateLimitHitResult =>
  results.reduce((closest, result) =>
    result.remaining < closest.remaining ? result : closest,
  );

const secondsUntil = (at: number): number =>
  Math.max(1, Math.ceil((at - Date.now()) / 1000));

export const rateLimitPlugin = new Elysia({ name: "rate-limit" })
  .macro({
    rateLimit: (rules: RouteRateLimitHook[]) => ({
      beforeHandle: async (raw: unknown) => {
        const context = raw as RateLimitContext;

        const results = await Promise.all(
          rules.map((rule) => hit(context, rule)),
        );
        const closest = tightest(results);

        context.set.headers["ratelimit-limit"] = closest.limit;
        context.set.headers["ratelimit-remaining"] = closest.remaining;
        context.set.headers["ratelimit-reset"] = secondsUntil(closest.resetAt);

        const blocked = results.filter((result) => !result.allowed);

        if (blocked.length === 0) return;

        context.set.headers["retry-after"] = secondsUntil(
          Math.max(...blocked.map((result) => result.resetAt)),
        );

        throw new RateLimitExceededError("Too many requests. Try again later.");
      },
    }),
  })
  .as("global");
