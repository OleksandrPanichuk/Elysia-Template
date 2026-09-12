import { t } from "elysia";

import { OAuthProviderName } from "./oauth.constants";

export const OAuthMessageModel = t.Object({
  message: t.String(),
});

export type OAuthMessageModel = typeof OAuthMessageModel.static;

export const LinkedOAuthProviderModel = t.Object({
  provider: t.Enum(OAuthProviderName),
  email: t.Union([t.String(), t.Null()]),
  linkedAt: t.Union([t.String(), t.Null()]),
});

export type LinkedOAuthProviderModel = typeof LinkedOAuthProviderModel.static;
