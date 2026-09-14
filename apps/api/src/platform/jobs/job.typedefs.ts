export interface EnqueueJobOptions {
  jobId?: string;
  delayMs?: number;
  attempts?: number;

  backoff?: {
    type: "exponential" | "fixed";
    delayMs: number;
  };
}

export interface JobSchedule<Payload> {
  pattern: string;
  payload: Payload;
  jobId?: string;
}

export interface JobMeta {
  readonly jobId: string;
  readonly name: string;
  readonly queue: string;
  readonly attempts: number;
}
