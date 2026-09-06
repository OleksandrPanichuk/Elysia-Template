import type { CORSConfig } from "@elysia/cors";

import { getEnv } from "./env.config";

export const getCorsConfig = (): CORSConfig => {
  const env = getEnv();

  return {
    allowedHeaders: ["Content-Type", "Authorization"],
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    preflight: true,
  };
};
