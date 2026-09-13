import { AppError, ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class SessionStoreUnavailableError extends AppError {
  public readonly status = HttpStatus.ServiceUnavailable;
  public readonly code = "SESSION_STORE_UNAVAILABLE";

  constructor(public readonly cause?: unknown) {
    super("Session store is temporarily unavailable");
  }
}

export class SessionNotFoundError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "SESSION_NOT_FOUND";
}
