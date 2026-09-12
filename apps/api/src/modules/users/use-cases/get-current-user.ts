import { UnauthorizedError } from "@/core/errors";
import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { UserEntity } from "../user.entity";
import { UsersService } from "../users.service";

export interface GetCurrentUserUseCaseOptions {
  userId: string;
}

type Options = GetCurrentUserUseCaseOptions;
type Result = UserEntity;

export class GetCurrentUserUseCase extends UseCase<Options, Result> {
  private readonly usersService = makeService(UsersService);

  public async execute({ userId }: Options): Promise<Result> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedError("Session user no longer exists");
    }

    return user;
  }
}
