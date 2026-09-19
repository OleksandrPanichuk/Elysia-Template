import { t } from "elysia";

import { MAX_OAUTH_PARAM_LENGTH } from "@/constants";

export const OAuthCallbackQuery = t.Object({
  code: t.Optional(t.String({ maxLength: MAX_OAUTH_PARAM_LENGTH })),
  state: t.Optional(t.String({ maxLength: MAX_OAUTH_PARAM_LENGTH })),
  error: t.Optional(t.String({ maxLength: MAX_OAUTH_PARAM_LENGTH })),
});
export type OAuthCallbackQuery = typeof OAuthCallbackQuery.static;
