import { BadRequestError } from "@/core/errors";
import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { AccountsRepository, AccountsService } from "@/modules/accounts";
import { UserEntity, UsersRepository } from "@/modules/users";

import {
  EmailAlreadyInUseError,
  InvalidCredentialsError,
} from "../auth.errors";
import { AuthService } from "../auth.service";

export interface ChangeEmailUseCaseOptions {
  userId: string;
  email: string;
  password?: string;
}

type Options = ChangeEmailUseCaseOptions;
type Result = void;

export class ChangeEmailUseCase extends UseCase<Options, Result> {
  private readonly usersRepository = makeRepository(UsersRepository);

  private readonly accountsRepository = makeRepository(AccountsRepository);

  private readonly accountsService = makeService(AccountsService);

  private readonly authService = makeService(AuthService);

  public async execute({ userId, email, password }: Options): Promise<Result> {
    const user = await this.usersRepository.getById(userId);
    const newEmail = UserEntity.normalizeEmail(email);

    if (newEmail === user.email) {
      throw new BadRequestError("That is already the email on this account");
    }

    await this.verifyPassword(userId, password);

    if (await this.usersRepository.findByEmail(newEmail)) {
      throw new EmailAlreadyInUseError(
        "An account with this email already exists",
      );
    }

    await this.authService.sendEmailChangeConfirmation(user, newEmail);
  }

  private async verifyPassword(
    userId: string,
    password: string | undefined,
  ): Promise<void> {
    const account = await this.accountsRepository.findByUserIdAndType(
      userId,
      "CREDENTIALS",
    );

    if (!account) return;

    if (!password) {
      throw new InvalidCredentialsError("Enter your password to confirm");
    }

    const matches = await this.accountsService.verifyPassword(
      account,
      password,
    );

    if (!matches) {
      throw new InvalidCredentialsError("Password is incorrect");
    }
  }
}
