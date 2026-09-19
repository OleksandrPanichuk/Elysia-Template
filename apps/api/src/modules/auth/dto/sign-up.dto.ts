import { t } from "elysia";

import {
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
} from "@/constants";

export const SignUpInput = t.Object({
  email: t.String({ format: "email", maxLength: MAX_EMAIL_LENGTH }),
  password: t.String({ minLength: 8, maxLength: MAX_PASSWORD_LENGTH }),
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LENGTH }),
});
export type SignUpInput = typeof SignUpInput.static;
