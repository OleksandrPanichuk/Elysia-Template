import { t } from "elysia";

export const SignUpInput = t.Object({
  email: t.String({ format: "email" }),
  password: t.String({ minLength: 8 }),
  name: t.String({ minLength: 1 }),
});
export type SignUpInput = typeof SignUpInput.static;
