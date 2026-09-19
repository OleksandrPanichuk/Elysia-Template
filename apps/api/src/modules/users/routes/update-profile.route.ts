import { defineRoute } from "@/core/route";

import { UpdateProfileInput } from "../dto";
import { UserEntity } from "../user.entity";
import { UserModel } from "../user.model";
import type { UsersActions } from "../users.routes";

export const updateProfileRoute = ({ updateProfile }: UsersActions) =>
  defineRoute({
    body: UpdateProfileInput,
    response: UserModel,
    summary: "Update your profile",
    auth: true,

    action: ({ body, user }) =>
      updateProfile.execute({ userId: user.id, name: body.name }),
    postAction: ({ output }) => UserEntity.normalize(output),
  });
