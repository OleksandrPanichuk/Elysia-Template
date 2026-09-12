import { MemoryCache } from "@/adapters/cache/memory.cache";
import { RedisCache } from "@/adapters/cache/redis.cache";
import { NodeEnv } from "@/configs";
import { SECOND } from "@/constants";
import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";
import { RedisConnection } from "@/infrastructure/redis";

import { Cache } from "./ports";

export const cacheModule = defineModule({
  name: "cache",

  register: ({ env }) => {
    if (env.NODE_ENV === NodeEnv.Test) {
      const cache = new MemoryCache();

      bind(Cache, () => cache);

      return { cache, connection: undefined };
    }

    const connection = new RedisConnection({
      name: "cache",
      url: env.CACHE_REDIS_URL,
      options: {
        connectTimeout: 2 * SECOND,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
      },
    });
    const cache = new RedisCache(connection);

    bind(Cache, () => cache);

    return { cache, connection };
  },

  start: ({ state }) => state.cache.verify(),

  ready: ({ state }) => state.connection?.ping() ?? true,

  shutdown: ({ state }) => state.cache.close(),
});
