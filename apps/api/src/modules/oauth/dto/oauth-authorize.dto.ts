import { t } from "elysia";

import { OAuthProviderName } from "../oauth.constants";

export const OAuthProviderParams = t.Object({
  provider: t.Enum(OAuthProviderName),
});
export type OAuthProviderParams = typeof OAuthProviderParams.static;

export const OAuthAuthorizeQuery = t.Object({
  redirectTo: t.Optional(t.String()),
});
export type OAuthAuthorizeQuery = typeof OAuthAuthorizeQuery.static;
