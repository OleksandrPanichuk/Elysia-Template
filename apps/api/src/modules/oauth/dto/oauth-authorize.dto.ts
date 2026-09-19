import { t } from "elysia";

import { MAX_OAUTH_PARAM_LENGTH } from "@/constants";

import { OAuthProviderName } from "../oauth.constants";

export const OAuthProviderParams = t.Object({
  provider: t.Enum(OAuthProviderName),
});
export type OAuthProviderParams = typeof OAuthProviderParams.static;

export const OAuthAuthorizeQuery = t.Object({
  redirectTo: t.Optional(t.String({ maxLength: MAX_OAUTH_PARAM_LENGTH })),
});
export type OAuthAuthorizeQuery = typeof OAuthAuthorizeQuery.static;
