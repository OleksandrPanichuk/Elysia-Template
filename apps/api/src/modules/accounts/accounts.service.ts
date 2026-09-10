import { makeRepository } from "@/core/registry";
import { Service } from "@/core/service";
import { UserEntity } from "@/modules/users/user.entity";

import { AccountEntity } from "./account.entity";
import { UNKNOWN_ACCOUNT_PASSWORD_HASH } from "./accounts.constants";
import { AccountsRepository } from "./accounts.repository";

export interface CreateCredentialsAccountInput {
  userId: string;
  email: string;
  password: string;
}

export class AccountsService extends Service {
  private readonly repository = makeRepository(AccountsRepository);

  public async createCredentials(
    input: CreateCredentialsAccountInput,
  ): Promise<AccountEntity> {
    const passwordHash = await AccountEntity.hashPassword(input.password);

    return this.repository.insertCredentials({
      userId: input.userId,
      email: UserEntity.normalizeEmail(input.email),
      passwordHash,
    });
  }

  public async verifyPassword(
    account: AccountEntity | null,
    password: string,
  ): Promise<boolean> {
    const passwordHash = account?.passwordHash ?? UNKNOWN_ACCOUNT_PASSWORD_HASH;
    const matches = await AccountEntity.verifyPassword(password, passwordHash);

    return account?.type === "CREDENTIALS" && matches;
  }

  public hashPassword(password: string): Promise<string> {
    return AccountEntity.hashPassword(password);
  }
}
