import { and, eq, gt, isNull, lt, or } from "drizzle-orm";

import { verificationTokensSchema, type VerificationTokenType } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import type { VerificationTokenEntity } from "../verification-token.entity";
import {
  type CreateVerificationTokenData,
  VerificationTokensRepository,
} from "../verification-tokens.repository";

export class PostgresVerificationTokensRepository extends VerificationTokensRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async insert(
    data: CreateVerificationTokenData,
  ): Promise<VerificationTokenEntity> {
    const [token] = await this.db
      .insert(verificationTokensSchema)
      .values(data)
      .returning();

    return token!;
  }

  public async findActiveByTokenHash(
    tokenHash: string,
    type: VerificationTokenType,
  ): Promise<VerificationTokenEntity | null> {
    const [token] = await this.db
      .select()
      .from(verificationTokensSchema)
      .where(
        and(
          eq(verificationTokensSchema.tokenHash, tokenHash),
          eq(verificationTokensSchema.type, type),
          isNull(verificationTokensSchema.consumedAt),
          gt(verificationTokensSchema.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return token ?? null;
  }

  public async consume(id: string, consumedAt: Date): Promise<boolean> {
    const consumed = await this.db
      .update(verificationTokensSchema)
      .set({ consumedAt })
      .where(
        and(
          eq(verificationTokensSchema.id, id),
          isNull(verificationTokensSchema.consumedAt),
          gt(verificationTokensSchema.expiresAt, consumedAt),
        ),
      )
      .returning({ id: verificationTokensSchema.id });

    return consumed.length > 0;
  }

  public async invalidateAllForUser(
    userId: string,
    type: VerificationTokenType,
    consumedAt: Date,
  ): Promise<void> {
    await this.db
      .update(verificationTokensSchema)
      .set({ consumedAt })
      .where(
        and(
          eq(verificationTokensSchema.userId, userId),
          eq(verificationTokensSchema.type, type),
          isNull(verificationTokensSchema.consumedAt),
        ),
      );
  }

  public async deleteSpent(before: Date): Promise<number> {
    const deleted = await this.db
      .delete(verificationTokensSchema)
      .where(
        or(
          lt(verificationTokensSchema.expiresAt, before),
          lt(verificationTokensSchema.consumedAt, before),
        ),
      )
      .returning({ id: verificationTokensSchema.id });

    return deleted.length;
  }
}
