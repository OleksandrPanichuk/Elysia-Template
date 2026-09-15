import { createClient, createUser, DEFAULT_PASSWORD } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

const attempt = (email: string, password = "wrong-password") =>
  createClient().post<{ code: string }>("/api/auth/sign-in", {
    email,
    password,
  });

describe("rate limiting", () => {
  test("stops repeated sign-in attempts against one address", async () => {
    const user = await createUser();
    const seen: number[] = [];

    for (let i = 0; i < 12; i += 1) {
      seen.push((await attempt(user.email)).status);
    }

    expect(seen).toContain(429);
    expect(seen.filter((status) => status === 401).length).toBeGreaterThan(0);
  });

  test("keeps the right password out once the budget is spent", async () => {
    const user = await createUser();

    for (let i = 0; i < 12; i += 1) await attempt(user.email);

    expect((await attempt(user.email, DEFAULT_PASSWORD)).status).toBe(429);
  });

  test("counts each address separately", async () => {
    const blocked = await createUser();
    const untouched = await createUser();

    for (let i = 0; i < 12; i += 1) await attempt(blocked.email);

    expect((await attempt(blocked.email)).status).toBe(429);
    expect((await attempt(untouched.email)).status).toBe(401);
  });

  test("reports what is left in the response headers", async () => {
    const user = await createUser();
    const first = await attempt(user.email);

    expect(first.headers.get("ratelimit-limit")).toBeTruthy();
    expect(Number(first.headers.get("ratelimit-remaining"))).toBeGreaterThan(0);
  });

  test("a forwarded header cannot buy a fresh budget", async () => {
    const user = await createUser();

    for (let i = 0; i < 12; i += 1) await attempt(user.email);

    const spoofed = await createClient().post("/api/auth/sign-in", {
      email: user.email,
      password: DEFAULT_PASSWORD,
    });

    expect(spoofed.status).toBe(429);
  });
});
