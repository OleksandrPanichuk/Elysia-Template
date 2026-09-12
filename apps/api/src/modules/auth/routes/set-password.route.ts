import { defineRoute } from "@/core/route";

import { AuthMessageModel } from "../auth.model";
import type { AuthActions } from "../auth.routes";
import { SetPasswordInput } from "../dto";

export const setPasswordRoute = ({ setPassword }: AuthActions) =>
  defineRoute({
    body: SetPasswordInput,
    response: AuthMessageModel,
    summary: "Set a password for an account that has none",
    auth: true,

    action: ({ body, user }) =>
      setPassword.execute({
        userId: user.id,
        password: body.password,
      }),
    postAction: () => ({ message: "ok" }),
  });
