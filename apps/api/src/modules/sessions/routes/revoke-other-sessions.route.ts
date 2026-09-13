import { defineRoute } from "@/core/route";

import { readSessionCookie } from "../session.cookie";
import { SessionMessageModel } from "../session.model";
import type { SessionsActions } from "../sessions.routes";

export const revokeOtherSessionsRoute = ({
  revokeOtherSessions,
}: SessionsActions) =>
  defineRoute({
    response: SessionMessageModel,
    summary: "Sign out everywhere else",
    auth: true,

    action: ({ cookie, user }) =>
      revokeOtherSessions.execute({
        userId: user.id,
        sessionToken: readSessionCookie(cookie),
      }),
    postAction: () => ({ message: "ok" }),
  });
