import { migrate } from "drizzle-orm/bun-sql/migrator";

import { loadEnv } from "@/configs";

import { createDatabase } from "./client";

const env = loadEnv();
const db = createDatabase(env.DATABASE_URL);

try {
  await migrate(db, {
    migrationsFolder: new URL("../../drizzle", import.meta.url).pathname,
  });
  console.log("Migrations applied");
} finally {
  await db.close();
}
