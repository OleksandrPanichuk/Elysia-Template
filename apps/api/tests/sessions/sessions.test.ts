import { createClient, createUser, DEFAULT_PASSWORD } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

import { MAX_SESSIONS_PER_USER } from "@/modules/sessions";

interface SessionModel {
  id: string;
  current: boolean;
  userAgent: string | null;
}

const signIn = async (email: string) => {
  const client = createClient();
  const response = await client.post("/api/auth/sign-in", {
    email,
    password: DEFAULT_PASSWORD,
  });

  if (response.status !== 200) {
    throw new Error(`sign-in failed: ${response.status}`);
  }

  return client;
};

describe("concurrent sessions", () => {
  test("signing in elsewhere leaves the first session alive", async () => {
    const laptop = await createUser();
    const phone = await signIn(laptop.email);

    expect((await laptop.get("/api/users/me")).status).toBe(200);
    expect((await phone.get("/api/users/me")).status).toBe(200);
  });

  test("lists them, marking exactly one as current", async () => {
    const laptop = await createUser();
    await signIn(laptop.email);

    const sessions = await laptop.get<SessionModel[]>("/api/sessions");

    expect(sessions.body.length).toBeGreaterThanOrEqual(2);
    expect(sessions.body.filter((s) => s.current)).toHaveLength(1);
  });

  test("keeps only the newest once the cap is passed", async () => {
    const user = await createUser();
    let newest = user as { get: typeof user.get };

    for (let i = 0; i < MAX_SESSIONS_PER_USER + 3; i += 1) {
      newest = await signIn(user.email);
      await Bun.sleep(2);
    }

    const sessions = await newest.get<SessionModel[]>("/api/sessions");

    expect(sessions.body).toHaveLength(MAX_SESSIONS_PER_USER);
    expect(sessions.body.filter((s) => s.current)).toHaveLength(1);
  });

  test("evicts the oldest session, not the newest", async () => {
    const oldest = await createUser();

    for (let i = 0; i < MAX_SESSIONS_PER_USER; i += 1) {
      await signIn(oldest.email);
      await Bun.sleep(2);
    }

    expect((await oldest.get("/api/users/me")).status).toBe(401);
  });
});

describe("revoking", () => {
  test("removes one session by id and leaves the caller signed in", async () => {
    const laptop = await createUser();
    const phone = await signIn(laptop.email);

    const before = await laptop.get<SessionModel[]>("/api/sessions");
    const other = before.body.find((s) => !s.current)!;

    expect((await laptop.delete(`/api/sessions/${other.id}`)).status).toBe(200);
    expect((await phone.get("/api/users/me")).status).toBe(401);
    expect((await laptop.get("/api/users/me")).status).toBe(200);
  });

  test("reports an id that is not yours as absent", async () => {
    const mine = await createUser();
    const theirs = await createUser();

    const sessions = await theirs.get<SessionModel[]>("/api/sessions");
    const target = sessions.body[0]!;

    const response = await mine.delete(`/api/sessions/${target.id}`);

    expect(response.status).toBe(404);
    expect((await theirs.get("/api/users/me")).status).toBe(200);
  });

  test("signs out everywhere else but here", async () => {
    const laptop = await createUser();
    const phone = await signIn(laptop.email);
    const tablet = await signIn(laptop.email);

    expect((await laptop.delete("/api/sessions/others")).status).toBe(200);

    expect((await laptop.get("/api/users/me")).status).toBe(200);
    expect((await phone.get("/api/users/me")).status).toBe(401);
    expect((await tablet.get("/api/users/me")).status).toBe(401);
  });

  test("signing out ends only the caller's session", async () => {
    const laptop = await createUser();
    const phone = await signIn(laptop.email);

    await laptop.post("/api/auth/sign-out");

    expect((await laptop.get("/api/users/me")).status).toBe(401);
    expect((await phone.get("/api/users/me")).status).toBe(200);
  });
});
