import "./prepare-environment";

import { MemoryCache } from "@/adapters/cache/memory.cache";
import { bind } from "@/core/registry";
import { closeDatabase } from "@/db";
import { accountsModule } from "@/modules/accounts";
import { usersModule } from "@/modules/users";
import { Cache } from "@/platform/cache";

import { runSeeders } from "./index";
import { formatReports } from "./report";

usersModule.register();
accountsModule.register();
bind(Cache, () => new MemoryCache());

try {
  console.log(formatReports(await runSeeders()));
} finally {
  await closeDatabase();
}
