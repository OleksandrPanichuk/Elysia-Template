import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { AccountsRepository, AccountsService } from "@/modules/accounts";
import { type CreatedSession, SessionsService } from "@/modules/sessions";

import { InvalidCredentialsError, PasswordNotSetError } from "../auth.errors";

export interface ChangePasswordUseCaseOptions {
  userId: string;
  currentPassword: string;
  password: string;
}

type Options = ChangePasswordUseCaseOptions;
type Result = CreatedSession;

export class ChangePasswordUseCase extends UseCase<Options, Result> {
  private readonly accountsRepository = makeRepository(AccountsRepository);

  private readonly accountsService = makeService(AccountsService);

  private readonly sessionsService = makeService(SessionsService);

  public async execute({
    userId,
    currentPassword,
    password,
  }: Options): Promise<Result> {
    const account = await this.accountsRepository.findByUserIdAndType(
      userId,
      "CREDENTIALS",
    );

    if (!account) {
      throw new PasswordNotSetError(
        "This account has no password yet. Set one instead.",
      );
    }

    const matches = await this.accountsService.verifyPassword(
      account,
      currentPassword,
    );

    if (!matches) {
      throw new InvalidCredentialsError("Current password is incorrect");
    }

    const passwordHash = await this.accountsService.hashPassword(password);

    await this.accountsRepository.updateCredentialsPasswordHash(
      userId,
      passwordHash,
    );

    await this.sessionsService.revokeAllForUser(userId);

    return this.sessionsService.create(userId);
  }
}
