import type { AppModule } from "@/core/module";
import { accountsModule } from "@/modules/accounts";
import { authModule } from "@/modules/auth";
import { notificationsModule } from "@/modules/notifications";
import { oauthModule } from "@/modules/oauth";
import { sessionsModule } from "@/modules/sessions";
import { usersModule } from "@/modules/users";
import { verificationTokensModule } from "@/modules/verification-tokens";
import { cacheModule } from "@/platform/cache";
import { databaseModule } from "@/platform/database";
import { healthModule } from "@/platform/health";
import { jobsModule } from "@/platform/jobs";
import { rateLimitModule } from "@/platform/rate-limit";

export const modules = [
  databaseModule,
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
