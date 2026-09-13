import { t } from "elysia";

export const SessionModel = t.Object({
  id: t.String({ format: "uuid" }),
  createdAt: t.String({ format: "date-time" }),
  expiresAt: t.String({ format: "date-time" }),
  userAgent: t.Union([t.String(), t.Null()]),
  ip: t.Union([t.String(), t.Null()]),
  current: t.Boolean(),
});

export type SessionModel = typeof SessionModel.static;

export const SessionMessageModel = t.Object({
  message: t.String(),
});

export type SessionMessageModel = typeof SessionMessageModel.static;
