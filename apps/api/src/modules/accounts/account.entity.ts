import type { AccountRow } from "@/db";

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
}
