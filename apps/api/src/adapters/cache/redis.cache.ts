import type { Redis } from "ioredis";
import type z from "zod";

import { getLogger } from "@/infrastructure";
import type { RedisConnection } from "@/infrastructure/redis";
import { Cache, type CacheSetOptions } from "@/platform/cache/ports/cache";

export class RedisCache extends Cache {
  constructor(
    private readonly connection: RedisConnection,
    private readonly keyPrefix = "velo:cache:",
  ) {
    super();
  }

  public async get<T>(key: string, schema: z.ZodType<T>): Promise<T | null> {
    const client = this.ready();

    if (!client) return null;

    try {
      const raw = await client.get(this.key(key));

      if (raw === null) return null;

      const result = schema.safeParse(JSON.parse(raw));

      if (result.success) return result.data;

      getLogger().warn(
        { component: "RedisCache", key, issues: result.error.issues },
        "discarding malformed cache entry",
      );

      await client.del(this.key(key));

      return null;
    } catch (error) {
      getLogger().error(
        { component: "RedisCache", key, err: error },
        "cache read failed",
      );

      return null;
    }
  }

  public async set<T>(
    key: string,
    value: T,
    { ttlMs }: CacheSetOptions,
  ): Promise<void> {
    const client = this.ready();

    if (!client) return;

    try {
      await client.set(this.key(key), JSON.stringify(value), "PX", ttlMs);
    } catch (error) {
      getLogger().error(
        { component: "RedisCache", key, err: error },
        "cache write failed",
      );
    }
  }

  public async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    const client = this.ready();

    if (!client) {
      getLogger().warn(
        { component: "RedisCache", keys },
        "cache unavailable; invalidation skipped",
      );

      return;
    }

    try {
      await client.del(...keys.map((key) => this.key(key)));
    } catch (error) {
      getLogger().error(
        { component: "RedisCache", keys, err: error },
        "cache invalidation failed",
      );
    }
  }

  public async verify(): Promise<void> {
    await this.connection.connect();

    if (!(await this.connection.ping())) {
      throw new Error("Cache redis ping failed");
    }
  }

  private ready(): Redis | null {
    const client = this.connection.instance;

    return client.status === "ready" ? client : null;
  }

  private key(key: string): string {
    return `${this.keyPrefix}${key}`;
  }
}
