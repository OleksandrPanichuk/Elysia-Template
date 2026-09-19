import { DAY } from "@/constants";
import type { VerificationTokenType } from "@/db";

export const VERIFICATION_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export const VerificationTokenKind = {
  EmailVerification: "email_verification",
  PasswordReset: "password_reset",
  EmailChange: "email_change",
} as const satisfies Record<string, VerificationTokenType>;

export type VerificationTokenKind =
  (typeof VerificationTokenKind)[keyof typeof VerificationTokenKind];

export const VERIFICATION_TOKENS_QUEUE = "verification-tokens";

export const VerificationTokenQueueJobs = {
  PurgeSpentTokens: "verification-tokens.purge-spent",
} as const;

export const PURGE_SPENT_TOKENS_PATTERN = "0 3 * * *";

export const SPENT_TOKEN_RETENTION_MS = 7 * DAY;
