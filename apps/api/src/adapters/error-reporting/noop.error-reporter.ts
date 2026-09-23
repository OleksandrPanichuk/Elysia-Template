import { getLogger } from "@/infrastructure";
import {
  type ErrorReport,
  ErrorReporter,
} from "@/platform/error-reporting/ports/error-reporter";

export class NoopErrorReporter extends ErrorReporter {
  public report(_error: unknown, { source }: ErrorReport): void {
    getLogger().debug(
      { component: "NoopErrorReporter", source },
      "error reporting is off; the error was logged only",
    );
  }
}
