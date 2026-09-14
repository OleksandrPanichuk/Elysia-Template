import type { VerificationTokenType } from "@/db";

import type { VerificationTokenEntity } from "./verification-token.entity";

export interface CreateVerificationTokenData {
  userId: string;
  tokenHash: string;
  type: VerificationTokenType;
  expiresAt: Date;
}

export abstract class VerificationTokensRepository {
  public abstract insert(
    data: CreateVerificationTokenData,
  ): Promise<VerificationTokenEntity>;

  public abstract findActiveByTokenHash(
    tokenHash: string,
    type: VerificationTokenType,
  ): Promise<VerificationTokenEntity | null>;

  public abstract consume(id: string, consumedAt: Date): Promise<boolean>;

  public abstract invalidateAllForUser(
    userId: string,
    type: VerificationTokenType,
    consumedAt: Date,
  ): Promise<void>;

  public abstract deleteSpent(before: Date): Promise<number>;
}
