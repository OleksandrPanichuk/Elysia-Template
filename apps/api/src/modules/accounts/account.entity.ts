import type { AccountRow } from "@/db";
import type { ConnectedAccountModel } from "@/modules/auth/auth.model";

import { PASSWORD_HASH_OPTIONS } from "./accounts.constants";

export interface AccountEntity extends AccountRow {}

export class AccountEntity {
  public static hashPassword(password: string): Promise<string> {
    return Bun.password.hash(password, PASSWORD_HASH_OPTIONS);
  }

  public static verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return Bun.password.verify(password, hash);
  }

  public static isCredentials(account: AccountEntity): boolean {
    return account.type === "CREDENTIALS";
  }

  public static canDisconnect(
    account: AccountEntity,
    connected: number,
  ): boolean {
    return !AccountEntity.isCredentials(account) && connected > 1;
  }

  public static normalize(
    account: AccountEntity,
    canDisconnect: boolean,
  ): ConnectedAccountModel {
    return {
      type: account.type,
      email: AccountEntity.isCredentials(account)
        ? account.providerAccountId
        : account.providerEmail,
      connectedAt: (account.linkedAt ?? account.createdAt).toISOString(),
      canDisconnect,
    };
  }
}
