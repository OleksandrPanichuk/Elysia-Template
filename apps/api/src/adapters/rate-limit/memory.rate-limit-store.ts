import {
  type RateLimitHitOptions,
  type RateLimitHitResult,
  RateLimitStore,
} from "@/platform/rate-limit/ports/rate-limit-store";

interface Window {
  count: number;
  resetAt: number;
}

export class MemoryRateLimitStore extends RateLimitStore {
  private readonly windows = new Map<string, Window>();

  public hit({
    key,
    limit,
    windowMs,
  }: RateLimitHitOptions): Promise<RateLimitHitResult> {
    const now = Date.now();
    const current = this.windows.get(key);
    const window =
      current && current.resetAt > now
        ? current
        : { count: 0, resetAt: now + windowMs };

    window.count += 1;
    this.windows.set(key, window);

    return Promise.resolve({
      allowed: window.count <= limit,
      remaining: Math.max(0, limit - window.count),
      limit,
      resetAt: window.resetAt,
    });
  }

  public clear(): void {
    this.windows.clear();
  }

  public close(): Promise<void> {
    this.clear();

    return Promise.resolve();
  }
}
