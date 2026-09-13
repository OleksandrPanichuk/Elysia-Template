import { t } from "elysia";

import { makeService } from "@/core/registry";
import { defineRoute } from "@/core/route";

import { readSessionCookie } from "../session.cookie";
import { SessionEntity } from "../session.entity";
import { SessionModel } from "../session.model";
import type { SessionsActions } from "../sessions.routes";
import { SessionsService } from "../sessions.service";

export const listSessionsRoute = ({ listSessions }: SessionsActions) =>
  defineRoute({
    response: t.Array(SessionModel),
    summary: "List active sessions",
    auth: true,

    action: ({ user }) => listSessions.execute({ userId: user.id }),

    postAction: ({ cookie, output }) => {
      const token = readSessionCookie(cookie);
      const sessions = makeService(SessionsService);

      return output.map((session) =>
        SessionEntity.normalize(session, sessions.isCurrent(session, token)),
      );
    },
  });
