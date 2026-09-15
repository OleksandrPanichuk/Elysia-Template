import { createGuest, createUser, getApp } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

describe("error responses", () => {
  test("reports which field failed validation", async () => {
    const response = await createGuest().post<{
      code: string;
      issues: Array<{ path?: string }>;
    }>("/api/auth/sign-in", { email: "not-an-email", password: "x" });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe("VALIDATION");
    expect(response.body.issues.some((i) => i.path?.includes("email"))).toBe(
      true,
    );
  });

  test("answers an unknown path with a plain 404", async () => {
    const response = await createGuest().get<{ code: string }>("/api/nowhere");

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("NOT_FOUND");
  });

  test("carries a request id on every response", async () => {
    const response = await createGuest().get("/api/health");

    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("refuses a state-changing request from another origin", async () => {
    const user = await createUser();

    const response = await getApp().handle(
      new Request("http://localhost:3000/api/auth/sign-out", {
        method: "POST",
        headers: { origin: "https://evil.example", cookie: user.cookies() },
      }),
    );

    expect(response.status).toBe(403);
    expect((await user.get("/api/users/me")).status).toBe(200);
  });

  test("allows the same request from our own origin", async () => {
    const user = await createUser();

    expect((await user.post("/api/auth/sign-out")).status).toBe(200);
    expect((await user.get("/api/users/me")).status).toBe(401);
  });
});
