import {
  createClient,
  createOAuthUser,
  createUser,
  DEFAULT_PASSWORD,
  inbox,
  useOAuthIdentity,
} from "@tests/helpers";
import { describe, expect, test } from "bun:test";

import { OAuthProviderName } from "@/modules/oauth";

const PHONE = { "user-agent": "Phone/1.0" };
const NEW_PASSWORD = "a-brand-new-password";

const subjects = (email: string): string[] =>
  inbox.for(email).map((message) => message.subject);

describe("security notices", () => {
  test("tell the owner when the password is changed", async () => {
    const user = await createUser({ email: "kate@example.test" });

    await user.post("/api/auth/change-password", {
      currentPassword: DEFAULT_PASSWORD,
      password: NEW_PASSWORD,
    });

    const notice = inbox.lastFor("kate@example.test");

    expect(notice.subject).toContain("password was changed");
    expect(notice.text).toContain("IP address");
  });

  test("tell the owner when the password is reset", async () => {
    await createUser({ email: "kate@example.test" });
    await createClient().post("/api/auth/send-reset-password-token", {
      email: "kate@example.test",
    });

    await createClient().post("/api/auth/reset-password", {
      token: inbox.tokenFor("kate@example.test"),
      password: NEW_PASSWORD,
    });

    expect(inbox.lastFor("kate@example.test").subject).toContain(
      "password was changed",
    );
  });

  test("tell the owner about a sign-in from a device without a session", async () => {
    const user = await createUser({ email: "kate@example.test" });
    const before = subjects(user.email).length;

    await createClient().post(
      "/api/auth/sign-in",
      { email: user.email, password: DEFAULT_PASSWORD },
      PHONE,
    );

    const after = subjects(user.email);

    expect(after).toHaveLength(before + 1);
    expect(after[after.length - 1]).toContain("New sign-in");
  });

  test("stay quiet for a device that already holds a session", async () => {
    const user = await createUser({ email: "kate@example.test" });
    const before = subjects(user.email).length;

    await createClient().post("/api/auth/sign-in", {
      email: user.email,
      password: DEFAULT_PASSWORD,
    });

    expect(subjects(user.email)).toHaveLength(before);
  });

  test("stay quiet on sign-up and on a first provider sign-in", async () => {
    await createUser({ email: "kate@example.test" });
    await createOAuthUser(OAuthProviderName.Google, {
      email: "pat@example.test",
    });

    expect(subjects("kate@example.test")).toEqual(["Verify your Velo email"]);
    expect(subjects("pat@example.test")).toEqual([]);
  });

  test("tell a returning provider user about a new device", async () => {
    const { sub } = useOAuthIdentity(OAuthProviderName.Google, {
      email: "pat@example.test",
    });
    await createOAuthUser(OAuthProviderName.Google, {
      sub,
      email: "pat@example.test",
    });

    const phone = createClient();
    const started = await phone.get(
      `/api/auth/oauth/${OAuthProviderName.Google}`,
      PHONE,
    );
    const state =
      new URL(started.headers.get("location") ?? "").searchParams.get(
        "state",
      ) ?? "";
    await phone.get(
      `/api/auth/oauth/${OAuthProviderName.Google}/callback?code=x&state=${encodeURIComponent(state)}`,
      PHONE,
    );

    expect(subjects("pat@example.test")).toEqual([
      "New sign-in to your Velo account",
    ]);
  });
});
