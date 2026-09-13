import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { AccountsRepository } from "@/modules/accounts";
import { UsersRepository } from "@/modules/users";

import { AuthService } from "../auth.service";

export interface SendResetPasswordTokenUseCaseOptions {
  email: string;
}

type Options = SendResetPasswordTokenUseCaseOptions;
type Result = void;

export class SendResetPasswordTokenUseCase extends UseCase<Options, Result> {
  private readonly accountsRepository = makeRepository(AccountsRepository);

  private readonly usersRepository = makeRepository(UsersRepository);

  private readonly authService = makeService(AuthService);

  public async execute({ email }: Options): Promise<Result> {
    const account = await this.accountsRepository.findCredentialsByEmail(email);

    if (!account) return;

    const user = await this.usersRepository.findById(account.userId);

    if (!user) return;

    await this.authService.sendPasswordReset(user);
  }
}
