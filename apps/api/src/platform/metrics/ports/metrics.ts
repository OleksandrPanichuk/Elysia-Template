import { Port } from "@/core/port";

export interface RequestMeasurement {
  method: string;
  route: string;
  status: number;
  durationMs: number;
}

export type JobOutcome = "done" | "retried" | "failed";

export interface JobMeasurement {
  job: string;
  queue: string;
  outcome: JobOutcome;
  durationMs: number;
}

export abstract class Metrics extends Port {
  public abstract recordRequest(measurement: RequestMeasurement): void;

  public abstract recordJob(measurement: JobMeasurement): void;

  public start(): Promise<void> {
    return Promise.resolve();
  }

  public close(): Promise<void> {
    return Promise.resolve();
  }
}
