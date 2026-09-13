import cors from "@elysia/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";

import { getCorsConfig } from "@/configs/cors.config";
import type { RoutedApp } from "@/core/app.routes";
import type { AppModule } from "@/core/module";
import { modules as defaultModules } from "@/modules";
import { cachePlugin } from "@/modules/cache";
import { rateLimitPlugin } from "@/modules/rate-limit";
import { getSessionCookieName, sessionsPlugin } from "@/modules/sessions";
import { usersPlugin } from "@/modules/users";
import { csrfPlugin, envPlugin, errorPlugin, loggerPlugin } from "@/plugins";

export const createApp = (modules: readonly AppModule[] = defaultModules) => {
  modules.forEach((module) => module.register());

  const base = new Elysia({ name: "api", prefix: "/api" })
    .use(loggerPlugin)
    .use(errorPlugin)
    .use(envPlugin)
    .use(cors(getCorsConfig()))
    .use(csrfPlugin)
    .use(sessionsPlugin)
    .use(usersPlugin)
    .use(cachePlugin)
    .use(rateLimitPlugin)
    .use(
      openapi({
        documentation: {
          info: { title: "API", version: "0.1.0" },
          components: {
            securitySchemes: {
              sessionAuth: {
                type: "apiKey",
                in: "cookie",
                name: getSessionCookieName(),
              },
            },
          },
        },
      }),
    );

  return modules.reduce(
    (app, module) => (module.routes ? app.use(module.routes()) : app),
    base,
  );
};

export type App = RoutedApp;

export const startModules = async (
  modules: readonly AppModule[] = defaultModules,
): Promise<void> => {
  for (const module of modules) {
    await module.start();
  }
};

export const closeModules = async (
  modules: readonly AppModule[] = defaultModules,
): Promise<void> => {
  const errors: unknown[] = [];

  for (const module of [...modules].reverse()) {
    try {
      await module.shutdown();
    } catch (error) {
      errors.push(error);
    }
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, "one or more modules failed to shut down");
  }
};
