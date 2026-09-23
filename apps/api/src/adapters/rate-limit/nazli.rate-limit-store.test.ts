import { describe, expect, test } from "bun:test";

import type { RedisConnection } from "@/infrastructure/redis";

import { NazliRateLimitStore } from "./nazli.rate-limit-store";

const neverAnswers = (): RedisConnection =>
  ({
    instance: new Proxy(
      {},
      { get: () => () => new Promise<never>(() => undefined) },
    ),
  }) as unknown as RedisConnection;

describe("NazliRateLimitStore", () => {
  test("fails open when Redis does not answer within the timeout", async () => {
    const store = new NazliRateLimitStore(
      neverAnswers(),
      "test:rate-limit",
      20,
    );
    const startedAt = Date.now();

    const result = await store.hit({ key: "k", limit: 5, windowMs: 1_000 });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
    expect(Date.now() - startedAt).toBeLessThan(500);
  });
});
