import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { AccountsRepository, AccountsService } from "@/modules/accounts";
import { type CreatedSession, SessionsService } from "@/modules/sessions";
import { UsersRepository } from "@/modules/users";

import { InvalidCredentialsError } from "../auth.errors";
import { AuthService } from "../auth.service";

export interface SignInUseCaseOptions {
  email: string;
  password: string;
  userAgent?: string | null;
  ip?: string | null;
}

type Options = SignInUseCaseOptions;
type Result = CreatedSession;

export class SignInUseCase extends UseCase<Options, Result> {
  private readonly accountsService = makeService(AccountsService);

  private readonly accountsRepository = makeRepository(AccountsRepository);

  private readonly sessionsService = makeService(SessionsService);

  private readonly usersRepository = makeRepository(UsersRepository);

  private readonly authService = makeService(AuthService);

  public async execute({
    email,
    password,
    userAgent,
    ip,
  }: Options): Promise<Result> {
    const account = await this.accountsRepository.findCredentialsByEmail(email);

    const isPasswordValid = await this.accountsService.verifyPassword(
      account,
      password,
    );

    if (!account || !isPasswordValid) {
      throw new InvalidCredentialsError("Invalid email or password");
    }

    const created = await this.sessionsService.create(account.userId, {
      userAgent,
      ip,
    });

    if (created.newDevice) {
      const user = await this.usersRepository.getById(account.userId);

      await this.authService.notifyNewSignIn(user, {
        userAgent: userAgent ?? null,
        ip: ip ?? null,
      });
    }

    return created;
  }
}
