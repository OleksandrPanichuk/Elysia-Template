import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";

import { modules } from "@/app.modules";

export const createOpenApiApp = () => {
  const base = new Elysia({ name: "api", prefix: "/api" }).use(openapi());

  const withPlugins = modules.reduce(
    (app, module) => (module.plugins ? app.use(module.plugins()) : app),
    base,
  );

  return modules.reduce(
    (app, module) => (module.routes ? app.use(module.routes()) : app),
    withPlugins,
  );
};
