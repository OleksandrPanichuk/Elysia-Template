import { t } from "elysia";

import { defineRoute } from "@/core/route";

import { UserEntity } from "../users.entity";
import { UserModel } from "../users.model";
import type { UsersActions } from "../users.routes";

export const listUsersRoute = ({ listUsers }: UsersActions) =>
  defineRoute({
    response: t.Array(UserModel),
    summary: "List users",
    action: () => listUsers.execute(),
    mapOut: UserEntity.normalizeMany,
  });
