import cors from "@elysia/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";

import { modules as defaultModules } from "@/app.modules";
import { getCorsConfig } from "@/configs/cors.config";
import type { RoutedApp } from "@/core/app.routes";
import type { AppModule } from "@/core/module";
import { getSessionCookieName } from "@/modules/sessions";
import { csrfPlugin, envPlugin, errorPlugin, loggerPlugin } from "@/plugins";

export const createApp = (modules: readonly AppModule[] = defaultModules) => {
  modules.forEach((module) => module.register());

  const base = new Elysia({ name: "api", prefix: "/api" })
    .use(loggerPlugin)
    .use(errorPlugin)
    .use(envPlugin)
    .use(cors(getCorsConfig()))
    .use(csrfPlugin);

  const withPlugins = modules.reduce(
    (app, module) => (module.plugins ? app.use(module.plugins()) : app),
    base,
  );

  const withOpenApi = withPlugins.use(
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
    withOpenApi,
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
