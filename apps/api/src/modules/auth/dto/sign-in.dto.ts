import { t } from "elysia";

export const SignInInput = t.Object({
  email: t.String({ format: "email" }),
  password: t.String({ minLength: 1 }),
});
export type SignInInput = typeof SignInInput.static;
