import { createHash, randomBytes } from "node:crypto";

import type { SessionModel } from "./session.model";
import type { StoredSession } from "./session.store";
import {
  MAX_USER_AGENT_LENGTH,
  SESSION_TOKEN_PATTERN,
} from "./sessions.constants";

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
  newDevice: boolean;
}

export class SessionEntity {
  public static generateToken(): string {
    return randomBytes(32).toString("hex");
  }

  public static hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  public static isWellFormed(token: string | undefined): token is string {
    return token !== undefined && SESSION_TOKEN_PATTERN.test(token);
  }

  public static isExpired(session: SessionEntity, now: number): boolean {
    return session.expiresAt <= now;
  }

  public static isCurrent(
    session: StoredSession,
    token: string | undefined,
  ): boolean {
    return (
      SessionEntity.isWellFormed(token) &&
      session.tokenHash === SessionEntity.hash(token)
    );
  }

  public static isKnownDevice(
    sessions: SessionEntity[],
    userAgent: string | null,
  ): boolean {
    return sessions.some((session) => session.userAgent === userAgent);
  }

  public static normalizeUserAgent(
    value: string | null | undefined,
  ): string | null {
    return value ? value.slice(0, MAX_USER_AGENT_LENGTH) : null;
  }

  public static normalize(
    session: StoredSession,
    token: string | undefined,
  ): SessionModel {
    return {
      id: session.id,
      createdAt: new Date(session.createdAt).toISOString(),
      expiresAt: new Date(session.expiresAt).toISOString(),
      userAgent: session.userAgent,
      ip: session.ip,
      current: SessionEntity.isCurrent(session, token),
    };
  }

  public static normalizeMany(
    sessions: StoredSession[],
    token: string | undefined,
  ): SessionModel[] {
    return sessions.map((session) => SessionEntity.normalize(session, token));
  }
}
