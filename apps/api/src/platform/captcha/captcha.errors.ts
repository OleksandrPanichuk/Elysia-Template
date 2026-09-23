import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class CaptchaRequiredError extends ModuleError {
  public readonly status = HttpStatus.Forbidden;
  public readonly code = "CAPTCHA_REQUIRED";
}

export class CaptchaChallengeRequiredError extends ModuleError {
  public readonly status = HttpStatus.Forbidden;
  public readonly code = "CAPTCHA_CHALLENGE_REQUIRED";
}

export class CaptchaFailedError extends ModuleError {
  public readonly status = HttpStatus.Forbidden;
  public readonly code = "CAPTCHA_FAILED";
}

export class CaptchaUnavailableError extends ModuleError {
  public readonly status = HttpStatus.ServiceUnavailable;
  public readonly code = "CAPTCHA_UNAVAILABLE";

  constructor(public readonly cause?: unknown) {
    super("Captcha verification is temporarily unavailable");
  }
}
