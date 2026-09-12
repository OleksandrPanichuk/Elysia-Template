import { t } from "elysia";

export const SetPasswordInput = t.Object({
  password: t.String({ minLength: 8 }),
});
export type SetPasswordInput = typeof SetPasswordInput.static;
