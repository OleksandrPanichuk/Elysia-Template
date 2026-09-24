import {
  type JobMeasurement,
  Metrics,
  type RequestMeasurement,
} from "@/platform/metrics/ports/metrics";

export class MemoryMetrics extends Metrics {
  private readonly recordedRequests: RequestMeasurement[] = [];

  private readonly recordedJobs: JobMeasurement[] = [];

  public recordRequest(measurement: RequestMeasurement): void {
    this.recordedRequests.push(measurement);
  }

  public recordJob(measurement: JobMeasurement): void {
    this.recordedJobs.push(measurement);
  }

  public requests(): readonly RequestMeasurement[] {
    return this.recordedRequests;
  }

  public jobs(): readonly JobMeasurement[] {
    return this.recordedJobs;
  }

  public clear(): void {
    this.recordedRequests.length = 0;
    this.recordedJobs.length = 0;
  }
}
