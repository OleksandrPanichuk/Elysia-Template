import { defineRoute } from "@/core/route";

import { MAIL_RATE_LIMIT } from "../auth.constants";
import { AuthMessageModel } from "../auth.model";
import type { AuthActions } from "../auth.routes";
import { ChangeEmailInput } from "../dto";

export const changeEmailRoute = ({ changeEmail }: AuthActions) =>
  defineRoute({
    body: ChangeEmailInput,
    response: AuthMessageModel,
    summary: "Start moving the account to a new email",
    auth: true,
    rateLimit: { ...MAIL_RATE_LIMIT, scope: "auth:change-email" },

    action: ({ body, user }) =>
      changeEmail.execute({
        userId: user.id,
        email: body.email,
        password: body.password,
      }),
    postAction: () => ({ message: "ok" }),
  });
