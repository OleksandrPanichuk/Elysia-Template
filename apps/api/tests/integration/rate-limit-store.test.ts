import { afterAll, beforeEach, describe, expect, test } from "bun:test";

import { NazliRateLimitStore } from "@/adapters/rate-limit/nazli.rate-limit-store";
import { getEnv } from "@/configs";
import { createOwnedRedisConnection } from "@/infrastructure/redis";

const url = process.env.TEST_RATE_LIMIT_REDIS_URL;

const KEY_PREFIX = `${getEnv().APP_SLUG}:test:rate-limit`;

const connection = url
  ? createOwnedRedisConnection({ name: "test-rate-limit", url })
  : undefined;

const store = connection
  ? new NazliRateLimitStore(connection, KEY_PREFIX)
  : undefined;

const clear = async () => {
  const keys = await connection!.instance.keys(`${KEY_PREFIX}*`);

  if (keys.length > 0) await connection!.instance.del(...keys);
};

afterAll(async () => {
  if (!connection) return;

  await clear();
  await connection.close();
});

describe.skipIf(!store)("NazliRateLimitStore against a real Redis", () => {
  beforeEach(clear);

  test("counts down and then refuses", async () => {
    const key = `probe:${crypto.randomUUID()}`;
    const seen: boolean[] = [];

    for (let i = 0; i < 5; i += 1) {
      seen.push(
        (await store!.hit({ key, limit: 3, windowMs: 60_000 })).allowed,
      );
    }

    expect(seen).toEqual([true, true, true, false, false]);
  });

  test("reports what is left and when it resets", async () => {
    const key = `probe:${crypto.randomUUID()}`;
    const first = await store!.hit({ key, limit: 3, windowMs: 60_000 });

    expect(first.limit).toBe(3);
    expect(first.remaining).toBe(2);
    expect(first.resetAt).toBeGreaterThan(Date.now());
  });

  test("gives the counter a ttl so a window expires on its own", async () => {
    const key = `probe:${crypto.randomUUID()}`;

    await store!.hit({ key, limit: 3, windowMs: 30_000 });

    const keys = await connection!.instance.keys(`${KEY_PREFIX}*`);
    const ttl = await connection!.instance.pttl(keys[0]!);

    expect(ttl).toBeGreaterThan(20_000);
    expect(ttl).toBeLessThanOrEqual(30_000);
  });

  test("peeks at a counter without spending from it", async () => {
    const rule = { key: "peeked", limit: 5, windowMs: 60_000 };

    await store!.hit(rule);
    await store!.hit(rule);

    expect(await store!.peek(rule)).toBe(2);
    expect(await store!.peek(rule)).toBe(2);

    const next = await store!.hit(rule);

    expect(next.remaining).toBe(2);
  });

  test("peeks at an unseen key as zero without leaving a key behind forever", async () => {
    expect(
      await store!.peek({ key: "unseen", limit: 5, windowMs: 60_000 }),
    ).toBe(0);

    const keys = await connection!.instance.keys(`${KEY_PREFIX}*`);

    for (const key of keys) {
      expect(await connection!.instance.pttl(key)).not.toBe(-1);
    }
  });

  test("counts each key on its own", async () => {
    const mine = `probe:${crypto.randomUUID()}`;
    const yours = `probe:${crypto.randomUUID()}`;

    for (let i = 0; i < 4; i += 1) {
      await store!.hit({ key: mine, limit: 3, windowMs: 60_000 });
    }

    expect(
      (await store!.hit({ key: mine, limit: 3, windowMs: 60_000 })).allowed,
    ).toBe(false);
    expect(
      (await store!.hit({ key: yours, limit: 3, windowMs: 60_000 })).allowed,
    ).toBe(true);
  });

  test("allows the request when the server is unreachable", async () => {
    const dead = createOwnedRedisConnection({
      name: "test-rate-limit-dead",
      url: "redis://127.0.0.1:59997",
      options: { maxRetriesPerRequest: 1, retryStrategy: () => null },
    });
    const offline = new NazliRateLimitStore(dead, KEY_PREFIX);

    const result = await offline.hit({ key: "k", limit: 1, windowMs: 1_000 });

    expect(result.allowed).toBe(true);

    await dead.close().catch(() => undefined);
  });
});
