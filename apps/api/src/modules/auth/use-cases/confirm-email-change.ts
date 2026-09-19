import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { transaction } from "@/db/executor";
import { AccountsRepository } from "@/modules/accounts";
import { UsersRepository, UsersService } from "@/modules/users";
import {
  VerificationTokenEntity,
  VerificationTokenKind,
  VerificationTokensRepository,
} from "@/modules/verification-tokens";

import { EmailAlreadyInUseError, InvalidTokenError } from "../auth.errors";
import { AuthService } from "../auth.service";

export interface ConfirmEmailChangeUseCaseOptions {
  token: string;
}

type Options = ConfirmEmailChangeUseCaseOptions;
type Result = void;

export class ConfirmEmailChangeUseCase extends UseCase<Options, Result> {
  private readonly tokensRepository = makeRepository(
    VerificationTokensRepository,
  );

  private readonly usersRepository = makeRepository(UsersRepository);

  private readonly accountsRepository = makeRepository(AccountsRepository);

  private readonly usersService = makeService(UsersService);

  private readonly authService = makeService(AuthService);

  private readonly runInTransaction = transaction;

  private readonly now = () => new Date();

  public async execute({ token }: Options): Promise<Result> {
    if (!VerificationTokenEntity.isWellFormed(token)) {
      throw this.invalidToken();
    }

    const changeToken = await this.tokensRepository.findActiveByTokenHash(
      VerificationTokenEntity.hash(token),
      VerificationTokenKind.EmailChange,
    );

    if (!changeToken?.email) {
      throw this.invalidToken();
    }

    const { userId, email: newEmail } = changeToken;
    const user = await this.usersRepository.getById(userId);
    const previousEmail = user.email;

    await this.runInTransaction(async () => {
      const consumedAt = this.now();
      const consumed = await this.tokensRepository.consume(
        changeToken.id,
        consumedAt,
      );

      if (!consumed) {
        throw this.invalidToken();
      }

      if (await this.usersRepository.findByEmail(newEmail)) {
        throw new EmailAlreadyInUseError(
          "An account with this email already exists",
        );
      }

      await this.usersRepository.updateEmail(userId, newEmail, consumedAt);
      await this.accountsRepository.updateCredentialsEmail(userId, newEmail);
      await this.tokensRepository.invalidateAllForUser(
        userId,
        VerificationTokenKind.EmailChange,
        consumedAt,
      );
    });

    await this.usersService.invalidate(userId);

    await this.authService.notifyEmailChanged(
      { ...user, email: newEmail },
      previousEmail,
    );
  }

  private invalidToken(): InvalidTokenError {
    return new InvalidTokenError("Invalid or expired email change token");
  }
}
