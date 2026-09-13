import { t } from "elysia";

import { defineRoute } from "@/core/route";

import { SessionMessageModel } from "../session.model";
import type { SessionsActions } from "../sessions.routes";

export const revokeSessionRoute = ({ revokeSession }: SessionsActions) =>
  defineRoute({
    params: t.Object({ id: t.String({ format: "uuid" }) }),
    response: SessionMessageModel,
    summary: "Revoke a session",
    auth: true,

    action: ({ params, user }) =>
      revokeSession.execute({ userId: user.id, sessionId: params.id }),
    postAction: () => ({ message: "ok" }),
  });
