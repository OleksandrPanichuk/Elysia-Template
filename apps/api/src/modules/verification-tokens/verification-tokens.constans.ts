import type { VerificationTokenType } from "@/db";

export const VERIFICATION_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export const VerificationTokenKind = {
  EmailVerification: "email_verification",
  PasswordReset: "password_reset",
} as const satisfies Record<string, VerificationTokenType>;

export type VerificationTokenKind =
  (typeof VerificationTokenKind)[keyof typeof VerificationTokenKind];
