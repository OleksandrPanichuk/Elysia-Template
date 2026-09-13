import { defineRoute } from "@/core/route";

import { MAIL_RATE_LIMIT } from "../auth.constants";
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
    rateLimit: {
      ...MAIL_RATE_LIMIT,
      scope: "auth:reset-password-token",
      key: ({ body }) => `email:${body.email.trim().toLowerCase()}`,
    },
    action: ({ body }) => sendResetPasswordToken.execute({ email: body.email }),
    postAction: () => ({ message: "ok" }),
  });
