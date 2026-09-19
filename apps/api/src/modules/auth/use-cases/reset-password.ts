import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { transaction } from "@/db/executor";
import { AccountsRepository, AccountsService } from "@/modules/accounts";
import { SessionsService } from "@/modules/sessions";
import {
  VerificationTokenEntity,
  VerificationTokenKind,
  VerificationTokensRepository,
} from "@/modules/verification-tokens";

import { InvalidTokenError } from "../auth.errors";

export interface ResetPasswordUseCaseOptions {
  token: string;
  password: string;
}

type Options = ResetPasswordUseCaseOptions;
type Result = void;

export class ResetPasswordUseCase extends UseCase<Options, Result> {
  private readonly tokensRepository = makeRepository(
    VerificationTokensRepository,
  );

  private readonly accountsRepository = makeRepository(AccountsRepository);

  private readonly accountsService = makeService(AccountsService);

  private readonly sessionsService = makeService(SessionsService);

  private readonly runInTransaction = transaction;

  private readonly now = () => new Date();

  public async execute({ token, password }: Options): Promise<Result> {
    if (!VerificationTokenEntity.isWellFormed(token)) {
      throw this.invalidToken();
    }

    const tokenHash = VerificationTokenEntity.hash(token);

    const resetToken = await this.tokensRepository.findActiveByTokenHash(
      tokenHash,
      VerificationTokenKind.PasswordReset,
    );

    if (!resetToken) {
      throw this.invalidToken();
    }

    const passwordHash = await this.accountsService.hashPassword(password);

    await this.sessionsService.revokeAllForUser(resetToken.userId);

    await this.runInTransaction(async () => {
      const consumedAt = this.now();
      const consumed = await this.tokensRepository.consume(
        resetToken.id,
        consumedAt,
      );

      if (!consumed) {
        throw this.invalidToken();
      }

      await this.accountsRepository.updateCredentialsPasswordHash(
        resetToken.userId,
        passwordHash,
      );

      await this.tokensRepository.invalidateAllForUser(
        resetToken.userId,
        VerificationTokenKind.PasswordReset,
        consumedAt,
      );
    });
  }

  private invalidToken(): InvalidTokenError {
    return new InvalidTokenError("Invalid or expired password reset token");
  }
}
