import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { transaction } from "@/db/executor";
import { AccountsService } from "@/modules/accounts";
import { type CreatedSession, SessionsService } from "@/modules/sessions";
import {
  UserAlreadyExistsError,
  UserEntity,
  UsersRepository,
  UsersService,
} from "@/modules/users";
import { JobQueueUnavailableError } from "@/platform/jobs";

import { AuthService } from "../auth.service";

export interface SignUpUseCaseOptions {
  email: string;
  password: string;
  name: string;
  userAgent?: string | null;
  ip?: string | null;
}

type Options = SignUpUseCaseOptions;
type Result = CreatedSession;

export class SignUpUseCase extends UseCase<Options, Result> {
  private readonly usersService = makeService(UsersService);

  private readonly accountsService = makeService(AccountsService);

  private readonly usersRepository = makeRepository(UsersRepository);

  private readonly sessionsService = makeService(SessionsService);

  private readonly authService = makeService(AuthService);

  private readonly runInTransaction = transaction;

  public async execute({
    name,
    email,
    password,
    userAgent,
    ip,
  }: Options): Promise<Result> {
    const normalizedEmail = UserEntity.normalizeEmail(email);

    const existingUser =
      await this.usersRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new UserAlreadyExistsError(
        "An account with this email already exists",
      );
    }

    const user = await this.runInTransaction(async () => {
      const createdUser = await this.usersService.create({
        email: normalizedEmail,
        name,
      });

      await this.accountsService.createCredentials({
        userId: createdUser.id,
        email: normalizedEmail,
        password,
      });

      return createdUser;
    });

    await this.sendVerificationEmail(user);

    return this.sessionsService.create(user.id, {
      userAgent,
      ip,
    });
  }

  private async sendVerificationEmail(user: UserEntity): Promise<void> {
    try {
      await this.authService.sendEmailVerification(user);
    } catch (error) {
      if (!(error instanceof JobQueueUnavailableError)) throw error;

      this.logger.error(
        { userId: user.id, err: error },
        "verification email was not queued",
      );
    }
  }
}
