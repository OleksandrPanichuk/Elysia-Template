import { t } from "elysia";

import { MAX_TOKEN_LENGTH } from "@/constants";

export const VerifyEmailInput = t.Object({
  token: t.String({ minLength: 1, maxLength: MAX_TOKEN_LENGTH }),
});
export type VerifyEmailInput = typeof VerifyEmailInput.static;
