import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import z from "zod";

import { RedisCache } from "@/adapters/cache/redis.cache";
import { createOwnedRedisConnection } from "@/infrastructure/redis";

const url = process.env.TEST_CACHE_REDIS_URL;

const connection = url
  ? createOwnedRedisConnection({ name: "test-cache", url })
  : undefined;

const cache = connection
  ? new RedisCache(connection, "velo:test:cache:")
  : undefined;

const Shape = z.object({ id: z.string(), count: z.number() });

afterAll(async () => {
  if (!connection) return;

  const keys = await connection.instance.keys("velo:test:cache:*");

  if (keys.length > 0) await connection.instance.del(...keys);

  await connection.close();
});

describe.skipIf(!cache)("RedisCache against a real Redis", () => {
  beforeEach(async () => {
    const keys = await connection!.instance.keys("velo:test:cache:*");

    if (keys.length > 0) await connection!.instance.del(...keys);
  });

  test("round-trips a value that satisfies the schema", async () => {
    await cache!.set("k", { id: "a", count: 1 }, { ttlMs: 60_000 });

    expect(await cache!.get("k", Shape)).toEqual({ id: "a", count: 1 });
  });

  test("reports a miss for a key that was never written", async () => {
    expect(await cache!.get("absent", Shape)).toBeNull();
  });

  test("honours the ttl it was given", async () => {
    await cache!.set("k", { id: "a", count: 1 }, { ttlMs: 30_000 });

    const ttl = await connection!.instance.pttl("velo:test:cache:k");

    expect(ttl).toBeGreaterThan(20_000);
    expect(ttl).toBeLessThanOrEqual(30_000);
  });

  test("treats a value the schema rejects as a miss", async () => {
    await connection!.instance.set(
      "velo:test:cache:wrong",
      JSON.stringify({ id: "a", count: "not a number" }),
    );

    expect(await cache!.get("wrong", Shape)).toBeNull();
  });

  test("treats unparsable json as a miss", async () => {
    await connection!.instance.set("velo:test:cache:junk", "{{{");

    expect(await cache!.get("junk", Shape)).toBeNull();
  });

  test("forgets a key it was told to delete", async () => {
    await cache!.set("k", { id: "a", count: 1 }, { ttlMs: 60_000 });
    await cache!.del("k");

    expect(await cache!.get("k", Shape)).toBeNull();
  });

  test("reads a miss rather than throwing when the server is gone", async () => {
    const dead = createOwnedRedisConnection({
      name: "test-cache-dead",
      url: "redis://127.0.0.1:59998",
      options: { maxRetriesPerRequest: 1, retryStrategy: () => null },
    });
    const offline = new RedisCache(dead, "velo:test:cache:");

    expect(await offline.get("k", Shape)).toBeNull();
    expect(
      await offline
        .set("k", { id: "a", count: 1 }, { ttlMs: 1_000 })
        .then(() => "ok"),
    ).toBe("ok");

    await dead.close().catch(() => undefined);
  });
});
