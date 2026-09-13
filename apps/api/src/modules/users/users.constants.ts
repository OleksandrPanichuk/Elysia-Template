import { MINUTE } from "@/constants";

export const DELETE_ACCOUNT_RATE_LIMIT = {
  limit: 5,
  windowMs: 15 * MINUTE,
} as const;
