import { defineRoute } from "@/core/route";

import { MAIL_CLIENT_RATE_LIMIT, MAIL_RATE_LIMIT } from "../auth.constants";
import { AuthMessageModel } from "../auth.model";
import type { AuthActions } from "../auth.routes";
import { SendResetPasswordTokenInput } from "../dto";

export const sendResetPasswordTokenRoute = ({
  sendResetPasswordToken,
}: AuthActions) =>
  defineRoute({
    body: SendResetPasswordTokenInput,
    response: AuthMessageModel,
    summary: "Send reset password token",
    rateLimit: [
      {
        ...MAIL_RATE_LIMIT,
        scope: "auth:reset-password-token",
        key: ({ body }) => `email:${body.email.trim().toLowerCase()}`,
      },
      { ...MAIL_CLIENT_RATE_LIMIT, scope: "auth:reset-password-token:client" },
    ],
    action: ({ body }) => sendResetPasswordToken.execute({ email: body.email }),
    postAction: () => ({ message: "ok" }),
  });
