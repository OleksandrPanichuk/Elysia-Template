import { Port } from "@/core/port";
import { make } from "@/core/registry";
import { getRequestContext } from "@/shared";

export interface ErrorReport {
  source: string;
  requestId?: string;
  userId?: string;
  tags?: Readonly<Record<string, string>>;
  extra?: Readonly<Record<string, unknown>>;
}

export abstract class ErrorReporter extends Port {
  public abstract report(error: unknown, report: ErrorReport): void;

  public start(): Promise<void> {
    return Promise.resolve();
  }

  public close(): Promise<void> {
    return Promise.resolve();
  }
}

export const captureException = (error: unknown, report: ErrorReport): void => {
  make(ErrorReporter).report(error, {
    requestId: getRequestContext()?.requestId,
    ...report,
  });
};
