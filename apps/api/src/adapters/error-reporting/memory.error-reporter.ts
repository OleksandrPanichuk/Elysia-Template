import {
  type ErrorReport,
  ErrorReporter,
} from "@/platform/error-reporting/ports/error-reporter";

export interface ReportedError {
  error: unknown;
  report: ErrorReport;
}

export class MemoryErrorReporter extends ErrorReporter {
  private readonly reported: ReportedError[] = [];

  public report(error: unknown, report: ErrorReport): void {
    this.reported.push({ error, report });
  }

  public reports(): readonly ReportedError[] {
    return this.reported;
  }

  public clear(): void {
    this.reported.length = 0;
  }
}
