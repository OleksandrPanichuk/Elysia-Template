import { t } from "elysia";

export const AuthSessionModel = t.Object({
  userId: t.String({ format: "uuid" }),
  expiresAt: t.Number(),
});

export type AuthSessionModel = typeof AuthSessionModel.static;

export const AuthMessageModel = t.Object({
  message: t.String(),
});

export type AuthMessageModel = typeof AuthMessageModel.static;
