import { defineRoute } from "@/core/route";

import { AuthMessageModel } from "../auth.model";
import type { AuthActions } from "../auth.routes";
import { VerifyEmailInput } from "../dto";

export const verifyEmailRoute = ({ verifyEmail }: AuthActions) =>
  defineRoute({
    body: VerifyEmailInput,
    response: AuthMessageModel,
    summary: "Verify email",
    action: ({ body }) => verifyEmail.execute({ token: body.token }),
    postAction: () => ({ message: "ok" }),
  });
