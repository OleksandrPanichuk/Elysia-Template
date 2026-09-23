import { defineRoute } from "@/core/route";
import { writeSessionCookie } from "@/modules/sessions";
import { getClientInfo } from "@/shared";

import {
  requireSignInCaptcha,
  SIGN_IN_ADDRESS_SCOPE,
  signInAddressKey,
} from "../auth.captcha";
import {
  SIGN_IN_CLIENT_RATE_LIMIT,
  SIGN_IN_RATE_LIMIT,
} from "../auth.constants";
import { AuthSessionModel } from "../auth.model";
import type { AuthActions } from "../auth.routes";
import { SignInInput } from "../dto";

export const signInRoute = ({ signIn }: AuthActions) =>
  defineRoute({
    body: SignInInput,
    response: AuthSessionModel,
    summary: "Sign in",
    rateLimit: [
      {
        ...SIGN_IN_RATE_LIMIT,
        scope: SIGN_IN_ADDRESS_SCOPE,
        key: signInAddressKey,
      },
      { ...SIGN_IN_CLIENT_RATE_LIMIT, scope: "auth:sign-in:client" },
    ],
    guards: [requireSignInCaptcha],

    action: ({ body, request, server }) =>
      signIn.execute({
        email: body.email,
        password: body.password,
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
