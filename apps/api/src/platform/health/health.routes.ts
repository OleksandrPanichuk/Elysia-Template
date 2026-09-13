import { Elysia, t } from "elysia";

import { NodeEnv } from "@/configs";
import { HttpStatus } from "@/core/http";
import { runReadinessChecks } from "@/core/readiness";
import { envPlugin } from "@/plugins";

export const healthRoutes = () =>
  new Elysia({ name: "health", prefix: "/health" })
    .use(envPlugin)
    .get(
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
    )
    .get(
      "/ready",
      async ({ set }) => {
        const dependencies = await runReadinessChecks();
        const ok = Object.values(dependencies).every((s) => s === "up");

        if (!ok) {
          set.status = HttpStatus.ServiceUnavailable;
        }

        return {
          status: ok ? ("ok" as const) : ("degraded" as const),
          dependencies,
        };
      },
      {
        response: t.Object({
          status: t.Union([t.Literal("ok"), t.Literal("degraded")]),
          dependencies: t.Record(
            t.String(),
            t.Union([t.Literal("up"), t.Literal("down")]),
          ),
        }),
        detail: { summary: "Readiness probe" },
      },
    );
