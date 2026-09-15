import { createUser, createVerifiedUser, inbox } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

describe("email verification", () => {
  test("marks the address verified from the emailed link", async () => {
    const user = await createUser({ email: "kate@example.test" });

    const response = await user.post("/api/auth/verify-email", {
      token: inbox.tokenFor("kate@example.test"),
    });

    expect(response.status).toBe(200);

    const me = await user.get<{ emailVerified: boolean }>("/api/users/me");
    expect(me.body.emailVerified).toBe(true);
  });

  test("refuses a token that was already spent", async () => {
    const user = await createUser({ email: "kate@example.test" });
    const token = inbox.tokenFor("kate@example.test");

    await user.post("/api/auth/verify-email", { token });
    const again = await user.post<{ code: string }>("/api/auth/verify-email", {
      token,
    });

    expect(again.status).toBe(400);
    expect(again.body.code).toBe("INVALID_TOKEN");
  });

  test("refuses a token that was never issued", async () => {
    const user = await createUser();
    const response = await user.post<{ code: string }>(
      "/api/auth/verify-email",
      { token: "0".repeat(64) },
    );

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_TOKEN");
  });

  test("a resend invalidates the token sent before it", async () => {
    const user = await createUser({ email: "kate@example.test" });
    const first = inbox.tokenFor("kate@example.test");

    await user.post("/api/auth/send-email-verification-token", {
      email: "kate@example.test",
    });
    const second = inbox.tokenFor("kate@example.test");

    expect(second).not.toBe(first);
    expect(
      (await user.post("/api/auth/verify-email", { token: first })).status,
    ).toBe(400);
    expect(
      (await user.post("/api/auth/verify-email", { token: second })).status,
    ).toBe(200);
  });

  test("says nothing about whether an address is registered", async () => {
    const user = await createUser();
    const response = await user.post(
      "/api/auth/send-email-verification-token",
      {
        email: "nobody@example.test",
      },
    );

    expect(response.status).toBe(200);
    expect(inbox.for("nobody@example.test")).toHaveLength(0);
  });

  test("createVerifiedUser leaves the account verified", async () => {
    const user = await createVerifiedUser();
    const me = await user.get<{ emailVerified: boolean }>("/api/users/me");

    expect(me.body.emailVerified).toBe(true);
  });
});
