import { t } from "elysia";

import { MAX_EMAIL_LENGTH, MAX_PASSWORD_LENGTH } from "@/constants";

export const DeleteAccountInput = t.Object({
  email: t.String({ format: "email", maxLength: MAX_EMAIL_LENGTH }),
  password: t.Optional(
    t.String({ minLength: 1, maxLength: MAX_PASSWORD_LENGTH }),
  ),
});

export type DeleteAccountInput = typeof DeleteAccountInput.static;
