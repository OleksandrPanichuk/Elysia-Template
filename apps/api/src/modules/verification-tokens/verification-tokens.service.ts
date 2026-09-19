import { SECOND } from "@/constants";
import { makeRepository } from "@/core/registry";
import { Service } from "@/core/service";

import { VerificationTokenEntity } from "./verification-token.entity";
import type { VerificationTokenKind } from "./verification-tokens.constans";
import { VerificationTokensRepository } from "./verification-tokens.repository";

export interface IssueVerificationTokenInput {
  userId: string;
  type: VerificationTokenKind;
  ttlSeconds: number;
  email?: string;
}

export interface IssuedVerificationToken {
  token: string;
  expiresAt: Date;
}

export class VerificationTokensService extends Service {
  private readonly repository = makeRepository(VerificationTokensRepository);

  private readonly now = () => new Date();

  public async issue({
    userId,
    type,
    ttlSeconds,
    email,
  }: IssueVerificationTokenInput): Promise<IssuedVerificationToken> {
    const now = this.now();
    const { token, tokenHash } = VerificationTokenEntity.generate();
    const expiresAt = new Date(now.getTime() + ttlSeconds * SECOND);

    await this.repository.invalidateAllForUser(userId, type, now);

    await this.repository.insert({
      userId,
      tokenHash,
      type,
      email: email ?? null,
      expiresAt,
    });

    return { token, expiresAt };
  }
}
