import { afterAll, beforeEach, describe, expect, test } from "bun:test";

import { RedisSessionStore } from "@/adapters/sessions/redis.session-store";
import { createOwnedRedisConnection } from "@/infrastructure/redis";
import type { SessionEntity } from "@/modules/sessions";

const url = process.env.TEST_SESSIONS_REDIS_URL;

const connection = url
  ? createOwnedRedisConnection({ name: "test-sessions", url })
  : undefined;

const store = connection
  ? new RedisSessionStore(connection, "velo:test:sessions:")
  : undefined;

const session = (over: Partial<SessionEntity> = {}): SessionEntity => ({
  id: crypto.randomUUID(),
  userId: crypto.randomUUID(),
  createdAt: Date.now(),
  expiresAt: Date.now() + 60_000,
  userAgent: null,
  ip: null,
  ...over,
});

afterAll(async () => {
  if (!connection) return;

  const keys = await connection.instance.keys("velo:test:sessions:*");

  if (keys.length > 0) await connection.instance.del(...keys);

  await connection.close();
});

describe.skipIf(!store)("RedisSessionStore against a real Redis", () => {
  beforeEach(async () => {
    const keys = await connection!.instance.keys("velo:test:sessions:*");

    if (keys.length > 0) await connection!.instance.del(...keys);
  });

  test("stores a session and reads it back intact", async () => {
    const entry = session({ userAgent: "Probe", ip: "10.0.0.1" });

    expect(await store!.create("hash-1", entry)).toBe(true);
    expect(await store!.findByTokenHash("hash-1")).toEqual(entry);
  });

  test("refuses to overwrite a hash that already exists", async () => {
    await store!.create("hash-1", session());

    expect(await store!.create("hash-1", session())).toBe(false);
  });

  test("gives the key a ttl that matches the session", async () => {
    const entry = session({ expiresAt: Date.now() + 30_000 });

    await store!.create("hash-ttl", entry);

    const ttl = await connection!.instance.pttl("velo:test:sessions:hash-ttl");

    expect(ttl).toBeGreaterThan(20_000);
    expect(ttl).toBeLessThanOrEqual(30_000);
  });

  test("lists a user's sessions newest first and carries the hash", async () => {
    const userId = crypto.randomUUID();

    await store!.create("older", session({ userId, createdAt: 1_000 }));
    await store!.create("newer", session({ userId, createdAt: 2_000 }));

    const listed = await store!.listByUserId(userId);

    expect(listed.map((s) => s.tokenHash)).toEqual(["newer", "older"]);
  });

  test("drops index entries whose session key has expired", async () => {
    const userId = crypto.randomUUID();

    await store!.create("ghost", session({ userId }));
    await connection!.instance.del("velo:test:sessions:ghost");

    expect(await store!.listByUserId(userId)).toEqual([]);
    expect(
      await connection!.instance.smembers(`velo:test:sessions:user:${userId}`),
    ).toEqual([]);
  });

  test("deletes one session and leaves the rest", async () => {
    const userId = crypto.randomUUID();

    await store!.create("keep", session({ userId }));
    await store!.create("drop", session({ userId }));

    await store!.deleteByTokenHash("drop");

    const listed = await store!.listByUserId(userId);

    expect(listed.map((s) => s.tokenHash)).toEqual(["keep"]);
  });

  test("deletes every session a user holds", async () => {
    const userId = crypto.randomUUID();

    await store!.create("a", session({ userId }));
    await store!.create("b", session({ userId }));

    await store!.deleteByUserId(userId);

    expect(await store!.listByUserId(userId)).toEqual([]);
    expect(await store!.findByTokenHash("a")).toBeNull();
  });

  test("deletes all but the one it was told to keep", async () => {
    const userId = crypto.randomUUID();

    await store!.create("mine", session({ userId }));
    await store!.create("theirs", session({ userId }));

    await store!.deleteByUserIdExcept(userId, "mine");

    const listed = await store!.listByUserId(userId);

    expect(listed.map((s) => s.tokenHash)).toEqual(["mine"]);
  });

  test("treats a malformed record as absent rather than throwing", async () => {
    await connection!.instance.set("velo:test:sessions:junk", "not json");

    expect(await store!.findByTokenHash("junk")).toBeNull();
  });
});
