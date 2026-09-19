import { t } from "elysia";

import { MAX_NAME_LENGTH } from "@/constants";

export const UpdateProfileInput = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LENGTH }),
});

export type UpdateProfileInput = typeof UpdateProfileInput.static;
