import { t } from "elysia";

import { MAX_PASSWORD_LENGTH } from "@/constants";

export const ChangePasswordInput = t.Object({
  currentPassword: t.String({ minLength: 1, maxLength: MAX_PASSWORD_LENGTH }),
  password: t.String({ minLength: 8, maxLength: MAX_PASSWORD_LENGTH }),
});
export type ChangePasswordInput = typeof ChangePasswordInput.static;
