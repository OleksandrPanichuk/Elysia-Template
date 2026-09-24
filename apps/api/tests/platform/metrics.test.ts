import { createGuest, createUser } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

import type { MemoryMetrics } from "@/adapters/metrics/memory.metrics";
import { make } from "@/core/registry";
import {
  Metrics,
  type RequestMeasurement,
  UNMATCHED_ROUTE,
} from "@/platform/metrics";

const metrics = (): MemoryMetrics => make(Metrics) as MemoryMetrics;

const recorded = async (
  match: (measurement: RequestMeasurement) => boolean,
): Promise<RequestMeasurement | undefined> => {
  for (let i = 0; i < 50; i += 1) {
    const found = metrics().requests().find(match);

    if (found) return found;

    await Bun.sleep(5);
  }

  return undefined;
};

describe("request metrics", () => {
  test("record the route template, not the path with its ids", async () => {
    const user = await createUser();

    await user.delete(`/api/sessions/${crypto.randomUUID()}`);

    const measurement = await recorded(({ method }) => method === "DELETE");

    expect(measurement).toMatchObject({
      route: "/api/sessions/:id",
      status: 404,
    });
    expect(measurement?.durationMs).toBeGreaterThanOrEqual(0);
  });

  test("record the status the caller got", async () => {
    await createGuest().post("/api/auth/sign-in", {
      email: "nobody@example.test",
      password: "wrong-password",
    });

    const measurement = await recorded(
      ({ route }) => route === "/api/auth/sign-in",
    );

    expect(measurement).toMatchObject({ method: "POST", status: 401 });
  });

  test("group every unknown path under one route", async () => {
    await createGuest().get("/api/nowhere/at/all");

    const measurement = await recorded(({ status }) => status === 404);

    expect(measurement?.route).toBe(UNMATCHED_ROUTE);
  });
});
