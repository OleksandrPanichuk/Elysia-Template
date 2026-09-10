import { t } from "elysia";

export const SendResetPasswordTokenInput = t.Object({
  email: t.String({ format: "email" }),
});
export type SendResetPasswordTokenInput =
  typeof SendResetPasswordTokenInput.static;
