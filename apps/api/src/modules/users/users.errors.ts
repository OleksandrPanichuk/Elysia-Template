import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class UserAlreadyExistsError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "USER_ALREADY_EXISTS";
}

export class UserNotFoundError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "NOT_FOUND";
}
