import { AppError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class JobQueueUnavailableError extends AppError {
  public readonly status = HttpStatus.ServiceUnavailable;
  public readonly code = "JOB_QUEUE_UNAVAILABLE";

  constructor(public readonly cause?: unknown) {
    super("Unable to schedule background work at this time.");
  }
}

export class UnprocessableJobError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "UnprocessableJobError";
  }
}
