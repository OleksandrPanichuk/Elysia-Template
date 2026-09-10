import { defineRoute } from "@/core/route";

import { AuthMessageModel } from "../auth.model";
import type { AuthActions } from "../auth.routes";
import { ResetPasswordInput } from "../dto";

export const resetPasswordRoute = ({ resetPassword }: AuthActions) =>
  defineRoute({
    body: ResetPasswordInput,
    response: AuthMessageModel,
    summary: "Reset password",
    action: ({ body }) =>
      resetPassword.execute({
        token: body.token,
        password: body.password,
      }),
    postAction: () => ({ message: "ok" }),
  });
