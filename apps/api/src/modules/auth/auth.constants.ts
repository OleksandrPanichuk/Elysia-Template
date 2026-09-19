import { MINUTE } from "@/constants";

export const SIGN_IN_RATE_LIMIT = {
  limit: 10,
  windowMs: 15 * MINUTE,
} as const;

export const SIGN_IN_CLIENT_RATE_LIMIT = {
  limit: 50,
  windowMs: 15 * MINUTE,
} as const;

export const MAIL_RATE_LIMIT = {
  limit: 3,
  windowMs: 15 * MINUTE,
} as const;

export const MAIL_CLIENT_RATE_LIMIT = {
  limit: 10,
  windowMs: 15 * MINUTE,
} as const;

export const SIGN_UP_RATE_LIMIT = {
  limit: 5,
  windowMs: 60 * MINUTE,
} as const;
