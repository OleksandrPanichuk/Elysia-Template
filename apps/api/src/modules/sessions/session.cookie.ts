import type { Context } from "elysia";

import { getEnv } from "@/configs";
import { NodeEnv } from "@/configs/env.config";

type CookieJar = Context["cookie"];

export interface SessionCookieValue {
  token: string;
  expiresAt: number;
}

const isProduction = (): boolean => getEnv().NODE_ENV === NodeEnv.Production;

export const getSessionCookieName = (): string => {
  const name = `${getEnv().APP_SLUG}-session`;

  return isProduction() ? `__Host-${name}` : name;
};

const getCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: "lax" as const,
  path: "/",
});

export const readSessionCookie = (cookies: CookieJar): string | undefined => {
  const value = cookies[getSessionCookieName()]?.value;

  return typeof value === "string" ? value : undefined;
};

export const writeSessionCookie = (
  cookies: CookieJar,
  { token, expiresAt }: SessionCookieValue,
): void => {
  cookies[getSessionCookieName()]!.set({
    ...getCookieOptions(),
    value: token,
    expires: new Date(expiresAt),
  });
};

export const clearSessionCookie = (cookies: CookieJar): void => {
  cookies[getSessionCookieName()]!.set({
    ...getCookieOptions(),
    value: "",
    expires: new Date(0),
    maxAge: 0,
  });
};
