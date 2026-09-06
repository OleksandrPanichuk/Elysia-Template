import type { UserRow } from "@/db";

import type { UserModel } from "./users.model";

export interface UserEntity extends UserRow {}

export class UserEntity {
  public static hashPassword(password: string): Promise<string> {
    return Bun.password.hash(password);
  }

  public static verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return Bun.password.verify(password, hash);
  }

  public static normalize(user: UserEntity): UserModel {
    return {
      id: user.id,
      name: user.name,
    };
  }

  public static normalizeMany(users: UserEntity[]): UserModel[] {
    return users.map(UserEntity.normalize);
  }
}
