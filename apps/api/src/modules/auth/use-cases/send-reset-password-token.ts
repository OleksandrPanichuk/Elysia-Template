import { getEnv } from "@/configs";
import { SECOND } from "@/constants";
import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { getLogger } from "@/infrastructure";
import { AccountsRepository } from "@/modules/accounts";
import {
  MailDeliveryError,
  NotificationsService,
} from "@/modules/notifications";
import { UsersRepository } from "@/modules/users";
import {
  VerificationTokenEntity,
  VerificationTokensRepository,
} from "@/modules/verification-tokens";

export interface SendResetPasswordTokenUseCaseOptions {
  email: string;
}

type Options = SendResetPasswordTokenUseCaseOptions;
type Result = void;

export class SendResetPasswordTokenUseCase extends UseCase<Options, Result> {
  private readonly accountsRepository = makeRepository(AccountsRepository);

  private readonly usersRepository = makeRepository(UsersRepository);

  private readonly tokensRepository = makeRepository(
    VerificationTokensRepository,
  );

  private readonly notifications = makeService(NotificationsService);

  public async execute({ email }: Options): Promise<Result> {
    const env = getEnv();
    const account = await this.accountsRepository.findCredentialsByEmail(email);

    if (!account) return;

    const user = await this.usersRepository.findById(account.userId);

    if (!user) return;

    const now = new Date();
    const { token, tokenHash } = VerificationTokenEntity.generate();
    const expiresAt = new Date(
      now.getTime() + env.PASSWORD_RESET_TTL_SECONDS * SECOND,
    );

    await this.tokensRepository.invalidateAllForUser(
      user.id,
      "password_reset",
      now,
    );

    await this.tokensRepository.insert({
      userId: user.id,
      tokenHash,
      type: "password_reset",
      expiresAt,
    });

    const resetUrl = new URL("/reset-password", env.APP_URL);
    resetUrl.searchParams.set("token", token);

    try {
      await this.notifications.sendPasswordReset({
        userId: user.id,
        email: user.email,
        name: user.name,
        resetUrl: resetUrl.toString(),
        expiresInMinutes: Math.ceil(env.PASSWORD_RESET_TTL_SECONDS / 60),
      });
    } catch (error) {
      if (!(error instanceof MailDeliveryError)) throw error;

      getLogger().error(
        {
          userId: user.id,
          notification: "password_reset",
        },
        "password reset email was not delivered",
      );
    }
  }
}
