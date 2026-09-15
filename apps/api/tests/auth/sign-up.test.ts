import { createGuest, createUser, inbox } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

describe("sign up", () => {
  test("creates an account and signs the caller in", async () => {
    const user = await createUser({ email: "kate@example.test" });
    const me = await user.get<{ email: string; emailVerified: boolean }>(
      "/api/users/me",
    );

    expect(me.status).toBe(200);
    expect(me.body.email).toBe("kate@example.test");
    expect(me.body.emailVerified).toBe(false);
  });

  test("sends a verification email", async () => {
    await createUser({ email: "kate@example.test" });

    expect(inbox.for("kate@example.test")).toHaveLength(1);
    expect(inbox.tokenFor("kate@example.test")).toMatch(/^[a-f0-9]{64}$/);
  });

  test("leaves the database empty between tests", async () => {
    const guest = createGuest();
    const me = await guest.get("/api/users/me");

    expect(me.status).toBe(401);
    expect(inbox.all()).toHaveLength(0);
  });
});
