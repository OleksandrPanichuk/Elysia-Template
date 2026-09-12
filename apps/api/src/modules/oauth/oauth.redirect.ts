import { getEnv } from "@/configs";

import {
  OAUTH_CALLBACK_PATH,
  type OAuthProviderName,
  SAFE_REDIRECT_PATH_PATTERN,
} from "./oauth.constants";

export const sanitizeRedirectPath = (
  redirectTo: string | undefined,
): string | null =>
  redirectTo && SAFE_REDIRECT_PATH_PATTERN.test(redirectTo) ? redirectTo : null;

export const resolveAppUrl = (redirectTo: string | null): string =>
  new URL(redirectTo ?? "/", getEnv().APP_URL).toString();

export const resolveAppErrorUrl = (
  redirectTo: string | null,
  code: string,
): string => {
  const url = new URL(resolveAppUrl(redirectTo));

  url.searchParams.set("error", code);

  return url.toString();
};

export const buildCallbackUrl = (provider: OAuthProviderName): string => {
  const env = getEnv();
  const base = env.OAUTH_REDIRECT_BASE ?? env.APP_URL;

  return new URL(
    `/api${OAUTH_CALLBACK_PATH}/${provider}/callback`,
    base,
  ).toString();
};
