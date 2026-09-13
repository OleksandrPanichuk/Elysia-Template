import { t } from "elysia";

export const DeleteAccountInput = t.Object({
  email: t.String({ format: "email" }),
  password: t.Optional(t.String({ minLength: 1 })),
});

export type DeleteAccountInput = typeof DeleteAccountInput.static;
