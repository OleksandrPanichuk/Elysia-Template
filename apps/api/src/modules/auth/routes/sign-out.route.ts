import { defineRoute } from "@/core/route";
import { clearSessionCookie, readSessionCookie } from "@/modules/sessions";

import { AuthMessageModel } from "../auth.model";
import type { AuthActions } from "../auth.routes";

export const signOutRoute = ({ signOut }: AuthActions) =>
  defineRoute({
    response: AuthMessageModel,
    summary: "Sign out",

    action: ({ cookie }) =>
      signOut.execute({
        sessionToken: readSessionCookie(cookie),
      }),
    postAction: ({ cookie }) => {
      clearSessionCookie(cookie);

      return { message: "ok" };
    },
  });
