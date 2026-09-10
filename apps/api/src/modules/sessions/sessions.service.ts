import { createHash, randomBytes, randomUUID } from "node:crypto";

import { getEnv } from "@/configs";
import { SECOND } from "@/constants";
import { makeRepository } from "@/core/registry";
import { Service } from "@/core/service";

import type { CreatedSession, SessionEntity } from "./session.entity";
import { SessionStore } from "./session.store";
import { SESSION_TOKEN_PATTERN } from "./sessions.constants";

export class SessionsService extends Service {
  constructor(
    private readonly store: SessionStore = makeRepository(SessionStore),
    private readonly ttlSeconds = getEnv().SESSIONS_TTL_SECONDS,
    private readonly now = () => Date.now(),
  ) {
    super();
  }

  public async create(userId: string): Promise<CreatedSession> {
    const token = randomBytes(32).toString("hex");
    const createdAt = this.now();

    const session: SessionEntity = {
      id: randomUUID(),
      userId,
      createdAt,
      expiresAt: createdAt + this.ttlSeconds * SECOND,
    };

    const created = await this.store.create(this.hash(token), session);

    if (!created) {
      throw new Error("Failed to create session");
    }

    return {
      token,
      session,
    };
  }

  public async validate(
    token: string | undefined,
  ): Promise<SessionEntity | null> {
    if (!this.isWellFormed(token)) {
      return null;
    }

    const tokenHash = this.hash(token);
    const session = await this.store.findByTokenHash(tokenHash);

    if (!session) {
      return null;
    }

    if (session.expiresAt <= this.now()) {
      await this.store.deleteByTokenHash(tokenHash);
      return null;
    }

    return session;
  }

  public async revoke(token: string | undefined): Promise<void> {
    if (!this.isWellFormed(token)) {
      return;
    }

    await this.store.deleteByTokenHash(this.hash(token));
  }

  public async revokeAllForUser(userId: string): Promise<void> {
    await this.store.deleteByUserId(userId);
  }

  private isWellFormed(token: string | undefined): token is string {
    return Boolean(token) && SESSION_TOKEN_PATTERN.test(token!);
  }

  private hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
