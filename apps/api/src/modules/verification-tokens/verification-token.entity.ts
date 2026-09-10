import { createHash, randomBytes } from "node:crypto";

import type { VerificationTokenRow } from "@/db";

import { VERIFICATION_TOKEN_PATTERN } from "./verification-tokens.constans";

export interface VerificationTokenEntity extends VerificationTokenRow {}

export interface GeneratedVerificationToken {
  token: string;
  tokenHash: string;
}

export class VerificationTokenEntity {
  public static generate(): GeneratedVerificationToken {
    const token = randomBytes(32).toString("hex");

    return { token, tokenHash: VerificationTokenEntity.hash(token) };
  }

  public static hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  public static isWellFormed(token: string): boolean {
    return VERIFICATION_TOKEN_PATTERN.test(token);
  }

  public static isUsable(
    entity: VerificationTokenEntity,
    now: Date = new Date(),
  ): boolean {
    return (
      entity.consumedAt === null && entity.expiresAt.getTime() > now.getTime()
    );
  }
}
