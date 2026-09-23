import { createUser } from "@tests/helpers";
import { describe, expect, test } from "bun:test";
import { Elysia, t } from "elysia";

import { defineRoute } from "@/core/route";
import { sessionsPlugin } from "@/modules/sessions";
import { rateLimitPlugin } from "@/platform/rate-limit";
import { errorPlugin } from "@/plugins";

const probe = (seen: string[]) =>
  new Elysia()
    .use(errorPlugin)
    .use(sessionsPlugin)
    .use(rateLimitPlugin)
    .post(
      "/probe",
      ...defineRoute({
        body: t.Object({ note: t.String() }),
        response: t.Object({ ok: t.Boolean() }),
        auth: true,
        rateLimit: { limit: 1, windowMs: 60_000, scope: "probe:guards" },
        guards: [
          ({ user }) => {
            seen.push(user.id);
          },
        ],
        action: () => ({ ok: true }),
      }),
    );

const send = (app: ReturnType<typeof probe>, cookie: string) =>
  app.handle(
    new Request("http://localhost/probe", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ note: "hi" }),
    }),
  );

describe("route guards", () => {
  test("see the signed-in user on an auth route", async () => {
    const user = await createUser();
    const seen: string[] = [];

    const response = await send(probe(seen), user.cookies());

    expect(response.status).toBe(200);
    expect(seen).toEqual([user.id]);
  });

  test("run after the rate limit, so a refused request never reaches them", async () => {
    const user = await createUser();
    const seen: string[] = [];
    const app = probe(seen);

    await send(app, user.cookies());
    const refused = await send(app, user.cookies());

    expect(refused.status).toBe(429);
    expect(seen).toHaveLength(1);
  });

  test("cannot be combined with a route cache", () => {
    const define = () =>
      // @ts-expect-error a cache hit answers before guards run
      defineRoute({
        response: t.Object({ ok: t.Boolean() }),
        cache: { ttlMs: 1_000 },
        guards: [() => undefined],
        action: () => ({ ok: true }),
      });

    expect(define).toThrow(TypeError);
  });
});
