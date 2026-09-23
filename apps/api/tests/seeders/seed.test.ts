import { resolve } from "node:path";

import { runSeeders, SEED_USERS } from "@seeders/index";
import { createGuest } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

import { getDatabase } from "@/db";

const API_ROOT = resolve(import.meta.dir, "../..");

const rows = async () => ({
  users: (await getDatabase().query.usersSchema.findMany()).length,
  accounts: (await getDatabase().query.accountsSchema.findMany()).length,
  tokens: (await getDatabase().query.verificationTokensSchema.findMany())
    .length,
});

describe("development seeders", () => {
  test("leave the same rows when run twice", async () => {
    const first = await runSeeders();
    const afterFirst = await rows();

    const second = await runSeeders();

    expect(afterFirst).toEqual({ users: 4, accounts: 5, tokens: 0 });
    expect(await rows()).toEqual(afterFirst);
    expect(
      first.flatMap(({ outcomes }) => outcomes.map(({ status }) => status)),
    ).toEqual(["created", "created", "created", "created"]);
    expect(
      second.flatMap(({ outcomes }) => outcomes.map(({ status }) => status)),
    ).toEqual(["existing", "existing", "existing", "existing"]);
  });

  test("create password users that can sign in over HTTP", async () => {
    await runSeeders();

    for (const user of SEED_USERS) {
      if (!user.password) continue;

      const client = createGuest();
      const signIn = await client.post("/api/auth/sign-in", {
        email: user.email,
        password: user.password,
      });
      const me = await client.get<{ emailVerified: boolean }>("/api/users/me");

      expect(signIn.status).toBe(200);
      expect(me.body.emailVerified).toBe(user.verified);
    }
  });

  test("store one account row per auth method", async () => {
    await runSeeders();

    const users = await getDatabase().query.usersSchema.findMany();
    const accounts = await getDatabase().query.accountsSchema.findMany();
    const emailOf = new Map(users.map(({ id, email }) => [id, email]));
    const methods = accounts
      .map(({ type, userId }) => `${emailOf.get(userId)}:${type}`)
      .sort();

    expect(methods).toEqual([
      "google@example.test:GOOGLE",
      "linked@example.test:CREDENTIALS",
      "linked@example.test:GOOGLE",
      "unverified@example.test:CREDENTIALS",
      "verified@example.test:CREDENTIALS",
    ]);
    expect(
      accounts
        .filter(({ type }) => type === "CREDENTIALS")
        .every(({ passwordHash }) => passwordHash?.startsWith("$argon2id$")),
    ).toBe(true);
  });

  test("refuse to run in production", async () => {
    const child = Bun.spawn(["bun", "seeders/main.ts"], {
      cwd: API_ROOT,
      env: { ...Bun.env, NODE_ENV: "production" },
      stdout: "pipe",
      stderr: "pipe",
    });

    const [exitCode, stderr] = await Promise.all([
      child.exited,
      new Response(child.stderr).text(),
    ]);

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("NODE_ENV is production");
    expect((await rows()).users).toBe(0);
  });
});
