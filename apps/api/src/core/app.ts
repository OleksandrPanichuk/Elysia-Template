import cors from "@elysia/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";

import { getCorsConfig } from "@/configs/cors.config";
import type { AppModule } from "@/core/module";
import { modules as defaultModules } from "@/modules";
import { envPlugin, errorPlugin, loggerPlugin } from "@/plugins";

export const createApp = (modules: readonly AppModule[] = defaultModules) => {
  modules.forEach((module) => module.register?.());

  const base = new Elysia({ name: "api", prefix: "/api" })
    .use(loggerPlugin)
    .use(errorPlugin)
    .use(envPlugin)
    .use(cors(getCorsConfig()))
    .use(
      openapi({
        documentation: {
          info: { title: "API", version: "0.1.0" },
          components: {
            securitySchemes: {
              bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
              },
            },
          },
        },
      }),
    );

  return modules.reduce((app, module) => app.use(module.routes()), base);
};

export type App = ReturnType<typeof createApp>;
