import { getEnv } from "@/configs";
import { makeService } from "@/core/registry";
import { Service } from "@/core/service";
import { NotificationsService } from "@/modules/notifications";
import type { UserEntity } from "@/modules/users";
import {
  VerificationTokenKind,
  VerificationTokensService,
} from "@/modules/verification-tokens";

export class AuthService extends Service {
  private readonly tokensService = makeService(VerificationTokensService);

  private readonly notificationsService = makeService(NotificationsService);

  public async sendEmailVerification(user: UserEntity): Promise<void> {
    const env = getEnv();

    const { token } = await this.tokensService.issue({
      userId: user.id,
      type: VerificationTokenKind.EmailVerification,
      ttlSeconds: env.EMAIL_VERIFICATION_TTL_SECONDS,
    });

    const verificationUrl = new URL("/verify-email", env.APP_URL);
    verificationUrl.searchParams.set("token", token);

    await this.notificationsService.sendEmailVerification({
      userId: user.id,
      email: user.email,
      name: user.name,
      verificationUrl: verificationUrl.toString(),
      expiresInHours: Math.ceil(env.EMAIL_VERIFICATION_TTL_SECONDS / (60 * 60)),
    });
  }

  public async sendPasswordReset(user: UserEntity): Promise<void> {
    const env = getEnv();

    const { token } = await this.tokensService.issue({
      userId: user.id,
      type: VerificationTokenKind.PasswordReset,
      ttlSeconds: env.PASSWORD_RESET_TTL_SECONDS,
    });

    const resetUrl = new URL("/reset-password", env.APP_URL);
    resetUrl.searchParams.set("token", token);

    await this.notificationsService.sendPasswordReset({
      userId: user.id,
      email: user.email,
      name: user.name,
      resetUrl: resetUrl.toString(),
      expiresInMinutes: Math.ceil(env.PASSWORD_RESET_TTL_SECONDS / 60),
    });
  }
}
