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

export abstract class RateLimitStore {
  public abstract hit(
    options: RateLimitHitOptions,
  ): Promise<RateLimitHitResult>;

  public close(): Promise<void> {
    return Promise.resolve();
  }
}
