import { type ErrorReport, ErrorReporter } from "@/core/error-reporting";
import { getLogger } from "@/infrastructure";

export class NoopErrorReporter extends ErrorReporter {
  public report(_error: unknown, { source }: ErrorReport): void {
    getLogger().debug(
      { component: "NoopErrorReporter", source },
      "error reporting is off; the error was logged only",
    );
  }
}
