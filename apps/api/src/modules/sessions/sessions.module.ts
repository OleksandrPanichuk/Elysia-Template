import { MemorySessionStore } from "@/adapters/sessions/memory.session-store";
import { RedisSessionStore } from "@/adapters/sessions/redis.session-store";
import { NodeEnv } from "@/configs/env.config";
import { SECOND } from "@/constants";
import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";
import { RedisConnection } from "@/infrastructure/redis";

import { SessionStore } from "./session.store";

export const sessionsModule = defineModule({
  name: "sessions",

  register: ({ env }) => {
    if (env.NODE_ENV === NodeEnv.Test) {
      const store = new MemorySessionStore();

      bind(SessionStore, () => store);

      return { connection: undefined };
    }

    const connection = new RedisConnection({
      name: "sessions",
      url: env.SESSIONS_REDIS_URL,
      options: {
        connectTimeout: 2 * SECOND,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      },
    });

    bind(SessionStore, () => new RedisSessionStore(connection));

    return { connection };
  },

  start: async ({ state }) => {
    await state.connection?.connect();
  },

  ready: ({ state }) => state.connection?.ping() ?? true,

  shutdown: ({ state }) => state.connection?.close(),
});
