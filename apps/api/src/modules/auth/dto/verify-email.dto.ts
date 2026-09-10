import { t } from "elysia";

export const VerifyEmailInput = t.Object({
  token: t.String({ minLength: 1 }),
});
export type VerifyEmailInput = typeof VerifyEmailInput.static;
