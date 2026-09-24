import { Metrics } from "@/platform/metrics/ports/metrics";

export class NoopMetrics extends Metrics {
  public recordRequest(): void {
    return;
  }

  public recordJob(): void {
    return;
  }
}
