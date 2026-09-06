import { t } from "elysia";

export const UserModel = t.Object({
  id: t.String(),
  name: t.String(),
});
export type UserModel = typeof UserModel.static;
