import { createGuest } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

const EXPOSED = [
  "x-request-id",
  "ratelimit-limit",
  "ratelimit-remaining",
  "ratelimit-reset",
  "retry-after",
];

describe("cors", () => {
  test("lets a browser read the request id and rate limit headers", async () => {
    const response = await createGuest().get("/api/health");
    const exposed = (
      response.headers.get("access-control-expose-headers") ?? ""
    )
      .split(",")
      .map((name) => name.trim().toLowerCase());

    for (const name of EXPOSED) {
      expect(exposed).toContain(name);
    }
  });
});
