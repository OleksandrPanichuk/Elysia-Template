import type { CORSConfig } from "@elysia/cors";

import { getEnv } from "./env.config";

export const getCorsConfig = (): CORSConfig => {
  const env = getEnv();

  return {
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-captcha-token",
      "x-captcha-kind",
    ],
    exposeHeaders: [
      "x-request-id",
      "ratelimit-limit",
      "ratelimit-remaining",
      "ratelimit-reset",
      "retry-after",
    ],
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    preflight: true,
  };
};
