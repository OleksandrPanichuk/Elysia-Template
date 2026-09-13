const MAX_USER_AGENT_LENGTH = 400;

export interface ClientInfo {
  userAgent: string | null;
  ip: string | null;
}

export const getClientIp = (request: Request): string | null =>
  request.headers.get("cf-connecting-ip") ??
  request.headers.get("x-real-ip") ??
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  null;

export const getClientUserAgent = (request: Request): string | null =>
  request.headers.get("user-agent")?.slice(0, MAX_USER_AGENT_LENGTH) ?? null;

export const getClientInfo = (request: Request): ClientInfo => ({
  userAgent: getClientUserAgent(request),
  ip: getClientIp(request),
});
