export interface EnqueueJobOptions {
  jobId?: string;
  delayMs?: number;
  attempts?: number;

  backoff?: {
    type: "exponential" | "fixed";
    delayMs: number;
  };
}

export interface JobMeta {
  readonly jobId: string;
  readonly name: string;
  readonly queue: string;
  readonly attempts: number;
}
