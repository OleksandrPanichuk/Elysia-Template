import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { AccountsRepository, AccountsService } from "@/modules/accounts";
import { type CreatedSession, SessionsService } from "@/modules/sessions";
import { UsersRepository } from "@/modules/users";

import { InvalidCredentialsError, PasswordNotSetError } from "../auth.errors";
import { AuthService } from "../auth.service";

export interface ChangePasswordUseCaseOptions {
  userId: string;
  currentPassword: string;
  password: string;
  userAgent?: string | null;
  ip?: string | null;
}

type Options = ChangePasswordUseCaseOptions;
type Result = CreatedSession;

export class ChangePasswordUseCase extends UseCase<Options, Result> {
  private readonly accountsRepository = makeRepository(AccountsRepository);

  private readonly accountsService = makeService(AccountsService);

  private readonly sessionsService = makeService(SessionsService);

  private readonly usersRepository = makeRepository(UsersRepository);

  private readonly authService = makeService(AuthService);

  public async execute({
    userId,
    currentPassword,
    password,
    userAgent,
    ip,
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

    const created = await this.sessionsService.create(userId, {
      userAgent,
      ip,
    });

    const user = await this.usersRepository.getById(userId);

    await this.authService.notifyPasswordChanged(user, {
      userAgent: userAgent ?? null,
      ip: ip ?? null,
    });

    return created;
  }
}
