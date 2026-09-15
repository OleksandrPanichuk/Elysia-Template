import {
  createClient,
  createOAuthUser,
  createUser,
  DEFAULT_PASSWORD,
  inbox,
} from "@tests/helpers";
import { describe, expect, test } from "bun:test";

import { OAuthProviderName } from "@/modules/oauth";

const NEW_PASSWORD = "a-brand-new-password";

describe("signing in", () => {
  test("accepts the right password", async () => {
    const user = await createUser();
    const client = createClient();

    const response = await client.post("/api/auth/sign-in", {
      email: user.email,
      password: DEFAULT_PASSWORD,
    });

    expect(response.status).toBe(200);
    expect((await client.get("/api/users/me")).status).toBe(200);
  });

  test("rejects the wrong one without saying which part was wrong", async () => {
    const user = await createUser();
    const wrongPassword = await createClient().post<{ code: string }>(
      "/api/auth/sign-in",
      { email: user.email, password: "not-the-password" },
    );
    const unknownEmail = await createClient().post<{ code: string }>(
      "/api/auth/sign-in",
      { email: "nobody@example.test", password: DEFAULT_PASSWORD },
    );

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });
});

describe("changing a password", () => {
  test("requires the current one", async () => {
    const user = await createUser();
    const response = await user.post<{ code: string }>(
      "/api/auth/change-password",
      { currentPassword: "wrong", password: NEW_PASSWORD },
    );

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("INVALID_CREDENTIALS");
  });

  test("replaces it, ends other sessions, and keeps the caller signed in", async () => {
    const user = await createUser();
    const elsewhere = createClient();

    await elsewhere.post("/api/auth/sign-in", {
      email: user.email,
      password: DEFAULT_PASSWORD,
    });

    const response = await user.post("/api/auth/change-password", {
      currentPassword: DEFAULT_PASSWORD,
      password: NEW_PASSWORD,
    });

    expect(response.status).toBe(200);
    expect((await user.get("/api/users/me")).status).toBe(200);
    expect((await elsewhere.get("/api/users/me")).status).toBe(401);

    const stale = await createClient().post("/api/auth/sign-in", {
      email: user.email,
      password: DEFAULT_PASSWORD,
    });
    expect(stale.status).toBe(401);
  });
});

describe("setting a first password", () => {
  test("lets an account created through a provider add one", async () => {
    const user = await createOAuthUser(OAuthProviderName.Google);

    expect(
      (await user.post("/api/auth/set-password", { password: NEW_PASSWORD }))
        .status,
    ).toBe(200);

    const signedIn = await createClient().post("/api/auth/sign-in", {
      email: user.email,
      password: NEW_PASSWORD,
    });
    expect(signedIn.status).toBe(200);
  });

  test("refuses when the account already has one", async () => {
    const user = await createUser();
    const response = await user.post<{ code: string }>(
      "/api/auth/set-password",
      { password: NEW_PASSWORD },
    );

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("PASSWORD_ALREADY_SET");
  });
});

describe("resetting a forgotten password", () => {
  test("works from the emailed link and ends every session", async () => {
    const user = await createUser({ email: "kate@example.test" });

    await user.post("/api/auth/send-reset-password-token", {
      email: "kate@example.test",
    });

    const response = await createClient().post("/api/auth/reset-password", {
      token: inbox.tokenFor("kate@example.test"),
      password: NEW_PASSWORD,
    });

    expect(response.status).toBe(200);
    expect((await user.get("/api/users/me")).status).toBe(401);

    const signedIn = await createClient().post("/api/auth/sign-in", {
      email: "kate@example.test",
      password: NEW_PASSWORD,
    });
    expect(signedIn.status).toBe(200);
  });

  test("sends nothing for an account that has no password", async () => {
    const user = await createOAuthUser(OAuthProviderName.Google, {
      email: "provider-only@example.test",
    });

    const response = await user.post("/api/auth/send-reset-password-token", {
      email: "provider-only@example.test",
    });

    expect(response.status).toBe(200);
    expect(inbox.for("provider-only@example.test")).toHaveLength(0);
  });
});
