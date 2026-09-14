import type { Server } from "elysia/universal/server";

import { getEnv } from "@/configs";

const MAX_USER_AGENT_LENGTH = 400;

export interface ClientInfo {
  userAgent: string | null;
  ip: string | null;
}

const forwardedIp = (request: Request): string | null => {
  const env = getEnv();

  if (!env.TRUSTED_PROXY_HEADER) return null;

  const value = request.headers.get(env.TRUSTED_PROXY_HEADER);

  if (!value) return null;

  const entries = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return entries[entries.length - env.TRUSTED_PROXY_DEPTH] ?? null;
};

export const getClientIp = (
  request: Request,
  server?: Server | null,
): string | null =>
  forwardedIp(request) ?? server?.requestIP(request)?.address ?? null;

export const getClientUserAgent = (request: Request): string | null =>
  request.headers.get("user-agent")?.slice(0, MAX_USER_AGENT_LENGTH) ?? null;

export const getClientInfo = (
  request: Request,
  server?: Server | null,
): ClientInfo => ({
  userAgent: getClientUserAgent(request),
  ip: getClientIp(request, server),
});
