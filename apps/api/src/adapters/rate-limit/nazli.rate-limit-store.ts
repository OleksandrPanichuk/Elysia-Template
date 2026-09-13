import { redisStore } from "elysia-nazli/redis";

import { getLogger } from "@/infrastructure";
import type { RedisConnection } from "@/infrastructure/redis";
import {
  type RateLimitHitOptions,
  type RateLimitHitResult,
  RateLimitStore,
} from "@/modules/rate-limit/ports/rate-limit-store";
import { RATE_LIMIT_KEY_PREFIX } from "@/modules/rate-limit/rate-limit.constants";

type NazliStore = ReturnType<typeof redisStore>;

export class NazliRateLimitStore extends RateLimitStore {
  private store: NazliStore | undefined;

  constructor(private readonly connection: RedisConnection) {
    super();
  }

  public async hit({
    key,
    limit,
    windowMs,
  }: RateLimitHitOptions): Promise<RateLimitHitResult> {
    const now = Date.now();

    try {
      const result = await this.resolve().hit({
        key,
        limit,
        window: windowMs,
        cost: 1,
        now,
      });

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

  private resolve(): NazliStore {
    return (this.store ??= redisStore({
      client: this.connection.instance as never,
      adapter: "ioredis",
      prefix: RATE_LIMIT_KEY_PREFIX,
    }));
  }
}
