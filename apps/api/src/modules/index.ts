import type { AppModule } from "@/core/module";

import { accountsModule } from "./accounts";
import { authModule } from "./auth";
import { healthModule } from "./health";
import { notificationsModule } from "./notifications";
import { sessionsModule } from "./sessions";
import { usersModule } from "./users";
import { verificationTokensModule } from "./verification-tokens";

export const modules: readonly AppModule[] = [
  healthModule,
  sessionsModule,
  notificationsModule,
  usersModule,
  accountsModule,
  authModule,
  verificationTokensModule,
];
