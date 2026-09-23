import { MemoryRateLimitStore } from "@/adapters/rate-limit/memory.rate-limit-store";
import { NazliRateLimitStore } from "@/adapters/rate-limit/nazli.rate-limit-store";
import { NodeEnv } from "@/configs/env.config";
import { SECOND } from "@/constants";
import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";
import { getSharedRedisConnection } from "@/infrastructure/redis";

import { RateLimitStore } from "./ports";
import { rateLimitPlugin } from "./rate-limit.plugin";

export const rateLimitModule = defineModule({
  name: "rate-limit",

  register: ({ env }) => {
    if (env.NODE_ENV === NodeEnv.Test) {
      const store = new MemoryRateLimitStore();

      bind(RateLimitStore, () => store);

      return { store, connection: undefined };
    }

    const connection = getSharedRedisConnection({
      name: "rate-limit",
      url: env.RATE_LIMIT_REDIS_URL ?? env.SESSIONS_REDIS_URL,
      options: {
        connectTimeout: 2 * SECOND,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      },
    });
    const store = new NazliRateLimitStore(
      connection,
      `${env.APP_SLUG}:rate-limit`,
    );

    bind(RateLimitStore, () => store);

    return { store, connection };
  },

  plugins: () => rateLimitPlugin,

  start: async ({ state }) => {
    await state.connection?.connect();
  },

  ready: ({ state }) => state.connection?.ping() ?? true,

  shutdown: ({ state }) => state.store.close(),
});
