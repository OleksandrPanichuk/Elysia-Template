import { defineRoute } from "@/core/route";

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
    action: ({ body }) => sendResetPasswordToken.execute({ email: body.email }),
    postAction: () => ({ message: "ok" }),
  });
