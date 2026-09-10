import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { transaction } from "@/db/executor";
import { UsersRepository } from "@/modules/users";
import {
  VerificationTokenEntity,
  VerificationTokensRepository,
} from "@/modules/verification-tokens";

import { InvalidTokenError } from "../auth.errors";

export interface VerifyEmailUseCaseOptions {
  token: string;
}

type Options = VerifyEmailUseCaseOptions;
type Result = void;

export class VerifyEmailUseCase extends UseCase<Options, Result> {
  private readonly tokensRepository = makeRepository(
    VerificationTokensRepository,
  );

  private readonly usersRepository = makeRepository(UsersRepository);

  private readonly runInTransaction = transaction;

  private readonly now = () => new Date();

  public async execute({ token }: Options): Promise<Result> {
    if (!VerificationTokenEntity.isWellFormed(token)) {
      throw this.invalidToken();
    }

    const tokenHash = VerificationTokenEntity.hash(token);

    await this.runInTransaction(async () => {
      const verificationToken =
        await this.tokensRepository.findActiveByTokenHash(
          tokenHash,
          "email_verification",
        );

      if (!verificationToken) {
        throw this.invalidToken();
      }

      const consumedAt = this.now();
      const consumed = await this.tokensRepository.consume(
        verificationToken.id,
        consumedAt,
      );

      if (!consumed) {
        throw this.invalidToken();
      }

      await this.usersRepository.markEmailVerified(
        verificationToken.userId,
        consumedAt,
      );

      await this.tokensRepository.invalidateAllForUser(
        verificationToken.userId,
        "email_verification",
        consumedAt,
      );
    });
  }

  private invalidToken(): InvalidTokenError {
    return new InvalidTokenError("Invalid or expired verification token");
  }
}
