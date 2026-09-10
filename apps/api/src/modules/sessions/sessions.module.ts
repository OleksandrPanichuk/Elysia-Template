import { RedisSessionStore } from "@/adapters/sessions/redis.session-store";
import { defineModule } from "@/core/module";
import { registerReadinessCheck } from "@/core/readiness";
import { bind } from "@/core/registry";
import {
  closeSessionsRedis,
  getSessionsRedis,
  pingSessionsRedis,
} from "@/infrastructure/redis";

import { SessionStore } from "./session.store";

export const sessionsModule = defineModule({
  name: "sessions",

  register: () => {
    bind(SessionStore, () => new RedisSessionStore());
    registerReadinessCheck("sessions", pingSessionsRedis);
  },

  start: async () => {
    await getSessionsRedis();
  },

  shutdown: closeSessionsRedis,
});
