import { t } from "elysia";

import { MAX_NAME_LENGTH } from "@/constants";

const NON_BLANK_PATTERN = "\\S";

export const UpdateProfileInput = t.Object({
  name: t
    .Transform(
      t.String({
        minLength: 1,
        maxLength: MAX_NAME_LENGTH,
        pattern: NON_BLANK_PATTERN,
      }),
    )
    .Decode((name) => name.trim())
    .Encode((name) => name),
});

export type UpdateProfileInput = typeof UpdateProfileInput.static;
