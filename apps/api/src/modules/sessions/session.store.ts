import { Repository } from "@/core/repository";

import type { SessionEntity } from "./session.entity";

export interface StoredSession extends SessionEntity {
  tokenHash: string;
}

export const byNewestFirst = (a: StoredSession, b: StoredSession): number =>
  b.createdAt - a.createdAt || a.id.localeCompare(b.id);

export abstract class SessionStore extends Repository {
  public abstract create(
    tokenHash: string,
    session: SessionEntity,
  ): Promise<boolean>;

  public abstract findByTokenHash(
    tokenHash: string,
  ): Promise<SessionEntity | null>;

  public abstract listByUserId(userId: string): Promise<StoredSession[]>;

  public abstract extend(tokenHash: string, expiresAt: number): Promise<void>;

  public abstract deleteByTokenHash(tokenHash: string): Promise<void>;

  public abstract deleteByUserId(userId: string): Promise<void>;

  public abstract deleteByUserIdExcept(
    userId: string,
    tokenHash: string,
  ): Promise<void>;
}
