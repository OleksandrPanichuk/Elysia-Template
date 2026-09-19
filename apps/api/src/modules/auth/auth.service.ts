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

const SECURITY_PATH = "/settings/security";

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

  private securityNotice(user: UserEntity, client: ClientInfo) {
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      occurredAt: new Date(),
      client,
      securityUrl: new URL(SECURITY_PATH, getEnv().APP_URL).toString(),
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
