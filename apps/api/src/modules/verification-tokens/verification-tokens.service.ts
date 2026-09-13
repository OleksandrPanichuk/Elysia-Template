import { SECOND } from "@/constants";
import { makeRepository } from "@/core/registry";
import { Service } from "@/core/service";

import { VerificationTokenEntity } from "./verification-token.entity";
import { VerificationTokensRepository } from "./verification-tokens.repository";

export interface IssueVerificationTokenInput {
  userId: string;
  type: "email_verification" | "password_reset";
  ttlSeconds: number;
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
  }: IssueVerificationTokenInput): Promise<IssuedVerificationToken> {
    const now = this.now();
    const { token, tokenHash } = VerificationTokenEntity.generate();
    const expiresAt = new Date(now.getTime() + ttlSeconds * SECOND);

    await this.repository.invalidateAllForUser(userId, type, now);

    await this.repository.insert({ userId, tokenHash, type, expiresAt });

    return { token, expiresAt };
  }
}
