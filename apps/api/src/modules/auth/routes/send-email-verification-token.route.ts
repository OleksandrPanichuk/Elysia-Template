import { defineRoute } from "@/core/route";

import { MAIL_CLIENT_RATE_LIMIT, MAIL_RATE_LIMIT } from "../auth.constants";
import { AuthMessageModel } from "../auth.model";
import type { AuthActions } from "../auth.routes";
import { SendEmailVerificationTokenInput } from "../dto";

export const sendEmailVerificationTokenRoute = ({
  sendEmailVerificationToken,
}: AuthActions) =>
  defineRoute({
    body: SendEmailVerificationTokenInput,
    response: AuthMessageModel,
    summary: "Send email verification token",
    rateLimit: [
      {
        ...MAIL_RATE_LIMIT,
        scope: "auth:email-verification-token",
        key: ({ body }) => `email:${body.email.trim().toLowerCase()}`,
      },
      {
        ...MAIL_CLIENT_RATE_LIMIT,
        scope: "auth:email-verification-token:client",
      },
    ],
    action: ({ body }) =>
      sendEmailVerificationToken.execute({ email: body.email }),
    postAction: () => ({ message: "ok" }),
  });
