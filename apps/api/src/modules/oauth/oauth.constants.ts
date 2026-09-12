import { MINUTE } from "@/constants";

export enum OAuthProviderName {
  Google = "google",
  GitHub = "github",
}

export const OAUTH_TRANSACTION_COOKIE_NAME = "velo-oauth-tx";

export const OAUTH_TRANSACTION_TTL_MS = 10 * MINUTE;

export const OAUTH_STATE_BYTES = 32;

export const OAUTH_NONCE_BYTES = 32;

export const OAUTH_CODE_VERIFIER_BYTES = 32;

export const OAUTH_CALLBACK_PATH = "/auth/oauth";

export const SAFE_REDIRECT_PATH_PATTERN = /^\/(?!\/)[^\s]*$/;
