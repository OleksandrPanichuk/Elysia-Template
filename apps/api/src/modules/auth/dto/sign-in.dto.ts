import { t } from "elysia";

import { MAX_EMAIL_LENGTH, MAX_PASSWORD_LENGTH } from "@/constants";

export const SignInInput = t.Object({
  email: t.String({ format: "email", maxLength: MAX_EMAIL_LENGTH }),
  password: t.String({ minLength: 1, maxLength: MAX_PASSWORD_LENGTH }),
});
export type SignInInput = typeof SignInInput.static;
