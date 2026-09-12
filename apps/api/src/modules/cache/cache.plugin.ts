import { Elysia, getSchemaValidator } from "elysia";
import z from "zod";

import type { AuthUser } from "@/core/auth";
import { make } from "@/core/registry";
import type { RouteCacheHook } from "@/core/route";

import { Cache } from "./ports";

const CACHE_HEADER = "x-cache";

interface CacheContext {
  request: Request;
  path: string;
  query: Record<string, unknown>;
  user?: AuthUser;
  set: {
    status?: number | string;
    headers: Record<string, string | number>;
  };
  response?: unknown;
}

const defaultKey = ({ request, path, query }: CacheContext): string => {
  const search = Object.entries(query)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}=${String(value)}`)
    .join("&");

  return `${request.method}:${path}${search ? `?${search}` : ""}`;
};

const routeCacheKey = (
  context: CacheContext,
  options: RouteCacheHook,
): string => {
  const base = options.key
    ? options.key(context as never)
    : defaultKey(context);

  return context.user
    ? `routes:${base}|user:${context.user.id}`
    : `routes:${base}`;
};

const isCacheable = ({ set }: CacheContext): boolean =>
  set.status === undefined || set.status === 200;

export const cachePlugin = new Elysia({ name: "cache" })
  .macro({
    cache: (options: RouteCacheHook) => {
      const validator = getSchemaValidator(options.response);

      return {
        beforeHandle: async (raw) => {
          const context = raw as unknown as CacheContext;
          const hit = await make(Cache).get(
            routeCacheKey(context, options),
            z.unknown(),
          );

          if (hit !== null && validator.Check(hit)) {
            context.set.headers[CACHE_HEADER] = "HIT";

            return hit;
          }

          context.set.headers[CACHE_HEADER] = "MISS";
        },

        afterHandle: async (raw) => {
          const context = raw as unknown as CacheContext;

          if (context.set.headers[CACHE_HEADER] === "HIT") return;
          if (!isCacheable(context)) return;

          await make(Cache).set(
            routeCacheKey(context, options),
            context.response,
            { ttlMs: options.ttlMs },
          );
        },
      };
    },
  })
  .as("global");
