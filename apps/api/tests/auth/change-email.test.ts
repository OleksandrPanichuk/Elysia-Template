import {
  createClient,
  createGuest,
  createOAuthUser,
  createUser,
  DEFAULT_PASSWORD,
  inbox,
} from "@tests/helpers";
import { describe, expect, test } from "bun:test";

import { OAuthProviderName } from "@/modules/oauth";

interface Me {
  email: string;
  emailVerified: boolean;
}

const OLD = "kate@example.test";
const NEW = "kate.new@example.test";

describe("changing the email", () => {
  test("moves the account once the new address confirms", async () => {
    const user = await createUser({ email: OLD });

    const requested = await user.post("/api/auth/change-email", {
      email: "Kate.New@Example.test",
      password: DEFAULT_PASSWORD,
    });
    expect(requested.status).toBe(200);
    expect(inbox.for(NEW)).toHaveLength(1);

    const confirmed = await createGuest().post(
      "/api/auth/confirm-email-change",
      {
        token: inbox.tokenFor(NEW),
      },
    );
    expect(confirmed.status).toBe(200);

    const me = await user.get<Me>("/api/users/me");
    expect(me.body.email).toBe(NEW);
    expect(me.body.emailVerified).toBe(true);

    const withNew = await createClient().post("/api/auth/sign-in", {
      email: NEW,
      password: DEFAULT_PASSWORD,
    });
    const withOld = await createClient().post("/api/auth/sign-in", {
      email: OLD,
      password: DEFAULT_PASSWORD,
    });
    expect(withNew.status).toBe(200);
    expect(withOld.status).toBe(401);

    expect(inbox.lastFor(OLD).subject).toContain("email was changed");
  });

  test("needs the password when the account has one", async () => {
    const user = await createUser({ email: OLD });

    const missing = await user.post<{ code: string }>(
      "/api/auth/change-email",
      {
        email: NEW,
      },
    );
    const wrong = await user.post<{ code: string }>("/api/auth/change-email", {
      email: NEW,
      password: "not-the-password",
    });

    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(inbox.for(NEW)).toHaveLength(0);
  });

  test("needs no password for a provider-only account", async () => {
    const user = await createOAuthUser(OAuthProviderName.Google, {
      email: OLD,
    });

    const response = await user.post("/api/auth/change-email", { email: NEW });

    expect(response.status).toBe(200);
    expect(inbox.for(NEW)).toHaveLength(1);
  });

  test("refuses the current address and one another account holds", async () => {
    const user = await createUser({ email: OLD });
    await createUser({ email: "taken@example.test" });

    const same = await user.post<{ code: string }>("/api/auth/change-email", {
      email: OLD,
      password: DEFAULT_PASSWORD,
    });
    const taken = await user.post<{ code: string }>("/api/auth/change-email", {
      email: "taken@example.test",
      password: DEFAULT_PASSWORD,
    });

    expect(same.status).toBe(400);
    expect(taken.status).toBe(409);
    expect(taken.body.code).toBe("EMAIL_ALREADY_IN_USE");
  });

  test("refuses a confirmation once someone else took the address", async () => {
    const user = await createUser({ email: OLD });

    await user.post("/api/auth/change-email", {
      email: NEW,
      password: DEFAULT_PASSWORD,
    });
    const token = inbox.tokenFor(NEW);

    await createUser({ email: NEW });

    const confirmed = await createGuest().post<{ code: string }>(
      "/api/auth/confirm-email-change",
      { token },
    );

    expect(confirmed.status).toBe(409);
    expect((await user.get<Me>("/api/users/me")).body.email).toBe(OLD);
  });

  test("refuses a token that is not an email change token", async () => {
    const user = await createUser({ email: OLD });

    const response = await createGuest().post<{ code: string }>(
      "/api/auth/confirm-email-change",
      { token: inbox.tokenFor(user.email) },
    );

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_TOKEN");
  });
});
