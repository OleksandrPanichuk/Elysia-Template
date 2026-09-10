import { defineRoute } from "@/core/route";
import { writeSessionCookie } from "@/modules/sessions";

import { AuthSessionModel } from "../auth.model";
import type { AuthActions } from "../auth.routes";
import { SignInInput } from "../dto";

export const signInRoute = ({ signIn }: AuthActions) =>
  defineRoute({
    body: SignInInput,
    response: AuthSessionModel,
    summary: "Sign in",

    action: ({ body }) =>
      signIn.execute({
        email: body.email,
        password: body.password,
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
