import type { SessionEntity } from "@/modules/sessions/session.entity";
import { SessionStore } from "@/modules/sessions/session.store";

export class MemorySessionStore extends SessionStore {
  private readonly sessions = new Map<string, SessionEntity>();

  public create(tokenHash: string, session: SessionEntity): Promise<boolean> {
    if (this.sessions.has(tokenHash)) return Promise.resolve(false);

    this.sessions.set(tokenHash, session);

    return Promise.resolve(true);
  }

  public findByTokenHash(tokenHash: string): Promise<SessionEntity | null> {
    const session = this.sessions.get(tokenHash);

    if (!session) return Promise.resolve(null);

    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(tokenHash);

      return Promise.resolve(null);
    }

    return Promise.resolve(session);
  }

  public deleteByTokenHash(tokenHash: string): Promise<void> {
    this.sessions.delete(tokenHash);

    return Promise.resolve();
  }

  public deleteByUserId(userId: string): Promise<void> {
    for (const [tokenHash, session] of this.sessions) {
      if (session.userId === userId) this.sessions.delete(tokenHash);
    }

    return Promise.resolve();
  }
}
