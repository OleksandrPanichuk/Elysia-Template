import { resolve } from "node:path";

import { migrate } from "drizzle-orm/bun-sql/migrator";
import z from "zod";

import { createDatabase } from "./client";

const { DATABASE_URL } = z
  .object({ DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }) })
  .parse(Bun.env);

const migrationsFolder = resolve(process.cwd(), "drizzle");

const hasMigrations = await Bun.file(migrationsFolder)
  .stat()
  .then((entry) => entry.isDirectory())
  .catch(() => false);

if (!hasMigrations) {
  console.error(
    `No migrations at ${migrationsFolder}. Run this from apps/api, where the drizzle folder lives.`,
  );
  process.exit(1);
}

const db = createDatabase({ url: DATABASE_URL });

try {
  await migrate(db, { migrationsFolder });
  console.log("Migrations applied");
} finally {
  await db.close();
}
