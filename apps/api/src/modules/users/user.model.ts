import { t } from "elysia";

export const UserModel = t.Object({
  id: t.String({ format: "uuid" }),
  name: t.String(),
  email: t.String({ format: "email" }),
  emailVerified: t.Boolean(),
});
export type UserModel = typeof UserModel.static;
