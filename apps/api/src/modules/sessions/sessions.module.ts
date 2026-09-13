import { MemorySessionStore } from "@/adapters/sessions/memory.session-store";
import { RedisSessionStore } from "@/adapters/sessions/redis.session-store";
import { NodeEnv } from "@/configs/env.config";
import { SECOND } from "@/constants";
import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";
import { getRedisConnection } from "@/infrastructure/redis";

import { SessionStore } from "./session.store";
import { sessionsRoutes } from "./sessions.routes";
import {
  ListSessionsUseCase,
  RevokeOtherSessionsUseCase,
  RevokeSessionUseCase,
} from "./use-cases";

export const sessionsModule = defineModule({
  name: "sessions",

  register: ({ env }) => {
    if (env.NODE_ENV === NodeEnv.Test) {
      const store = new MemorySessionStore();

      bind(SessionStore, () => store);

      return { connection: undefined };
    }

    const connection = getRedisConnection({
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

  routes: () =>
    sessionsRoutes({
      listSessions: makeUseCase(ListSessionsUseCase),
      revokeSession: makeUseCase(RevokeSessionUseCase),
      revokeOtherSessions: makeUseCase(RevokeOtherSessionsUseCase),
    }),

  start: async ({ state }) => {
    await state.connection?.connect();
  },

  ready: ({ state }) => state.connection?.ping() ?? true,
});
