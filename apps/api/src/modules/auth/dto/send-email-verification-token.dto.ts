import { t } from "elysia";

import { MAX_EMAIL_LENGTH } from "@/constants";

export const SendEmailVerificationTokenInput = t.Object({
  email: t.String({ format: "email", maxLength: MAX_EMAIL_LENGTH }),
});
export type SendEmailVerificationTokenInput =
  typeof SendEmailVerificationTokenInput.static;
