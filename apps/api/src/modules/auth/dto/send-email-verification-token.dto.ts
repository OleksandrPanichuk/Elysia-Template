import { t } from "elysia";

export const SendEmailVerificationTokenInput = t.Object({
  email: t.String({ format: "email" }),
});
export type SendEmailVerificationTokenInput =
  typeof SendEmailVerificationTokenInput.static;
