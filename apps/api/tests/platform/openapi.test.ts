import { createGuest } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

describe("openapi", () => {
  test("serves the spec outside production", async () => {
    const response = await createGuest().get<{
      paths: Record<string, unknown>;
    }>("/api/openapi/json");

    expect(response.status).toBe(200);
    expect(Object.keys(response.body.paths)).toContain("/api/auth/sign-in");
  });
});
