import { getEnv } from "@/configs";
import { makeService } from "@/core/registry";
import { Service } from "@/core/service";
import { NotificationsService } from "@/modules/notifications";
import type { UserEntity } from "@/modules/users";
import {
  VerificationTokenKind,
  VerificationTokensService,
} from "@/modules/verification-tokens";
import { JobQueueUnavailableError } from "@/platform/jobs";

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

    const verificationUrl = new URL(env.APP_VERIFY_EMAIL_PATH, env.APP_URL);
    verificationUrl.searchParams.set("token", token);

    await this.notificationsService.sendEmailVerification({
      userId: user.id,
      email: user.email,
      name: user.name,
      verificationUrl: verificationUrl.toString(),
      expiresInHours: Math.ceil(env.EMAIL_VERIFICATION_TTL_SECONDS / (60 * 60)),
    });
  }

  public async sendEmailChangeConfirmation(
    user: UserEntity,
    newEmail: string,
  ): Promise<void> {
    const env = getEnv();

    const { token } = await this.tokensService.issue({
      userId: user.id,
      type: VerificationTokenKind.EmailChange,
      ttlSeconds: env.EMAIL_VERIFICATION_TTL_SECONDS,
      email: newEmail,
    });

    const confirmUrl = new URL(env.APP_CONFIRM_EMAIL_CHANGE_PATH, env.APP_URL);
    confirmUrl.searchParams.set("token", token);

    await this.notificationsService.sendEmailChange({
      userId: user.id,
      email: newEmail,
      name: user.name,
      confirmUrl: confirmUrl.toString(),
      expiresInHours: Math.ceil(env.EMAIL_VERIFICATION_TTL_SECONDS / (60 * 60)),
    });
  }

  public async notifyEmailChanged(
    user: UserEntity,
    previousEmail: string,
  ): Promise<void> {
    const env = getEnv();

    try {
      await this.notificationsService.sendEmailChanged({
        userId: user.id,
        email: previousEmail,
        name: user.name,
        newEmail: user.email,
        securityUrl: new URL(env.APP_SECURITY_PATH, env.APP_URL).toString(),
      });
    } catch (error) {
      if (!(error instanceof JobQueueUnavailableError)) throw error;

      this.logger.error(
        { userId: user.id, err: error },
        "email change notice was not queued",
      );
    }
  }

  public async sendPasswordReset(user: UserEntity): Promise<void> {
    const env = getEnv();

    const { token } = await this.tokensService.issue({
      userId: user.id,
      type: VerificationTokenKind.PasswordReset,
      ttlSeconds: env.PASSWORD_RESET_TTL_SECONDS,
    });

    const resetUrl = new URL(env.APP_RESET_PASSWORD_PATH, env.APP_URL);
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
