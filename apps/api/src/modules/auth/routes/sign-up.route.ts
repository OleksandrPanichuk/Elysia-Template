import { defineRoute } from "@/core/route";
import { writeSessionCookie } from "@/modules/sessions";
import { getClientInfo } from "@/shared";

import { SIGN_UP_RATE_LIMIT } from "../auth.constants";
import { AuthSessionModel } from "../auth.model";
import type { AuthActions } from "../auth.routes";
import { SignUpInput } from "../dto";

export const signUpRoute = ({ signUp }: AuthActions) =>
  defineRoute({
    body: SignUpInput,
    response: AuthSessionModel,
    summary: "Sign up",
    rateLimit: { ...SIGN_UP_RATE_LIMIT, scope: "auth:sign-up" },

    action: ({ body, request, server }) =>
      signUp.execute({
        email: body.email,
        password: body.password,
        name: body.name,
        ...getClientInfo(request, server),
      }),
    postAction: ({ cookie, output }) => {
      writeSessionCookie(cookie, {
        token: output.token,
        expiresAt: output.session.expiresAt,
      });

      return {
        userId: output.session.userId,
        expiresAt: output.session.expiresAt,
      };
    },
  });
