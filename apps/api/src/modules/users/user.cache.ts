import z from "zod";

import { MINUTE } from "@/constants";

export const USER_CACHE_TTL_MS = 15 * MINUTE;

export const userCacheKey = (id: string): string => `users:${id}`;

export const CachedUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  emailVerifiedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});
