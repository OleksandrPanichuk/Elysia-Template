import { defineRoute } from "@/core/route";
import { writeSessionCookie } from "@/modules/sessions";

import { AuthSessionModel } from "../auth.model";
import type { AuthActions } from "../auth.routes";
import { SignUpInput } from "../dto";

export const signUpRoute = ({ signUp }: AuthActions) =>
  defineRoute({
    body: SignUpInput,
    response: AuthSessionModel,
    summary: "Sign up",

    action: ({ body }) =>
      signUp.execute({
        email: body.email,
        password: body.password,
        name: body.name,
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
