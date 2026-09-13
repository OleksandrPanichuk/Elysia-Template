import { defineRoute } from "@/core/route";
import { writeSessionCookie } from "@/modules/sessions";
import { getClientInfo } from "@/shared";

import { AuthMessageModel } from "../auth.model";
import type { AuthActions } from "../auth.routes";
import { ChangePasswordInput } from "../dto";

export const changePasswordRoute = ({ changePassword }: AuthActions) =>
  defineRoute({
    body: ChangePasswordInput,
    response: AuthMessageModel,
    summary: "Change the account password",
    auth: true,

    action: ({ body, user, request }) =>
      changePassword.execute({
        userId: user.id,
        currentPassword: body.currentPassword,
        password: body.password,
        ...getClientInfo(request),
      }),
    postAction: ({ cookie, output }) => {
      writeSessionCookie(cookie, {
        token: output.token,
        expiresAt: output.session.expiresAt,
      });

      return { message: "ok" };
    },
  });
