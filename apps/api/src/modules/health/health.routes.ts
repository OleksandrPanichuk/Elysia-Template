import { Elysia, t } from "elysia";

import { NodeEnv } from "@/configs";
import { envPlugin } from "@/plugins";

export const healthRoutes = () =>
  new Elysia({ name: "health", prefix: "/health" }).use(envPlugin).get(
    "/",
    ({ env }) => ({
      status: "ok" as const,
      uptime: process.uptime(),
      environment: env.NODE_ENV,
    }),
    {
      response: t.Object({
        status: t.Literal("ok"),
        uptime: t.Number(),
        environment: t.Enum(NodeEnv),
      }),
      detail: { summary: "Liveness probe" },
    },
  );
