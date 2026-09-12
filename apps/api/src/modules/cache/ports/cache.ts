import type z from "zod";

export interface CacheSetOptions {
  ttlMs: number;
}

export abstract class Cache {
  public abstract get<T>(key: string, schema: z.ZodType<T>): Promise<T | null>;

  public abstract set<T>(
    key: string,
    value: T,
    options: CacheSetOptions,
  ): Promise<void>;

  public abstract del(...keys: string[]): Promise<void>;

  public verify(): Promise<void> {
    return Promise.resolve();
  }

  public close(): Promise<void> {
    return Promise.resolve();
  }
}
