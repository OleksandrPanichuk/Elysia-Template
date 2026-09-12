import type { AccountType } from "@/db";

import type { AccountEntity } from "./account.entity";

export interface CreateCredentialsAccountData {
  userId: string;
  email: string;
  passwordHash: string;
}

export interface CreateOAuthAccountData {
  userId: string;
  type: AccountType;
  providerAccountId: string;
  providerEmail: string;
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

  public abstract insertOAuthAccount(
    data: CreateOAuthAccountData,
  ): Promise<AccountEntity>;

  public abstract findByProviderAccountId(
    type: AccountType,
    providerAccountId: string,
  ): Promise<AccountEntity | null>;

  public abstract findByUserIdAndType(
    userId: string,
    type: AccountType,
  ): Promise<AccountEntity | null>;

  public abstract listByUserId(userId: string): Promise<AccountEntity[]>;

  public abstract deleteByUserIdAndType(
    userId: string,
    type: AccountType,
  ): Promise<void>;
}
