import { makeRepository } from "@/core/registry";
import { Service } from "@/core/service";

import { UserEntity } from "./user.entity";
import { UsersRepository } from "./users.repository";

export interface CreateUserInput {
  name: string;
  email: string;
}

export class UsersService extends Service {
  private readonly repo = makeRepository(UsersRepository);

  public async create({ name, email }: CreateUserInput): Promise<UserEntity> {
    return this.repo.insert({
      name,
      email: UserEntity.normalizeEmail(email),
    });
  }
}
