import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { AccountsRepository, AccountsService } from "@/modules/accounts";
import { UsersRepository } from "@/modules/users";

import { PasswordAlreadySetError } from "../auth.errors";

export interface SetPasswordUseCaseOptions {
  userId: string;
  password: string;
}

type Options = SetPasswordUseCaseOptions;
type Result = void;

export class SetPasswordUseCase extends UseCase<Options, Result> {
  private readonly accountsRepository = makeRepository(AccountsRepository);

  private readonly accountsService = makeService(AccountsService);

  private readonly usersRepository = makeRepository(UsersRepository);

  public async execute({ userId, password }: Options): Promise<Result> {
    const existing = await this.accountsRepository.findByUserIdAndType(
      userId,
      "CREDENTIALS",
    );

    if (existing) {
      throw new PasswordAlreadySetError(
        "This account already has a password. Change it instead.",
      );
    }

    const user = await this.usersRepository.getById(userId);

    await this.accountsService.createCredentials({
      userId,
      email: user.email,
      password,
    });
  }
}
