import type { SessionEntity } from "./session.entity";

export abstract class SessionStore {
  public abstract create(
    tokenHash: string,
    session: SessionEntity,
  ): Promise<boolean>;

  public abstract findByTokenHash(
    tokenHash: string,
  ): Promise<SessionEntity | null>;

  public abstract deleteByTokenHash(tokenHash: string): Promise<void>;

  public abstract deleteByUserId(userId: string): Promise<void>;
}
