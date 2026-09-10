import { t } from "elysia";

export const ResetPasswordInput = t.Object({
  token: t.String({ minLength: 1 }),
  password: t.String({ minLength: 8 }),
});
export type ResetPasswordInput = typeof ResetPasswordInput.static;
