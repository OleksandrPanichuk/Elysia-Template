import { Port } from "@/core/port";

export interface RateLimitHitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitHitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
}

export abstract class RateLimitStore extends Port {
  public abstract hit(
    options: RateLimitHitOptions,
  ): Promise<RateLimitHitResult>;

  public abstract peek(options: RateLimitHitOptions): Promise<number>;

  public close(): Promise<void> {
    return Promise.resolve();
  }
}
