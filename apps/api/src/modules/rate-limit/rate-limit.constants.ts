import { MINUTE } from "@/constants";

export const RATE_LIMIT_KEY_PREFIX = "velo:rate-limit";

export const RATE_LIMIT_STORE_TIMEOUT_MS = 1_000;

export const SIGN_IN_RATE_LIMIT = {
  limit: 10,
  windowMs: 15 * MINUTE,
} as const;

export const MAIL_RATE_LIMIT = {
  limit: 3,
  windowMs: 15 * MINUTE,
} as const;

export const SIGN_UP_RATE_LIMIT = {
  limit: 5,
  windowMs: 60 * MINUTE,
} as const;
