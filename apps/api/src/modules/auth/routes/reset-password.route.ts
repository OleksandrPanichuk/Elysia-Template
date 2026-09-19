import { defineRoute } from "@/core/route";
import { getClientInfo } from "@/shared";

import { AuthMessageModel } from "../auth.model";
import type { AuthActions } from "../auth.routes";
import { ResetPasswordInput } from "../dto";

export const resetPasswordRoute = ({ resetPassword }: AuthActions) =>
  defineRoute({
    body: ResetPasswordInput,
    response: AuthMessageModel,
    summary: "Reset password",
    action: ({ body, request, server }) =>
      resetPassword.execute({
        token: body.token,
        password: body.password,
        ...getClientInfo(request, server),
      }),
    postAction: () => ({ message: "ok" }),
  });
