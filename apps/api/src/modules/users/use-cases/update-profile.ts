import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { UserEntity } from "../user.entity";
import { UsersService } from "../users.service";

export interface UpdateProfileUseCaseOptions {
  userId: string;
  name: string;
}

type Options = UpdateProfileUseCaseOptions;
type Result = UserEntity;

export class UpdateProfileUseCase extends UseCase<Options, Result> {
  private readonly usersService = makeService(UsersService);

  public execute({ userId, name }: Options): Promise<Result> {
    return this.usersService.update(userId, { name });
  }
}
