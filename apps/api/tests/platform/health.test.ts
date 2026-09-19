import { createGuest } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

import { registerReadinessCheck } from "@/core/readiness";

interface ReadyBody {
  status: "ok" | "degraded";
  dependencies: Record<string, "up" | "down">;
}

describe("readiness", () => {
  test("reports the database among the dependencies", async () => {
    const response = await createGuest().get<ReadyBody>("/api/health/ready");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.dependencies.database).toBe("up");
  });

  test("degrades to 503 when any dependency is down", async () => {
    const unregister = registerReadinessCheck("test-dependency", () => false);

    try {
      const response = await createGuest().get<ReadyBody>("/api/health/ready");

      expect(response.status).toBe(503);
      expect(response.body.status).toBe("degraded");
      expect(response.body.dependencies["test-dependency"]).toBe("down");
      expect(response.body.dependencies.database).toBe("up");
    } finally {
      unregister();
    }
  });
});
