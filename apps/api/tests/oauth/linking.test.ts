import {
  completeOAuth,
  createGuest,
  createOAuthUser,
  createUser,
  useOAuthIdentity,
} from "@tests/helpers";
import { describe, expect, test } from "bun:test";

import { OAuthProviderName } from "@/modules/oauth";

const { Google, GitHub } = OAuthProviderName;

describe("signing in with a provider", () => {
  test("matches an existing link by provider subject, not by email", async () => {
    const user = await createOAuthUser(Google, { sub: "sub-1" });

    useOAuthIdentity(Google, { sub: "sub-1", email: "moved@example.test" });

    const returning = createGuest();
    await completeOAuth(returning, Google);

    const me = await returning.get<{ id: string }>("/api/users/me");

    expect(me.status).toBe(200);
    expect(me.body.id).toBe(user.id);
  });

  test("provisions a user when the subject and the email are both new", async () => {
    const guest = createGuest();

    useOAuthIdentity(Google, { email: "fresh@example.test" });
    await completeOAuth(guest, Google);

    const me = await guest.get<{ email: string; emailVerified: boolean }>(
      "/api/users/me",
    );

    expect(me.status).toBe(200);
    expect(me.body.email).toBe("fresh@example.test");
    expect(me.body.emailVerified).toBe(true);
  });

  test("leaves the email unverified when the provider is not authoritative", async () => {
    const guest = createGuest();

    useOAuthIdentity(Google, {
      email: "unsure@corp.example",
      emailIsAuthoritative: false,
    });
    await completeOAuth(guest, Google);

    const me = await guest.get<{ emailVerified: boolean }>("/api/users/me");

    expect(me.body.emailVerified).toBe(false);
  });
});

describe("an existing account holds the email", () => {
  test("links when the provider is authoritative for it", async () => {
    const user = await createUser({ email: "same@example.test" });

    useOAuthIdentity(Google, {
      email: "same@example.test",
      emailIsAuthoritative: true,
    });

    const guest = createGuest();
    await completeOAuth(guest, Google);

    const me = await guest.get<{ id: string }>("/api/users/me");

    expect(me.body.id).toBe(user.id);

    const accounts =
      await user.get<Array<{ type: string }>>("/api/auth/accounts");
    expect(accounts.body.map((a) => a.type).sort()).toEqual([
      "CREDENTIALS",
      "GOOGLE",
    ]);
  });

  test("refuses when the provider is not authoritative", async () => {
    await createUser({ email: "victim@corp.example" });

    useOAuthIdentity(Google, {
      email: "victim@corp.example",
      emailIsAuthoritative: false,
    });

    const attacker = createGuest();
    const { location } = await completeOAuth(attacker, Google);

    expect(location).toContain("error=ACCOUNT_LINK_REQUIRED");
    expect((await attacker.get("/api/users/me")).status).toBe(401);
  });
});

describe("linking from an account you already hold", () => {
  test("adds the provider", async () => {
    const user = await createUser();

    useOAuthIdentity(GitHub);
    await completeOAuth(user, GitHub, {
      path: `/api/auth/oauth/${GitHub}/link`,
      method: "POST",
    });

    const accounts =
      await user.get<Array<{ type: string }>>("/api/auth/accounts");
    expect(accounts.body.map((a) => a.type).sort()).toEqual([
      "CREDENTIALS",
      "GITHUB",
    ]);
  });

  test("refuses a provider account another user already holds", async () => {
    await createOAuthUser(GitHub, { sub: "taken" });

    const other = await createUser();
    useOAuthIdentity(GitHub, { sub: "taken" });

    const { location } = await completeOAuth(other, GitHub, {
      path: `/api/auth/oauth/${GitHub}/link`,
      method: "POST",
    });

    expect(location).toContain("error=ACCOUNT_ALREADY_LINKED");
  });
});

describe("unlinking", () => {
  test("refuses to remove the only way in", async () => {
    const user = await createOAuthUser(Google);
    const response = await user.post<{ code: string }>(
      `/api/auth/oauth/${Google}/unlink`,
    );

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("LAST_AUTH_METHOD");
  });

  test("removes it once another remains", async () => {
    const user = await createUser();

    useOAuthIdentity(Google);
    await completeOAuth(user, Google, {
      path: `/api/auth/oauth/${Google}/link`,
      method: "POST",
    });

    const response = await user.post(`/api/auth/oauth/${Google}/unlink`);

    expect(response.status).toBe(200);

    const accounts =
      await user.get<Array<{ type: string }>>("/api/auth/accounts");
    expect(accounts.body.map((a) => a.type)).toEqual(["CREDENTIALS"]);
  });
});
