import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { transaction } from "@/db/executor";
import { UsersService } from "@/modules/users";
import {
  VerificationTokenEntity,
  VerificationTokenKind,
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

  private readonly usersService = makeService(UsersService);

  private readonly runInTransaction = transaction;

  private readonly now = () => new Date();

  public async execute({ token }: Options): Promise<Result> {
    if (!VerificationTokenEntity.isWellFormed(token)) {
      throw this.invalidToken();
    }

    const tokenHash = VerificationTokenEntity.hash(token);

    const userId = await this.runInTransaction(async () => {
      const verificationToken =
        await this.tokensRepository.findActiveByTokenHash(
          tokenHash,
          VerificationTokenKind.EmailVerification,
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

      await this.usersService.markEmailVerified(
        verificationToken.userId,
        consumedAt,
      );

      await this.tokensRepository.invalidateAllForUser(
        verificationToken.userId,
        VerificationTokenKind.EmailVerification,
        consumedAt,
      );

      return verificationToken.userId;
    });

    await this.usersService.invalidate(userId);
  }

  private invalidToken(): InvalidTokenError {
    return new InvalidTokenError("Invalid or expired verification token");
  }
}
