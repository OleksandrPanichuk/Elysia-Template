export interface SessionEntity {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

export interface CreatedSession {
  token: string;
  session: SessionEntity;
}
