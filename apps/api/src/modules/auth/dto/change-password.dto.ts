import { t } from "elysia";

export const ChangePasswordInput = t.Object({
  currentPassword: t.String({ minLength: 1 }),
  password: t.String({ minLength: 8 }),
});
export type ChangePasswordInput = typeof ChangePasswordInput.static;
