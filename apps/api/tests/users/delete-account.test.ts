import { createOAuthUser, createUser, DEFAULT_PASSWORD } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

import { getDatabase } from "@/db";
import { OAuthProviderName } from "@/modules/oauth";

const rows = async () => ({
  users: (await getDatabase().query.usersSchema.findMany()).length,
  accounts: (await getDatabase().query.accountsSchema.findMany()).length,
  tokens: (await getDatabase().query.verificationTokensSchema.findMany())
    .length,
});

describe("deleting an account", () => {
  test("removes the user and everything hanging off it", async () => {
    const user = await createUser({ email: "kate@example.test" });

    expect(await rows()).toEqual({ users: 1, accounts: 1, tokens: 1 });

    const response = await user.delete("/api/users/me", {
      email: "kate@example.test",
      password: DEFAULT_PASSWORD,
    });

    expect(response.status).toBe(200);
    expect(await rows()).toEqual({ users: 0, accounts: 0, tokens: 0 });
  });

  test("leaves the caller signed out", async () => {
    const user = await createUser({ email: "kate@example.test" });

    await user.delete("/api/users/me", {
      email: "kate@example.test",
      password: DEFAULT_PASSWORD,
    });

    expect((await user.get("/api/users/me")).status).toBe(401);
  });

  test("accepts the address in any case", async () => {
    const user = await createUser({ email: "kate@example.test" });

    const response = await user.delete("/api/users/me", {
      email: "KATE@Example.TEST",
      password: DEFAULT_PASSWORD,
    });

    expect(response.status).toBe(200);
  });

  test("refuses when the typed address is not yours", async () => {
    const user = await createUser({ email: "kate@example.test" });

    const response = await user.delete<{ code: string }>("/api/users/me", {
      email: "someone@example.test",
      password: DEFAULT_PASSWORD,
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("ACCOUNT_DELETION_NOT_CONFIRMED");
    expect((await rows()).users).toBe(1);
  });

  test("refuses without the password when the account has one", async () => {
    const user = await createUser({ email: "kate@example.test" });

    const missing = await user.delete<{ code: string }>("/api/users/me", {
      email: "kate@example.test",
    });
    const wrong = await user.delete<{ code: string }>("/api/users/me", {
      email: "kate@example.test",
      password: "not-the-password",
    });

    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(wrong.body.code).toBe("ACCOUNT_DELETION_UNAUTHORIZED");
    expect((await rows()).users).toBe(1);
  });

  test("needs no password when the account was created through a provider", async () => {
    const user = await createOAuthUser(OAuthProviderName.Google, {
      email: "provider@example.test",
    });

    const response = await user.delete("/api/users/me", {
      email: "provider@example.test",
    });

    expect(response.status).toBe(200);
    expect((await rows()).users).toBe(0);
  });

  test("cannot be reached without signing in", async () => {
    const { createGuest } = await import("@tests/helpers");
    const response = await createGuest().delete("/api/users/me", {
      email: "kate@example.test",
    });

    expect(response.status).toBe(401);
  });
});
