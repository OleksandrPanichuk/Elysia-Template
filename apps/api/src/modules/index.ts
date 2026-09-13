import type { AppModule } from "@/core/module";

import { accountsModule } from "./accounts";
import { authModule } from "./auth";
import { cacheModule } from "./cache";
import { healthModule } from "./health";
import { jobsModule } from "./jobs";
import { notificationsModule } from "./notifications";
import { oauthModule } from "./oauth";
import { rateLimitModule } from "./rate-limit";
import { sessionsModule } from "./sessions";
import { usersModule } from "./users";
import { verificationTokensModule } from "./verification-tokens";

export const modules = [
  healthModule,
  sessionsModule,
  cacheModule,
  rateLimitModule,
  notificationsModule,
  usersModule,
  accountsModule,
  authModule,
  oauthModule,
  verificationTokensModule,
  jobsModule,
] as const satisfies readonly AppModule[];
