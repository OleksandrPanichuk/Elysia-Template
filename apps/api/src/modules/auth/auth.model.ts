import { t } from "elysia";

import { accountTypeEnum } from "@/db";

export const AuthSessionModel = t.Object({
  userId: t.String({ format: "uuid" }),
  expiresAt: t.Number(),
});

export type AuthSessionModel = typeof AuthSessionModel.static;

export const AuthMessageModel = t.Object({
  message: t.String(),
});

export type AuthMessageModel = typeof AuthMessageModel.static;

export const ConnectedAccountModel = t.Object({
  type: t.UnionEnum(accountTypeEnum.enumValues),
  email: t.Union([t.String(), t.Null()]),
  connectedAt: t.String({ format: "date-time" }),
  canDisconnect: t.Boolean(),
});

export type ConnectedAccountModel = typeof ConnectedAccountModel.static;
