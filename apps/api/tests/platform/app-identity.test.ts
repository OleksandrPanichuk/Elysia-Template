import { createClient, createUser, inbox } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

import type { MemoryCache } from "@/adapters/cache/memory.cache";
import { getEnv } from "@/configs";
import { make } from "@/core/registry";
import { OAuthProviderName } from "@/modules/oauth";
import { Cache } from "@/platform/cache";

const cookieNames = (response: { headers: Headers }): string[] =>
  response.headers
    .getSetCookie()
    .map((line) => line.slice(0, line.indexOf("=")));

describe("app identity", () => {
  test("boots with the slug and name the environment gives it", () => {
    expect(getEnv().APP_SLUG).toBe("acme");
    expect(getEnv().APP_NAME).toBe("Acme");
  });

  test("names the session cookie after the slug", async () => {
    const response = await createClient().post("/api/auth/sign-up", {
      email: "ada@example.test",
      password: "test-password-123",
      name: "Ada",
    });

    expect(response.status).toBe(200);
    expect(cookieNames(response)).toEqual(["acme-session"]);
  });

  test("names the OAuth transaction cookie after the slug", async () => {
    const response = await createClient().get(
      `/api/auth/oauth/${OAuthProviderName.Google}`,
    );

    expect(cookieNames(response)).toEqual(["acme-oauth-tx"]);
  });

  test("prefixes the keys the cache writes with the slug", async () => {
    const user = await createUser();

    await user.get("/api/users/me");

    expect((make(Cache) as MemoryCache).keys()).toContain(
      `acme:cache:users:${user.id}`,
    );
  });

  test("signs email with the app name", async () => {
    const user = await createUser();
    const message = inbox.lastFor(user.email);

    expect(message.subject).toBe("Verify your Acme email");
    expect(message.text).toContain("If you did not sign up for Acme");
    expect(message.html).toContain(" Acme · Please do not reply");
  });
});
