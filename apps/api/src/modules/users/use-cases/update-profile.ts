import { BadRequestError } from "@/core/errors";
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

  public async execute({ userId, name }: Options): Promise<Result> {
    const trimmed = name.trim();

    if (trimmed.length === 0) {
      throw new BadRequestError("Name cannot be blank");
    }

    return this.usersService.update(userId, { name: trimmed });
  }
}
