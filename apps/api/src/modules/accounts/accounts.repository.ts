import type { AccountEntity } from "./account.entity";

export interface CreateCredentialsAccountData {
  userId: string;
  email: string;
  passwordHash: string;
}

export abstract class AccountsRepository {
  public abstract insertCredentials(
    data: CreateCredentialsAccountData,
  ): Promise<AccountEntity>;

  public abstract findCredentialsByEmail(
    email: string,
  ): Promise<AccountEntity | null>;

  public abstract updateCredentialsPasswordHash(
    userId: string,
    passwordHash: string,
  ): Promise<void>;
}
