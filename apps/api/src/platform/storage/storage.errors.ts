import { AppError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class FileStorageUnavailableError extends AppError {
  public readonly status = HttpStatus.ServiceUnavailable;
  public readonly code = "FILE_STORAGE_UNAVAILABLE";

  constructor(public readonly cause?: unknown) {
    super("Unable to store or read files at this time.");
  }
}
