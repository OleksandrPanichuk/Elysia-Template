import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { transaction } from "@/db/executor";

import type { UserEntity } from "../users.entity";
import { UsersService } from "../users.service";

export interface CreateUserUseCaseOptions {
  name: string;
}

type Options = CreateUserUseCaseOptions;
type Result = UserEntity;

export class CreateUserUseCase extends UseCase<Options, Result> {
  private readonly usersService = makeService(UsersService);

  public async execute({ name }: Options): Promise<Result> {
    return transaction(async () => {
      const user = await this.usersService.create({ name });
      return user;
    });
  }
}
