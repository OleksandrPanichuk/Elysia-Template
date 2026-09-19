import { t } from "elysia";

import { MAX_PASSWORD_LENGTH } from "@/constants";

export const SetPasswordInput = t.Object({
  password: t.String({ minLength: 8, maxLength: MAX_PASSWORD_LENGTH }),
});
export type SetPasswordInput = typeof SetPasswordInput.static;
