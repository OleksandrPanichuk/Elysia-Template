import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { AccountsRepository, AccountsService } from "@/modules/accounts";
import { type CreatedSession, SessionsService } from "@/modules/sessions";

import { InvalidCredentialsError } from "../auth.errors";

export interface SignInUseCaseOptions {
  email: string;
  password: string;
}

type Options = SignInUseCaseOptions;
type Result = CreatedSession;

export class SignInUseCase extends UseCase<Options, Result> {
  private readonly accountsService = makeService(AccountsService);

  private readonly accountsRepository = makeRepository(AccountsRepository);

  private readonly sessionsService = makeService(SessionsService);

  public async execute({ email, password }: Options): Promise<Result> {
    const account = await this.accountsRepository.findCredentialsByEmail(email);

    const isPasswordValid = await this.accountsService.verifyPassword(
      account,
      password,
    );

    if (!account || !isPasswordValid) {
      throw new InvalidCredentialsError("Invalid email or password");
    }

    await this.sessionsService.revokeAllForUser(account.userId);

    return this.sessionsService.create(account.userId);
  }
}
