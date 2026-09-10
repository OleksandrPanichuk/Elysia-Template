import { AppError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class MailDeliveryError extends AppError {
  public readonly status = HttpStatus.ServiceUnavailable;
  public readonly code = "MAIL_DELIVERY_FAILED";

  constructor(public readonly cause?: unknown) {
    super("Unable to send email at this time");
  }
}
