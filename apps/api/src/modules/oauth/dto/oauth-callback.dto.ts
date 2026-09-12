import { t } from "elysia";

export const OAuthCallbackQuery = t.Object({
  code: t.Optional(t.String()),
  state: t.Optional(t.String()),
  error: t.Optional(t.String()),
});
export type OAuthCallbackQuery = typeof OAuthCallbackQuery.static;
