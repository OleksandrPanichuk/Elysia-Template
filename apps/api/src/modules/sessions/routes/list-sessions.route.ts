import { t } from "elysia";

import { defineRoute } from "@/core/route";

import { readSessionCookie } from "../session.cookie";
import { SessionEntity } from "../session.entity";
import { SessionModel } from "../session.model";
import type { SessionsActions } from "../sessions.routes";

export const listSessionsRoute = ({ listSessions }: SessionsActions) =>
  defineRoute({
    response: t.Array(SessionModel),
    summary: "List active sessions",
    auth: true,

    action: ({ user }) => listSessions.execute({ userId: user.id }),

    postAction: ({ cookie, output }) =>
      SessionEntity.normalizeMany(output, readSessionCookie(cookie)),
  });
