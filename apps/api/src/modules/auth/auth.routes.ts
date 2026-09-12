import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { InvalidCredentialsError } from "./auth.errors";
import {
  changePasswordRoute,
  listConnectedAccountsRoute,
  resetPasswordRoute,
  sendEmailVerificationTokenRoute,
  sendResetPasswordTokenRoute,
  setPasswordRoute,
  signInRoute,
  signOutRoute,
  signUpRoute,
  verifyEmailRoute,
} from "./routes";
import type {
  ChangePasswordUseCase,
  ListConnectedAccountsUseCase,
  ResetPasswordUseCase,
  SendEmailVerificationTokenUseCase,
  SendResetPasswordTokenUseCase,
  SetPasswordUseCase,
  SignInUseCase,
  SignOutUseCase,
  SignUpUseCase,
  VerifyEmailUseCase,
} from "./use-cases";

export interface AuthActions {
  signIn: Executable<SignInUseCase>;
  listConnectedAccounts: Executable<ListConnectedAccountsUseCase>;
  signUp: Executable<SignUpUseCase>;
  signOut: Executable<SignOutUseCase>;
  verifyEmail: Executable<VerifyEmailUseCase>;
  sendEmailVerificationToken: Executable<SendEmailVerificationTokenUseCase>;
  resetPassword: Executable<ResetPasswordUseCase>;
  sendResetPasswordToken: Executable<SendResetPasswordTokenUseCase>;
  setPassword: Executable<SetPasswordUseCase>;
  changePassword: Executable<ChangePasswordUseCase>;
}

export const authRoutes = (actions: AuthActions) =>
  new Elysia({ name: "auth", prefix: "/auth" })
    .onError(({ error, set }) => {
      if (error instanceof InvalidCredentialsError) {
        set.status = error.status;
        return { code: error.code, error: error.message, module: "auth" };
      }
    })
    .get("/accounts", ...listConnectedAccountsRoute(actions))
    .post("/sign-in", ...signInRoute(actions))
    .post("/sign-up", ...signUpRoute(actions))
    .post("/sign-out", ...signOutRoute(actions))
    .post("/verify-email", ...verifyEmailRoute(actions))
    .post(
      "/send-email-verification-token",
      ...sendEmailVerificationTokenRoute(actions),
    )
    .post("/reset-password", ...resetPasswordRoute(actions))
    .post("/set-password", ...setPasswordRoute(actions))
    .post("/change-password", ...changePasswordRoute(actions))
    .post(
      "/send-reset-password-token",
      ...sendResetPasswordTokenRoute(actions),
    );
