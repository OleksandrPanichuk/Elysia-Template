import { defineRoute } from "@/core/route";

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
    action: ({ body }) =>
      sendEmailVerificationToken.execute({ email: body.email }),
    postAction: () => ({ message: "ok" }),
  });
