import { makeRepository } from "@/core/registry";
import { Service } from "@/core/service";

import type { CreateUserData } from "./users.repository";
import { UsersRepository } from "./users.repository";

export class UsersService extends Service {
  private readonly repo = makeRepository(UsersRepository);

  public create(data: CreateUserData) {
    return this.repo.insert(data);
  }

  public list() {
    return this.repo.list();
  }
}
