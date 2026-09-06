import { defineRoute } from "@/core/route";

import { CreateUserInput } from "../dto";
import { UserEntity } from "../users.entity";
import { UserModel } from "../users.model";
import type { UsersActions } from "../users.routes";

export const createUserRoute = ({ createUser }: UsersActions) =>
  defineRoute({
    body: CreateUserInput,
    response: UserModel,
    summary: "Create a user",
    action: ({ body }) => createUser.execute({ name: body.name }),
    mapOut: UserEntity.normalize,
  });
