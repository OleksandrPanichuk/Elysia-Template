import { t } from "elysia";

import { MAX_EMAIL_LENGTH } from "@/constants";

export const SendResetPasswordTokenInput = t.Object({
  email: t.String({ format: "email", maxLength: MAX_EMAIL_LENGTH }),
});
export type SendResetPasswordTokenInput =
  typeof SendResetPasswordTokenInput.static;
