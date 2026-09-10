import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { InvalidCredentialsError } from "./auth.errors";
import {
  resetPasswordRoute,
  sendEmailVerificationTokenRoute,
  sendResetPasswordTokenRoute,
  signInRoute,
  signOutRoute,
  signUpRoute,
  verifyEmailRoute,
} from "./routes";
import type {
  ResetPasswordUseCase,
  SendEmailVerificationTokenUseCase,
  SendResetPasswordTokenUseCase,
  SignInUseCase,
  SignOutUseCase,
  SignUpUseCase,
  VerifyEmailUseCase,
} from "./use-cases";

export interface AuthActions {
  signIn: Executable<SignInUseCase>;
  signUp: Executable<SignUpUseCase>;
  signOut: Executable<SignOutUseCase>;
  verifyEmail: Executable<VerifyEmailUseCase>;
  sendEmailVerificationToken: Executable<SendEmailVerificationTokenUseCase>;
  resetPassword: Executable<ResetPasswordUseCase>;
  sendResetPasswordToken: Executable<SendResetPasswordTokenUseCase>;
}

export const authRoutes = (actions: AuthActions) =>
  new Elysia({ name: "auth", prefix: "/auth" })
    .onError(({ error, set }) => {
      if (error instanceof InvalidCredentialsError) {
        set.status = error.status;
        return { code: error.code, error: error.message, module: "auth" };
      }
    })
    .post("/sign-in", ...signInRoute(actions))
    .post("/sign-up", ...signUpRoute(actions))
    .post("/sign-out", ...signOutRoute(actions))
    .post("/verify-email", ...verifyEmailRoute(actions))
    .post(
      "/send-email-verification-token",
      ...sendEmailVerificationTokenRoute(actions),
    )
    .post("/reset-password", ...resetPasswordRoute(actions))
    .post(
      "/send-reset-password-token",
      ...sendResetPasswordTokenRoute(actions),
    );
