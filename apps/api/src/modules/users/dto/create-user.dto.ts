import { t } from "elysia";

export const CreateUserInput = t.Object({
  name: t.String({ minLength: 1 }),
});
export type CreateUserInput = typeof CreateUserInput.static;
