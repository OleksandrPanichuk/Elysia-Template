import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class InvalidCredentialsError extends ModuleError {
  public readonly status = HttpStatus.Unauthorized;
  public readonly code = "INVALID_CREDENTIALS";
}

export class EmailAlreadyInUseError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "EMAIL_ALREADY_IN_USE";
}

export class InvalidTokenError extends ModuleError {
  public readonly status = HttpStatus.BadRequest;
  public readonly code = "INVALID_TOKEN";
}

export class TokenExpiredError extends ModuleError {
  public readonly status = HttpStatus.BadRequest;
  public readonly code = "TOKEN_EXPIRED";
}

export class PasswordAlreadySetError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "PASSWORD_ALREADY_SET";
}

export class PasswordNotSetError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "PASSWORD_NOT_SET";
}
