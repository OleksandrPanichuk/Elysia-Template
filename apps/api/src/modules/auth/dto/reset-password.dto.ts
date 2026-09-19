import { t } from "elysia";

import { MAX_PASSWORD_LENGTH, MAX_TOKEN_LENGTH } from "@/constants";

export const ResetPasswordInput = t.Object({
  token: t.String({ minLength: 1, maxLength: MAX_TOKEN_LENGTH }),
  password: t.String({ minLength: 8, maxLength: MAX_PASSWORD_LENGTH }),
});
export type ResetPasswordInput = typeof ResetPasswordInput.static;
