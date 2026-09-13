import { createHash, randomBytes, randomUUID } from "node:crypto";

import { getEnv } from "@/configs";
import { SECOND } from "@/constants";
import { makeRepository } from "@/core/registry";
import { Service } from "@/core/service";

import type { CreatedSession, SessionEntity } from "./session.entity";
import { SessionStore, type StoredSession } from "./session.store";
import {
  MAX_SESSIONS_PER_USER,
  MAX_USER_AGENT_LENGTH,
  SESSION_TOKEN_PATTERN,
} from "./sessions.constants";

export interface CreateSessionOptions {
  userAgent?: string | null;
  ip?: string | null;
}

export class SessionsService extends Service {
  private readonly store: SessionStore = makeRepository(SessionStore);
  private readonly ttlSeconds = getEnv().SESSIONS_TTL_SECONDS;
  private readonly now = () => Date.now();

  public async create(
    userId: string,
    options: CreateSessionOptions,
  ): Promise<CreatedSession> {
    const token = randomBytes(32).toString("hex");
    const createdAt = this.now();

    const session: SessionEntity = {
      id: randomUUID(),
      userId,
      createdAt,
      expiresAt: createdAt + this.ttlSeconds * SECOND,
      userAgent: this.truncate(options.userAgent, MAX_USER_AGENT_LENGTH),
      ip: options?.ip ?? null,
    };

    const created = await this.store.create(this.hash(token), session);

    if (!created) {
      throw new Error("Failed to create session");
    }

    await this.evictOldest(userId);

    return {
      token,
      session,
    };
  }

  public list(userId: string): Promise<StoredSession[]> {
    return this.store.listByUserId(userId);
  }

  public isCurrent(session: StoredSession, token: string | undefined): boolean {
    return this.isWellFormed(token) && session.tokenHash === this.hash(token);
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

  public async revokeById(userId: string, sessionId: string): Promise<boolean> {
    const sessions = await this.store.listByUserId(userId);

    const target = sessions.find((s) => s.id === sessionId);

    if (!target) return false;

    await this.store.deleteByTokenHash(target.tokenHash);

    return true;
  }

  public async revokeOthers(
    userId: string,
    token: string | undefined,
  ): Promise<void> {
    if (!this.isWellFormed(token)) {
      await this.store.deleteByUserId(userId);
      return;
    }

    await this.store.deleteByUserIdExcept(userId, this.hash(token));
  }

  public async revokeAllForUser(userId: string): Promise<void> {
    await this.store.deleteByUserId(userId);
  }

  private async evictOldest(userId: string): Promise<void> {
    const sessions = await this.store.listByUserId(userId);

    if (sessions.length <= MAX_SESSIONS_PER_USER) {
      return;
    }

    const doomed = sessions.slice(MAX_SESSIONS_PER_USER);

    await Promise.all(
      doomed.map((s) => this.store.deleteByTokenHash(s.tokenHash)),
    );
  }

  private truncate(
    value: string | null | undefined,
    maxLength: number,
  ): string | null {
    if (!value) return null;

    return value.slice(0, maxLength);
  }

  private isWellFormed(token: string | undefined): token is string {
    return Boolean(token) && SESSION_TOKEN_PATTERN.test(token!);
  }

  private hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
