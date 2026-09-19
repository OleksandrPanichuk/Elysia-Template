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
import type { ClientInfo } from "@/shared";

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

  public notifyPasswordChanged(
    user: UserEntity,
    client: ClientInfo,
  ): Promise<void> {
    return this.notify("password changed", user, () =>
      this.notificationsService.sendPasswordChanged(
        this.securityNotice(user, client),
      ),
    );
  }

  public notifyNewSignIn(user: UserEntity, client: ClientInfo): Promise<void> {
    return this.notify("new sign-in", user, () =>
      this.notificationsService.sendNewSignIn(
        this.securityNotice(user, client),
      ),
    );
  }

  public notifyEmailChanged(
    user: UserEntity,
    previousEmail: string,
  ): Promise<void> {
    return this.notify("email changed", user, () =>
      this.notificationsService.sendEmailChanged({
        userId: user.id,
        email: previousEmail,
        name: user.name,
        newEmail: user.email,
        securityUrl: this.securityUrl(),
      }),
    );
  }

  private securityUrl(): string {
    const env = getEnv();

    return new URL(env.APP_SECURITY_PATH, env.APP_URL).toString();
  }

  private securityNotice(user: UserEntity, client: ClientInfo) {
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      occurredAt: new Date(),
      client,
      securityUrl: this.securityUrl(),
    };
  }

  private async notify(
    notice: string,
    user: UserEntity,
    send: () => Promise<void>,
  ): Promise<void> {
    try {
      await send();
    } catch (error) {
      if (!(error instanceof JobQueueUnavailableError)) throw error;

      this.logger.error(
        { userId: user.id, notice, err: error },
        "security notice was not queued",
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
