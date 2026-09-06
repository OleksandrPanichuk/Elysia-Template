import { HttpStatus } from "./http";

export abstract class AppError extends Error {
  public abstract readonly status: number;
  public abstract readonly code: string;

  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export abstract class ModuleError extends AppError {}

export class BadRequestError extends AppError {
  public readonly status = HttpStatus.BadRequest;
  public readonly code = "BAD_REQUEST";
}

export class UnauthorizedError extends AppError {
  public readonly status = HttpStatus.Unauthorized;
  public readonly code = "UNAUTHORIZED";
}

export class ForbiddenError extends AppError {
  public readonly status = HttpStatus.Forbidden;
  public readonly code = "FORBIDDEN";
}

export class NotFoundError extends AppError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "NOT_FOUND";
}

export class ConflictError extends AppError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "CONFLICT";
}
