import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class OAuthProviderNotConfiguredError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "OAUTH_PROVIDER_NOT_CONFIGURED";
}

export class OAuthTransactionInvalidError extends ModuleError {
  public readonly status = HttpStatus.BadRequest;
  public readonly code = "OAUTH_TRANSACTION_INVALID";
}

export class OAuthExchangeFailedError extends ModuleError {
  public readonly status = HttpStatus.BadGateway;
  public readonly code = "OAUTH_EXCHANGE_FAILED";
}

export class OAuthEmailUnavailableError extends ModuleError {
  public readonly status = HttpStatus.BadRequest;
  public readonly code = "OAUTH_EMAIL_UNAVAILABLE";
}

export class AccountLinkRequiredError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "ACCOUNT_LINK_REQUIRED";
}

export class AccountAlreadyLinkedError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "ACCOUNT_ALREADY_LINKED";
}

export class LastAuthMethodError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "LAST_AUTH_METHOD";
}

export class OAuthProviderNotLinkedError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "OAUTH_PROVIDER_NOT_LINKED";
}
