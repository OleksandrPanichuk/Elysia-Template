import type z from "zod";

import { Cache, type CacheSetOptions } from "@/platform/cache/ports/cache";

interface Entry {
  value: string;
  expiresAt: number;
}

export class MemoryCache extends Cache {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly keyPrefix: string) {
    super();
  }

  public keys(): string[] {
    return [...this.entries.keys()];
  }

  public get<T>(key: string, schema: z.ZodType<T>): Promise<T | null> {
    const entry = this.entries.get(this.key(key));

    if (!entry) return Promise.resolve(null);

    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(this.key(key));

      return Promise.resolve(null);
    }

    const result = schema.safeParse(JSON.parse(entry.value));

    if (!result.success) {
      this.entries.delete(this.key(key));

      return Promise.resolve(null);
    }

    return Promise.resolve(result.data);
  }

  public set<T>(
    key: string,
    value: T,
    { ttlMs }: CacheSetOptions,
  ): Promise<void> {
    this.entries.set(this.key(key), {
      value: JSON.stringify(value),
      expiresAt: Date.now() + ttlMs,
    });

    return Promise.resolve();
  }

  public del(...keys: string[]): Promise<void> {
    for (const key of keys) {
      this.entries.delete(this.key(key));
    }

    return Promise.resolve();
  }

  public close(): Promise<void> {
    this.entries.clear();

    return Promise.resolve();
  }

  private key(key: string): string {
    return `${this.keyPrefix}${key}`;
  }
}
