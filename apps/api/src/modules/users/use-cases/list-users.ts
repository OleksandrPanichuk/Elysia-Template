import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { UserEntity } from "../users.entity";
import { UsersService } from "../users.service";

type Options = void;
type Result = UserEntity[];

export class ListUsersUseCase extends UseCase<Options, Result> {
  private readonly usersService = makeService(UsersService);

  public execute(): Promise<Result> {
    return this.usersService.list();
  }
}
