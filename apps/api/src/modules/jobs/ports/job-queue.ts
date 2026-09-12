import type { Job } from "../job";
import type { EnqueueJobOptions } from "../job.typedefs";

export abstract class JobQueue {
  public abstract enqueue<T>(
    job: Job<T>,
    payload: T,
    options?: EnqueueJobOptions,
  ): Promise<void>;

  public abstract process<T>(job: Job<T>): void;

  public verify(): Promise<void> {
    return Promise.resolve();
  }

  public close(): Promise<void> {
    return Promise.resolve();
  }
}
