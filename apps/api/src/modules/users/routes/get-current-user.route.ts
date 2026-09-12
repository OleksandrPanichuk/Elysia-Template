import { defineRoute } from "@/core/route";

import { UserEntity } from "../user.entity";
import { UserModel } from "../user.model";
import type { UsersActions } from "../users.routes";

export const getCurrentUserRoute = ({ getCurrentUser }: UsersActions) =>
  defineRoute({
    response: UserModel,
    summary: "Get current user",
    auth: true,

    action: ({ user }) => getCurrentUser.execute({ userId: user.id }),
    postAction: ({ output }) => UserEntity.normalize(output),
  });
