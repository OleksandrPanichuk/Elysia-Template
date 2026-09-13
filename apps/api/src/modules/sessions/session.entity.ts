import type { SessionModel } from "./session.model";
import type { StoredSession } from "./session.store";

export interface SessionEntity {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  userAgent: string | null;
  ip: string | null;
}

export interface CreatedSession {
  token: string;
  session: SessionEntity;
}

export class SessionEntity {
  public static normalize(
    session: StoredSession,
    current: boolean,
  ): SessionModel {
    return {
      id: session.id,
      createdAt: new Date(session.createdAt).toISOString(),
      expiresAt: new Date(session.expiresAt).toISOString(),
      userAgent: session.userAgent,
      ip: session.ip,
      current,
    };
  }
}
