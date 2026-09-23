import { redisStore } from "elysia-nazli/redis";

import { getLogger } from "@/infrastructure";
import type { RedisConnection } from "@/infrastructure/redis";
import {
  type RateLimitHitOptions,
  type RateLimitHitResult,
  RateLimitStore,
} from "@/platform/rate-limit/ports/rate-limit-store";
import { RATE_LIMIT_STORE_TIMEOUT_MS } from "@/platform/rate-limit/rate-limit.constants";

type NazliStore = ReturnType<typeof redisStore>;

export class NazliRateLimitStore extends RateLimitStore {
  private store: NazliStore | undefined;

  constructor(
    private readonly connection: RedisConnection,
    private readonly keyPrefix: string,
    private readonly timeoutMs = RATE_LIMIT_STORE_TIMEOUT_MS,
  ) {
    super();
  }

  public async hit({
    key,
    limit,
    windowMs,
  }: RateLimitHitOptions): Promise<RateLimitHitResult> {
    const now = Date.now();

    try {
      const result = await this.withinTimeout(
        this.resolve().hit({
          key,
          limit,
          window: windowMs,
          cost: 1,
          now,
        }),
      );

      return {
        allowed: !result.blocked,
        remaining: Math.max(0, result.remaining),
        limit: result.limit,
        resetAt: result.resetAt,
      };
    } catch (error) {
      getLogger().error({ err: error, key }, "rate limit store unavailable");

      return {
        allowed: true,
        remaining: limit,
        limit,
        resetAt: now + windowMs,
      };
    }
  }

  public async peek({
    key,
    limit,
    windowMs,
  }: RateLimitHitOptions): Promise<number> {
    try {
      const result = await this.withinTimeout(
        this.resolve().hit({
          key,
          limit,
          window: windowMs,
          cost: 0,
          now: Date.now(),
        }),
      );

      return Math.max(0, result.limit - result.remaining);
    } catch (error) {
      getLogger().error({ err: error, key }, "rate limit store unavailable");

      return limit;
    }
  }

  private async withinTimeout<T>(operation: T | Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new Error(`Rate limit store timed out after ${this.timeoutMs}ms`),
        );
      }, this.timeoutMs);
    });

    try {
      return await Promise.race([operation, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  private resolve(): NazliStore {
    return (this.store ??= redisStore({
      client: this.connection.instance as never,
      adapter: "ioredis",
      prefix: this.keyPrefix,
    }));
  }
}
