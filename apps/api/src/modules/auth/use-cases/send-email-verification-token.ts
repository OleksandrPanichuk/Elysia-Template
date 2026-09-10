import { getEnv } from "@/configs";
import { SECOND } from "@/constants";
import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { getLogger } from "@/infrastructure";
import {
  MailDeliveryError,
  NotificationsService,
} from "@/modules/notifications";
import { UserEntity, UsersRepository } from "@/modules/users";
import {
  VerificationTokenEntity,
  VerificationTokensRepository,
} from "@/modules/verification-tokens";

export interface SendEmailVerificationTokenUseCaseOptions {
  email: string;
}

type Options = SendEmailVerificationTokenUseCaseOptions;
type Result = void;

export class SendEmailVerificationTokenUseCase extends UseCase<
  Options,
  Result
> {
  private readonly usersRepository = makeRepository(UsersRepository);

  private readonly tokensRepository = makeRepository(
    VerificationTokensRepository,
  );

  private readonly notificationsService = makeService(NotificationsService);

  public async execute({ email }: Options): Promise<Result> {
    const env = getEnv();
    const user = await this.usersRepository.findByEmail(
      UserEntity.normalizeEmail(email),
    );

    if (!user || UserEntity.isEmailVerified(user)) return;

    const now = new Date();
    const { token, tokenHash } = VerificationTokenEntity.generate();
    const expiresAt = new Date(
      now.getTime() + env.EMAIL_VERIFICATION_TTL_SECONDS * SECOND,
    );

    await this.tokensRepository.invalidateAllForUser(
      user.id,
      "email_verification",
      now,
    );

    await this.tokensRepository.insert({
      userId: user.id,
      tokenHash,
      type: "email_verification",
      expiresAt,
    });

    const verificationUrl = new URL("/verify-email", env.APP_URL);
    verificationUrl.searchParams.set("token", token);

    try {
      await this.notificationsService.sendEmailVerification({
        userId: user.id,
        email: user.email,
        name: user.name,
        verificationUrl: verificationUrl.toString(),
        expiresInHours: Math.ceil(
          env.EMAIL_VERIFICATION_TTL_SECONDS / (60 * 60),
        ),
      });
    } catch (error) {
      if (!(error instanceof MailDeliveryError)) throw error;

      getLogger().error(
        {
          userId: user.id,
          notification: "email_verification",
        },
        "verification email was not delivered",
      );
    }
  }
}
