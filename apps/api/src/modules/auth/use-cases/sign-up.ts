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

import { AuthService } from "../auth.service";

export interface SignUpUseCaseOptions {
  email: string;
  password: string;
  name: string;
}

type Options = SignUpUseCaseOptions;
type Result = CreatedSession;

export class SignUpUseCase extends UseCase<Options, Result> {
  private readonly SLEEP_DURATION_MS = 2000;

  private readonly usersService = makeService(UsersService);

  private readonly accountsService = makeService(AccountsService);

  private readonly usersRepository = makeRepository(UsersRepository);

  private readonly sessionsService = makeService(SessionsService);

  private readonly authService = makeService(AuthService);

  private readonly runInTransaction = transaction;

  public async execute({ name, email, password }: Options): Promise<Result> {
    const normalizedEmail = UserEntity.normalizeEmail(email);

    const existingUser =
      await this.usersRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      await this.sleep(this.SLEEP_DURATION_MS);
      throw new UserAlreadyExistsError("Could not create new account");
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

    await this.authService.sendEmailVerification(user);

    return this.sessionsService.create(user.id);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
