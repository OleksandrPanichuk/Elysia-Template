import { Elysia } from "elysia";

import type { AuthUser } from "@/core/auth";
import { make } from "@/core/registry";
import type { RouteRateLimitHook } from "@/core/route";
import { getClientIp } from "@/shared";

import { RateLimitStore } from "./ports";
import { RateLimitExceededError } from "./rate-limit.errors";

interface RateLimitContext {
  request: Request;
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
    : `ip:${getClientIp(context.request) ?? "unknown"}`;

const rateLimitKey = (
  context: RateLimitContext,
  options: RouteRateLimitHook,
): string => {
  const scope = options.scope ?? context.path;
  const subject = options.key?.(context as never) ?? defaultKey(context);

  return `${scope}|${subject}`;
};

export const rateLimitPlugin = new Elysia({ name: "rate-limit" })
  .macro({
    rateLimit: (options: RouteRateLimitHook) => ({
      beforeHandle: async (raw: unknown) => {
        const context = raw as RateLimitContext;

        const result = await make(RateLimitStore).hit({
          key: rateLimitKey(context, options),
          limit: options.limit,
          windowMs: options.windowMs,
        });

        context.set.headers["ratelimit-limit"] = result.limit;
        context.set.headers["ratelimit-remaining"] = result.remaining;
        context.set.headers["ratelimit-reset"] = Math.ceil(
          (result.resetAt - Date.now()) / 1000,
        );

        if (result.allowed) return;

        context.set.headers["retry-after"] = Math.max(
          1,
          Math.ceil((result.resetAt - Date.now()) / 1000),
        );

        throw new RateLimitExceededError("Too many requests. Try again later.");
      },
    }),
  })
  .as("global");
