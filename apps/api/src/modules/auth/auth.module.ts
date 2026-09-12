import { defineModule } from "@/core/module";
import { makeUseCase } from "@/core/registry";

import { authRoutes } from "./auth.routes";
import {
  ListConnectedAccountsUseCase,
  ResetPasswordUseCase,
  SendEmailVerificationTokenUseCase,
  SendResetPasswordTokenUseCase,
  SignInUseCase,
  SignOutUseCase,
  SignUpUseCase,
  VerifyEmailUseCase,
} from "./use-cases";

export const authModule = defineModule({
  name: "auth",

  routes: () =>
    authRoutes({
      signIn: makeUseCase(SignInUseCase),
      listConnectedAccounts: makeUseCase(ListConnectedAccountsUseCase),
      signUp: makeUseCase(SignUpUseCase),
      signOut: makeUseCase(SignOutUseCase),
      verifyEmail: makeUseCase(VerifyEmailUseCase),
      sendEmailVerificationToken: makeUseCase(
        SendEmailVerificationTokenUseCase,
      ),
      resetPassword: makeUseCase(ResetPasswordUseCase),
      sendResetPasswordToken: makeUseCase(SendResetPasswordTokenUseCase),
    }),
});
