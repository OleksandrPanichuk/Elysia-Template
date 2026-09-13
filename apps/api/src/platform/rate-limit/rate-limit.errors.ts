import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class RateLimitExceededError extends ModuleError {
  public readonly status = HttpStatus.TooManyRequests;
  public readonly code = "RATE_LIMIT_EXCEEDED";
}
